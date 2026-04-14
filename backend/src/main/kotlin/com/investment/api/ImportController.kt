package com.investment.api

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.ImportConfirmRequest
import com.investment.api.dto.ImportPreviewResponse
import com.investment.api.dto.ImportSummaryResponse
import com.investment.application.ImportService
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/import")
class ImportController(
    private val importService: ImportService
) {

    private val objectMapper = jacksonObjectMapper()

    /**
     * Parses [file] using [columnMapping] (a JSON string mapping file-column → domain-field).
     * Returns a preview of every row with per-row validation results. Nothing is persisted.
     *
     * Example columnMapping: {"Date":"date","Ticker":"symbol","Action":"type","Qty":"quantity","Price":"price"}
     */
    @PostMapping("/preview", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun preview(
        @RequestPart("file") file: MultipartFile,
        @RequestParam("columnMapping") columnMappingJson: String
    ): ResponseEntity<ImportPreviewResponse> {
        val columnMapping: Map<String, String> = objectMapper.readValue(columnMappingJson)
        val response = importService.preview(file, columnMapping)
        return ResponseEntity.ok(response)
    }

    /**
     * Bulk-inserts the valid rows returned from a prior preview call.
     * All rows are assumed to have been validated — only valid rows should be sent.
     */
    @PostMapping("/confirm")
    fun confirm(@RequestBody request: ImportConfirmRequest): ResponseEntity<ImportSummaryResponse> {
        val response = importService.confirm(request)
        return ResponseEntity.ok(response)
    }
}
