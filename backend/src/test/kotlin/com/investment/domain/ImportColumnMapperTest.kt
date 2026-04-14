package com.investment.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ImportColumnMapperTest {

    // ── helpers ──────────────────────────────────────────────────────────────

    /** A typical raw row keyed by brokerage-style column names. */
    private fun rawRow(vararg pairs: Pair<String, String>) = mapOf(*pairs)

    // ── happy path ────────────────────────────────────────────────────────────

    @Test
    fun `valid BUY row maps all recognized domain fields correctly`() {
        val rawRow = rawRow(
            "Ticker" to "AAPL",
            "Action" to "BUY",
            "Track" to "LONG",
            "Qty" to "10",
            "Price" to "150.00",
            "Fee" to "1.50",
            "Ccy" to "USD",
            "Date" to "2024-01-15",
            "Notes" to "First purchase"
        )
        val mapping = mapOf(
            "Ticker" to "symbol",
            "Action" to "type",
            "Track" to "track",
            "Qty" to "quantity",
            "Price" to "price",
            "Fee" to "fees",
            "Ccy" to "currency",
            "Date" to "date",
            "Notes" to "notes"
        )

        val result = ImportColumnMapper.map(rawRow, mapping)

        assertEquals("AAPL", result.symbol)
        assertEquals("BUY", result.transactionType)
        assertEquals("LONG", result.track)
        assertEquals("10", result.quantity)
        assertEquals("150.00", result.pricePerUnit)
        assertEquals("1.50", result.fees)
        assertEquals("USD", result.currency)
        assertEquals("2024-01-15", result.transactionDate)
        assertEquals("First purchase", result.notes)
    }

    @Test
    fun `domain field name matching is case-insensitive`() {
        val rawRow = rawRow("Date" to "2024-06-01", "Symbol" to "MSFT")
        val mapping = mapOf("Date" to "DATE", "Symbol" to "SYMBOL")   // uppercase domain keys

        val result = ImportColumnMapper.map(rawRow, mapping)

        assertEquals("MSFT", result.symbol)
        assertEquals("2024-06-01", result.transactionDate)
    }

    // ── partial mapping ───────────────────────────────────────────────────────

    @Test
    fun `unmapped domain fields are null — validator will surface errors`() {
        val rawRow = rawRow("Ticker" to "VOO")
        val mapping = mapOf("Ticker" to "symbol")   // only symbol is mapped

        val result = ImportColumnMapper.map(rawRow, mapping)

        assertEquals("VOO", result.symbol)
        assertNull(result.transactionType)
        assertNull(result.quantity)
        assertNull(result.pricePerUnit)
        assertNull(result.transactionDate)
    }

    @Test
    fun `unrecognized domain field names are silently ignored`() {
        val rawRow = rawRow("Foo" to "bar", "Symbol" to "TSLA")
        val mapping = mapOf(
            "Foo" to "unknownDomainField",   // not recognized
            "Symbol" to "symbol"
        )

        val result = ImportColumnMapper.map(rawRow, mapping)

        assertEquals("TSLA", result.symbol)
        assertNull(result.transactionType)
    }

    // ── blank / missing cell values ───────────────────────────────────────────

    @Test
    fun `blank cell value results in null domain field`() {
        val rawRow = rawRow("Symbol" to "  ", "Type" to "BUY")
        val mapping = mapOf("Symbol" to "symbol", "Type" to "type")

        val result = ImportColumnMapper.map(rawRow, mapping)

        assertNull(result.symbol)        // blank trimmed → empty → treated as absent
        assertEquals("BUY", result.transactionType)
    }

    @Test
    fun `file column absent from raw row results in null domain field`() {
        val rawRow = rawRow("Symbol" to "NVDA")   // no "Date" column in file
        val mapping = mapOf("Symbol" to "symbol", "Date" to "date")

        val result = ImportColumnMapper.map(rawRow, mapping)

        assertEquals("NVDA", result.symbol)
        assertNull(result.transactionDate)
    }

    // ── empty mapping ─────────────────────────────────────────────────────────

    @Test
    fun `empty column mapping produces all-null TransactionImportRow`() {
        val rawRow = rawRow("Symbol" to "AAPL", "Date" to "2024-01-01")
        val result = ImportColumnMapper.map(rawRow, emptyMap())

        assertNull(result.symbol)
        assertNull(result.transactionType)
        assertNull(result.quantity)
        assertNull(result.pricePerUnit)
        assertNull(result.transactionDate)
    }

    // ── extra file columns ────────────────────────────────────────────────────

    @Test
    fun `extra file columns not in mapping are ignored`() {
        val rawRow = rawRow(
            "Symbol" to "ETH",
            "Price" to "3000.00",
            "ExtraCol" to "ignored_value"
        )
        val mapping = mapOf("Symbol" to "symbol", "Price" to "price")

        val result = ImportColumnMapper.map(rawRow, mapping)

        assertEquals("ETH", result.symbol)
        assertEquals("3000.00", result.pricePerUnit)
        assertNull(result.notes)
    }
}
