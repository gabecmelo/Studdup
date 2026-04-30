#include "DatabaseManager.h"

#include <sqlite3.h>

#include <stdexcept>
#include <utility>

namespace srs {

namespace {

void bindText(sqlite3_stmt* st, int idx, const std::string& s) {
    sqlite3_bind_text(st, idx, s.c_str(), static_cast<int>(s.size()), SQLITE_TRANSIENT);
}

void bindDate(sqlite3_stmt* st, int idx, Date d) {
    if (d.isValid()) {
        const std::string iso = d.toIso();
        sqlite3_bind_text(st, idx, iso.c_str(), static_cast<int>(iso.size()), SQLITE_TRANSIENT);
    } else {
        sqlite3_bind_null(st, idx);
    }
}

Date readDate(sqlite3_stmt* st, int col) {
    if (sqlite3_column_type(st, col) == SQLITE_NULL)
        return Date{};
    const unsigned char* txt = sqlite3_column_text(st, col);
    if (!txt)
        return Date{};
    return Date::fromIso(reinterpret_cast<const char*>(txt));
}

std::string readText(sqlite3_stmt* st, int col) {
    if (sqlite3_column_type(st, col) == SQLITE_NULL)
        return {};
    const unsigned char* txt = sqlite3_column_text(st, col);
    const int len = sqlite3_column_bytes(st, col);
    return txt ? std::string(reinterpret_cast<const char*>(txt), static_cast<size_t>(len))
               : std::string{};
}

}  // namespace

DatabaseManager::DatabaseManager(std::string path) : path_(std::move(path)) {
    if (sqlite3_open(path_.c_str(), &db_) != SQLITE_OK) {
        std::string err = "sqlite3_open failed: ";
        err += sqlite3_errmsg(db_);
        sqlite3_close(db_);
        db_ = nullptr;
        throw std::runtime_error(err);
    }
    exec("PRAGMA foreign_keys = ON");
    exec("PRAGMA journal_mode = WAL");
}

DatabaseManager::~DatabaseManager() {
    if (db_)
        sqlite3_close(db_);
}

void DatabaseManager::exec(const char* sql) {
    char* err = nullptr;
    if (sqlite3_exec(db_, sql, nullptr, nullptr, &err) != SQLITE_OK) {
        std::string msg = "sqlite exec failed: ";
        if (err) {
            msg += err;
            sqlite3_free(err);
        }
        throw std::runtime_error(msg);
    }
}

void DatabaseManager::migrate() {
    exec(
        "CREATE TABLE IF NOT EXISTS cards ("
        "  id                INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  title             TEXT NOT NULL,"
        "  content_link      TEXT NOT NULL DEFAULT '',"
        "  review_link       TEXT NOT NULL DEFAULT '',"
        "  start_date        TEXT NOT NULL,"
        "  stage             INTEGER NOT NULL,"
        "  archived          INTEGER NOT NULL DEFAULT 0,"
        "  created_at        TEXT NOT NULL,"
        "  last_completed_at TEXT"
        ")");
    exec(
        "CREATE TABLE IF NOT EXISTS history ("
        "  id          INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,"
        "  event_type  TEXT NOT NULL,"
        "  from_stage  INTEGER,"
        "  to_stage    INTEGER,"
        "  when_date   TEXT NOT NULL"
        ")");
    exec("CREATE INDEX IF NOT EXISTS idx_cards_archived ON cards(archived)");
    exec("CREATE INDEX IF NOT EXISTS idx_history_card   ON history(card_id)");
}

int64_t DatabaseManager::insertCard(const Card& c) {
    const char* sql =
        "INSERT INTO cards (title, content_link, review_link, start_date, stage, archived, "
        "created_at, last_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    sqlite3_stmt* st = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &st, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("prepare insertCard: ") + sqlite3_errmsg(db_));
    }
    bindText(st, 1, c.title);
    bindText(st, 2, c.contentLink);
    bindText(st, 3, c.reviewLink);
    bindDate(st, 4, c.startDate);
    sqlite3_bind_int(st, 5, static_cast<int>(c.currentStage));
    sqlite3_bind_int(st, 6, c.archived ? 1 : 0);
    bindDate(st, 7, c.createdAt);
    bindDate(st, 8, c.lastCompletedAt);
    if (sqlite3_step(st) != SQLITE_DONE) {
        const std::string err = sqlite3_errmsg(db_);
        sqlite3_finalize(st);
        throw std::runtime_error("insertCard: " + err);
    }
    sqlite3_finalize(st);
    return sqlite3_last_insert_rowid(db_);
}

void DatabaseManager::updateCard(const Card& c) {
    const char* sql =
        "UPDATE cards SET title=?, content_link=?, review_link=?, start_date=?, stage=?, "
        "archived=?, created_at=?, last_completed_at=? WHERE id=?";
    sqlite3_stmt* st = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &st, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("prepare updateCard: ") + sqlite3_errmsg(db_));
    }
    bindText(st, 1, c.title);
    bindText(st, 2, c.contentLink);
    bindText(st, 3, c.reviewLink);
    bindDate(st, 4, c.startDate);
    sqlite3_bind_int(st, 5, static_cast<int>(c.currentStage));
    sqlite3_bind_int(st, 6, c.archived ? 1 : 0);
    bindDate(st, 7, c.createdAt);
    bindDate(st, 8, c.lastCompletedAt);
    sqlite3_bind_int64(st, 9, c.id);
    if (sqlite3_step(st) != SQLITE_DONE) {
        const std::string err = sqlite3_errmsg(db_);
        sqlite3_finalize(st);
        throw std::runtime_error("updateCard: " + err);
    }
    sqlite3_finalize(st);
}

void DatabaseManager::deleteCard(int64_t id) {
    sqlite3_stmt* st = nullptr;
    sqlite3_prepare_v2(db_, "DELETE FROM cards WHERE id=?", -1, &st, nullptr);
    sqlite3_bind_int64(st, 1, id);
    sqlite3_step(st);
    sqlite3_finalize(st);
}

static std::vector<Card> loadWhere(sqlite3* db, const char* where, const char* order) {
    std::string sql =
        "SELECT id, title, content_link, review_link, start_date, stage, archived, "
        "created_at, last_completed_at FROM cards WHERE ";
    sql += where;
    sql += " ORDER BY ";
    sql += order;

    sqlite3_stmt* st = nullptr;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &st, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("prepare load: ") + sqlite3_errmsg(db));
    }

    std::vector<Card> out;
    while (sqlite3_step(st) == SQLITE_ROW) {
        Card c;
        c.id = sqlite3_column_int64(st, 0);
        c.title = readText(st, 1);
        c.contentLink = readText(st, 2);
        c.reviewLink = readText(st, 3);
        c.startDate = readDate(st, 4);
        c.currentStage = static_cast<Stage>(sqlite3_column_int(st, 5));
        c.archived = sqlite3_column_int(st, 6) != 0;
        c.createdAt = readDate(st, 7);
        c.lastCompletedAt = readDate(st, 8);
        out.push_back(std::move(c));
    }
    sqlite3_finalize(st);
    return out;
}

std::vector<Card> DatabaseManager::loadActive() {
    return loadWhere(db_, "archived = 0", "start_date ASC, stage ASC");
}

std::vector<Card> DatabaseManager::loadArchived() {
    return loadWhere(db_, "archived = 1", "last_completed_at DESC, id DESC");
}

void DatabaseManager::recordEvent(int64_t cardId, const std::string& type, Stage fromStage,
                                  Stage toStage, Date when) {
    const char* sql =
        "INSERT INTO history (card_id, event_type, from_stage, to_stage, when_date) "
        "VALUES (?, ?, ?, ?, ?)";
    sqlite3_stmt* st = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &st, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("prepare recordEvent: ") + sqlite3_errmsg(db_));
    }
    sqlite3_bind_int64(st, 1, cardId);
    bindText(st, 2, type);
    sqlite3_bind_int(st, 3, static_cast<int>(fromStage));
    sqlite3_bind_int(st, 4, static_cast<int>(toStage));
    bindDate(st, 5, when);
    if (sqlite3_step(st) != SQLITE_DONE) {
        const std::string err = sqlite3_errmsg(db_);
        sqlite3_finalize(st);
        throw std::runtime_error("recordEvent: " + err);
    }
    sqlite3_finalize(st);
}

std::vector<HistoryEvent> DatabaseManager::loadHistoryFor(int64_t cardId) {
    const char* sql =
        "SELECT id, card_id, event_type, from_stage, to_stage, when_date "
        "FROM history WHERE card_id = ? ORDER BY id ASC";
    sqlite3_stmt* st = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &st, nullptr) != SQLITE_OK) {
        throw std::runtime_error(std::string("prepare loadHistoryFor: ") + sqlite3_errmsg(db_));
    }
    sqlite3_bind_int64(st, 1, cardId);

    std::vector<HistoryEvent> out;
    while (sqlite3_step(st) == SQLITE_ROW) {
        HistoryEvent e;
        e.id = sqlite3_column_int64(st, 0);
        e.cardId = sqlite3_column_int64(st, 1);
        e.type = readText(st, 2);
        e.fromStage = static_cast<Stage>(sqlite3_column_int(st, 3));
        e.toStage = static_cast<Stage>(sqlite3_column_int(st, 4));
        e.when = readDate(st, 5);
        out.push_back(std::move(e));
    }
    sqlite3_finalize(st);
    return out;
}

}  // namespace srs
