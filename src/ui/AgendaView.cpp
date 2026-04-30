#include "App.h"

#include <imgui.h>

#include <map>
#include <string>
#include <vector>

#include "../Scheduler.h"

namespace srs::ui::AgendaView {

namespace {

void drawCardRow(App& app, const Card& c, bool complete, bool overdue, int overdueDays) {
    ImGui::PushID(static_cast<int>(c.id));

    ImGui::AlignTextToFramePadding();
    // Title is clickable — opens the detail view
    ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(220, 220, 255, 255));
    if (ImGui::SmallButton(c.title.c_str())) app.openCardDetail(c);
    ImGui::PopStyleColor();
    ImGui::SameLine();
    ImGui::TextDisabled("[%s]", stageLabel(c.currentStage));

    if (overdue) {
        ImGui::SameLine();
        ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(255, 120, 120, 255));
        ImGui::Text("(overdue %dd)", overdueDays);
        ImGui::PopStyleColor();
    }

    if (!c.contentLink.empty() || !c.reviewLink.empty()) {
        ImGui::Indent();
        if (!c.contentLink.empty()) ImGui::TextDisabled("Content: %s", c.contentLink.c_str());
        if (!c.reviewLink.empty())  ImGui::TextDisabled("Review:  %s", c.reviewLink.c_str());
        ImGui::Unindent();
    }

    ImGui::SameLine();
    ImGui::Dummy(ImVec2(8, 0));
    ImGui::SameLine();

    if (complete) {
        if (ImGui::SmallButton("Complete")) app.completeCard(c);
        ImGui::SameLine();
    }

    if (ImGui::SmallButton("Edit")) app.openEditCard(c);
    ImGui::SameLine();
    if (ImGui::SmallButton("Postpone")) app.openPostpone(c);

    ImGui::Separator();
    ImGui::PopID();
}

}  // namespace

void draw(App& app) {
    const Date today    = app.today();
    const Date tomorrow = today.addDays(1);

    std::vector<const Card*> todayCards;
    std::vector<const Card*> tomorrowCards;
    std::map<std::string, std::vector<const Card*>> upcoming;

    for (const Card& c : app.active()) {
        const Date due = Scheduler::dueDate(c);
        if (due <= today)         todayCards.push_back(&c);
        else if (due == tomorrow) tomorrowCards.push_back(&c);
        else                      upcoming[due.toIso()].push_back(&c);
    }

    if (ImGui::CollapsingHeader(("Today (" + std::to_string(todayCards.size()) + ")").c_str(),
                                ImGuiTreeNodeFlags_DefaultOpen)) {
        if (todayCards.empty())
            ImGui::TextDisabled("Nothing due today. Enjoy the break!");
        else
            for (const Card* c : todayCards)
                drawCardRow(app, *c, true, Scheduler::isOverdue(*c, today),
                            Scheduler::overdueDays(*c, today));
    }

    if (ImGui::CollapsingHeader(("Tomorrow (" + std::to_string(tomorrowCards.size()) + ")").c_str(),
                                ImGuiTreeNodeFlags_DefaultOpen)) {
        if (tomorrowCards.empty())
            ImGui::TextDisabled("Nothing scheduled for tomorrow.");
        else
            for (const Card* c : tomorrowCards)
                drawCardRow(app, *c, false, false, 0);
    }

    if (ImGui::CollapsingHeader(("Upcoming (" + std::to_string(upcoming.size()) + " dates)").c_str(),
                                ImGuiTreeNodeFlags_DefaultOpen)) {
        if (upcoming.empty()) {
            ImGui::TextDisabled("No upcoming reviews.");
        } else {
            for (auto& [iso, cards] : upcoming) {
                const Date d = Date::fromIso(iso);
                ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(180, 200, 255, 255));
                ImGui::Text("%s", d.toHuman().c_str());
                ImGui::PopStyleColor();
                ImGui::Indent();
                for (const Card* c : cards) drawCardRow(app, *c, false, false, 0);
                ImGui::Unindent();
            }
        }
    }
}

}  // namespace srs::ui::AgendaView
