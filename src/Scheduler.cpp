#include "Scheduler.h"

#include <cassert>

namespace srs::Scheduler {

Date dueDate(const Card& c) {
    return c.startDate.addDays(static_cast<int>(c.currentStage));
}

bool isDueToday(const Card& c, Date today) {
    return !c.archived && dueDate(c) <= today;
}

bool isDueTomorrow(const Card& c, Date today) {
    return !c.archived && dueDate(c) == today.addDays(1);
}

bool isOverdue(const Card& c, Date today) {
    return !c.archived && dueDate(c) < today;
}

int overdueDays(const Card& c, Date today) {
    if (c.archived) return 0;
    const int d = dueDate(c).daysUntil(today);  // today - due
    return d > 0 ? d : 0;
}

Card markCompleted(Card c, Date today) {
    assert(!c.archived);
    assert(c.currentStage != Stage::Done);
    c.currentStage    = nextStage(c.currentStage);
    c.lastCompletedAt = today;
    if (c.currentStage == Stage::Done) {
        c.archived = true;
    }
    return c;
}

Card restartStudy(Card c, Date today) {
    // Force dueDate(c) == today by setting startDate = today - currentStage offset.
    c.startDate = today.addDays(-static_cast<int>(c.currentStage));
    return c;
}

Card eraseStudy(Card c, Date today) {
    c.startDate    = today;
    c.currentStage = Stage::Day0;
    c.archived     = false;
    return c;
}

Card reviveFromHistory(Card c, Date today) {
    c.startDate       = today;
    c.currentStage    = Stage::Day0;
    c.archived        = false;
    c.lastCompletedAt = Date{};
    return c;
}

}  // namespace srs::Scheduler
