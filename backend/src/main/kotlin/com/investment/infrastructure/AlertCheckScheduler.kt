package com.investment.infrastructure

import com.investment.application.AlertService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class AlertCheckScheduler(private val alertService: AlertService) {

    @Scheduled(fixedRate = 300000) // every 5 minutes
    fun checkAlerts() {
        alertService.checkAlerts()
    }
}
