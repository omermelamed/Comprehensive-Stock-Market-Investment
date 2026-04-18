package com.investment.infrastructure.market

import com.investment.domain.OhlcBar
import com.investment.domain.PriceQuote
import java.math.BigDecimal
import java.time.LocalDate

interface MarketDataProvider {
    val sourceName: String
    fun fetchQuote(symbol: String): PriceQuote?
    fun fetchHistoricalPrices(symbol: String, from: LocalDate, to: LocalDate): Map<LocalDate, BigDecimal> = emptyMap()
    fun fetchOhlcBars(symbol: String, from: LocalDate, to: LocalDate): List<OhlcBar> = emptyList()
}
