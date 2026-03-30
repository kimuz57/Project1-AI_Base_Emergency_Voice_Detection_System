/*
 * Guardian AI — ESP32 Firmware
 * INMP441 I2S Microphone → MQTT Audio Streaming
 *
 * Device Code: A01
 * MQTT Topic:  voice/audio/A01
 *
 * Hardware Wiring (INMP441 → ESP32):
 *   VDD  → 3.3V
 *   GND  → GND
 *   SD   → GPIO32  (I2S Data)
 *   WS   → GPIO25  (I2S Word Select / LRCLK)
 *   SCK  → GPIO26  (I2S Bit Clock / BCLK)
 *   L/R  → GND     (Mono, Left Channel)
 */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "driver/i2s.h"
#include "mqtt_client.h"

/* ─── CONFIG ─────────────────────────────────────────────────── */
#define WIFI_SSID        "YOUR_WIFI_SSID"       // ← แก้ตรงนี้
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"   // ← แก้ตรงนี้
#define MQTT_BROKER_URI  "mqtt://192.168.1.100" // ← IP ของเครื่อง Node.js
#define MQTT_TOPIC       "voice/audio/A01"
#define DEVICE_CODE      "A01"

/* ─── I2S CONFIG ─────────────────────────────────────────────── */
#define I2S_NUM          I2S_NUM_0
#define I2S_WS           GPIO_NUM_25   // Word Select (LRCLK)
#define I2S_SCK          GPIO_NUM_26   // Bit Clock (BCLK)
#define I2S_SD           GPIO_NUM_32   // Data In

#define SAMPLE_RATE      16000         // 16 kHz — เหมาะกับ AI
#define SAMPLE_BITS      32            // INMP441 output 32-bit
#define CHANNEL_NUM      1             // Mono
#define I2S_READ_LEN     (1024 * 2)   // 2KB per read
#define MQTT_CHUNK_SIZE  (1024 * 4)   // 4KB per MQTT publish

/* ─── TAGS ───────────────────────────────────────────────────── */
static const char *TAG_WIFI  = "WIFI";
static const char *TAG_MQTT  = "MQTT";
static const char *TAG_I2S   = "I2S";
static const char *TAG_MAIN  = "MAIN";

/* ─── GLOBALS ────────────────────────────────────────────────── */
static EventGroupHandle_t s_wifi_event_group;
static esp_mqtt_client_handle_t mqtt_client = NULL;
static bool mqtt_connected = false;

#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT      BIT1
#define WIFI_MAX_RETRY     5
static int s_retry_num = 0;

/* ═══════════════════════════════════════════════════════════════
 *  WIFI
 * ═══════════════════════════════════════════════════════════════ */
static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                                int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        if (s_retry_num < WIFI_MAX_RETRY) {
            esp_wifi_connect();
            s_retry_num++;
            ESP_LOGW(TAG_WIFI, "Retry connecting... (%d/%d)", s_retry_num, WIFI_MAX_RETRY);
        } else {
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
            ESP_LOGE(TAG_WIFI, "Connection failed");
        }
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *) event_data;
        ESP_LOGI(TAG_WIFI, "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

static void wifi_init(void)
{
    s_wifi_event_group = xEventGroupCreate();
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t inst_any_id;
    esp_event_handler_instance_t inst_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                                         &wifi_event_handler, NULL, &inst_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                                         &wifi_event_handler, NULL, &inst_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid     = WIFI_SSID,
            .password = WIFI_PASSWORD,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG_WIFI, "Connecting to SSID: %s", WIFI_SSID);

    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group,
                                            WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
                                            pdFALSE, pdFALSE, portMAX_DELAY);
    if (bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG_WIFI, "✅ WiFi connected!");
    } else {
        ESP_LOGE(TAG_WIFI, "❌ WiFi failed. Check SSID/Password.");
    }
}

/* ═══════════════════════════════════════════════════════════════
 *  MQTT
 * ═══════════════════════════════════════════════════════════════ */
static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                                int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t event = event_data;
    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG_MQTT, "✅ MQTT connected to %s", MQTT_BROKER_URI);
            mqtt_connected = true;
            break;
        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGW(TAG_MQTT, "⚠️  MQTT disconnected, reconnecting...");
            mqtt_connected = false;
            break;
        case MQTT_EVENT_ERROR:
            ESP_LOGE(TAG_MQTT, "❌ MQTT error");
            break;
        default:
            break;
    }
}

static void mqtt_init(void)
{
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = MQTT_BROKER_URI,
        .credentials.client_id = "esp32_guardian_" DEVICE_CODE,
        .session.keepalive = 30,
        .network.reconnect_timeout_ms = 3000,
    };

    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(mqtt_client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(mqtt_client);

    // รอให้ต่อ MQTT ก่อน
    int retry = 0;
    while (!mqtt_connected && retry < 20) {
        vTaskDelay(pdMS_TO_TICKS(500));
        retry++;
    }
}

/* ═══════════════════════════════════════════════════════════════
 *  I2S — INMP441 Setup
 * ═══════════════════════════════════════════════════════════════ */
static void i2s_init(void)
{
    i2s_config_t i2s_config = {
        .mode                 = I2S_MODE_MASTER | I2S_MODE_RX,
        .sample_rate          = SAMPLE_RATE,
        .bits_per_sample      = I2S_BITS_PER_SAMPLE_32BIT,
        .channel_format       = I2S_CHANNEL_FMT_ONLY_LEFT,  // INMP441 mono
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count        = 8,
        .dma_buf_len          = 512,
        .use_apll             = false,
        .tx_desc_auto_clear   = false,
        .fixed_mclk           = 0,
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num   = I2S_SCK,
        .ws_io_num    = I2S_WS,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num  = I2S_SD,
    };

    ESP_ERROR_CHECK(i2s_driver_install(I2S_NUM, &i2s_config, 0, NULL));
    ESP_ERROR_CHECK(i2s_set_pin(I2S_NUM, &pin_config));
    ESP_ERROR_CHECK(i2s_zero_dma_buffer(I2S_NUM));

    ESP_LOGI(TAG_I2S, "✅ I2S initialized — INMP441 ready @ %d Hz", SAMPLE_RATE);
}

/* ═══════════════════════════════════════════════════════════════
 *  AUDIO STREAMING TASK
 * ═══════════════════════════════════════════════════════════════ */
static void audio_stream_task(void *pvParameters)
{
    ESP_LOGI(TAG_I2S, "🎤 Audio streaming started → %s", MQTT_TOPIC);

    // Buffer สำหรับอ่าน I2S (32-bit samples)
    int32_t *i2s_raw = (int32_t *)malloc(I2S_READ_LEN);
    // Buffer สำหรับ 16-bit PCM ที่จะส่ง MQTT  
    int16_t *pcm_buf = (int16_t *)malloc(MQTT_CHUNK_SIZE);
    
    if (!i2s_raw || !pcm_buf) {
        ESP_LOGE(TAG_I2S, "❌ Memory allocation failed!");
        vTaskDelete(NULL);
        return;
    }

    size_t chunk_pos = 0;  // position ใน pcm_buf

    while (1) {
        if (!mqtt_connected) {
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        // อ่านจาก I2S
        size_t bytes_read = 0;
        esp_err_t err = i2s_read(I2S_NUM, (void *)i2s_raw, I2S_READ_LEN,
                                  &bytes_read, pdMS_TO_TICKS(100));

        if (err != ESP_OK || bytes_read == 0) continue;

        int samples_read = bytes_read / sizeof(int32_t);

        // แปลง 32-bit I2S → 16-bit PCM
        // INMP441 ส่งข้อมูล MSB-first, shift right 14 bits
        for (int i = 0; i < samples_read; i++) {
            int32_t sample = i2s_raw[i] >> 14;
            if (sample >  32767) sample =  32767;
            if (sample < -32768) sample = -32768;

            pcm_buf[chunk_pos++] = (int16_t)sample;

            // เมื่อ buffer เต็ม → publish MQTT
            if (chunk_pos >= MQTT_CHUNK_SIZE / sizeof(int16_t)) {
                int msg_id = esp_mqtt_client_publish(
                    mqtt_client,
                    MQTT_TOPIC,
                    (const char *)pcm_buf,
                    chunk_pos * sizeof(int16_t),
                    0,    // QoS 0 (fast)
                    0     // retain = false
                );

                if (msg_id >= 0) {
                    ESP_LOGD(TAG_MQTT, "📤 Published %zu bytes to %s",
                             chunk_pos * sizeof(int16_t), MQTT_TOPIC);
                } else {
                    ESP_LOGW(TAG_MQTT, "⚠️  Publish failed");
                }

                chunk_pos = 0;  // reset buffer
            }
        }
    }

    free(i2s_raw);
    free(pcm_buf);
    vTaskDelete(NULL);
}

/* ═══════════════════════════════════════════════════════════════
 *  APP MAIN
 * ═══════════════════════════════════════════════════════════════ */
void app_main(void)
{
    ESP_LOGI(TAG_MAIN, "🚀 Guardian AI — Device %s booting...", DEVICE_CODE);

    // 1. NVS init (WiFi ต้องการ)
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // 2. WiFi
    ESP_LOGI(TAG_MAIN, "📶 Connecting WiFi...");
    wifi_init();

    // 3. I2S Microphone
    ESP_LOGI(TAG_MAIN, "🎤 Initializing I2S...");
    i2s_init();

    // 4. MQTT
    ESP_LOGI(TAG_MAIN, "📡 Connecting MQTT...");
    mqtt_init();

    // 5. Start streaming task
    ESP_LOGI(TAG_MAIN, "🎙️  Starting audio stream task...");
    xTaskCreatePinnedToCore(
        audio_stream_task,   // Task function
        "audio_stream",      // Task name
        8192,                // Stack size (bytes)
        NULL,                // Parameters
        5,                   // Priority (high)
        NULL,                // Task handle
        1                    // Core 1 (ปล่อย Core 0 ให้ WiFi/MQTT)
    );

    ESP_LOGI(TAG_MAIN, "✅ Guardian AI running — streaming to %s", MQTT_TOPIC);
}
