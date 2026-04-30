FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG        v3.7.1
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(Catch2)

add_executable(studdup_tests
    test_date.cpp
    test_scheduler.cpp
    ${PROJECT_SOURCE_DIR}/src/Date.cpp
    ${PROJECT_SOURCE_DIR}/src/Scheduler.cpp
)

target_include_directories(studdup_tests PRIVATE
    ${PROJECT_SOURCE_DIR}/src
)

target_link_libraries(studdup_tests PRIVATE Catch2::Catch2WithMain)

if (ENABLE_COVERAGE AND NOT MSVC)
    target_compile_options(studdup_tests PRIVATE --coverage -O0 -g)
    target_link_options(studdup_tests PRIVATE --coverage)
endif()

include(CTest)
include(Catch)
catch_discover_tests(studdup_tests)
