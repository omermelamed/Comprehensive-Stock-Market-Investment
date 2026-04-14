package com.investment.domain

import com.opencsv.CSVReader
import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.InputStream
import java.io.InputStreamReader

/**
 * Parses a CSV or Excel (.xlsx) upload into a list of raw row maps.
 * Each row is represented as a [Map] from column header to cell value string.
 * The first row of both formats is always treated as the header row.
 *
 * Pure object — no Spring dependencies, no I/O side-effects beyond reading the stream.
 */
object ImportParser {

    /**
     * Parses the [inputStream] according to [filename] extension.
     * Returns (detectedColumns, rows).
     */
    fun parse(inputStream: InputStream, filename: String): Pair<List<String>, List<Map<String, String>>> {
        return if (filename.endsWith(".xlsx", ignoreCase = true) || filename.endsWith(".xls", ignoreCase = true)) {
            parseExcel(inputStream)
        } else {
            parseCsv(inputStream)
        }
    }

    private fun parseCsv(inputStream: InputStream): Pair<List<String>, List<Map<String, String>>> {
        CSVReader(InputStreamReader(inputStream)).use { reader ->
            val allRows = reader.readAll()
            if (allRows.isEmpty()) return Pair(emptyList(), emptyList())

            val headers = allRows[0].map { it.trim() }
            val rows = allRows.drop(1)
                .filter { row -> row.any { it.isNotBlank() } } // skip blank rows
                .map { row ->
                    headers.mapIndexed { index, header ->
                        header to (if (index < row.size) row[index].trim() else "")
                    }.toMap()
                }

            return Pair(headers, rows)
        }
    }

    private fun parseExcel(inputStream: InputStream): Pair<List<String>, List<Map<String, String>>> {
        XSSFWorkbook(inputStream).use { workbook ->
            val sheet = workbook.getSheetAt(0)
            val rowIterator = sheet.rowIterator()
            if (!rowIterator.hasNext()) return Pair(emptyList(), emptyList())

            val headerRow = rowIterator.next()
            val headers = (0..headerRow.lastCellNum).map { i ->
                headerRow.getCell(i)?.stringCellValue?.trim() ?: ""
            }.filter { it.isNotBlank() }

            if (headers.isEmpty()) return Pair(emptyList(), emptyList())

            val rows = mutableListOf<Map<String, String>>()
            while (rowIterator.hasNext()) {
                val row = rowIterator.next()
                val values = headers.mapIndexed { index, header ->
                    val cell = row.getCell(index)
                    val value = when (cell?.cellType) {
                        CellType.NUMERIC -> {
                            // Avoid scientific notation for large numbers
                            val d = cell.numericCellValue
                            if (d == Math.floor(d) && !d.isInfinite()) {
                                d.toLong().toString()
                            } else {
                                d.toBigDecimal().toPlainString()
                            }
                        }
                        CellType.STRING -> cell.stringCellValue.trim()
                        CellType.BOOLEAN -> cell.booleanCellValue.toString()
                        CellType.FORMULA -> {
                            try { cell.numericCellValue.toBigDecimal().toPlainString() }
                            catch (_: Exception) { cell.stringCellValue.trim() }
                        }
                        else -> ""
                    }
                    header to value
                }.toMap()

                // Skip entirely blank rows
                if (values.values.any { it.isNotBlank() }) {
                    rows.add(values)
                }
            }

            return Pair(headers, rows)
        }
    }
}
