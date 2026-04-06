package com.investment.application

import com.investment.infrastructure.SymbolAliasRepository
import org.springframework.stereotype.Service

@Service
class SymbolResolverService(private val symbolAliasRepository: SymbolAliasRepository) {

    /**
     * Resolves a user-facing symbol to the real Yahoo Finance symbol.
     * Returns the alias target if one exists, otherwise returns the input unchanged.
     */
    fun resolve(symbol: String): String {
        return symbolAliasRepository.findByAlias(symbol.uppercase()) ?: symbol
    }
}
