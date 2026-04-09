cmake_minimum_required(VERSION 3.5)

list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)
list(APPEND CMAKE_MODULE_PATH $ENV{IDF_PATH}/tools/cmake)

project(guardian_ai_voice_recorder)

include($ENV{IDF_PATH}/tools/cmake/idf.cmake)

idf_build_process(esp32
    COMPONENTS
        freertos
        lwip
        mqtt
        esp_netif
        esp_wifi
        esp_event
        esp_wifi
        nvs_flash
        driver
    SDKCONFIG $\{CMAKE_BINARY_DIR}/sdkconfig
    BUILD_DIR $\{CMAKE_BINARY_DIR}
)

idf_component_register(
    SRCS 
        "voice_recorder.c"
    INCLUDE_DIRS 
        "."
)
