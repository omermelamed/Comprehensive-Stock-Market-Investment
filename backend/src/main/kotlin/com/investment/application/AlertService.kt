package com.investment.application

import com.investment.api.dto.AlertResponse
import com.investment.api.dto.CreateAlertRequest
import com.investment.domain.MarketDataUnavailableException
import com.investment.infrastructure.AlertRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.util.UUID

@Service
class AlertService(
    private val alertRepository: AlertRepository,
    private val marketDataService: MarketDataService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun listAlerts(): List<AlertResponse> {
        return alertRepository.findAll()
    }

    fun createAlert(request: CreateAlertRequest): AlertResponse {
        require(request.symbol.isNotBlank()) { "Symbol must not be blank" }
        val condition = request.condition.trim().uppercase()
        require(condition == "ABOVE" || condition == "BELOW") {
            "Condition must be ABOVE or BELOW"
        }
        require(request.thresholdPrice > BigDecimal.ZERO) {
            "Threshold price must be positive"
        }

        marketDataService.getQuote(request.symbol)

        return alertRepository.insert(
            symbol = request.symbol,
            condition = condition,
            thresholdPrice = request.thresholdPrice,
            note = request.note
        )
    }

    fun deleteAlert(id: UUID) {
        alertRepository.delete(id)
    }

    fun dismissAlert(id: UUID) {
        alertRepository.dismiss(id)
    }

    fun reEnableAlert(id: UUID) {
        alertRepository.reEnable(id)
    }

    fun countUnread(): Int {
        return alertRepository.countUnread()
    }

    fun checkAlerts() {
        val active = alertRepository.findActive()
        for (alert in active) {
            val quote = try {
                marketDataService.getQuote(alert.symbol)
            } catch (e: MarketDataUnavailableException) {
                log.warn("Alert check skipped for {}: {}", alert.symbol, e.message)
                continue
            }

            val triggered = when (alert.condition.uppercase()) {
                "ABOVE" -> quote.price >= alert.thresholdPrice
                "BELOW" -> quote.price <= alert.thresholdPrice
                else -> false
            }

            if (triggered) {
                alertRepository.trigger(alert.id)
                log.info(
                    "Alert {} triggered for {} (condition={}, threshold={}): current price {}",
                    alert.id,
                    alert.symbol,
                    alert.condition,
                    alert.thresholdPrice,
                    quote.price
                )
            }
        }
    }
}
