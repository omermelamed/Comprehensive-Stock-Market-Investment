package com.investment.infrastructure.market

import com.investment.domain.PriceQuote
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@Component
class YahooFinanceAdapter(
    @Qualifier("marketDataRestClient") private val restClient: RestClient,
) : MarketDataProvider {

    private val log = LoggerFactory.getLogger(javaClass)
    private val marketTz = ZoneId.of("America/New_York")
    private val AGORA_DIVISOR = BigDecimal("100")

    override val sourceName: String = "YAHOO"

    override fun fetchQuote(symbol: String): PriceQuote? {
        return try {
            val url = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=1d"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return null
            parseQuote(symbol, body)
        } catch (e: Exception) {
            log.warn("YahooFinance quote fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    /**
     * Fetches adjusted daily closing prices for [symbol] covering [fromDate] to [toDate].
     * Returns a map of trading date → adjusted close price. Returns empty map on any failure.
     * Uses adjusted close to account for dividends and splits.
     */
    fun fetchHistoricalPrices(symbol: String, fromDate: LocalDate, toDate: LocalDate): Map<LocalDate, BigDecimal> {
        val daySpan = toDate.toEpochDay() - fromDate.toEpochDay()
        val range = when {
            daySpan <= 35  -> "1mo"
            daySpan <= 95  -> "3mo"
            daySpan <= 190 -> "6mo"
            daySpan <= 370 -> "1y"
            daySpan <= 740 -> "2y"
            else           -> "5y"
        }
        return try {
            val url = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=$range"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return emptyMap()
            parseHistorical(body, fromDate, toDate)
        } catch (e: Exception) {
            log.warn("YahooFinance historical fetch failed for {}: {}", symbol, e.message)
            emptyMap()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseQuote(symbol: String, body: Map<*, *>): PriceQuote? {
        return try {
            val chart = body["chart"] as? Map<*, *> ?: return null
            val results = chart["result"] as? List<*> ?: return null
            val first = results.firstOrNull() as? Map<*, *> ?: return null
            val meta = first["meta"] as? Map<*, *> ?: return null

            val rawPrice = meta["regularMarketPrice"] ?: return null
            var price = when (rawPrice) {
                is Number -> BigDecimal(rawPrice.toString())
                else -> return null
            }
            var currency = meta["currency"] as? String ?: "USD"

            // Yahoo returns Israeli stock prices in Agorot (ILA). Convert to Shekels (ILS).
            if (currency.equals("ILA", ignoreCase = true)) {
                price = price.divide(AGORA_DIVISOR, 4, RoundingMode.HALF_UP)
                currency = "ILS"
            }

            PriceQuote(symbol = symbol.uppercase(), price = price, currency = currency,
                timestamp = Instant.now(), source = sourceName)
        } catch (e: Exception) {
            log.warn("YahooFinance response parse failed for {}: {}", symbol, e.message)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseHistorical(body: Map<*, *>, fromDate: LocalDate, toDate: LocalDate): Map<LocalDate, BigDecimal> {
        return try {
            val chart = body["chart"] as? Map<*, *> ?: return emptyMap()
            val results = chart["result"] as? List<*> ?: return emptyMap()
            val first = results.firstOrNull() as? Map<*, *> ?: return emptyMap()

            val meta = first["meta"] as? Map<*, *>
            val currency = meta?.get("currency") as? String ?: "USD"
            val isAgora = currency.equals("ILA", ignoreCase = true)

            val timestamps = first["timestamp"] as? List<*> ?: return emptyMap()
            val indicators = first["indicators"] as? Map<*, *> ?: return emptyMap()

            // Prefer adjusted close; fall back to regular close
            val adjcloseBlock = (indicators["adjclose"] as? List<*>)?.firstOrNull() as? Map<*, *>
            val prices: List<*>? = (adjcloseBlock?.get("adjclose") as? List<*>)
                ?: ((indicators["quote"] as? List<*>)?.firstOrNull() as? Map<*, *>)?.get("close") as? List<*>

            if (prices == null) return emptyMap()

            val result = mutableMapOf<LocalDate, BigDecimal>()
            for (i in timestamps.indices) {
                val ts = timestamps[i] as? Number ?: continue
                val rawPrice = prices.getOrNull(i) as? Number ?: continue
                val date = Instant.ofEpochSecond(ts.toLong()).atZone(marketTz).toLocalDate()
                if (date.isBefore(fromDate) || date.isAfter(toDate)) continue
                var p = BigDecimal(rawPrice.toString()).setScale(4, RoundingMode.HALF_UP)
                if (isAgora) p = p.divide(AGORA_DIVISOR, 4, RoundingMode.HALF_UP)
                result[date] = p
            }
            result
        } catch (e: Exception) {
            log.warn("YahooFinance historical parse failed: {}", e.message)
            emptyMap()
        }
    }
}
