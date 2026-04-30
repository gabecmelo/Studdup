#include <catch2/catch_test_macros.hpp>

#include "Card.h"
#include "Scheduler.h"

using namespace srs;

static Card makeCard(Date startDate, Stage stage = Stage::Day0, bool archived = false) {
    Card c;
    c.startDate    = startDate;
    c.currentStage = stage;
    c.archived     = archived;
    c.createdAt    = startDate;
    return c;
}

const Date kStart{2026, 4, 29};
const Date kToday{2026, 4, 29};

TEST_CASE("Scheduler::dueDate matches startDate + stage offset") {
    CHECK(Scheduler::dueDate(makeCard(kStart, Stage::Day0))  == (Date{2026, 4, 29}));
    CHECK(Scheduler::dueDate(makeCard(kStart, Stage::Day1))  == (Date{2026, 4, 30}));
    CHECK(Scheduler::dueDate(makeCard(kStart, Stage::Day2))  == (Date{2026, 5,  1}));
    CHECK(Scheduler::dueDate(makeCard(kStart, Stage::Day5))  == (Date{2026, 5,  4}));
    CHECK(Scheduler::dueDate(makeCard(kStart, Stage::Day15)) == (Date{2026, 5, 14}));
    CHECK(Scheduler::dueDate(makeCard(kStart, Stage::Day30)) == (Date{2026, 5, 29}));
}

TEST_CASE("Scheduler::isDueToday") {
    CHECK(Scheduler::isDueToday(makeCard(kStart, Stage::Day0), kToday));
    CHECK_FALSE(Scheduler::isDueToday(makeCard(kStart, Stage::Day1), kToday));
    // overdue is also "due today"
    const Date yesterday = kToday.addDays(-1);
    CHECK(Scheduler::isDueToday(makeCard(yesterday, Stage::Day0), kToday));
}

TEST_CASE("Scheduler::isDueTomorrow") {
    CHECK(Scheduler::isDueTomorrow(makeCard(kStart, Stage::Day1), kToday));
    CHECK_FALSE(Scheduler::isDueTomorrow(makeCard(kStart, Stage::Day0), kToday));
    CHECK_FALSE(Scheduler::isDueTomorrow(makeCard(kStart, Stage::Day2), kToday));
}

TEST_CASE("Scheduler::isOverdue") {
    CHECK_FALSE(Scheduler::isOverdue(makeCard(kStart, Stage::Day0), kToday)); // due today, not overdue
    const Date yesterday{2026, 4, 28};
    CHECK(Scheduler::isOverdue(makeCard(yesterday, Stage::Day0), kToday));
    CHECK_FALSE(Scheduler::isOverdue(makeCard(kStart, Stage::Day0), kToday.addDays(-1))); // future
}

TEST_CASE("Scheduler::overdueDays") {
    CHECK(Scheduler::overdueDays(makeCard(kStart, Stage::Day0), kToday) == 0); // due today
    const Date threeDaysAgo = kToday.addDays(-3);
    CHECK(Scheduler::overdueDays(makeCard(threeDaysAgo, Stage::Day0), kToday) == 3);
}

TEST_CASE("Scheduler::markCompleted advances each stage") {
    const Date start{2026, 4, 29};
    struct Step { Stage from; Stage to; Date expectedDue; };
    const Step steps[] = {
        {Stage::Day0,  Stage::Day1,  {2026, 4, 30}},
        {Stage::Day1,  Stage::Day2,  {2026, 5,  1}},
        {Stage::Day2,  Stage::Day5,  {2026, 5,  4}},
        {Stage::Day5,  Stage::Day15, {2026, 5, 14}},
        {Stage::Day15, Stage::Day30, {2026, 5, 29}},
    };
    for (const auto& s : steps) {
        Card c        = makeCard(start, s.from);
        Card updated  = Scheduler::markCompleted(c, kToday);
        CHECK(updated.currentStage == s.to);
        CHECK(Scheduler::dueDate(updated) == s.expectedDue);
        CHECK(updated.lastCompletedAt == kToday);
        CHECK_FALSE(updated.archived);
    }
}

TEST_CASE("Scheduler::markCompleted archives on Day30 completion") {
    Card c = makeCard(kStart, Stage::Day30);
    Card updated = Scheduler::markCompleted(c, kToday);
    CHECK(updated.currentStage == Stage::Done);
    CHECK(updated.archived == true);
    CHECK(updated.lastCompletedAt == kToday);
}

TEST_CASE("Scheduler::markCompleted startDate is unchanged (anchor invariant)") {
    Card c = makeCard(kStart, Stage::Day2);
    Card updated = Scheduler::markCompleted(c, kToday);
    CHECK(updated.startDate == kStart);
}

TEST_CASE("Scheduler::restartStudy forces dueDate == today") {
    const Date threeDaysAgo = kToday.addDays(-3);
    Card c = makeCard(threeDaysAgo, Stage::Day1);
    Card updated = Scheduler::restartStudy(c, kToday);
    CHECK(updated.currentStage == Stage::Day1);
    CHECK(Scheduler::dueDate(updated) == kToday);
}

TEST_CASE("Scheduler::restartStudy keeps same stage") {
    Card c = makeCard(kStart, Stage::Day5);
    Card updated = Scheduler::restartStudy(c, kToday);
    CHECK(updated.currentStage == Stage::Day5);
}

TEST_CASE("Scheduler::eraseStudy resets to Day0 with today as startDate") {
    const Date oldStart{2026, 3, 1};
    Card c = makeCard(oldStart, Stage::Day15);
    Card updated = Scheduler::eraseStudy(c, kToday);
    CHECK(updated.currentStage == Stage::Day0);
    CHECK(updated.startDate == kToday);
    CHECK(updated.archived == false);
    CHECK(Scheduler::dueDate(updated) == kToday);
}

TEST_CASE("Scheduler::reviveFromHistory resets archived card to Day0") {
    Card c = makeCard(kStart, Stage::Done, /*archived=*/true);
    c.lastCompletedAt = kStart;
    Card updated = Scheduler::reviveFromHistory(c, kToday);
    CHECK(updated.currentStage == Stage::Day0);
    CHECK(updated.startDate == kToday);
    CHECK(updated.archived == false);
    CHECK_FALSE(updated.lastCompletedAt.isValid());
    CHECK(Scheduler::dueDate(updated) == kToday);
}

TEST_CASE("nextStage full ladder") {
    CHECK(nextStage(Stage::Day0)  == Stage::Day1);
    CHECK(nextStage(Stage::Day1)  == Stage::Day2);
    CHECK(nextStage(Stage::Day2)  == Stage::Day5);
    CHECK(nextStage(Stage::Day5)  == Stage::Day15);
    CHECK(nextStage(Stage::Day15) == Stage::Day30);
    CHECK(nextStage(Stage::Day30) == Stage::Done);
    CHECK(nextStage(Stage::Done)  == Stage::Done);
}
