package com.investment.application

import com.investment.domain.MarketDataUnavailableException
import com.investment.domain.OhlcBar
import com.investment.domain.PriceQuote
import com.investment.infrastructure.market.MarketDataProvider
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
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
        private const val CACHE_TTL_SECONDS = 300L
        private const val STALE_CACHE_MAX_SECONDS = 86_400L
    }

    fun getQuote(symbol: String): PriceQuote {
        val upperSymbol = symbol.uppercase()
        val resolvedSymbol = symbolResolverService.resolve(upperSymbol)
        val cacheKey = upperSymbol
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

        if (cached != null && now.isBefore(cached.cachedAt.plusSeconds(STALE_CACHE_MAX_SECONDS))) {
            log.warn("All providers failed for {}; returning stale cached quote from {}", upperSymbol, cached.cachedAt)
            return cached.quote
        }

        throw MarketDataUnavailableException(upperSymbol)
    }

    /**
     * Fetches closing prices for [symbol] for each trading day in [[from], [to]].
     * Tries providers in order; returns the first non-empty result.
     * Non-trading days (weekends, holidays) are simply absent from the returned map.
     */
    fun getHistoricalPrices(symbol: String, from: LocalDate, to: LocalDate): Map<LocalDate, BigDecimal> {
        val resolvedSymbol = symbolResolverService.resolve(symbol.uppercase())
        for (provider in providers) {
            val prices = try {
                provider.fetchHistoricalPrices(resolvedSymbol, from, to)
            } catch (e: Exception) {
                log.warn("Provider {} historical fetch failed for {}: {}", provider.sourceName, symbol, e.message)
                emptyMap()
            }
            if (prices.isNotEmpty()) return prices
        }
        log.warn("No historical prices found for {} from {} to {}", symbol, from, to)
        return emptyMap()
    }

    fun getOhlcBars(symbol: String, from: LocalDate, to: LocalDate): List<OhlcBar> {
        val resolvedSymbol = symbolResolverService.resolve(symbol.uppercase())
        for (provider in providers) {
            val bars = try {
                provider.fetchOhlcBars(resolvedSymbol, from, to)
            } catch (e: Exception) {
                log.warn("Provider {} OHLC fetch failed for {}: {}", provider.sourceName, symbol, e.message)
                emptyList()
            }
            if (bars.isNotEmpty()) return bars
        }
        log.warn("No OHLC data found for {} from {} to {}", symbol, from, to)
        return emptyList()
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
