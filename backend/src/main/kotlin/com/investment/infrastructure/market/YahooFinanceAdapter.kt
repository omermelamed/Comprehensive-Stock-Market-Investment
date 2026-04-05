package com.investment.infrastructure.market

import com.investment.domain.PriceQuote
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.math.BigDecimal
import java.time.Instant

@Component
class YahooFinanceAdapter(
    @Qualifier("marketDataRestClient") private val restClient: RestClient,
) : MarketDataProvider {

    private val log = LoggerFactory.getLogger(javaClass)

    override val sourceName: String = "YAHOO"

    override fun fetchQuote(symbol: String): PriceQuote? {
        return try {
            val url = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=1d"
            val body = restClient.get()
                .uri(url)
                .retrieve()
                .body(Map::class.java) ?: return null

            parseResponse(symbol, body)
        } catch (e: Exception) {
            log.warn("YahooFinance quote fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseResponse(symbol: String, body: Map<*, *>): PriceQuote? {
        return try {
            val chart = body["chart"] as? Map<*, *> ?: return null
            val results = chart["result"] as? List<*> ?: return null
            val first = results.firstOrNull() as? Map<*, *> ?: return null
            val meta = first["meta"] as? Map<*, *> ?: return null

            val rawPrice = meta["regularMarketPrice"] ?: return null
            val price = when (rawPrice) {
                is Number -> BigDecimal(rawPrice.toString())
                else -> return null
            }

            val currency = meta["currency"] as? String ?: "USD"

            PriceQuote(
                symbol = symbol.uppercase(),
                price = price,
                currency = currency,
                timestamp = Instant.now(),
                source = sourceName,
            )
        } catch (e: Exception) {
            log.warn("YahooFinance response parse failed for {}: {}", symbol, e.message)
            null
        }
    }
}
