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
    private val symbolResolverService: SymbolResolverService,
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
        val resolvedSymbol = symbolResolverService.resolve(upperSymbol)
        val cacheKey = upperSymbol // cache by user-facing symbol
        val now = clock.instant()

        val cached = cache[cacheKey]
        if (cached != null && now.isBefore(cached.cachedAt.plusSeconds(CACHE_TTL_SECONDS))) {
            log.debug("Cache hit for {}", cacheKey)
            return cached.quote
        }

        for (provider in providers) {
            val quote = try {
                provider.fetchQuote(resolvedSymbol)
            } catch (e: Exception) {
                log.warn("Provider {} threw unexpectedly for {} (resolved: {}): {}", provider.sourceName, upperSymbol, resolvedSymbol, e.message)
                null
            }

            if (quote != null) {
                cache[cacheKey] = CachedQuote(quote = quote, cachedAt = now)
                log.debug("Quote for {} (resolved: {}) fetched from {}", upperSymbol, resolvedSymbol, provider.sourceName)
                return quote
            }
        }

        throw MarketDataUnavailableException(upperSymbol)
    }

    /**
     * Returns the exchange rate to convert 1 unit of [fromCurrency] into [toCurrency].
     * Uses Yahoo Finance FX pairs (e.g. USDILS=X).
     */
    fun getExchangeRate(fromCurrency: String, toCurrency: String): BigDecimal {
        val from = fromCurrency.uppercase()
        val to = toCurrency.uppercase()
        if (from == to) return BigDecimal.ONE
        val fxSymbol = "${from}${to}=X"
        return try {
            getQuote(fxSymbol).price
        } catch (e: Exception) {
            log.warn("Could not fetch FX rate for {}, defaulting to 1.0", fxSymbol)
            BigDecimal.ONE
        }
    }
}
