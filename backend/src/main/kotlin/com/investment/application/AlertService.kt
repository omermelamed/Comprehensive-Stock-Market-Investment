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
        val userId = RequestContext.get()
        return alertRepository.findAll(userId)
    }

    fun createAlert(request: CreateAlertRequest): AlertResponse {
        val userId = RequestContext.get()
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
            userId = userId,
            symbol = request.symbol,
            condition = condition,
            thresholdPrice = request.thresholdPrice,
            note = request.note
        )
    }

    fun deleteAlert(id: UUID) {
        val userId = RequestContext.get()
        alertRepository.delete(userId, id)
    }

    fun dismissAlert(id: UUID) {
        val userId = RequestContext.get()
        alertRepository.dismiss(userId, id)
    }

    fun reEnableAlert(id: UUID) {
        val userId = RequestContext.get()
        alertRepository.reEnable(userId, id)
    }

    fun countUnread(): Int {
        val userId = RequestContext.get()
        return alertRepository.countUnread(userId)
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
                alertRepository.trigger(alert.userId, alert.id)
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
