package com.investment.infrastructure.market

import com.investment.domain.PriceQuote

interface MarketDataProvider {
    fun fetchQuote(symbol: String): PriceQuote?
    val sourceName: String
}
