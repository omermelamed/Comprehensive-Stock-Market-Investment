package com.investment.application

import com.investment.api.dto.ImportConfirmRequest
import com.investment.api.dto.ImportPreviewResponse
import com.investment.api.dto.ImportRowResultDto
import com.investment.api.dto.ImportSummaryResponse
import com.investment.domain.ImportColumnMapper
import com.investment.domain.ImportParser
import com.investment.domain.ImportRowStatus
import com.investment.domain.ImportValidator
import com.investment.infrastructure.TransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate
import java.time.ZoneOffset

@Service
class ImportService(
    private val transactionRepository: TransactionRepository,
    @Lazy @Autowired private val snapshotService: SnapshotService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * Parses [file], applies [columnMapping], and validates every row.
     * No data is written to the database.
     *
     * [columnMapping] maps file-column-name → domain-field-name.
     * Recognized domain field names: symbol, type, track, quantity, price, date, notes, fees, currency
     */
    fun preview(file: MultipartFile, columnMapping: Map<String, String>): ImportPreviewResponse {
        val filename = file.originalFilename ?: file.name
        val (detectedColumns, rawRows) = ImportParser.parse(file.inputStream, filename)

        val results = rawRows.mapIndexed { index, rawRow ->
            val importRow = ImportColumnMapper.map(rawRow, columnMapping)
            val result = ImportValidator.validate(index, importRow)
            ImportRowResultDto(
                rowIndex = result.rowIndex,
                status = result.status.name,
                errors = result.errors,
                parsedRow = result.parsedRow
            )
        }

        return ImportPreviewResponse(
            detectedColumns = detectedColumns,
            rows = results,
            validCount = results.count { it.status == ImportRowStatus.OK.name },
            errorCount = results.count { it.status == ImportRowStatus.ERROR.name }
        )
    }

    /**
     * Bulk-inserts the rows from [request] into the transactions table with source = IMPORT.
     * All rows in the request are assumed to be valid (they came from a successful preview).
     * Returns the count of rows inserted.
     */
    @Transactional
    fun confirm(request: ImportConfirmRequest): ImportSummaryResponse {
        if (request.rows.isEmpty()) {
            return ImportSummaryResponse(imported = 0, skipped = 0)
        }
        val inserted = transactionRepository.insertImport(request.rows)
        val skipped = request.rows.size - inserted

        val earliestDate = request.rows
            .mapNotNull { row ->
                try {
                    LocalDate.parse(row.transactionDate)
                } catch (_: Exception) {
                    null
                }
            }
            .minOrNull()

        if (earliestDate != null) {
            TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
                override fun afterCommit() {
                    Thread {
                        try {
                            snapshotService.regenerateSnapshotsFrom(earliestDate)
                        } catch (e: Exception) {
                            log.warn("Snapshot regeneration after import failed from {}: {}", earliestDate, e.message)
                        }
                    }.also { it.isDaemon = true }.start()
                }
            })
        }

        return ImportSummaryResponse(imported = inserted, skipped = skipped)
    }
}
