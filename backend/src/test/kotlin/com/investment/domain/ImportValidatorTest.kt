package com.investment.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ImportValidatorTest {

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun row(
        symbol: String? = "AAPL",
        type: String? = "BUY",
        track: String? = null,
        quantity: String? = "10",
        price: String? = "150.00",
        fees: String? = null,
        currency: String? = null,
        date: String? = "2024-01-15",
        notes: String? = null
    ) = TransactionImportRow(
        symbol = symbol,
        transactionType = type,
        track = track,
        quantity = quantity,
        pricePerUnit = price,
        fees = fees,
        currency = currency,
        transactionDate = date,
        notes = notes
    )

    // ── valid row ─────────────────────────────────────────────────────────────

    @Test
    fun `valid BUY row produces OK result with correct parsed values`() {
        val result = ImportValidator.validate(0, row())

        assertEquals(ImportRowStatus.OK, result.status)
        assertTrue(result.errors.isEmpty())
        assertNotNull(result.parsedRow)

        val parsed = result.parsedRow!!
        assertEquals("AAPL", parsed.symbol)
        assertEquals("BUY", parsed.transactionType)
        assertEquals("LONG", parsed.track)     // default applied
        assertEquals("10", parsed.quantity)
        assertEquals("150.00", parsed.pricePerUnit)
        assertEquals("0", parsed.fees)          // default applied
        assertEquals("USD", parsed.currency)    // default applied
        assertEquals("2024-01-15", parsed.transactionDate)
        assertNull(parsed.notes)
    }

    @Test
    fun `valid SELL row with explicit track and fees`() {
        val result = ImportValidator.validate(1, row(
            type = "sell",           // case-insensitive
            track = "long",
            quantity = "5",
            price = "200.00",
            fees = "2.50",
            currency = "usd",
            date = "2024-03-01"
        ))

        assertEquals(ImportRowStatus.OK, result.status)
        assertEquals("SELL", result.parsedRow!!.transactionType)
        assertEquals("LONG", result.parsedRow!!.track)
        assertEquals("2.50", result.parsedRow!!.fees)
        assertEquals("USD", result.parsedRow!!.currency)
    }

    // ── symbol validation ─────────────────────────────────────────────────────

    @Test
    fun `missing symbol returns ERROR with symbol message`() {
        val result = ImportValidator.validate(0, row(symbol = null))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertNull(result.parsedRow)
        assertTrue(result.errors.any { it.contains("symbol") })
    }

    @Test
    fun `blank symbol returns ERROR`() {
        val result = ImportValidator.validate(0, row(symbol = "  "))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("symbol") })
    }

    // ── type validation ───────────────────────────────────────────────────────

    @Test
    fun `missing type returns ERROR`() {
        val result = ImportValidator.validate(0, row(type = null))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("type") })
    }

    @Test
    fun `invalid type returns ERROR with list of valid types`() {
        val result = ImportValidator.validate(0, row(type = "DEPOSIT"))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertNull(result.parsedRow)
        assertTrue(result.errors.any { it.contains("type must be one of") })
    }

    @Test
    fun `type matching is case-insensitive`() {
        val result = ImportValidator.validate(0, row(type = "buy"))
        assertEquals(ImportRowStatus.OK, result.status)
        assertEquals("BUY", result.parsedRow!!.transactionType)
    }

    // ── quantity validation ───────────────────────────────────────────────────

    @Test
    fun `negative quantity returns ERROR`() {
        val result = ImportValidator.validate(0, row(quantity = "-5"))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertNull(result.parsedRow)
        assertTrue(result.errors.any { it.contains("quantity must be positive") })
    }

    @Test
    fun `zero quantity returns ERROR`() {
        val result = ImportValidator.validate(0, row(quantity = "0"))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("quantity must be positive") })
    }

    @Test
    fun `non-numeric quantity returns ERROR`() {
        val result = ImportValidator.validate(0, row(quantity = "lots"))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("quantity must be a valid number") })
    }

    @Test
    fun `missing quantity returns ERROR`() {
        val result = ImportValidator.validate(0, row(quantity = null))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("quantity") })
    }

    // ── price validation ──────────────────────────────────────────────────────

    @Test
    fun `zero price returns ERROR because database enforces price_per_unit gt 0`() {
        val result = ImportValidator.validate(0, row(price = "0"))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("price must be positive") })
    }

    @Test
    fun `negative price returns ERROR`() {
        val result = ImportValidator.validate(0, row(price = "-10.00"))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("price must be positive") })
    }

    // ── date validation ───────────────────────────────────────────────────────

    @Test
    fun `ISO date format yyyy-MM-dd parses correctly`() {
        val result = ImportValidator.validate(0, row(date = "2024-01-15"))

        assertEquals(ImportRowStatus.OK, result.status)
        assertEquals("2024-01-15", result.parsedRow!!.transactionDate)
    }

    @Test
    fun `US date format MM-slash-dd-slash-yyyy parses correctly`() {
        val result = ImportValidator.validate(0, row(date = "01/15/2024"))

        assertEquals(ImportRowStatus.OK, result.status)
        assertEquals("2024-01-15", result.parsedRow!!.transactionDate)
    }

    @Test
    fun `European date format dd-slash-MM-slash-yyyy parses correctly`() {
        // 03/04/2024 is ambiguous; ImportValidator tries MM/dd/yyyy first (→ March 4)
        // Use unambiguous day > 12 to prove dd/MM/yyyy path: 15/04/2024
        val result = ImportValidator.validate(0, row(date = "15/04/2024"))

        assertEquals(ImportRowStatus.OK, result.status)
        assertEquals("2024-04-15", result.parsedRow!!.transactionDate)
    }

    @Test
    fun `unparseable date returns ERROR with helpful message`() {
        val result = ImportValidator.validate(0, row(date = "not-a-date"))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("could not be parsed") })
    }

    @Test
    fun `missing date returns ERROR`() {
        val result = ImportValidator.validate(0, row(date = null))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.any { it.contains("date") })
    }

    // ── totalAmount derivation ────────────────────────────────────────────────

    @Test
    fun `total amount is quantity times price`() {
        val result = ImportValidator.validate(0, row(quantity = "10", price = "150.00"))

        assertEquals(ImportRowStatus.OK, result.status)
        assertEquals("1500.00", result.parsedRow!!.totalAmount)
    }

    // ── multiple errors ───────────────────────────────────────────────────────

    @Test
    fun `row missing both symbol and type accumulates two errors`() {
        val result = ImportValidator.validate(0, row(symbol = null, type = null))

        assertEquals(ImportRowStatus.ERROR, result.status)
        assertTrue(result.errors.size >= 2)
    }

    // ── rowIndex propagation ──────────────────────────────────────────────────

    @Test
    fun `rowIndex is propagated into result`() {
        val result = ImportValidator.validate(42, row())
        assertEquals(42, result.rowIndex)
    }
}
