cmake_minimum_required(VERSION 3.30.5)

project("zygisk")

link_libraries(log)

find_package(cxx REQUIRED CONFIG)

link_libraries(cxx::cxx)

add_library(zygisk SHARED zygisk.cpp pif_config.cpp local_cxa_atexit_finalize_impl/atexit.cpp)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/Dobby" Dobby)

target_link_libraries(zygisk PRIVATE dobby_static)
