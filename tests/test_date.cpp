#include <catch2/catch_test_macros.hpp>

#include "Date.h"

using srs::Date;

TEST_CASE("Date::isValid") {
    CHECK(Date{2026, 4, 29}.isValid());
    CHECK_FALSE(Date{}.isValid());
    CHECK_FALSE(Date{2026, 0, 1}.isValid());
    CHECK_FALSE(Date{2026, 13, 1}.isValid());
    CHECK_FALSE(Date{2026, 1, 0}.isValid());
    CHECK_FALSE(Date{2026, 1, 32}.isValid());
    CHECK(Date{2024, 2, 29}.isValid());        // leap year
    CHECK_FALSE(Date{2023, 2, 29}.isValid());  // not leap
}

TEST_CASE("Date::fromIso / toIso roundtrip") {
    const auto d = Date::fromIso("2026-04-29");
    REQUIRE(d.isValid());
    CHECK(d.year == 2026);
    CHECK(d.month == 4);
    CHECK(d.day == 29);
    CHECK(d.toIso() == "2026-04-29");
}

TEST_CASE("Date::fromIso rejects bad input") {
    CHECK_FALSE(Date::fromIso("not-a-date").isValid());
    CHECK_FALSE(Date::fromIso("2026/04/29").isValid());
    CHECK_FALSE(Date::fromIso("2026-13-01").isValid());
    CHECK_FALSE(Date::fromIso("").isValid());
}

TEST_CASE("Date::addDays identity") {
    const Date d{2026, 4, 29};
    CHECK(d.addDays(0) == d);
}

TEST_CASE("Date::addDays simple forward") {
    CHECK(Date{2026, 4, 29}.addDays(1) == (Date{2026, 4, 30}));
    CHECK(Date{2026, 4, 29}.addDays(2) == (Date{2026, 5, 1}));
}

TEST_CASE("Date::addDays month boundary") {
    CHECK(Date{2026, 1, 31}.addDays(1) == (Date{2026, 2, 1}));
    CHECK(Date{2026, 3, 31}.addDays(1) == (Date{2026, 4, 1}));
    CHECK(Date{2026, 12, 31}.addDays(1) == (Date{2027, 1, 1}));
}

TEST_CASE("Date::addDays leap year Feb") {
    CHECK(Date{2024, 2, 28}.addDays(1) == (Date{2024, 2, 29}));
    CHECK(Date{2024, 2, 29}.addDays(1) == (Date{2024, 3, 1}));
    CHECK(Date{2023, 2, 28}.addDays(1) == (Date{2023, 3, 1}));  // non-leap
}

TEST_CASE("Date::addDays negative (backward)") {
    CHECK(Date{2026, 5, 1}.addDays(-1) == (Date{2026, 4, 30}));
    CHECK(Date{2026, 3, 1}.addDays(-1) == (Date{2026, 2, 28}));
    CHECK(Date{2024, 3, 1}.addDays(-1) == (Date{2024, 2, 29}));  // leap
}

TEST_CASE("Date::addDays large offset (SRS ladder)") {
    const Date start{2026, 4, 29};
    CHECK(start.addDays(1) == (Date{2026, 4, 30}));
    CHECK(start.addDays(2) == (Date{2026, 5, 1}));
    CHECK(start.addDays(5) == (Date{2026, 5, 4}));
    CHECK(start.addDays(15) == (Date{2026, 5, 14}));
    CHECK(start.addDays(30) == (Date{2026, 5, 29}));
}

TEST_CASE("Date::daysUntil") {
    const Date a{2026, 4, 29};
    const Date b{2026, 5, 4};
    CHECK(a.daysUntil(b) == 5);
    CHECK(b.daysUntil(a) == -5);
    CHECK(a.daysUntil(a) == 0);
}

TEST_CASE("Date comparison operators") {
    const Date a{2026, 4, 29};
    const Date b{2026, 4, 30};
    const Date c{2026, 4, 29};

    CHECK(a == c);
    CHECK(a != b);
    CHECK(a < b);
    CHECK(b > a);
    CHECK(a <= c);
    CHECK(a <= b);
    CHECK(b >= a);
    CHECK(c >= a);
}
