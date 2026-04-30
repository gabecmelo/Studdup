#pragma once

#include <cstdint>
#include <string>

#include "Date.h"

namespace srs {

enum class Stage : int {
    Day0 = 0,
    Day1 = 1,
    Day2 = 2,
    Day5 = 5,
    Day15 = 15,
    Day30 = 30,
    Done = -1,
};

inline Stage nextStage(Stage s) {
    switch (s) {
        case Stage::Day0:
            return Stage::Day1;
        case Stage::Day1:
            return Stage::Day2;
        case Stage::Day2:
            return Stage::Day5;
        case Stage::Day5:
            return Stage::Day15;
        case Stage::Day15:
            return Stage::Day30;
        case Stage::Day30:
            return Stage::Done;
        case Stage::Done:
            return Stage::Done;
    }
    return Stage::Done;
}

inline const char* stageLabel(Stage s) {
    switch (s) {
        case Stage::Day0:
            return "Day 0";
        case Stage::Day1:
            return "Day 1";
        case Stage::Day2:
            return "Day 2";
        case Stage::Day5:
            return "Day 5";
        case Stage::Day15:
            return "Day 15";
        case Stage::Day30:
            return "Day 30";
        case Stage::Done:
            return "Done";
    }
    return "?";
}

struct Card {
    int64_t id = 0;
    std::string title;
    std::string contentLink;
    std::string reviewLink;
    Date startDate;
    Stage currentStage = Stage::Day0;
    Date createdAt;
    Date lastCompletedAt;  // invalid until first completion
    bool archived = false;
};

struct HistoryEvent {
    int64_t id = 0;
    int64_t cardId = 0;
    std::string type;  // 'created' | 'completed' | 'restart' | 'erase' | 'archived' | 'revived'
    Stage fromStage = Stage::Done;
    Stage toStage = Stage::Done;
    Date when;
};

}  // namespace srs
