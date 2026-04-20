package com.investment.application

import com.investment.api.dto.OptionsListResponse
import com.investment.api.dto.OptionsStrategyResponse
import com.investment.api.dto.OptionsTransactionRequest
import com.investment.api.dto.OptionsTransactionResponse
import com.investment.api.dto.UpdateOptionsStatusRequest
import com.investment.application.agents.OptionsStrategyAgent
import com.investment.infrastructure.OptionsTransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class OptionsTransactionService(
    private val optionsRepository: OptionsTransactionRepository,
    private val userProfileService: UserProfileService,
    private val optionsStrategyAgent: OptionsStrategyAgent
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun listAll(): OptionsListResponse {
        val userId = RequestContext.get()
        val profile = userProfileService.getProfile()
        val enabled = profile?.tracksEnabled?.any { it.uppercase() == "OPTIONS" } ?: false
        val positions = if (enabled) optionsRepository.findAll(userId) else emptyList()
        return OptionsListResponse(positions = positions, optionsTrackEnabled = enabled)
    }

    fun create(request: OptionsTransactionRequest): OptionsTransactionResponse {
        val userId = RequestContext.get()
        requireOptionsTrackEnabled()
        validateRequest(request)
        return optionsRepository.insert(
            userId = userId,
            underlyingSymbol = request.underlyingSymbol.trim().uppercase(),
            optionType = request.optionType.trim().uppercase(),
            action = request.action.trim().uppercase(),
            strikePrice = request.strikePrice,
            expirationDate = request.expirationDate,
            contracts = request.contracts,
            premiumPerContract = request.premiumPerContract,
            notes = request.notes?.trim()?.ifBlank { null }
        )
    }

    fun updateStatus(id: UUID, request: UpdateOptionsStatusRequest): OptionsTransactionResponse {
        val userId = RequestContext.get()
        requireOptionsTrackEnabled()
        val status = request.status.trim().uppercase()
        require(status in setOf("EXPIRED", "EXERCISED", "CLOSED")) {
            "Status must be one of: EXPIRED, EXERCISED, CLOSED"
        }
        return optionsRepository.updateStatus(userId, id, status)
    }

    fun delete(id: UUID) {
        val userId = RequestContext.get()
        requireOptionsTrackEnabled()
        optionsRepository.delete(userId, id)
    }

    fun getStrategy(symbol: String): OptionsStrategyResponse {
        RequestContext.get()
        requireOptionsTrackEnabled()
        val profile = userProfileService.getProfile()
        val riskLevel = profile?.riskLevel ?: "MODERATE"
        return optionsStrategyAgent.generateStrategy(symbol.trim().uppercase(), riskLevel)
    }

    private fun requireOptionsTrackEnabled() {
        val profile = userProfileService.getProfile()
        val enabled = profile?.tracksEnabled?.any { it.uppercase() == "OPTIONS" } ?: false
        require(enabled) { "OPTIONS track is not enabled for this profile" }
    }

    private fun validateRequest(request: OptionsTransactionRequest) {
        require(request.underlyingSymbol.isNotBlank()) { "Underlying symbol must not be blank" }
        require(request.optionType.uppercase() in setOf("CALL", "PUT")) {
            "Option type must be CALL or PUT"
        }
        require(request.action.uppercase() in setOf("BUY", "SELL")) {
            "Action must be BUY or SELL"
        }
        require(request.strikePrice > java.math.BigDecimal.ZERO) { "Strike price must be positive" }
        require(request.contracts > 0) { "Contracts must be positive" }
        require(request.premiumPerContract > java.math.BigDecimal.ZERO) { "Premium must be positive" }
        require(!request.expirationDate.isBefore(java.time.LocalDate.now())) {
            "Expiration date must be today or in the future"
        }
    }
}
