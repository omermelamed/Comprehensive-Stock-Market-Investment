package com.investment.infrastructure.market

import com.investment.api.dto.FundamentalsData
import com.investment.domain.PriceQuote
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.math.BigDecimal
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Component
class AlphaVantageAdapter(
    @Qualifier("marketDataRestClient") private val restClient: RestClient,
) : MarketDataProvider {

    private val log = LoggerFactory.getLogger(javaClass)

    override val sourceName: String = "ALPHAVANTAGE"

    private val apiKey: String? = System.getenv("ALPHA_VANTAGE_API_KEY")?.takeIf { it.isNotBlank() }

    // Fundamentals change slowly — cache for 1 hour to avoid rate-limit exhaustion
    private val fundamentalsCache = ConcurrentHashMap<String, Pair<FundamentalsData, Long>>()
    private val fundamentalsTtlMs = 3_600_000L

    override fun fetchQuote(symbol: String): PriceQuote? {
        if (apiKey == null) return null
        return try {
            val url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=$symbol&apikey=$apiKey"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return null
            parseQuote(symbol, body)
        } catch (e: Exception) {
            log.warn("AlphaVantage quote fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    /**
     * Fetches fundamental metrics via Alpha Vantage OVERVIEW.
     * Returns null when the API key is absent, the symbol is not supported, or any call fails.
     * Results are cached for 1 hour.
     */
    fun fetchFundamentals(symbol: String): FundamentalsData? {
        if (apiKey == null) return null

        val cached = fundamentalsCache[symbol.uppercase()]
        if (cached != null && System.currentTimeMillis() - cached.second < fundamentalsTtlMs) {
            return cached.first
        }

        return try {
            val url = "https://www.alphavantage.co/query?function=OVERVIEW&symbol=$symbol&apikey=$apiKey"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return null
            val data = parseOverview(body) ?: return null
            fundamentalsCache[symbol.uppercase()] = Pair(data, System.currentTimeMillis())
            data
        } catch (e: Exception) {
            log.warn("AlphaVantage fundamentals fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseQuote(symbol: String, body: Map<*, *>): PriceQuote? {
        return try {
            val globalQuote = body["Global Quote"] as? Map<*, *> ?: return null
            val rawPrice = globalQuote["05. price"] as? String ?: return null
            val price = rawPrice.toBigDecimalOrNull() ?: return null
            PriceQuote(symbol = symbol.uppercase(), price = price, currency = "USD",
                timestamp = Instant.now(), source = sourceName)
        } catch (e: Exception) {
            log.warn("AlphaVantage response parse failed for {}: {}", symbol, e.message)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseOverview(body: Map<*, *>): FundamentalsData? {
        // Alpha Vantage returns {"Information": "..."} when rate-limited or key is invalid
        if (body.containsKey("Information") || body.containsKey("Note")) return null

        fun field(key: String): String? = (body[key] as? String)?.takeIf { it != "None" && it.isNotBlank() }
        fun decimal(key: String): BigDecimal? = field(key)?.toBigDecimalOrNull()

        return FundamentalsData(
            peRatio = decimal("PERatio"),
            pegRatio = decimal("PEGRatio"),
            eps = decimal("EPS"),
            dividendYield = decimal("DividendYield"),
            fiftyTwoWeekHigh = decimal("52WeekHigh"),
            fiftyTwoWeekLow = decimal("52WeekLow"),
            marketCap = field("MarketCapitalization")
        )
    }
}
