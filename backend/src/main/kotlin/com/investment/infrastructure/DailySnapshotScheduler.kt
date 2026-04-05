package com.investment.infrastructure

import com.investment.application.CatchUpService
import com.investment.application.SnapshotService
import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDate

@Component
class DailySnapshotScheduler(
    private val snapshotService: SnapshotService,
    private val catchUpService: CatchUpService,
    private val clock: Clock
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "0 0 0 * * *")
    fun scheduledDailySnapshot() {
        val today = LocalDate.now(clock)
        log.info("Daily scheduler: creating snapshot for {}", today)
        snapshotService.createSnapshotForDate(today, "SCHEDULED")
    }

    @EventListener(ApplicationReadyEvent::class)
    fun onApplicationReady() {
        log.info("Application ready: running catch-up job")
        catchUpService.runCatchUp()

        val today = LocalDate.now(clock)
        log.info("Application ready: ensuring today's snapshot exists for {}", today)
        snapshotService.createSnapshotForDate(today, "SCHEDULED")
    }
}
