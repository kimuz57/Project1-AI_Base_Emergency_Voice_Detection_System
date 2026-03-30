idf_component_register(
    SRCS "connect.c"
    INCLUDE_DIRS "."
    REQUIRES
        nvs_flash
        esp_wifi
        esp_event
        esp_netif
        driver
        mqtt
        freertos
        log
)
