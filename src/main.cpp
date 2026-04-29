// SRS desktop app entry point.
// GLFW + OpenGL3 + Dear ImGui boilerplate; the application logic lives in srs::ui::App.

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>

#ifdef _WIN32
  #include <windows.h>
#endif
#include <GL/gl.h>

#include <GLFW/glfw3.h>

#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <memory>
#include <stdexcept>
#include <string>

#include "ui/App.h"

namespace {

void glfwErrorCallback(int error, const char* description) {
    std::fprintf(stderr, "GLFW error %d: %s\n", error, description);
}

std::string defaultDbPath() {
    std::error_code ec;
    std::filesystem::create_directories("data", ec);
    return "data/srs.db";
}

void handleHotkeys(srs::ui::App& app) {
    const ImGuiIO& io = ImGui::GetIO();
    const bool ctrl = io.KeyCtrl;

    if (ImGui::IsKeyPressed(ImGuiKey_F1, false)) app.requestOpenHelp();
    if (ImGui::IsKeyPressed(ImGuiKey_Slash, false) && io.KeyShift) app.requestOpenHelp();

    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_N, false)) app.requestOpenNewCard();
    if (ctrl && ImGui::IsKeyPressed(ImGuiKey_H, false)) app.requestToggleHistory();
}

}  // namespace

int main(int /*argc*/, char** /*argv*/) {
    glfwSetErrorCallback(glfwErrorCallback);
    if (!glfwInit()) {
        std::fprintf(stderr, "Failed to init GLFW\n");
        return 1;
    }

    // OpenGL 3.3 core (works on Windows + Linux for ImGui's gl3 backend).
    const char* glsl_version = "#version 130";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(960, 720, "SRS", nullptr, nullptr);
    if (!window) {
        std::fprintf(stderr, "Failed to create GLFW window\n");
        glfwTerminate();
        return 1;
    }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.IniFilename = nullptr;  // don't write imgui.ini next to the exe
    ImGui::StyleColorsDark();

    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init(glsl_version);

    std::unique_ptr<srs::ui::App> app;
    try {
        app = std::make_unique<srs::ui::App>(defaultDbPath());
    } catch (const std::exception& e) {
        std::fprintf(stderr, "Failed to open database: %s\n", e.what());
        ImGui_ImplOpenGL3_Shutdown();
        ImGui_ImplGlfw_Shutdown();
        ImGui::DestroyContext();
        glfwDestroyWindow(window);
        glfwTerminate();
        return 1;
    }

    glfwSetWindowUserPointer(window, app.get());
    glfwSetWindowFocusCallback(window, [](GLFWwindow* w, int focused) {
        if (focused) {
            if (auto* a = static_cast<srs::ui::App*>(glfwGetWindowUserPointer(w))) {
                a->onWindowFocusChanged();
            }
        }
    });

    while (!glfwWindowShouldClose(window)) {
        glfwPollEvents();

        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();

        handleHotkeys(*app);
        app->renderFrame();

        ImGui::Render();
        int display_w = 0, display_h = 0;
        glfwGetFramebufferSize(window, &display_w, &display_h);
        glViewport(0, 0, display_w, display_h);
        glClearColor(0.10f, 0.11f, 0.13f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

        glfwSwapBuffers(window);
    }

    app.reset();
    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
