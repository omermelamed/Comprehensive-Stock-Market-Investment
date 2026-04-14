package com.investment.domain

/**
 * Maps a raw file row (keyed by file column headers) into a [TransactionImportRow]
 * using the caller-supplied column mapping.
 *
 * The [columnMapping] parameter maps **file column names** → **domain field names**.
 * Recognized domain field names (case-insensitive):
 *   symbol, type, track, quantity, price, date, notes, fees, currency
 *
 * Missing mapping entries are silently left null so that [ImportValidator] can
 * report them as errors with precise field context.
 */
object ImportColumnMapper {

    /** Domain field identifiers accepted in the column mapping. */
    private val DOMAIN_FIELDS = setOf(
        "symbol", "type", "track", "quantity", "price", "date", "notes", "fees", "currency"
    )

    /**
     * Maps [rawRow] (file-header → raw-cell-value) into a [TransactionImportRow]
     * using [columnMapping] (file-header → domain-field).
     *
     * Unrecognized or unmapped file columns are ignored.
     */
    fun map(rawRow: Map<String, String>, columnMapping: Map<String, String>): TransactionImportRow {
        // Invert: domainField → rawValue
        val byDomain = mutableMapOf<String, String>()
        for ((fileCol, domainField) in columnMapping) {
            val normalized = domainField.trim().lowercase()
            if (normalized in DOMAIN_FIELDS) {
                val cellValue = rawRow[fileCol]?.trim()
                if (!cellValue.isNullOrEmpty()) {
                    byDomain[normalized] = cellValue
                }
            }
        }

        return TransactionImportRow(
            symbol = byDomain["symbol"],
            transactionType = byDomain["type"],
            track = byDomain["track"],
            quantity = byDomain["quantity"],
            pricePerUnit = byDomain["price"],
            fees = byDomain["fees"],
            currency = byDomain["currency"],
            transactionDate = byDomain["date"],
            notes = byDomain["notes"]
        )
    }
}
