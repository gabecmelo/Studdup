#include "App.h"

#include <imgui.h>

namespace srs::ui::HistoryView {

void draw(App& app) {
    ImGui::Text("Archived cards (%zu)", app.archived().size());
    ImGui::Separator();

    if (app.archived().empty()) {
        ImGui::TextDisabled("No cards have completed Day 30 yet.");
        return;
    }

    for (const Card& c : app.archived()) {
        ImGui::PushID(static_cast<int>(c.id));

        ImGui::AlignTextToFramePadding();
        ImGui::TextUnformatted(c.title.c_str());
        ImGui::SameLine();
        if (c.lastCompletedAt.isValid())
            ImGui::TextDisabled("— completed %s", c.lastCompletedAt.toHuman().c_str());
        else
            ImGui::TextDisabled("— completed (date unknown)");

        if (!c.contentLink.empty() || !c.reviewLink.empty()) {
            ImGui::Indent();
            if (!c.contentLink.empty()) ImGui::TextDisabled("Content: %s", c.contentLink.c_str());
            if (!c.reviewLink.empty())  ImGui::TextDisabled("Review:  %s", c.reviewLink.c_str());
            ImGui::Unindent();
        }

        ImGui::SameLine();
        ImGui::Dummy(ImVec2(8, 0));
        ImGui::SameLine();
        if (ImGui::SmallButton("View log")) app.openViewLog(c);
        ImGui::SameLine();
        if (ImGui::SmallButton("Revive"))   app.applyRevive(c);
        ImGui::SameLine();
        if (ImGui::SmallButton("Edit"))     app.openEditCard(c);

        ImGui::Separator();
        ImGui::PopID();
    }
}

}  // namespace srs::ui::HistoryView
