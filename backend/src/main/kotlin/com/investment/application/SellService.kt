package com.investment.application

import com.investment.api.dto.SellPreviewCalculation
import com.investment.api.dto.SellPreviewResponse
import com.investment.api.dto.SellRequest
import com.investment.api.dto.SellResponse
import com.investment.api.dto.TransactionRequest
import com.investment.domain.MarketDataUnavailableException
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.RecalculationJobRepository
import com.investment.infrastructure.TransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class SellService(
    private val transactionRepository: TransactionRepository,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService,
    private val snapshotService: SnapshotService,
    private val recalculationService: RecalculationService,
    private val recalculationJobRepository: RecalculationJobRepository,
    private val clock: Clock
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val recentSells = ConcurrentHashMap<String, Instant>()

    fun getSellPreview(
        symbol: String,
        quantity: BigDecimal?,
        price: BigDecimal?,
        dateStr: String?
    ): SellPreviewResponse {
        val userId = RequestContext.get()
        val upperSymbol = symbol.uppercase()
        val profile = userProfileService.getProfile()
        val preferredCurrency = profile?.preferredCurrency ?: "USD"

        val holding = holdingsRepository.findAll(userId).firstOrNull { it.symbol.equals(upperSymbol, ignoreCase = true) }
        val sharesHeld = holding?.netQuantity ?: BigDecimal.ZERO
        val avgCost = holding?.avgBuyPrice ?: BigDecimal.ZERO

        val allocation = allocationRepository.findAll().firstOrNull { it.symbol.equals(upperSymbol, ignoreCase = true) }

        val quote = try {
            marketDataService.getQuote(upperSymbol)
        } catch (e: MarketDataUnavailableException) { null }

        val nativeCurrency = quote?.currency ?: "USD"
        val currentPriceNative = quote?.price ?: BigDecimal.ZERO
        val fxRate = marketDataService.getExchangeRate(nativeCurrency, preferredCurrency)

        val sellDate = dateStr?.let { LocalDate.parse(it) }
        val today = LocalDate.now(clock)
        val isRetroactive = sellDate != null && sellDate.isBefore(today)

        var historicalPrice: BigDecimal? = null
        var sharesHeldAtDate: BigDecimal? = null
        var avgCostAtDate: BigDecimal? = null

        if (isRetroactive && sellDate != null) {
            val allTxs = transactionRepository.findAllOrderedByExecutedAtAsc(userId)
            val holdingsAtDate = computeHoldingsAtDate(allTxs, upperSymbol, sellDate)
            sharesHeldAtDate = holdingsAtDate.first
            avgCostAtDate = holdingsAtDate.second

            val hist = marketDataService.getHistoricalPrices(upperSymbol, sellDate, sellDate)
            historicalPrice = hist[sellDate] ?: findNearestPrice(upperSymbol, sellDate)
        }

        val effectivePrice = price ?: historicalPrice ?: currentPriceNative
        val effectiveShares = if (isRetroactive) sharesHeldAtDate ?: sharesHeld else sharesHeld
        val effectiveAvgCost = if (isRetroactive) avgCostAtDate ?: avgCost else avgCost

        val preview = if (quantity != null && quantity > BigDecimal.ZERO) {
            computePreview(quantity, effectivePrice, effectiveAvgCost, effectiveShares, fxRate)
        } else null

        return SellPreviewResponse(
            symbol = upperSymbol,
            label = allocation?.label,
            sharesHeld = sharesHeld,
            avgCostPerShare = avgCost,
            currentPriceUsd = currentPriceNative,
            currentPriceDisplay = currentPriceNative * fxRate,
            preferredCurrency = preferredCurrency,
            exchangeRate = fxRate,
            currentValueDisplay = sharesHeld * currentPriceNative * fxRate,
            nativeCurrency = nativeCurrency,
            isRetroactive = isRetroactive,
            retroactiveDate = sellDate?.toString(),
            historicalPriceUsd = historicalPrice,
            sharesHeldAtDate = sharesHeldAtDate,
            avgCostAtDate = avgCostAtDate,
            preview = preview
        )
    }

    @Transactional
    fun executeSell(request: SellRequest): SellResponse {
        val userId = RequestContext.get()
        val upperSymbol = request.symbol.uppercase()
        val today = LocalDate.now(clock)
        val sellDate = request.executedAt.atZone(ZoneOffset.UTC).toLocalDate()

        if (sellDate.isAfter(today)) {
            throw SellValidationException("FUTURE_DATE_NOT_ALLOWED", "Sell date cannot be in the future")
        }

        if (request.quantity <= BigDecimal.ZERO) {
            throw SellValidationException("INVALID_QUANTITY", "Quantity must be greater than 0")
        }

        if (request.pricePerUnit <= BigDecimal.ZERO) {
            throw SellValidationException("INVALID_PRICE", "Price must be greater than 0")
        }

        val dedupeKey = "${upperSymbol}:${request.quantity}:${request.pricePerUnit}:${request.executedAt}"
        val now = Instant.now(clock)
        val lastSell = recentSells[dedupeKey]
        if (lastSell != null && now.isBefore(lastSell.plusSeconds(5))) {
            throw SellValidationException("DUPLICATE_TRANSACTION", "Duplicate sell detected. Please wait a moment.")
        }

        val isRetroactive = sellDate.isBefore(today)
        val allTxs = transactionRepository.findAllOrderedByExecutedAtAsc(userId)
        val currentHolding = holdingsRepository.findAll(userId)
            .firstOrNull { it.symbol.equals(upperSymbol, ignoreCase = true) }
        val holdingTrack = currentHolding?.track ?: "LONG"

        val (sharesAtDate, avgCostAtDate) = if (isRetroactive) {
            computeHoldingsAtDate(allTxs, upperSymbol, sellDate)
        } else {
            val shares = currentHolding?.netQuantity ?: BigDecimal.ZERO
            val avgCost = currentHolding?.avgBuyPrice ?: BigDecimal.ZERO
            shares to avgCost
        }

        if (request.quantity > sharesAtDate) {
            throw SellValidationException(
                "INSUFFICIENT_SHARES",
                "You only held $sharesAtDate shares of $upperSymbol${if (isRetroactive) " on $sellDate" else ""}. Cannot sell ${request.quantity}.",
                sharesAtDate
            )
        }

        recentSells[dedupeKey] = now

        val txResponse = transactionRepository.insert(
            userId,
            TransactionRequest(
                symbol = upperSymbol,
                type = "SELL",
                track = holdingTrack,
                quantity = request.quantity,
                pricePerUnit = request.pricePerUnit,
                executedAt = request.executedAt,
                notes = request.notes
            )
        )

        val profile = userProfileService.getProfile()
        val preferredCurrency = profile?.preferredCurrency ?: "USD"
        val quote = try { marketDataService.getQuote(upperSymbol) } catch (_: Exception) { null }
        val nativeCurrency = quote?.currency ?: "USD"
        val fxRate = try {
            marketDataService.getExchangeRate(nativeCurrency, preferredCurrency)
        } catch (_: Exception) { BigDecimal.ONE }

        val pnlPerShare = request.pricePerUnit - avgCostAtDate
        val pnlUsd = pnlPerShare * request.quantity
        val pnlDisplay = pnlUsd * fxRate
        val pnlPercent = if (avgCostAtDate > BigDecimal.ZERO) {
            pnlPerShare.divide(avgCostAtDate, 4, RoundingMode.HALF_UP) * BigDecimal(100)
        } else BigDecimal.ZERO

        val totalProceedsUsd = request.pricePerUnit * request.quantity
        val remainingShares = sharesAtDate - request.quantity
        val positionClosed = remainingShares.compareTo(BigDecimal.ZERO) == 0

        var recalcJobId: UUID? = null

        if (isRetroactive) {
            val job = recalculationJobRepository.create(
                triggeredBy = txResponse.id,
                sellDate = sellDate,
                recalcFrom = sellDate,
                recalcTo = today
            )
            recalcJobId = job.id

            TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
                override fun afterCommit() {
                    recalculationService.startRecalculation(job.id, userId)
                }
            })
        } else {
            TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
                override fun afterCommit() {
                    Thread {
                        try {
                            snapshotService.regenerateSnapshotsFrom(userId, sellDate)
                        } catch (e: Exception) {
                            log.warn("Snapshot regeneration after sell failed: {}", e.message)
                        }
                    }.also { it.isDaemon = true }.start()
                }
            })
        }

        return SellResponse(
            transactionId = txResponse.id,
            symbol = upperSymbol,
            quantitySold = request.quantity,
            pricePerUnit = request.pricePerUnit,
            totalProceedsUsd = totalProceedsUsd,
            totalProceedsDisplay = totalProceedsUsd * fxRate,
            pnlUsd = pnlUsd,
            pnlDisplay = pnlDisplay,
            pnlPercent = pnlPercent.setScale(2, RoundingMode.HALF_UP),
            remainingShares = remainingShares,
            positionClosed = positionClosed,
            isRetroactive = isRetroactive,
            recalculationJobId = recalcJobId
        )
    }

    private fun computeHoldingsAtDate(
        allTxs: List<com.investment.infrastructure.TransactionLedgerRow>,
        symbol: String,
        date: LocalDate
    ): Pair<BigDecimal, BigDecimal> {
        val relevantTxs = allTxs.filter {
            it.symbol.equals(symbol, ignoreCase = true) &&
            it.executedAt.atZone(ZoneOffset.UTC).toLocalDate() <= date
        }

        var netQty = BigDecimal.ZERO
        var totalBuyCost = BigDecimal.ZERO
        var totalBuyQty = BigDecimal.ZERO

        for (tx in relevantTxs) {
            when (tx.type.uppercase()) {
                "BUY" -> {
                    netQty += tx.quantity
                    totalBuyCost += tx.quantity * tx.pricePerUnit
                    totalBuyQty += tx.quantity
                }
                "SELL" -> netQty -= tx.quantity
                "SHORT" -> netQty -= tx.quantity
                "COVER" -> netQty += tx.quantity
            }
        }

        val avgCost = if (totalBuyQty > BigDecimal.ZERO) {
            totalBuyCost.divide(totalBuyQty, 8, RoundingMode.HALF_UP)
        } else BigDecimal.ZERO

        return (if (netQty < BigDecimal.ZERO) BigDecimal.ZERO else netQty) to avgCost
    }

    private fun computePreview(
        quantity: BigDecimal,
        sellPrice: BigDecimal,
        avgCost: BigDecimal,
        sharesHeld: BigDecimal,
        fxRate: BigDecimal
    ): SellPreviewCalculation {
        val totalProceeds = sellPrice * quantity
        val pnlPerShare = sellPrice - avgCost
        val pnlUsd = pnlPerShare * quantity
        val pnlPercent = if (avgCost > BigDecimal.ZERO) {
            pnlPerShare.divide(avgCost, 4, RoundingMode.HALF_UP) * BigDecimal(100)
        } else BigDecimal.ZERO
        val remaining = sharesHeld - quantity

        return SellPreviewCalculation(
            quantity = quantity,
            sellPriceUsd = sellPrice,
            totalProceedsUsd = totalProceeds,
            totalProceedsDisplay = totalProceeds * fxRate,
            avgCostAtDate = avgCost,
            pnlUsd = pnlUsd.setScale(2, RoundingMode.HALF_UP),
            pnlDisplay = (pnlUsd * fxRate).setScale(2, RoundingMode.HALF_UP),
            pnlPercent = pnlPercent.setScale(2, RoundingMode.HALF_UP),
            remainingShares = if (remaining < BigDecimal.ZERO) BigDecimal.ZERO else remaining,
            positionCloses = remaining.compareTo(BigDecimal.ZERO) == 0
        )
    }

    private fun findNearestPrice(symbol: String, date: LocalDate): BigDecimal? {
        var lookback = date.minusDays(1)
        val limit = date.minusDays(7)
        while (!lookback.isBefore(limit)) {
            val prices = marketDataService.getHistoricalPrices(symbol, lookback, lookback)
            if (prices.isNotEmpty()) return prices.values.first()
            lookback = lookback.minusDays(1)
        }
        return null
    }
}

class SellValidationException(
    val errorCode: String,
    override val message: String,
    val sharesHeldAtDate: BigDecimal? = null
) : RuntimeException(message)
