#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/i2s.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_err.h"
#include "mqtt_client.h"
#include "esp_wifi.h"
#include "nvs_flash.h"
#include "esp_event.h"
#include "esp_netif.h"

static const char *TAG = "VOICE_RECORDER";

// Configuration
#define I2S_PORT I2S_NUM_0
#define I2S_SAMPLE_RATE 16000
#define I2S_CHANNELS 1
#define I2S_BITS_PER_SAMPLE I2S_BITS_PER_SAMPLE_16BIT

// I2S Pin Configuration (ESP32 DEVKIT V1 + INMP441)
#define I2S_SCK_PIN 26       // Serial Clock
#define I2S_WS_PIN 25        // Word Select
#define I2S_DIN_PIN 22       // Data IN (from INMP441)
#define I2S_DOUT_PIN -1      // Not used for input

// LED indicators
#define STATUS_LED_PIN 2     // Blue LED on ESP32 DEVKIT
#define RECORD_LED_PIN 4     // Red LED (optional)

// WiFi credentials
#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASSWORD "YOUR_PASSWORD"

// MQTT Configuration
#define MQTT_BROKER_URI "mqtt://YOUR_MQTT_BROKER_IP:1883"
#define MQTT_DEVICE_CODE "GPS_DEVICE_001"  // Change for each device

// Audio recording parameters
#define AUDIO_CHUNK_SIZE 2048       // Samples per chunk
#define RECORDING_DURATION_SEC 5    // Record 5-second clips
#define SAMPLES_COUNT (I2S_SAMPLE_RATE * RECORDING_DURATION_SEC)

// Global variables
static esp_mqtt_client_handle_t mqtt_client = NULL;
static bool wifi_connected = false;
static bool mqtt_connected = false;
static QueueHandle_t audio_queue = NULL;

// ========================================
// LED Control Functions
// ========================================
void init_led() {
    gpio_pad_select_gpio(STATUS_LED_PIN);
    gpio_set_direction(STATUS_LED_PIN, GPIO_MODE_OUTPUT);
    
    gpio_pad_select_gpio(RECORD_LED_PIN);
    gpio_set_direction(RECORD_LED_PIN, GPIO_MODE_OUTPUT);
    
    gpio_set_level(STATUS_LED_PIN, 0);
    gpio_set_level(RECORD_LED_PIN, 0);
}

void set_status_led(int state) {
    gpio_set_level(STATUS_LED_PIN, state);
}

void set_record_led(int state) {
    gpio_set_level(RECORD_LED_PIN, state);
}

void blink_led(int pin, int count) {
    for (int i = 0; i < count; i++) {
        gpio_set_level(pin, 1);
        vTaskDelay(100 / portTICK_PERIOD_MS);
        gpio_set_level(pin, 0);
        vTaskDelay(100 / portTICK_PERIOD_MS);
    }
}

// ========================================
// I2S Audio Initialization
// ========================================
void init_i2s_audio() {
    i2s_config_t i2s_config = {
        .mode = I2S_MODE_MASTER | I2S_MODE_RX,
        .sample_rate = I2S_SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_I2S_MSB,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = AUDIO_CHUNK_SIZE,
        .use_apll = true,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_SCK_PIN,
        .ws_io_num = I2S_WS_PIN,
        .data_out_num = I2S_DOUT_PIN,
        .data_in_num = I2S_DIN_PIN
    };

    ESP_ERROR_CHECK(i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL));
    ESP_ERROR_CHECK(i2s_set_pin(I2S_PORT, &pin_config));
    
    ESP_LOGI(TAG, "✓ I2S initialized (Sample Rate: %d Hz)", I2S_SAMPLE_RATE);
    blink_led(STATUS_LED_PIN, 2);
}

// ========================================
// WiFi Event Handler
// ========================================
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                               int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        ESP_LOGI(TAG, "WiFi connecting...");
        esp_wifi_connect();
        set_status_led(1);
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        ESP_LOGW(TAG, "WiFi disconnected, attempting reconnection...");
        wifi_connected = false;
        set_status_led(0);
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        ESP_LOGI(TAG, "✓ WiFi connected, IP: " IPSTR, IP2STR(&event->ip_info.ip));
        wifi_connected = true;
        blink_led(STATUS_LED_PIN, 3);
    }
}

// ========================================
// WiFi Initialization
// ========================================
void init_wifi() {
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    
    esp_netif_create_sta_default();
    
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                               &wifi_event_handler, NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                               &wifi_event_handler, NULL));
    
    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASSWORD,
        },
    };
    
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
    
    ESP_LOGI(TAG, "WiFi initialization started");
}

// ========================================
// MQTT Event Handler
// ========================================
static esp_err_t mqtt_event_handler_cb(esp_mqtt_event_handle_t event) {
    switch (event->event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "✓ MQTT connected");
            mqtt_connected = true;
            blink_led(RECORD_LED_PIN, 3);
            break;

        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGW(TAG, "MQTT disconnected");
            mqtt_connected = false;
            set_record_led(0);
            break;

        case MQTT_EVENT_PUBLISHED:
            ESP_LOGI(TAG, "✓ Audio published to MQTT");
            break;

        case MQTT_EVENT_ERROR:
            ESP_LOGE(TAG, "✗ MQTT error");
            break;

        default:
            break;
    }
    return ESP_OK;
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                               int32_t event_id, void *event_data) {
    mqtt_event_handler_cb(event_data);
}

// ========================================
// MQTT Initialization
// ========================================
void init_mqtt() {
    const esp_mqtt_client_config_t mqtt_cfg = {
        .uri = MQTT_BROKER_URI,
        .lwt_topic = "device/status/" MQTT_DEVICE_CODE,
        .lwt_msg = "offline",
        .lwt_qos = 1,
        .lwt_retain = true,
    };

    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(mqtt_client, ESP_EVENT_ANY_ID,
                                   mqtt_event_handler, NULL);
    esp_mqtt_client_start(mqtt_client);
    
    ESP_LOGI(TAG, "MQTT initialization started");
}

// ========================================
// Audio Recording and Publishing Task
// ========================================
void audio_record_task(void *pvParameters) {
    size_t bytes_read = 0;
    int16_t audio_buffer[SAMPLES_COUNT];
    char mqtt_topic[100];
    
    snprintf(mqtt_topic, sizeof(mqtt_topic), "voice/audio/%s", MQTT_DEVICE_CODE);
    
    ESP_LOGI(TAG, "Audio recording task started");
    
    while (1) {
        // Wait for WiFi and MQTT connection
        if (!wifi_connected || !mqtt_connected) {
            ESP_LOGW(TAG, "Waiting for WiFi and MQTT connection...");
            vTaskDelay(2000 / portTICK_PERIOD_MS);
            continue;
        }
        
        ESP_LOGI(TAG, "Recording audio for %d seconds...", RECORDING_DURATION_SEC);
        set_record_led(1);
        
        // Record audio in chunks
        int samples_recorded = 0;
        while (samples_recorded < SAMPLES_COUNT) {
            int remaining_samples = SAMPLES_COUNT - samples_recorded;
            int chunk_samples = (remaining_samples < AUDIO_CHUNK_SIZE) 
                ? remaining_samples 
                : AUDIO_CHUNK_SIZE;
            
            i2s_read(I2S_PORT, 
                    &audio_buffer[samples_recorded],
                    chunk_samples * sizeof(int16_t),
                    &bytes_read,
                    portMAX_DELAY);
            
            samples_recorded += bytes_read / sizeof(int16_t);
        }
        
        set_record_led(0);
        ESP_LOGI(TAG, "Recording completed: %d samples", samples_recorded);
        
        // Publish raw audio data to MQTT
        if (mqtt_connected) {
            ESP_LOGI(TAG, "Publishing audio to MQTT (%d bytes)...", 
                    samples_recorded * sizeof(int16_t));
            
            esp_mqtt_client_publish(mqtt_client,
                                   mqtt_topic,
                                   (char *)audio_buffer,
                                   samples_recorded * sizeof(int16_t),
                                   0, 0);  // QoS 0
            
            // Device status heartbeat
            char status_topic[100];
            snprintf(status_topic, sizeof(status_topic), 
                    "device/status/%s", MQTT_DEVICE_CODE);
            esp_mqtt_client_publish(mqtt_client, status_topic, "online", 6, 1, 1);
        }
        
        // Wait before next recording
        ESP_LOGI(TAG, "Waiting 2 seconds before next recording...");
        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }
}

// ========================================
// System Monitor Task
// ========================================
void system_monitor_task(void *pvParameters) {
    while (1) {
        ESP_LOGI(TAG, "=== System Status ===");
        ESP_LOGI(TAG, "WiFi: %s", wifi_connected ? "Connected" : "Disconnected");
        ESP_LOGI(TAG, "MQTT: %s", mqtt_connected ? "Connected" : "Disconnected");
        ESP_LOGI(TAG, "Free Memory: %lu bytes", esp_get_free_heap_size());
        ESP_LOGI(TAG, "Uptime: %lld ms", esp_timer_get_time() / 1000);
        
        vTaskDelay(30000 / portTICK_PERIOD_MS);  // Log every 30 seconds
    }
}

// ========================================
// Application Main
// ========================================
void app_main(void) {
    ESP_LOGI(TAG, "=================================");
    ESP_LOGI(TAG, "  Guardian AI Voice Recorder");
    ESP_LOGI(TAG, "  Device Code: %s", MQTT_DEVICE_CODE);
    ESP_LOGI(TAG, "=================================");
    
    // Initialize components
    init_led();
    init_i2s_audio();
    init_wifi();
    
    // Wait for WiFi to connect before initializing MQTT
    vTaskDelay(3000 / portTICK_PERIOD_MS);
    init_mqtt();
    
    // Create tasks
    xTaskCreate(audio_record_task, "audio_record", 4096, NULL, 10, NULL);
    xTaskCreate(system_monitor_task, "monitor", 2048, NULL, 5, NULL);
    
    ESP_LOGI(TAG, "Application tasks created successfully");
}
