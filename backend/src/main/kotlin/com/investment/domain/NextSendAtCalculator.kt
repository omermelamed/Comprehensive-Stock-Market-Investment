package com.investment.domain

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.TemporalAdjusters
import java.time.temporal.WeekFields

/**
 * Pure domain calculator for the next scheduled WhatsApp message send time.
 * No Spring dependencies, no I/O.
 */
object NextSendAtCalculator {

    /**
     * Computes the next Instant at which a scheduled message should fire.
     *
     * @param frequency   "WEEKLY", "BIWEEKLY", or "MONTHLY"
     * @param dayOfWeek   0=Sun, 1=Mon, …, 6=Sat — required for WEEKLY and BIWEEKLY
     * @param biweeklyWeek 1=odd ISO weeks, 2=even ISO weeks — required for BIWEEKLY
     * @param dayOfMonth  1-28 — required for MONTHLY
     * @param sendTime    wall-clock time in [timezone]
     * @param timezone    the user's timezone
     * @param after       reference moment (defaults to now in [timezone]); result is strictly after this
     */
    fun compute(
        frequency: String,
        dayOfWeek: Int?,
        biweeklyWeek: Int?,
        dayOfMonth: Int?,
        sendTime: LocalTime,
        timezone: ZoneId,
        after: ZonedDateTime = ZonedDateTime.now(timezone)
    ): Instant {
        return when (frequency.uppercase()) {
            "WEEKLY"   -> computeWeekly(dayOfWeek!!, sendTime, timezone, after)
            "BIWEEKLY" -> computeBiweekly(dayOfWeek!!, biweeklyWeek!!, sendTime, timezone, after)
            "MONTHLY"  -> computeMonthly(dayOfMonth!!, sendTime, timezone, after)
            else       -> throw IllegalArgumentException("Unknown frequency: $frequency")
        }
    }

    // ---- private helpers ----

    private fun computeWeekly(
        targetDayOfWeek: Int,   // 0=Sun, 1=Mon…6=Sat
        sendTime: LocalTime,
        @Suppress("UNUSED_PARAMETER") unusedTimezone: ZoneId,
        after: ZonedDateTime
    ): Instant {
        val javaDow = toJavaDayOfWeek(targetDayOfWeek)
        return nextOccurrenceOfWeekday(javaDow, sendTime, after).toInstant()
    }

    private fun computeBiweekly(
        targetDayOfWeek: Int,
        targetBiweeklyWeek: Int,  // 1=odd ISO week, 2=even ISO week
        sendTime: LocalTime,
        @Suppress("UNUSED_PARAMETER") unusedTimezone: ZoneId,
        after: ZonedDateTime
    ): Instant {
        val javaDow = toJavaDayOfWeek(targetDayOfWeek)

        // Walk forward week-by-week from the next occurrence of that weekday
        var candidate = nextOccurrenceOfWeekday(javaDow, sendTime, after)
        // Limit search to 28 days (covers 4 weekly cycles)
        repeat(4) {
            val isoWeek = candidate.get(WeekFields.ISO.weekOfWeekBasedYear())
            val isOdd = isoWeek % 2 == 1
            val weekMatches = if (targetBiweeklyWeek == 1) isOdd else !isOdd
            if (weekMatches) return candidate.toInstant()
            // Advance one week and try again
            candidate = candidate.plusWeeks(1)
        }
        // Fallback: should never reach here with a 4-iteration window
        return candidate.toInstant()
    }

    private fun computeMonthly(
        dayOfMonth: Int,
        sendTime: LocalTime,
        @Suppress("UNUSED_PARAMETER") unusedTimezone: ZoneId,
        after: ZonedDateTime
    ): Instant {
        // Try the current month first
        val candidate = after.withDayOfMonth(dayOfMonth).with(sendTime)
        return if (candidate.isAfter(after)) {
            candidate.toInstant()
        } else {
            // Roll to next month
            after.plusMonths(1).withDayOfMonth(dayOfMonth).with(sendTime).toInstant()
        }
    }

    /**
     * Returns the next ZonedDateTime at [sendTime] on [javaDow] that is strictly after [after].
     * If today is the target day but the time hasn't passed yet, returns today at [sendTime].
     * The [after] value already carries the correct timezone via its zone, so no additional
     * ZoneId parameter is needed here.
     */
    private fun nextOccurrenceOfWeekday(
        javaDow: DayOfWeek,
        sendTime: LocalTime,
        after: ZonedDateTime
    ): ZonedDateTime {
        val todayAtTime = after.with(sendTime)
        return if (after.dayOfWeek == javaDow && todayAtTime.isAfter(after)) {
            // Same day, time hasn't passed yet
            todayAtTime
        } else {
            // Next occurrence of this weekday (may still be today if time is before after — handled above)
            val nextDay = after.with(TemporalAdjusters.next(javaDow))
            nextDay.with(sendTime)
        }
    }

    /**
     * Converts our 0=Sunday convention to java.time.DayOfWeek.
     * Java uses 1=Monday … 7=Sunday.
     */
    private fun toJavaDayOfWeek(day: Int): DayOfWeek = when (day) {
        0    -> DayOfWeek.SUNDAY
        1    -> DayOfWeek.MONDAY
        2    -> DayOfWeek.TUESDAY
        3    -> DayOfWeek.WEDNESDAY
        4    -> DayOfWeek.THURSDAY
        5    -> DayOfWeek.FRIDAY
        6    -> DayOfWeek.SATURDAY
        else -> throw IllegalArgumentException("dayOfWeek must be 0-6, got $day")
    }
}
