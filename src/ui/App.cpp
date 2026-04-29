#include "App.h"

#include <imgui.h>

#include <algorithm>
#include <cstring>
#include <utility>

#include "../Scheduler.h"

namespace srs::ui {

App::App(std::string dbPath) : db_(std::move(dbPath)), today_(Date::today()) {
    db_.migrate();
    reloadActive();
    reloadArchived();
}

App::~App() = default;

void App::reloadActive() {
    active_ = db_.loadActive();
    std::sort(active_.begin(), active_.end(), [](const Card& a, const Card& b) {
        const Date da = Scheduler::dueDate(a);
        const Date db = Scheduler::dueDate(b);
        if (da != db) return da < db;
        return a.id < b.id;
    });
}

void App::reloadArchived() {
    archived_ = db_.loadArchived();
}

void App::refreshToday() {
    today_ = Date::today();
}

void App::onWindowFocusChanged() {
    refreshToday();
}

void App::requestOpenNewCard() {
    modal               = Modal::NewCard;
    newCardForm         = NewCardForm{};
    wantFocusFirstField = true;
}

void App::requestToggleHistory() {
    view = (view == MainView::Agenda) ? MainView::History : MainView::Agenda;
}

void App::requestOpenHelp() {
    modal = Modal::Help;
}

void App::closeModal() {
    modal               = Modal::None;
    wantFocusFirstField = false;
}

void App::completeCard(const Card& c) {
    if (Scheduler::isOverdue(c, today_)) {
        openOverdueModal(c);
    } else {
        applyMarkCompleted(c);
    }
}

void App::openOverdueModal(const Card& c) {
    overdue.cardId       = c.id;
    overdue.title        = c.title;
    overdue.overdueDays  = Scheduler::overdueDays(c, today_);
    overdue.currentStage = c.currentStage;
    modal                = Modal::Overdue;
}

void App::openViewLog(const Card& c) {
    viewLog.cardId = c.id;
    viewLog.title  = c.title;
    viewLog.events = db_.loadHistoryFor(c.id);
    modal          = Modal::ViewLog;
}

void App::applyMarkCompleted(Card c) {
    const Stage from = c.currentStage;
    Card updated     = Scheduler::markCompleted(std::move(c), today_);
    db_.updateCard(updated);
    db_.recordEvent(updated.id, "completed", from, updated.currentStage, today_);
    if (updated.archived) {
        db_.recordEvent(updated.id, "archived", from, updated.currentStage, today_);
    }
    reloadActive();
    reloadArchived();
    closeModal();
}

void App::applyRestart(Card c) {
    const Stage stage = c.currentStage;
    Card updated      = Scheduler::restartStudy(std::move(c), today_);
    db_.updateCard(updated);
    db_.recordEvent(updated.id, "restart", stage, stage, today_);
    reloadActive();
    closeModal();
}

void App::applyErase(Card c) {
    const Stage from = c.currentStage;
    Card updated     = Scheduler::eraseStudy(std::move(c), today_);
    db_.updateCard(updated);
    db_.recordEvent(updated.id, "erase", from, Stage::Day0, today_);
    reloadActive();
    closeModal();
}

void App::applyRevive(Card c) {
    const Stage from = c.currentStage;
    Card updated     = Scheduler::reviveFromHistory(std::move(c), today_);
    db_.updateCard(updated);
    db_.recordEvent(updated.id, "revived", from, Stage::Day0, today_);
    reloadActive();
    reloadArchived();
    closeModal();
}

void App::submitNewCard() {
    Card c;
    c.title        = newCardForm.title;
    c.contentLink  = newCardForm.contentLink;
    c.reviewLink   = newCardForm.reviewLink;
    c.currentStage = Stage::Day0;  // stage label matches the day-offset; for tomorrow we just shift startDate
    c.startDate    = (newCardForm.stageChoice == 0) ? today_ : today_.addDays(1);
    c.createdAt    = today_;
    c.archived     = false;

    if (c.title.empty()) {
        newCardForm.showError = true;
        return;
    }

    c.id = db_.insertCard(c);
    db_.recordEvent(c.id, "created", Stage::Day0, Stage::Day0, today_);
    reloadActive();
    closeModal();
}

void App::renderFrame() {
    refreshToday();

    const ImGuiViewport* vp = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(vp->WorkPos);
    ImGui::SetNextWindowSize(vp->WorkSize);

    constexpr ImGuiWindowFlags kRootFlags =
        ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
        ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoBringToFrontOnFocus |
        ImGuiWindowFlags_NoSavedSettings;

    ImGui::Begin("##srs_root", nullptr, kRootFlags);

    // Toolbar
    if (ImGui::Button("+ New Card")) requestOpenNewCard();
    ImGui::SameLine();
    if (ImGui::Button(view == MainView::Agenda ? "History" : "Agenda")) requestToggleHistory();
    ImGui::SameLine();
    if (ImGui::Button("?")) requestOpenHelp();
    ImGui::SameLine();
    ImGui::TextDisabled("Today: %s", today_.toHuman().c_str());

    ImGui::Separator();

    if (view == MainView::Agenda) AgendaView::draw(*this);
    else                          HistoryView::draw(*this);

    ImGui::End();

    // Modals (rendered on top)
    switch (modal) {
        case Modal::NewCard: CardEditor::drawNewCardModal(*this); break;
        case Modal::Overdue: CardEditor::drawOverdueModal(*this); break;
        case Modal::ViewLog: CardEditor::drawViewLogModal(*this); break;
        case Modal::Help:    HelpView::draw(*this);               break;
        case Modal::None:                                         break;
    }
}

}  // namespace srs::ui
