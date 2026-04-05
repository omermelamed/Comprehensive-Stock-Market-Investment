package com.investment.infrastructure.market

import com.investment.domain.PriceQuote
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.math.BigDecimal
import java.time.Instant

@Component
class PolygonAdapter(
    @Qualifier("marketDataRestClient") private val restClient: RestClient,
) : MarketDataProvider {

    private val log = LoggerFactory.getLogger(javaClass)

    override val sourceName: String = "POLYGON"

    private val apiKey: String? = System.getenv("POLYGON_API_KEY")?.takeIf { it.isNotBlank() }

    override fun fetchQuote(symbol: String): PriceQuote? {
        if (apiKey == null) {
            return null
        }

        return try {
            val url = "https://api.polygon.io/v2/last/trade/$symbol?apiKey=$apiKey"
            val body = restClient.get()
                .uri(url)
                .retrieve()
                .body(Map::class.java) ?: return null

            parseResponse(symbol, body)
        } catch (e: Exception) {
            log.warn("Polygon quote fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseResponse(symbol: String, body: Map<*, *>): PriceQuote? {
        return try {
            val results = body["results"] as? Map<*, *> ?: return null
            val rawPrice = results["p"] ?: return null
            val price = when (rawPrice) {
                is Number -> BigDecimal(rawPrice.toString())
                else -> return null
            }

            PriceQuote(
                symbol = symbol.uppercase(),
                price = price,
                currency = "USD",
                timestamp = Instant.now(),
                source = sourceName,
            )
        } catch (e: Exception) {
            log.warn("Polygon response parse failed for {}: {}", symbol, e.message)
            null
        }
    }
}
