package com.investment.infrastructure.market

import com.investment.domain.PriceQuote
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.math.BigDecimal
import java.time.Instant

@Component
class AlphaVantageAdapter(
    @Qualifier("marketDataRestClient") private val restClient: RestClient,
) : MarketDataProvider {

    private val log = LoggerFactory.getLogger(javaClass)

    override val sourceName: String = "ALPHAVANTAGE"

    private val apiKey: String? = System.getenv("ALPHA_VANTAGE_API_KEY")?.takeIf { it.isNotBlank() }

    override fun fetchQuote(symbol: String): PriceQuote? {
        if (apiKey == null) {
            return null
        }

        return try {
            val url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=$symbol&apikey=$apiKey"
            val body = restClient.get()
                .uri(url)
                .retrieve()
                .body(Map::class.java) ?: return null

            parseResponse(symbol, body)
        } catch (e: Exception) {
            log.warn("AlphaVantage quote fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseResponse(symbol: String, body: Map<*, *>): PriceQuote? {
        return try {
            val globalQuote = body["Global Quote"] as? Map<*, *> ?: return null
            val rawPrice = globalQuote["05. price"] as? String ?: return null
            val price = rawPrice.toBigDecimalOrNull() ?: return null

            PriceQuote(
                symbol = symbol.uppercase(),
                price = price,
                currency = "USD",
                timestamp = Instant.now(),
                source = sourceName,
            )
        } catch (e: Exception) {
            log.warn("AlphaVantage response parse failed for {}: {}", symbol, e.message)
            null
        }
    }
}
