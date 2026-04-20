package com.investment.application

import com.investment.api.dto.TargetAllocationResponse
import com.investment.domain.DailyBriefingData
import com.investment.domain.HoldingMover
import com.investment.domain.MarketIndex
import com.investment.domain.NewsHeadline
import com.investment.domain.SectorAllocation
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.market.YahooFinanceAdapter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneOffset

@Service
class DailyBriefingDataCollector(
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val snapshotRepository: SnapshotRepository,
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService,
    private val yahooFinanceAdapter: YahooFinanceAdapter,
    private val clock: Clock,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        private val INDEX_SYMBOLS = listOf(
            "^GSPC" to "S&P 500",
            "^IXIC" to "NASDAQ",
            "^RUT"  to "Russell 2000"
        )

        // US stock market holidays for 2026 (NYSE/NASDAQ schedule)
        private val US_MARKET_HOLIDAYS_2026 = setOf(
            LocalDate.of(2026, 1, 1),   // New Year's Day
            LocalDate.of(2026, 1, 19),  // MLK Day
            LocalDate.of(2026, 2, 16),  // Presidents' Day
            LocalDate.of(2026, 4, 3),   // Good Friday
            LocalDate.of(2026, 5, 25),  // Memorial Day
            LocalDate.of(2026, 6, 19),  // Juneteenth
            LocalDate.of(2026, 7, 3),   // Independence Day (observed)
            LocalDate.of(2026, 9, 7),   // Labor Day
            LocalDate.of(2026, 11, 26), // Thanksgiving
            LocalDate.of(2026, 12, 25), // Christmas
        )

        fun isUsMarketOpen(date: LocalDate): Boolean {
            val dow = date.dayOfWeek
            if (dow == java.time.DayOfWeek.SATURDAY || dow == java.time.DayOfWeek.SUNDAY) return false
            return date !in US_MARKET_HOLIDAYS_2026
        }
    }

    fun collect(): DailyBriefingData {
        val today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC)
        val marketOpen = isUsMarketOpen(today)
        val profile = userProfileService.getProfile()
        val currency = profile?.preferredCurrency ?: "USD"

        val holdings = holdingsRepository.findAll().filter { it.track.uppercase() == "LONG" }
        val allocationsBySym = allocationRepository.findAll()
            .associateBy { it.symbol.uppercase() }

        // Portfolio value and per-holding day changes
        val quotes = holdings.associate { h ->
            h.symbol.uppercase() to try {
                marketDataService.getQuote(h.symbol)
            } catch (e: Exception) {
                log.warn("Could not fetch quote for {}: {}", h.symbol, e.message)
                null
            }
        }

        val holdingValues = holdings.associate { h ->
            val price = quotes[h.symbol.uppercase()]?.price ?: BigDecimal.ZERO
            h.symbol.uppercase() to (price * h.netQuantity).setScale(2, RoundingMode.HALF_UP)
        }
        val portfolioTotal = holdingValues.values.fold(BigDecimal.ZERO, BigDecimal::add)

        // Today's portfolio change vs yesterday's snapshot
        val todaySnapshot = snapshotRepository.findByDate(today)
        val yesterdaySnapshot = snapshotRepository.findByDate(today.minusDays(1))
        val portfolioChangeAbsolute: BigDecimal? = if (todaySnapshot != null && yesterdaySnapshot != null) {
            todaySnapshot.totalValue - yesterdaySnapshot.totalValue
        } else null
        val portfolioChangePercent: BigDecimal? = if (portfolioChangeAbsolute != null && yesterdaySnapshot != null &&
            yesterdaySnapshot.totalValue.compareTo(BigDecimal.ZERO) != 0) {
            portfolioChangeAbsolute.divide(yesterdaySnapshot.totalValue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
        } else null

        // Top gainers and losers by day change percent
        val movers = holdings.mapNotNull { h ->
            val dayChange = quotes[h.symbol.uppercase()]?.dayChangePercent ?: return@mapNotNull null
            val value = holdingValues[h.symbol.uppercase()] ?: BigDecimal.ZERO
            HoldingMover(h.symbol.uppercase(), dayChange.setScale(2, RoundingMode.HALF_UP), value)
        }
        val topGainers = movers.filter { it.dayChangePercent > BigDecimal.ZERO }
            .sortedByDescending { it.dayChangePercent }.take(3)
        val topLosers = movers.filter { it.dayChangePercent < BigDecimal.ZERO }
            .sortedBy { it.dayChangePercent }.take(3)

        // Sector breakdown
        val sectorBreakdown = buildSectorBreakdown(holdings.map { it.symbol }, holdingValues, allocationsBySym, portfolioTotal)

        // Market indices
        val marketIndices = INDEX_SYMBOLS.mapNotNull { (sym, label) ->
            try {
                val quote = marketDataService.getQuote(sym)
                val pct = quote.dayChangePercent ?: return@mapNotNull null
                MarketIndex(sym, label, pct.setScale(2, RoundingMode.HALF_UP))
            } catch (e: Exception) {
                log.warn("Could not fetch index {}: {}", sym, e.message)
                null
            }
        }

        // News headlines
        val newsHeadlines = holdings.flatMap { h ->
            try {
                yahooFinanceAdapter.fetchNewsHeadlines(h.symbol)
                    .map { headline -> NewsHeadline(h.symbol.uppercase(), headline) }
            } catch (e: Exception) {
                log.warn("Could not fetch news for {}: {}", h.symbol, e.message)
                emptyList()
            }
        }

        return DailyBriefingData(
            date = today,
            currency = currency,
            marketOpen = marketOpen,
            portfolioChangeAbsolute = portfolioChangeAbsolute,
            portfolioChangePercent = portfolioChangePercent,
            portfolioTotal = portfolioTotal,
            topGainers = topGainers,
            topLosers = topLosers,
            sectorBreakdown = sectorBreakdown,
            marketIndices = marketIndices,
            newsHeadlines = newsHeadlines,
        )
    }

    private fun buildSectorBreakdown(
        symbols: List<String>,
        holdingValues: Map<String, BigDecimal>,
        allocationsBySym: Map<String, TargetAllocationResponse>,
        portfolioTotal: BigDecimal,
    ): List<SectorAllocation> {
        if (portfolioTotal.compareTo(BigDecimal.ZERO) == 0) return emptyList()

        val sectorValues = mutableMapOf<String, BigDecimal>()
        for (sym in symbols) {
            val upperSym = sym.uppercase()
            val value = holdingValues[upperSym] ?: BigDecimal.ZERO
            val sector = resolveSector(upperSym, allocationsBySym)
            sectorValues[sector] = (sectorValues[sector] ?: BigDecimal.ZERO) + value
        }

        return sectorValues.entries
            .sortedByDescending { it.value }
            .map { (sector, value) ->
                val pct = value.divide(portfolioTotal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100")).setScale(1, RoundingMode.HALF_UP)
                SectorAllocation(sector, pct)
            }
    }

    private fun resolveSector(symbol: String, allocationsBySym: Map<String, TargetAllocationResponse>): String {
        val manual = allocationsBySym[symbol]?.sector?.takeIf { it.isNotBlank() }
        if (manual != null) return manual

        return try {
            yahooFinanceAdapter.fetchSectorInfo(symbol)?.takeIf { it.isNotBlank() } ?: "Other"
        } catch (e: Exception) {
            log.warn("Could not fetch sector for {}: {}", symbol, e.message)
            "Other"
        }
    }
}
