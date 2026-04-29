cmake_minimum_required(VERSION 3.16)

file(READ "${CMAKE_SOURCE_DIR}/version.txt" STUDDUP_VERSION)
string(STRIP "${STUDDUP_VERSION}" STUDDUP_VERSION)

project(studdup VERSION ${STUDDUP_VERSION} LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)
set(FETCHCONTENT_QUIET OFF)

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

# GLFW
FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG        3.4
    GIT_SHALLOW    TRUE
)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS    OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_DOCS     OFF CACHE BOOL "" FORCE)
set(GLFW_INSTALL        OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(glfw)

# Dear ImGui (no CMake of its own; we compile the sources directly)
FetchContent_Declare(
    imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG        v1.91.5
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(imgui)

add_library(imgui STATIC
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${imgui_SOURCE_DIR}/imgui_demo.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_glfw.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
)
target_include_directories(imgui PUBLIC
    ${imgui_SOURCE_DIR}
    ${imgui_SOURCE_DIR}/backends
)
target_link_libraries(imgui PUBLIC glfw)

# SQLite3 amalgamation (3.46.0, 2024 release)
FetchContent_Declare(
    sqlite_amalg
    URL https://www.sqlite.org/2024/sqlite-amalgamation-3460000.zip
)
FetchContent_MakeAvailable(sqlite_amalg)

add_library(sqlite3 STATIC ${sqlite_amalg_SOURCE_DIR}/sqlite3.c)
target_include_directories(sqlite3 PUBLIC ${sqlite_amalg_SOURCE_DIR})
if (NOT WIN32)
    target_link_libraries(sqlite3 PUBLIC ${CMAKE_DL_LIBS} pthread)
endif()

# OpenGL (for ImGui backend)
find_package(OpenGL REQUIRED)

# ---------------------------------------------------------------------------
# studdup executable
# ---------------------------------------------------------------------------

add_executable(studdup
    src/main.cpp
    src/Date.cpp
    src/Scheduler.cpp
    src/DatabaseManager.cpp
    src/ui/App.cpp
    src/ui/AgendaView.cpp
    src/ui/CardEditor.cpp
    src/ui/HistoryView.cpp
    src/ui/HelpView.cpp
)

target_include_directories(studdup PRIVATE src)

target_compile_definitions(studdup PRIVATE
    STUDDUP_VERSION="${STUDDUP_VERSION}"
)

target_link_libraries(studdup PRIVATE
    imgui
    glfw
    sqlite3
    OpenGL::GL
)

if (WIN32)
    # Hide console window on Release builds; keep it on Debug for diagnostics
    set_target_properties(studdup PROPERTIES
        WIN32_EXECUTABLE $<CONFIG:Release>
    )
endif()

if (MSVC)
    target_compile_options(studdup PRIVATE /W4 /permissive-)
else()
    target_compile_options(studdup PRIVATE -Wall -Wextra -Wpedantic)
endif()
