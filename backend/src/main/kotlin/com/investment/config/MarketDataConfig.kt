package com.investment.config

import com.investment.infrastructure.market.AlphaVantageAdapter
import com.investment.infrastructure.market.MarketDataProvider
import com.investment.infrastructure.market.PolygonAdapter
import com.investment.infrastructure.market.YahooFinanceAdapter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestClient
import java.time.Clock

@Configuration
class MarketDataConfig {

    @Bean
    fun clock(): Clock = Clock.systemUTC()

    @Bean
    fun marketDataRestClient(): RestClient = RestClient.builder()
        .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; investment-platform/1.0)")
        .build()

    // Explicit ordered list: Yahoo → Polygon → AlphaVantage
    @Bean
    fun marketDataProviders(
        yahoo: YahooFinanceAdapter,
        polygon: PolygonAdapter,
        alphaVantage: AlphaVantageAdapter,
    ): List<MarketDataProvider> = listOf(yahoo, polygon, alphaVantage)
}
