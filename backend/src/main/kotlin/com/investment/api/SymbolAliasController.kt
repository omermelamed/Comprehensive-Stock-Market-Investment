package com.investment.api

import com.investment.api.dto.CreateSymbolAliasRequest
import com.investment.api.dto.SymbolAliasResponse
import com.investment.infrastructure.SymbolAliasRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/symbol-aliases")
class SymbolAliasController(private val repository: SymbolAliasRepository) {

    @GetMapping
    fun getAll(): ResponseEntity<List<SymbolAliasResponse>> {
        return ResponseEntity.ok(repository.findAll())
    }

    @PostMapping
    fun create(@RequestBody request: CreateSymbolAliasRequest): ResponseEntity<SymbolAliasResponse> {
        require(request.alias.isNotBlank()) { "Alias must not be blank" }
        require(request.yahooSymbol.isNotBlank()) { "Yahoo symbol must not be blank" }
        val result = repository.upsert(request.alias, request.yahooSymbol)
        return ResponseEntity.status(201).body(result)
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        repository.delete(id)
        return ResponseEntity.noContent().build()
    }
}
