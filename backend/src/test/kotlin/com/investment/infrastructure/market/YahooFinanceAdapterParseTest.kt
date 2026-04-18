package com.investment.infrastructure.market

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class YahooFinanceAdapterParseTest {

    @Test
    fun `parseDayChangePercent returns value when present`() {
        val meta = mapOf("regularMarketChangePercent" to 1.234567)
        val result = YahooFinanceAdapter.parseDayChangePercent(meta)
        assertEquals(BigDecimal("1.2346"), result)
    }

    @Test
    fun `parseDayChangePercent returns null when absent`() {
        val meta = emptyMap<String, Any>()
        val result = YahooFinanceAdapter.parseDayChangePercent(meta)
        assertNull(result)
    }

    @Test
    fun `parseSectorInfo extracts sector from assetProfile`() {
        val assetProfile = mapOf("sector" to "Technology")
        val result = YahooFinanceAdapter.parseSectorInfo(assetProfile)
        assertEquals("Technology", result)
    }

    @Test
    fun `parseSectorInfo returns null when sector blank`() {
        val assetProfile = mapOf("sector" to "")
        val result = YahooFinanceAdapter.parseSectorInfo(assetProfile)
        assertNull(result)
    }

    @Test
    fun `parseSectorInfo returns null when sector absent`() {
        val result = YahooFinanceAdapter.parseSectorInfo(emptyMap<String, Any>())
        assertNull(result)
    }

    @Test
    fun `parseNewsHeadlines returns up to 2 titles`() {
        val newsItems = listOf(
            mapOf("title" to "Headline One"),
            mapOf("title" to "Headline Two"),
            mapOf("title" to "Headline Three")
        )
        val result = YahooFinanceAdapter.parseNewsHeadlines(newsItems)
        assertEquals(listOf("Headline One", "Headline Two"), result)
    }

    @Test
    fun `parseNewsHeadlines skips items with blank title`() {
        val newsItems = listOf(
            mapOf("title" to ""),
            mapOf("title" to "Real Headline")
        )
        val result = YahooFinanceAdapter.parseNewsHeadlines(newsItems)
        assertEquals(listOf("Real Headline"), result)
    }

    @Test
    fun `parseNewsHeadlines returns empty when list is empty`() {
        val result = YahooFinanceAdapter.parseNewsHeadlines(emptyList<Map<String, Any>>())
        assertEquals(emptyList<String>(), result)
    }
}
