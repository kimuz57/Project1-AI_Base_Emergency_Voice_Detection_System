cmake_minimum_required(VERSION 3.5)

project(guardian_ai_voice_recorder)

set(COMPONENTS
    freertos
    lwip
    mqtt
    esp_netif
    esp_wifi
    esp_event
    nvs_flash
    driver
)

include($ENV{IDF_PATH}/tools/cmake/idf.cmake)

idf_build_process(esp32
    COMPONENTS ${COMPONENTS}
)
