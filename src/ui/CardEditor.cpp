#include "App.h"

#include <imgui.h>

#include <algorithm>

#include "../Scheduler.h"

namespace srs::ui::CardEditor {

// ===========================================================================
// New Card modal
// ===========================================================================

void drawNewCardModal(App& app) {
    ImGui::OpenPopup("New Card");

    const ImVec2 center = ImGui::GetMainViewport()->GetCenter();
    ImGui::SetNextWindowPos(center, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
    ImGui::SetNextWindowSize(ImVec2(480, 0), ImGuiCond_Appearing);

    if (!ImGui::BeginPopupModal("New Card", nullptr, ImGuiWindowFlags_AlwaysAutoResize))
        return;

    if (app.wantFocusFirstField) {
        ImGui::SetKeyboardFocusHere();
        app.wantFocusFirstField = false;
    }

    bool submit = false;
    submit |= ImGui::InputText("Title##nc", app.newCardForm.title,
                               IM_ARRAYSIZE(app.newCardForm.title),
                               ImGuiInputTextFlags_EnterReturnsTrue);
    submit |= ImGui::InputText("Content link##nc", app.newCardForm.contentLink,
                               IM_ARRAYSIZE(app.newCardForm.contentLink),
                               ImGuiInputTextFlags_EnterReturnsTrue);
    submit |= ImGui::InputText("Review link##nc", app.newCardForm.reviewLink,
                               IM_ARRAYSIZE(app.newCardForm.reviewLink),
                               ImGuiInputTextFlags_EnterReturnsTrue);

    ImGui::Spacing();
    ImGui::TextDisabled("When do you want to start studying?");
    ImGui::RadioButton("Study today   (Day 0, due today)",    &app.newCardForm.stageChoice, 0);
    ImGui::RadioButton("Study tomorrow (Day 0, due tomorrow)", &app.newCardForm.stageChoice, 1);

    if (app.newCardForm.showError) {
        ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(255, 120, 120, 255));
        ImGui::TextWrapped("Title is required.");
        ImGui::PopStyleColor();
    }

    ImGui::Spacing();
    if (ImGui::Button("Create", ImVec2(120, 0)) || submit) {
        app.submitNewCard();
        if (app.modal == Modal::None) ImGui::CloseCurrentPopup();
    }
    ImGui::SameLine();
    if (ImGui::Button("Cancel", ImVec2(120, 0)) || ImGui::IsKeyPressed(ImGuiKey_Escape)) {
        app.closeModal();
        ImGui::CloseCurrentPopup();
    }

    ImGui::EndPopup();
}

// ===========================================================================
// Edit Card modal  (commit 1)
// ===========================================================================

void drawEditCardModal(App& app) {
    ImGui::OpenPopup("Edit Card");

    const ImVec2 center = ImGui::GetMainViewport()->GetCenter();
    ImGui::SetNextWindowPos(center, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
    ImGui::SetNextWindowSize(ImVec2(480, 0), ImGuiCond_Appearing);

    if (!ImGui::BeginPopupModal("Edit Card", nullptr, ImGuiWindowFlags_AlwaysAutoResize))
        return;

    if (app.wantFocusFirstField) {
        ImGui::SetKeyboardFocusHere();
        app.wantFocusFirstField = false;
    }

    bool submit = false;
    submit |= ImGui::InputText("Title##ec", app.editCardForm.title,
                               IM_ARRAYSIZE(app.editCardForm.title),
                               ImGuiInputTextFlags_EnterReturnsTrue);
    submit |= ImGui::InputText("Content link##ec", app.editCardForm.contentLink,
                               IM_ARRAYSIZE(app.editCardForm.contentLink),
                               ImGuiInputTextFlags_EnterReturnsTrue);
    submit |= ImGui::InputText("Review link##ec", app.editCardForm.reviewLink,
                               IM_ARRAYSIZE(app.editCardForm.reviewLink),
                               ImGuiInputTextFlags_EnterReturnsTrue);

    ImGui::TextDisabled("Note: stage and schedule are not affected by editing.");

    if (app.editCardForm.showError) {
        ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(255, 120, 120, 255));
        ImGui::TextWrapped("Title is required.");
        ImGui::PopStyleColor();
    }

    ImGui::Spacing();
    if (ImGui::Button("Save", ImVec2(120, 0)) || submit) {
        app.applyEditCard();
        if (app.modal == Modal::None) ImGui::CloseCurrentPopup();
    }
    ImGui::SameLine();
    if (ImGui::Button("Cancel", ImVec2(120, 0)) || ImGui::IsKeyPressed(ImGuiKey_Escape)) {
        app.closeModal();
        ImGui::CloseCurrentPopup();
    }

    ImGui::EndPopup();
}

// ===========================================================================
// Card Detail modal  (commit 2)
// ===========================================================================

void drawCardDetailModal(App& app) {
    ImGui::OpenPopup("Card Details");

    const ImVec2 center = ImGui::GetMainViewport()->GetCenter();
    ImGui::SetNextWindowPos(center, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
    ImGui::SetNextWindowSize(ImVec2(520, 0), ImGuiCond_Appearing);

    if (!ImGui::BeginPopupModal("Card Details", nullptr, ImGuiWindowFlags_AlwaysAutoResize))
        return;

    const Card* ptr = app.cardDetail.archived
                          ? app.findArchived(app.cardDetail.cardId)
                          : app.findActive(app.cardDetail.cardId);

    if (!ptr) {
        ImGui::TextDisabled("Card not found.");
        if (ImGui::Button("Close", ImVec2(-1, 0)) || ImGui::IsKeyPressed(ImGuiKey_Escape)) {
            app.closeModal(); ImGui::CloseCurrentPopup();
        }
        ImGui::EndPopup();
        return;
    }

    const Card&  c     = *ptr;
    const Date   today = app.today();

    // ── Title + stage ──────────────────────────────────────────────────────
    ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(240, 240, 255, 255));
    ImGui::TextUnformatted(c.title.c_str());
    ImGui::PopStyleColor();
    ImGui::SameLine();
    ImGui::TextDisabled("[%s]", stageLabel(c.currentStage));

    ImGui::Separator();

    // ── Schedule ───────────────────────────────────────────────────────────
    ImGui::TextDisabled("Start date : %s", c.startDate.toHuman().c_str());

    if (!c.archived) {
        const Date due = Scheduler::dueDate(c);
        ImGui::TextDisabled("Due date   : %s", due.toHuman().c_str());

        if (Scheduler::isOverdue(c, today)) {
            const int days = Scheduler::overdueDays(c, today);
            ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(255, 120, 120, 255));
            ImGui::Text("Overdue by %d day%s!", days, days == 1 ? "" : "s");
            ImGui::PopStyleColor();
        } else if (Scheduler::isDueToday(c, today)) {
            ImGui::PushStyleColor(ImGuiCol_Text, IM_COL32(120, 255, 120, 255));
            ImGui::TextUnformatted("Due today!");
            ImGui::PopStyleColor();
        } else {
            const int in = today.daysUntil(due);
            ImGui::TextDisabled("Due in %d day%s.", in, in == 1 ? "" : "s");
        }
    } else {
        if (c.lastCompletedAt.isValid())
            ImGui::TextDisabled("Completed : %s", c.lastCompletedAt.toHuman().c_str());
        ImGui::TextDisabled("(Archived — full 30-day cycle completed.)");
    }

    // ── Links ──────────────────────────────────────────────────────────────
    ImGui::Spacing();
    if (!c.contentLink.empty())
        ImGui::TextDisabled("Content : %s", c.contentLink.c_str());
    if (!c.reviewLink.empty())
        ImGui::TextDisabled("Review  : %s", c.reviewLink.c_str());
    if (c.contentLink.empty() && c.reviewLink.empty())
        ImGui::TextDisabled("No links attached.");

    // ── Actions ────────────────────────────────────────────────────────────
    ImGui::Spacing();
    ImGui::Separator();
    ImGui::Spacing();

    if (!c.archived && Scheduler::isDueToday(c, today)) {
        if (ImGui::Button("Complete", ImVec2(110, 0))) {
            app.closeModal(); ImGui::CloseCurrentPopup(); app.completeCard(c);
        }
        ImGui::SameLine();
    }
    if (ImGui::Button("Edit", ImVec2(80, 0))) {
        app.closeModal(); ImGui::CloseCurrentPopup(); app.openEditCard(c);
    }
    ImGui::SameLine();
    if (ImGui::Button("View Log", ImVec2(80, 0))) {
        app.closeModal(); ImGui::CloseCurrentPopup(); app.openViewLog(c);
    }
    ImGui::SameLine();
    if (ImGui::Button("Close", ImVec2(80, 0)) || ImGui::IsKeyPressed(ImGuiKey_Escape) ||
        ImGui::IsKeyPressed(ImGuiKey_Enter)) {
        app.closeModal(); ImGui::CloseCurrentPopup();
    }

    ImGui::EndPopup();
}

// ===========================================================================
// Overdue modal
// ===========================================================================

void drawOverdueModal(App& app) {
    ImGui::OpenPopup("Overdue card");

    const ImVec2 center = ImGui::GetMainViewport()->GetCenter();
    ImGui::SetNextWindowPos(center, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
    ImGui::SetNextWindowSize(ImVec2(520, 0), ImGuiCond_Appearing);

    if (!ImGui::BeginPopupModal("Overdue card", nullptr, ImGuiWindowFlags_AlwaysAutoResize))
        return;

    ImGui::TextWrapped("\"%s\" is overdue by %d day%s (stage: %s).",
                       app.overdue.title.c_str(),
                       app.overdue.overdueDays,
                       app.overdue.overdueDays == 1 ? "" : "s",
                       stageLabel(app.overdue.currentStage));
    ImGui::Spacing();
    ImGui::TextWrapped("How would you like to resolve it?");
    ImGui::Spacing();

    const Card* c   = app.findActive(app.overdue.cardId);
    bool        acted = false;

    if (ImGui::Button("Mark as completed", ImVec2(-1, 0)) ||
        ImGui::IsKeyPressed(ImGuiKey_Enter)) {
        if (c) { app.applyMarkCompleted(*c); acted = true; }
    }
    ImGui::TextDisabled("  Advance to the next stage, anchored to the original start date.");

    ImGui::Spacing();
    if (ImGui::Button("Restart the study", ImVec2(-1, 0))) {
        if (c) { app.applyRestart(*c); acted = true; }
    }
    ImGui::TextDisabled("  Keep the current stage and re-schedule it for today.");

    ImGui::Spacing();
    if (ImGui::Button("Erase the study", ImVec2(-1, 0))) {
        if (c) { app.applyErase(*c); acted = true; }
    }
    ImGui::TextDisabled("  Reset to Day 0 with today as the new start date.");

    ImGui::Spacing();
    ImGui::Separator();
    if (ImGui::Button("Cancel", ImVec2(-1, 0)) || ImGui::IsKeyPressed(ImGuiKey_Escape)) {
        app.closeModal();
        ImGui::CloseCurrentPopup();
    } else if (acted) {
        ImGui::CloseCurrentPopup();
    }

    ImGui::EndPopup();
}

// ===========================================================================
// View Log modal
// ===========================================================================

void drawViewLogModal(App& app) {
    ImGui::OpenPopup("Event log");

    const ImVec2 center = ImGui::GetMainViewport()->GetCenter();
    ImGui::SetNextWindowPos(center, ImGuiCond_Appearing, ImVec2(0.5f, 0.5f));
    ImGui::SetNextWindowSize(ImVec2(560, 420), ImGuiCond_Appearing);

    if (!ImGui::BeginPopupModal("Event log", nullptr)) return;

    ImGui::Text("%s", app.viewLog.title.c_str());
    ImGui::Separator();

    if (app.viewLog.events.empty()) {
        ImGui::TextDisabled("No events recorded.");
    } else {
        for (const HistoryEvent& e : app.viewLog.events) {
            ImGui::Text("%-12s  %-10s  %s -> %s",
                        e.when.toHuman().c_str(),
                        e.type.c_str(),
                        stageLabel(e.fromStage),
                        stageLabel(e.toStage));
        }
    }

    ImGui::Separator();
    if (ImGui::Button("Close", ImVec2(-1, 0)) || ImGui::IsKeyPressed(ImGuiKey_Escape) ||
        ImGui::IsKeyPressed(ImGuiKey_Enter)) {
        app.closeModal();
        ImGui::CloseCurrentPopup();
    }

    ImGui::EndPopup();
}

}  // namespace srs::ui::CardEditor
