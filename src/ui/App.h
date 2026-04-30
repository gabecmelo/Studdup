#pragma once

#include <memory>
#include <string>
#include <vector>

#include "../Card.h"
#include "../Date.h"
#include "../DatabaseManager.h"

namespace srs::ui {

enum class MainView { Agenda, History };

enum class Modal {
    None,
    NewCard,
    EditCard,   // edit title / content / review link
    Overdue,
    Help,
    ViewLog,
};

struct NewCardForm {
    char title[256]       = {0};
    char contentLink[512] = {0};
    char reviewLink[512]  = {0};
    int  stageChoice      = 0;
    bool showError        = false;
};

struct EditCardForm {
    int64_t id = 0;
    char    title[256]       = {0};
    char    contentLink[512] = {0};
    char    reviewLink[512]  = {0};
    bool    showError        = false;
};

struct OverdueState {
    int64_t     cardId       = 0;
    std::string title;
    int         overdueDays  = 0;
    Stage       currentStage = Stage::Day0;
};

struct ViewLogState {
    int64_t     cardId = 0;
    std::string title;
    std::vector<HistoryEvent> events;
};

class App {
public:
    explicit App(std::string dbPath);
    ~App();

    void renderFrame();

    void requestOpenNewCard();
    void requestToggleHistory();
    void requestOpenHelp();
    void onWindowFocusChanged();

    Date today() const                        { return today_; }
    const std::vector<Card>& active()   const { return active_; }
    const std::vector<Card>& archived() const { return archived_; }

    const Card* findActive  (int64_t id) const;
    const Card* findArchived(int64_t id) const;

    void completeCard      (const Card& c);
    void applyMarkCompleted(Card c);
    void applyRestart      (Card c);
    void applyErase        (Card c);
    void applyRevive       (Card c);

    void openOverdueModal(const Card& c);
    void openViewLog     (const Card& c);
    void closeModal();

    // Create
    void submitNewCard();

    // Edit (commit 1)
    void openEditCard (const Card& c);
    void applyEditCard();

    MainView    view                = MainView::Agenda;
    Modal       modal               = Modal::None;
    bool        wantFocusFirstField = false;

    NewCardForm  newCardForm;
    EditCardForm editCardForm;
    OverdueState overdue;
    ViewLogState viewLog;

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

namespace srs::ui::AgendaView  { void draw(App& app); }
namespace srs::ui::HistoryView { void draw(App& app); }
namespace srs::ui::HelpView    { void draw(App& app); }
namespace srs::ui::CardEditor {
    void drawNewCardModal (App& app);
    void drawEditCardModal(App& app);
    void drawOverdueModal (App& app);
    void drawViewLogModal (App& app);
}
