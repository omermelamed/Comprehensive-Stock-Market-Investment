package com.investment.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.WeekFields

class NextSendAtCalculatorTest {

    private val utc = ZoneId.of("UTC")
    private val jerusalem = ZoneId.of("Asia/Jerusalem")

    // ---- WEEKLY ----

    @Test
    fun `weekly - next Monday when today is Wednesday`() {
        // Wednesday 2024-01-10 10:00 UTC
        val after = ZonedDateTime.of(2024, 1, 10, 10, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency  = "WEEKLY",
            dayOfWeek  = 1,         // Monday
            biweeklyWeek = null,
            dayOfMonth = null,
            sendTime   = LocalTime.of(9, 0),
            timezone   = utc,
            after      = after
        )
        val expected = ZonedDateTime.of(2024, 1, 15, 9, 0, 0, 0, utc).toInstant() // next Monday
        assertEquals(expected, result)
    }

    @Test
    fun `weekly - same day but time not yet passed returns today`() {
        // Monday 2024-01-15 07:00 UTC, send time 09:00
        val after = ZonedDateTime.of(2024, 1, 15, 7, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency  = "WEEKLY",
            dayOfWeek  = 1,         // Monday
            biweeklyWeek = null,
            dayOfMonth = null,
            sendTime   = LocalTime.of(9, 0),
            timezone   = utc,
            after      = after
        )
        val expected = ZonedDateTime.of(2024, 1, 15, 9, 0, 0, 0, utc).toInstant() // same day
        assertEquals(expected, result)
    }

    @Test
    fun `weekly - same day but time already passed returns next week`() {
        // Monday 2024-01-15 10:00 UTC, send time 09:00
        val after = ZonedDateTime.of(2024, 1, 15, 10, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency  = "WEEKLY",
            dayOfWeek  = 1,         // Monday
            biweeklyWeek = null,
            dayOfMonth = null,
            sendTime   = LocalTime.of(9, 0),
            timezone   = utc,
            after      = after
        )
        val expected = ZonedDateTime.of(2024, 1, 22, 9, 0, 0, 0, utc).toInstant() // next Monday
        assertEquals(expected, result)
    }

    // ---- BIWEEKLY ----

    @Test
    fun `biweekly - skips wrong ISO week and fires on correct week`() {
        // Monday 2024-01-15 is ISO week 3 (odd).
        // biweeklyWeek=2 means even weeks only.
        // So it should skip 2024-01-15 and fire on 2024-01-22 (week 4, even).
        val after = ZonedDateTime.of(2024, 1, 14, 23, 0, 0, 0, utc) // Sunday before
        val result = NextSendAtCalculator.compute(
            frequency    = "BIWEEKLY",
            dayOfWeek    = 1,          // Monday
            biweeklyWeek = 2,          // even ISO weeks
            dayOfMonth   = null,
            sendTime     = LocalTime.of(9, 0),
            timezone     = utc,
            after        = after
        )
        // ISO week of 2024-01-22 should be 4 (even)
        val resultDate = result.atZone(utc).toLocalDate()
        val isoWeek = resultDate.get(WeekFields.ISO.weekOfWeekBasedYear())
        assertEquals(DayOfWeek.MONDAY, resultDate.dayOfWeek)
        assertEquals(0, isoWeek % 2, "Expected even ISO week, got $isoWeek")
    }

    @Test
    fun `biweekly - fires on odd ISO week when biweeklyWeek is 1`() {
        // After Sunday 2024-01-21 (ISO week 3 starts Mon 2024-01-15; Jan 22 is week 4)
        // Next Monday is 2024-01-22 (week 4, even) — skipped for biweeklyWeek=1
        // Then Monday 2024-01-29 (week 5, odd) — this should fire
        val after = ZonedDateTime.of(2024, 1, 21, 23, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency    = "BIWEEKLY",
            dayOfWeek    = 1,          // Monday
            biweeklyWeek = 1,          // odd ISO weeks
            dayOfMonth   = null,
            sendTime     = LocalTime.of(9, 0),
            timezone     = utc,
            after        = after
        )
        val resultDate = result.atZone(utc).toLocalDate()
        val isoWeek = resultDate.get(WeekFields.ISO.weekOfWeekBasedYear())
        assertEquals(DayOfWeek.MONDAY, resultDate.dayOfWeek)
        assertEquals(1, isoWeek % 2, "Expected odd ISO week, got $isoWeek")
    }

    // ---- MONTHLY ----

    @Test
    fun `monthly - current month if day is in the future`() {
        // Today is 2024-01-05, dayOfMonth=15
        val after = ZonedDateTime.of(2024, 1, 5, 10, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency    = "MONTHLY",
            dayOfWeek    = null,
            biweeklyWeek = null,
            dayOfMonth   = 15,
            sendTime     = LocalTime.of(9, 0),
            timezone     = utc,
            after        = after
        )
        val expected = ZonedDateTime.of(2024, 1, 15, 9, 0, 0, 0, utc).toInstant()
        assertEquals(expected, result)
    }

    @Test
    fun `monthly - next month if day has already passed`() {
        // Today is 2024-01-20, dayOfMonth=15 — already past
        val after = ZonedDateTime.of(2024, 1, 20, 10, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency    = "MONTHLY",
            dayOfWeek    = null,
            biweeklyWeek = null,
            dayOfMonth   = 15,
            sendTime     = LocalTime.of(9, 0),
            timezone     = utc,
            after        = after
        )
        val expected = ZonedDateTime.of(2024, 2, 15, 9, 0, 0, 0, utc).toInstant()
        assertEquals(expected, result)
    }

    @Test
    fun `monthly - same day but time not yet passed returns today`() {
        // Today is 2024-01-15 08:00, send time 09:00
        val after = ZonedDateTime.of(2024, 1, 15, 8, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency    = "MONTHLY",
            dayOfWeek    = null,
            biweeklyWeek = null,
            dayOfMonth   = 15,
            sendTime     = LocalTime.of(9, 0),
            timezone     = utc,
            after        = after
        )
        val expected = ZonedDateTime.of(2024, 1, 15, 9, 0, 0, 0, utc).toInstant()
        assertEquals(expected, result)
    }

    @Test
    fun `monthly - same day but time already passed returns next month`() {
        // Today is 2024-01-15 10:00, send time 09:00
        val after = ZonedDateTime.of(2024, 1, 15, 10, 0, 0, 0, utc)
        val result = NextSendAtCalculator.compute(
            frequency    = "MONTHLY",
            dayOfWeek    = null,
            biweeklyWeek = null,
            dayOfMonth   = 15,
            sendTime     = LocalTime.of(9, 0),
            timezone     = utc,
            after        = after
        )
        val expected = ZonedDateTime.of(2024, 2, 15, 9, 0, 0, 0, utc).toInstant()
        assertEquals(expected, result)
    }

    // ---- TIMEZONE ----

    @Test
    fun `timezone correctness - Asia Jerusalem weekly`() {
        // In Jerusalem it's Wednesday 2024-01-10 10:00 (UTC+2 in winter = UTC 08:00)
        val after = ZonedDateTime.of(2024, 1, 10, 10, 0, 0, 0, jerusalem)
        val result = NextSendAtCalculator.compute(
            frequency    = "WEEKLY",
            dayOfWeek    = 1,         // Monday
            biweeklyWeek = null,
            dayOfMonth   = null,
            sendTime     = LocalTime.of(9, 0),
            timezone     = jerusalem,
            after        = after
        )
        // Next Monday in Jerusalem is 2024-01-15 09:00 Israel time
        val resultInJerusalem = result.atZone(jerusalem)
        assertEquals(2024, resultInJerusalem.year)
        assertEquals(1, resultInJerusalem.monthValue)
        assertEquals(15, resultInJerusalem.dayOfMonth)
        assertEquals(9, resultInJerusalem.hour)
        assertEquals(0, resultInJerusalem.minute)
    }

    @Test
    fun `timezone correctness - Asia Jerusalem monthly`() {
        // In Jerusalem 2024-01-05 10:00, dayOfMonth=20
        val after = ZonedDateTime.of(2024, 1, 5, 10, 0, 0, 0, jerusalem)
        val result = NextSendAtCalculator.compute(
            frequency    = "MONTHLY",
            dayOfWeek    = null,
            biweeklyWeek = null,
            dayOfMonth   = 20,
            sendTime     = LocalTime.of(8, 30),
            timezone     = jerusalem,
            after        = after
        )
        val resultInJerusalem = result.atZone(jerusalem)
        assertEquals(2024, resultInJerusalem.year)
        assertEquals(1, resultInJerusalem.monthValue)
        assertEquals(20, resultInJerusalem.dayOfMonth)
        assertEquals(8, resultInJerusalem.hour)
        assertEquals(30, resultInJerusalem.minute)
    }
}
