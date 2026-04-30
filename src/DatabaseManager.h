#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "Card.h"

struct sqlite3;

namespace srs {

class DatabaseManager {
public:
    explicit DatabaseManager(std::string path);
    ~DatabaseManager();

    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    void migrate();

    int64_t insertCard(const Card& c);
    void updateCard(const Card& c);
    void deleteCard(int64_t id);

    std::vector<Card> loadActive();
    std::vector<Card> loadArchived();

    void recordEvent(int64_t cardId, const std::string& type, Stage fromStage, Stage toStage,
                     Date when);

    std::vector<HistoryEvent> loadHistoryFor(int64_t cardId);

private:
    void exec(const char* sql);

    std::string path_;
    sqlite3* db_ = nullptr;
};

}  // namespace srs
