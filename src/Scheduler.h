#pragma once

#include "Card.h"
#include "Date.h"

namespace srs::Scheduler {

Date dueDate(const Card& c);

bool isDueToday   (const Card& c, Date today);
bool isDueTomorrow(const Card& c, Date today);
bool isOverdue    (const Card& c, Date today);
int  overdueDays  (const Card& c, Date today);  // 0 if not overdue

// Stage transitions. All pure: take Card by value, return updated Card.

// Advance to the next stage. Anchored to startDate (next due = startDate + nextStage).
// If the card is leaving Stage::Day30, it transitions to Stage::Done and `archived = true`.
// Precondition: !c.archived && c.currentStage != Stage::Done.
Card markCompleted(Card c, Date today);

// User chose "Restart the study" on an overdue card: keep stage, force due == today.
// Implemented by re-anchoring startDate so that startDate + currentStage == today.
Card restartStudy(Card c, Date today);

// User chose "Erase the study": discard progress, treat as a fresh study.
// startDate = today, stage = Day0, archived = false.
Card eraseStudy(Card c, Date today);

// History → Agenda: bring an archived card back as a fresh Day 0 study.
Card reviveFromHistory(Card c, Date today);

}  // namespace srs::Scheduler
