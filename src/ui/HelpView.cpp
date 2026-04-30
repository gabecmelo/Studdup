#include <imgui.h>

#include "App.h"

namespace srs::ui::HelpView {

namespace {

struct Binding {
    const char* keys;
    const char* action;
};

constexpr Binding kBindings[] = {
    {"Enter", "Submit active modal (Create / primary action)"},
    {"Esc", "Cancel / close active modal"},
    {"Ctrl+N", "New card"},
    {"Ctrl+H", "Toggle History view"},
    {"?  /  F1", "Open this help screen"},
    {"Tab", "Move focus to next field / button"},
    {"Shift+Tab", "Move focus to previous field / button"},
};

}  // namespace

void draw(App& app) {
    ImGui::OpenPopup("Hotkeys");

    const ImVec2 center = ImGui::GetMainViewport()->GetCenter();
    ImGui::SetNextWindowPos(center, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
    ImGui::SetNextWindowSize(ImVec2(440, 0), ImGuiCond_Appearing);

    if (!ImGui::BeginPopupModal("Hotkeys", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) {
        return;
    }

    if (ImGui::BeginTable("hotkeys", 2,
                          ImGuiTableFlags_SizingStretchProp | ImGuiTableFlags_RowBg)) {
        ImGui::TableSetupColumn("Keys", ImGuiTableColumnFlags_WidthFixed, 110.0f);
        ImGui::TableSetupColumn("Action");
        for (const Binding& b : kBindings) {
            ImGui::TableNextRow();
            ImGui::TableSetColumnIndex(0);
            ImGui::TextUnformatted(b.keys);
            ImGui::TableSetColumnIndex(1);
            ImGui::TextUnformatted(b.action);
        }
        ImGui::EndTable();
    }

    ImGui::Spacing();
    ImGui::Separator();
    if (ImGui::Button("Close", ImVec2(-1, 0)) || ImGui::IsKeyPressed(ImGuiKey_Escape) ||
        ImGui::IsKeyPressed(ImGuiKey_Enter)) {
        app.closeModal();
        ImGui::CloseCurrentPopup();
    }

    ImGui::EndPopup();
}

}  // namespace srs::ui::HelpView
