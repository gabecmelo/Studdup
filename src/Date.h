#pragma once

#include <string>
#include <string_view>

namespace srs {

struct Date {
    int year  = 0;
    int month = 0;  // 1..12
    int day   = 0;  // 1..31

    bool isValid() const;

    static Date today();
    static Date fromIso(std::string_view iso);  // "YYYY-MM-DD"; returns {} (invalid) on parse error

    Date addDays(int n) const;
    int  daysUntil(Date other) const;  // other - *this

    std::string toIso() const;
    std::string toHuman() const;       // "May 02, 2026"

    friend bool operator==(Date, Date);
    friend bool operator!=(Date, Date);
    friend bool operator<(Date,  Date);
    friend bool operator<=(Date, Date);
    friend bool operator>(Date,  Date);
    friend bool operator>=(Date, Date);
};

}  // namespace srs
