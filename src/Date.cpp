#include "Date.h"

#include <array>
#include <cstdio>
#include <ctime>

namespace srs {

namespace {

bool isLeap(int y) {
    return (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
}

int daysInMonth(int year, int month) {
    static constexpr std::array<int, 12> kDays = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (month == 2 && isLeap(year))
        return 29;
    return kDays[static_cast<size_t>(month - 1)];
}

// Convert Y/M/D to a serial day count (proleptic Gregorian, days since 0000-03-01).
// Source: Howard Hinnant's date algorithms.
long long toSerial(int y, int m, int d) {
    y -= (m <= 2);
    const int era = (y >= 0 ? y : y - 399) / 400;
    const unsigned yoe = static_cast<unsigned>(y - era * 400);
    const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return static_cast<long long>(era) * 146097 + static_cast<long long>(doe);
}

void fromSerial(long long serial, int& y, int& m, int& d) {
    const long long era = (serial >= 0 ? serial : serial - 146096) / 146097;
    const unsigned doe = static_cast<unsigned>(serial - era * 146097);
    const unsigned yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    const int year = static_cast<int>(yoe) + static_cast<int>(era) * 400;
    const unsigned doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    const unsigned mp = (5 * doy + 2) / 153;
    const unsigned day = doy - (153 * mp + 2) / 5 + 1;
    const unsigned mon = mp + (mp < 10 ? 3 : -9);
    y = year + (mon <= 2);
    m = static_cast<int>(mon);
    d = static_cast<int>(day);
}

}  // namespace

bool Date::isValid() const {
    if (year == 0 && month == 0 && day == 0)
        return false;
    if (month < 1 || month > 12)
        return false;
    if (day < 1)
        return false;
    return day <= daysInMonth(year, month);
}

Date Date::today() {
    const std::time_t t = std::time(nullptr);
    std::tm lt{};
#ifdef _WIN32
    localtime_s(&lt, &t);
#else
    localtime_r(&t, &lt);
#endif
    return Date{lt.tm_year + 1900, lt.tm_mon + 1, lt.tm_mday};
}

Date Date::fromIso(std::string_view iso) {
    if (iso.size() != 10 || iso[4] != '-' || iso[7] != '-')
        return Date{};
    int y = 0, m = 0, d = 0;
    auto digit = [&](char c, int& out) {
        if (c < '0' || c > '9')
            return false;
        out = out * 10 + (c - '0');
        return true;
    };
    for (size_t i = 0; i < 4; ++i)
        if (!digit(iso[i], y))
            return Date{};
    for (size_t i = 5; i < 7; ++i)
        if (!digit(iso[i], m))
            return Date{};
    for (size_t i = 8; i < 10; ++i)
        if (!digit(iso[i], d))
            return Date{};
    Date out{y, m, d};
    return out.isValid() ? out : Date{};
}

Date Date::addDays(int n) const {
    int y, m, d;
    fromSerial(toSerial(year, month, day) + n, y, m, d);
    return Date{y, m, d};
}

int Date::daysUntil(Date other) const {
    return static_cast<int>(toSerial(other.year, other.month, other.day) -
                            toSerial(year, month, day));
}

std::string Date::toIso() const {
    char buf[16];
    std::snprintf(buf, sizeof(buf), "%04d-%02d-%02d", year, month, day);
    return std::string(buf);
}

std::string Date::toHuman() const {
    static constexpr const char* kMonths[] = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
    if (month < 1 || month > 12)
        return toIso();
    char buf[24];
    std::snprintf(buf, sizeof(buf), "%s %02d, %04d", kMonths[month - 1], day, year);
    return std::string(buf);
}

bool operator==(Date a, Date b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
}
bool operator!=(Date a, Date b) {
    return !(a == b);
}
bool operator<(Date a, Date b) {
    if (a.year != b.year)
        return a.year < b.year;
    if (a.month != b.month)
        return a.month < b.month;
    return a.day < b.day;
}
bool operator<=(Date a, Date b) {
    return a < b || a == b;
}
bool operator>(Date a, Date b) {
    return b < a;
}
bool operator>=(Date a, Date b) {
    return !(a < b);
}

}  // namespace srs
