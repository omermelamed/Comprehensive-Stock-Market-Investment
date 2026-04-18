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
        val allRows = dsl.fetch("SELECT * FROM target_allocations ORDER BY display_order, created_at")
        val parentIds = allRows
            .mapNotNull { it.get("parent_id", String::class.java) }
            .map { it.uppercase() }
            .toSet()
        val idsWithChildren = allRows
            .map { it.get("id", String::class.java).uppercase() }
            .filter { it in parentIds }
            .toSet()
        return allRows.map { it.toResponse(idsWithChildren) }
    }

    fun insert(request: TargetAllocationRequest): TargetAllocationResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO target_allocations (id, symbol, asset_type, target_percentage, label, display_order, parent_id, sector, created_at, updated_at)
            VALUES (?::uuid, ?, ?::asset_type_enum, ?, ?, ?, ?::uuid, ?, NOW(), NOW())
            ON CONFLICT (UPPER(symbol)) DO UPDATE SET
                asset_type = EXCLUDED.asset_type,
                target_percentage = EXCLUDED.target_percentage,
                label = EXCLUDED.label,
                display_order = EXCLUDED.display_order,
                parent_id = EXCLUDED.parent_id,
                sector = EXCLUDED.sector,
                updated_at = NOW()
            RETURNING *
            """.trimIndent(),
            id.toString(),
            request.symbol.uppercase(),
            request.assetType.uppercase(),
            request.targetPercentage,
            request.label,
            request.displayOrder,
            request.parentId,
            request.sector
        ) ?: throw IllegalStateException("Upsert into target_allocations returned no record")

        return record.toResponse(emptySet())
    }

    fun update(id: UUID, request: TargetAllocationRequest): TargetAllocationResponse {
        val record = dsl.fetchOne(
            """
            UPDATE target_allocations SET
                symbol = ?,
                asset_type = ?::asset_type_enum,
                target_percentage = ?,
                label = ?,
                display_order = ?,
                parent_id = ?::uuid,
                sector = ?
            WHERE id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.symbol.uppercase(),
            request.assetType.uppercase(),
            request.targetPercentage,
            request.label,
            request.displayOrder,
            request.parentId,
            request.sector,
            id.toString()
        ) ?: throw NoSuchElementException("No allocation found with id $id")

        return record.toResponse(emptySet())
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
        val parents = allocations.filter { it.parentId == null }
        parents.forEach { insert(it) }

        val parentSymbolToId = dsl
            .fetch("SELECT id, symbol FROM target_allocations")
            .associate { it.get("symbol", String::class.java).uppercase() to it.get("id", String::class.java) }

        val children = allocations.filter { it.parentId != null }
        children.forEach { child ->
            val resolvedParentId = parentSymbolToId[child.parentId!!.uppercase()]
                ?: throw IllegalArgumentException("Parent symbol '${child.parentId}' not found for child '${child.symbol}'")
            insert(child.copy(parentId = resolvedParentId))
        }
    }

    private fun Record.toResponse(idsWithChildren: Set<String> = emptySet()): TargetAllocationResponse {
        val rowId = get("id", String::class.java)
        val parentIdRaw = get("parent_id", String::class.java)
        return TargetAllocationResponse(
            id = UUID.fromString(rowId),
            symbol = get("symbol", String::class.java),
            assetType = get("asset_type", String::class.java),
            targetPercentage = get("target_percentage", BigDecimal::class.java),
            label = get("label", String::class.java),
            displayOrder = get("display_order", Int::class.java),
            parentId = parentIdRaw?.let { UUID.fromString(it) },
            isCategory = rowId.uppercase() in idsWithChildren,
            sector = get("sector", String::class.java),
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant(),
            updatedAt = get("updated_at", java.sql.Timestamp::class.java).toInstant(),
        )
    }
}
