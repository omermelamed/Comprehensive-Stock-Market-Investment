package com.investment.domain

import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.ByteArrayOutputStream

/**
 * Pure object that converts a table (headers + rows) into either a CSV byte array
 * or an Excel (.xlsx) byte array.
 *
 * No Spring dependencies. No I/O side-effects beyond the returned byte array.
 */
object ExportFormatter {

    /**
     * @param headers column names, in order
     * @param rows    each row is a list of values (null rendered as empty string)
     * @param format  "csv" (default) or "xlsx"
     */
    fun format(headers: List<String>, rows: List<List<Any?>>, format: String): ByteArray {
        return when (format.lowercase()) {
            "xlsx" -> formatXlsx(headers, rows)
            else   -> formatCsv(headers, rows)
        }
    }

    private fun formatCsv(headers: List<String>, rows: List<List<Any?>>): ByteArray {
        val sb = StringBuilder()
        sb.appendLine(headers.joinToString(",") { escapeCsv(it) })
        for (row in rows) {
            sb.appendLine(row.joinToString(",") { escapeCsv(it?.toString() ?: "") })
        }
        return sb.toString().toByteArray(Charsets.UTF_8)
    }

    private fun escapeCsv(value: String): String {
        return if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            "\"${value.replace("\"", "\"\"")}\""
        } else {
            value
        }
    }

    private fun formatXlsx(headers: List<String>, rows: List<List<Any?>>): ByteArray {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Export")

        // Header row
        val headerRow = sheet.createRow(0)
        headers.forEachIndexed { i, h -> headerRow.createCell(i).setCellValue(h) }

        // Data rows
        rows.forEachIndexed { rowIdx, row ->
            val sheetRow = sheet.createRow(rowIdx + 1)
            row.forEachIndexed { colIdx, value ->
                val cell = sheetRow.createCell(colIdx)
                when (value) {
                    is Number -> cell.setCellValue(value.toDouble())
                    null      -> cell.setCellValue("")
                    else      -> cell.setCellValue(value.toString())
                }
            }
        }

        // Auto-size columns
        headers.indices.forEach { sheet.autoSizeColumn(it) }

        return ByteArrayOutputStream().also { workbook.write(it) }.toByteArray()
    }
}
