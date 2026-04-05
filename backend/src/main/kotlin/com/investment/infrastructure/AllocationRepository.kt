package com.investment.infrastructure

import com.investment.api.dto.TargetAllocationRequest
import com.investment.api.dto.TargetAllocationResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Repository
class AllocationRepository(
    private val dsl: DSLContext
) {

    fun findAll(): List<TargetAllocationResponse> {
        return dsl.fetch("SELECT * FROM target_allocations ORDER BY display_order, created_at")
            .map { it.toResponse() }
    }

    fun insert(request: TargetAllocationRequest): TargetAllocationResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO target_allocations (id, symbol, asset_type, target_percentage, label, display_order, created_at, updated_at)
            VALUES (?::uuid, ?, ?::asset_type_enum, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (UPPER(symbol)) DO UPDATE SET
                asset_type = EXCLUDED.asset_type,
                target_percentage = EXCLUDED.target_percentage,
                label = EXCLUDED.label,
                display_order = EXCLUDED.display_order,
                updated_at = NOW()
            RETURNING *
            """.trimIndent(),
            id.toString(),
            request.symbol.uppercase(),
            request.assetType.uppercase(),
            request.targetPercentage,
            request.label,
            request.displayOrder
        ) ?: throw IllegalStateException("Upsert into target_allocations returned no record")

        return record.toResponse()
    }

    fun update(id: UUID, request: TargetAllocationRequest): TargetAllocationResponse {
        val record = dsl.fetchOne(
            """
            UPDATE target_allocations SET
                symbol = ?,
                asset_type = ?::asset_type_enum,
                target_percentage = ?,
                label = ?,
                display_order = ?
            WHERE id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.symbol.uppercase(),
            request.assetType.uppercase(),
            request.targetPercentage,
            request.label,
            request.displayOrder,
            id.toString()
        ) ?: throw NoSuchElementException("No allocation found with id $id")

        return record.toResponse()
    }

    fun delete(id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM target_allocations WHERE id = ?::uuid",
            id.toString()
        )
        if (deleted == 0) {
            throw NoSuchElementException("No allocation found with id $id")
        }
    }

    @Transactional
    fun replaceAll(allocations: List<TargetAllocationRequest>) {
        dsl.execute("DELETE FROM target_allocations")
        allocations.forEach { insert(it) }
    }

    private fun Record.toResponse(): TargetAllocationResponse {
        return TargetAllocationResponse(
            id = UUID.fromString(get("id", String::class.java)),
            symbol = get("symbol", String::class.java),
            assetType = get("asset_type", String::class.java),
            targetPercentage = get("target_percentage", BigDecimal::class.java),
            label = get("label", String::class.java),
            displayOrder = get("display_order", Int::class.java),
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant(),
            updatedAt = get("updated_at", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
