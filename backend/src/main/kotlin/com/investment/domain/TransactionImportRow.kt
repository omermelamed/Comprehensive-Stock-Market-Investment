package com.investment.domain

/**
 * Normalized intermediate representation of a single imported row, produced by
 * [ImportColumnMapper] after applying the user-supplied column mapping.
 *
 * All fields are nullable strings so that [ImportValidator] can report precise
 * per-field errors rather than throwing during mapping.
 */
data class TransactionImportRow(
    val symbol: String?,
    val transactionType: String?,
    val track: String?,
    val quantity: String?,
    val pricePerUnit: String?,
    val fees: String?,
    val currency: String?,
    val transactionDate: String?,
    val notes: String?
)
