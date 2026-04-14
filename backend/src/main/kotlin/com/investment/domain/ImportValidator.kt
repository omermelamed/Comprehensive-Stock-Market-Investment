package com.investment.domain

import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/**
 * Validates a [TransactionImportRow] and returns an [ImportRowResult].
 *
 * Rules:
 * - symbol must be non-blank
 * - transactionType must be one of BUY/SELL/SHORT/COVER/DIVIDEND (case-insensitive)
 * - quantity must be a positive decimal
 * - price must be a positive decimal (or zero for DIVIDEND/DEPOSIT/WITHDRAWAL)
 * - transactionDate must be parseable; formats tried: yyyy-MM-dd, MM/dd/yyyy, dd/MM/yyyy
 *
 * Defaults applied when a field is absent:
 * - track      → "LONG"
 * - fees       → "0"
 * - currency   → "USD"
 *
 * SELL-vs-held-quantity is intentionally NOT checked here. That check is expensive
 * (requires a full ledger scan) and the frontend surfaces a warning to the user.
 */
object ImportValidator {

    /**
     * Types that the database enum (transaction_type_enum) recognizes.
     * DIVIDEND is intentionally excluded — it is not in the current schema enum.
     */
    private val VALID_TYPES = setOf("BUY", "SELL", "SHORT", "COVER")

    private val DATE_FORMATS = listOf(
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("MM/dd/yyyy"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("M/d/yyyy"),
        DateTimeFormatter.ofPattern("d/M/yyyy")
    )

    fun validate(rowIndex: Int, row: TransactionImportRow): ImportRowResult {
        val errors = mutableListOf<String>()

        // symbol
        if (row.symbol.isNullOrBlank()) {
            errors.add("symbol is required")
        }

        // transactionType
        val normalizedType = row.transactionType?.trim()?.uppercase()
        if (normalizedType == null) {
            errors.add("type is required")
        } else if (normalizedType !in VALID_TYPES) {
            errors.add("type must be one of ${VALID_TYPES.joinToString(", ")} (got '$normalizedType')")
        }

        // quantity
        val quantity = parseBigDecimal(row.quantity)
        if (quantity == null) {
            errors.add("quantity must be a valid number")
        } else if (quantity <= BigDecimal.ZERO) {
            errors.add("quantity must be positive (got ${row.quantity})")
        }

        // price — database enforces price_per_unit > 0
        val price = parseBigDecimal(row.pricePerUnit)
        if (price == null) {
            errors.add("price must be a valid number")
        } else if (price <= BigDecimal.ZERO) {
            errors.add("price must be positive (got ${row.pricePerUnit})")
        }

        // date
        val parsedDate = parseDate(row.transactionDate)
        if (parsedDate == null) {
            val display = row.transactionDate ?: "(absent)"
            errors.add("date '$display' could not be parsed; accepted formats: yyyy-MM-dd, MM/dd/yyyy, dd/MM/yyyy")
        }

        if (errors.isNotEmpty()) {
            return ImportRowResult(rowIndex = rowIndex, status = ImportRowStatus.ERROR, errors = errors, parsedRow = null)
        }

        val parsedRow = ParsedTransactionRow(
            symbol = row.symbol!!.trim().uppercase(),
            transactionType = normalizedType!!,
            track = row.track?.trim()?.uppercase() ?: "LONG",
            quantity = quantity!!.toPlainString(),
            pricePerUnit = price!!.toPlainString(),
            totalAmount = (quantity * price).toPlainString(),
            fees = (parseBigDecimal(row.fees) ?: BigDecimal.ZERO).toPlainString(),
            currency = row.currency?.trim()?.uppercase() ?: "USD",
            transactionDate = parsedDate!!.toString(),
            notes = row.notes?.trim()?.ifEmpty { null }
        )

        return ImportRowResult(rowIndex = rowIndex, status = ImportRowStatus.OK, errors = emptyList(), parsedRow = parsedRow)
    }

    fun parseDate(raw: String?): LocalDate? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        for (fmt in DATE_FORMATS) {
            try {
                return LocalDate.parse(trimmed, fmt)
            } catch (_: DateTimeParseException) {
                // try next format
            }
        }
        return null
    }

    private fun parseBigDecimal(raw: String?): BigDecimal? {
        if (raw.isNullOrBlank()) return null
        return try {
            BigDecimal(raw.trim().replace(",", ""))
        } catch (_: NumberFormatException) {
            null
        }
    }
}

enum class ImportRowStatus { OK, ERROR }

data class ParsedTransactionRow(
    val symbol: String,
    val transactionType: String,
    val track: String,
    val quantity: String,
    val pricePerUnit: String,
    val totalAmount: String,
    val fees: String,
    val currency: String,
    val transactionDate: String,
    val notes: String?
)

data class ImportRowResult(
    val rowIndex: Int,
    val status: ImportRowStatus,
    val errors: List<String>,
    val parsedRow: ParsedTransactionRow?
)
