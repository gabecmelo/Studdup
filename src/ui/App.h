#pragma once

#include <memory>
#include <string>
#include <vector>

#include "../Card.h"
#include "../Date.h"
#include "../DatabaseManager.h"

namespace srs::ui {

enum class MainView { Agenda, History };

enum class Modal { None, NewCard, Overdue, Help, ViewLog };

struct NewCardForm {
    char  title[256]       = {0};
    char  contentLink[512] = {0};
    char  reviewLink[512]  = {0};
    int   stageChoice      = 0;  // 0 = Day 0 (today), 1 = Day 1 (tomorrow)
    bool  showError        = false;
};

struct OverdueState {
    int64_t cardId        = 0;
    std::string title;
    int     overdueDays   = 0;
    Stage   currentStage  = Stage::Day0;
};

struct ViewLogState {
    int64_t cardId = 0;
    std::string title;
    std::vector<HistoryEvent> events;
};

class App {
public:
    explicit App(std::string dbPath);
    ~App();

    void renderFrame();

    // Hotkey-triggered requests (called from main.cpp key callbacks).
    void requestOpenNewCard();
    void requestToggleHistory();
    void requestOpenHelp();

    // Called on window focus change so we re-evaluate the local date when
    // the user returns to the app after midnight.
    void onWindowFocusChanged();

    // ---- helpers used by the View files ----
    Date today() const                              { return today_; }
    const std::vector<Card>& active()   const       { return active_; }
    const std::vector<Card>& archived() const       { return archived_; }

    void completeCard(const Card& c);     // opens overdue modal if overdue
    void applyMarkCompleted(Card c);
    void applyRestart(Card c);
    void applyErase(Card c);
    void applyRevive(Card c);

    void openOverdueModal(const Card& c);
    void openViewLog(const Card& c);
    void closeModal();
    void submitNewCard();   // called by CardEditor on Enter / Create

    MainView          view        = MainView::Agenda;
    Modal             modal       = Modal::None;
    bool              wantFocusFirstField = false;
    NewCardForm       newCardForm;
    OverdueState      overdue;
    ViewLogState      viewLog;

private:
    void reloadActive();
    void reloadArchived();
    void refreshToday();

    DatabaseManager   db_;
    std::vector<Card> active_;
    std::vector<Card> archived_;
    Date              today_;
};

}  // namespace srs::ui

namespace srs::ui::AgendaView { void draw(App& app); }
namespace srs::ui::HistoryView { void draw(App& app); }
namespace srs::ui::HelpView    { void draw(App& app); }
namespace srs::ui::CardEditor {
    void drawNewCardModal(App& app);
    void drawOverdueModal (App& app);
    void drawViewLogModal (App& app);
}
