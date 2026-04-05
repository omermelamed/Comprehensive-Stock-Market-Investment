package com.investment.application

import com.investment.domain.MarketDataUnavailableException
import com.investment.domain.PriceQuote
import com.investment.infrastructure.market.MarketDataProvider
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Service
class MarketDataService(
    private val providers: List<MarketDataProvider>,
    private val clock: Clock,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private data class CachedQuote(
        val quote: PriceQuote,
        val cachedAt: Instant,
    )

    private val cache = ConcurrentHashMap<String, CachedQuote>()

    companion object {
        private const val CACHE_TTL_SECONDS = 60L
    }

    fun getQuote(symbol: String): PriceQuote {
        val upperSymbol = symbol.uppercase()
        val now = clock.instant()

        val cached = cache[upperSymbol]
        if (cached != null && now.isBefore(cached.cachedAt.plusSeconds(CACHE_TTL_SECONDS))) {
            log.debug("Cache hit for {}", upperSymbol)
            return cached.quote
        }

        for (provider in providers) {
            val quote = try {
                provider.fetchQuote(upperSymbol)
            } catch (e: Exception) {
                log.warn("Provider {} threw unexpectedly for {}: {}", provider.sourceName, upperSymbol, e.message)
                null
            }

            if (quote != null) {
                cache[upperSymbol] = CachedQuote(quote = quote, cachedAt = now)
                log.debug("Quote for {} fetched from {}", upperSymbol, provider.sourceName)
                return quote
            }
        }

        throw MarketDataUnavailableException(upperSymbol)
    }

    fun getExchangeRate(toCurrency: String): BigDecimal {
        if (toCurrency.uppercase() == "USD") return BigDecimal.ONE
        val fxSymbol = "USD${toCurrency.uppercase()}=X"
        return try {
            getQuote(fxSymbol).price
        } catch (e: Exception) {
            log.warn("Could not fetch FX rate for {}, defaulting to 1.0", fxSymbol)
            BigDecimal.ONE
        }
    }
}
