package com.investment.application

import com.investment.api.dto.TargetAllocationRequest
import com.investment.api.dto.TargetAllocationResponse
import com.investment.domain.AllocationValidator
import com.investment.infrastructure.AllocationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private fun TargetAllocationResponse.toRequest() = TargetAllocationRequest(
    symbol = symbol,
    assetType = assetType,
    targetPercentage = targetPercentage,
    label = label,
    displayOrder = displayOrder,
    parentId = parentId?.toString(),
    sector = sector,
)

@Service
class AllocationService(
    private val allocationRepository: AllocationRepository
) {

    fun getAllocations(): List<TargetAllocationResponse> {
        val userId = RequestContext.get()
        return allocationRepository.findAll(userId)
    }

    @Transactional
    fun addAllocation(request: TargetAllocationRequest): TargetAllocationResponse {
        val userId = RequestContext.get()
        val existing = allocationRepository.findAll(userId).map { it.toRequest() } + request
        val errors = AllocationValidator.validate(existing)
        if (errors.isNotEmpty()) {
            throw IllegalArgumentException(errors.joinToString("; ") { "${it.field}: ${it.message}" })
        }
        return allocationRepository.insert(userId, request)
    }

    @Transactional
    fun updateAllocation(id: UUID, request: TargetAllocationRequest): TargetAllocationResponse {
        val userId = RequestContext.get()
        val existing = allocationRepository.findAll(userId)
            .filter { it.id != id }
            .map { it.toRequest() } + request

        val errors = AllocationValidator.validate(existing)
        if (errors.isNotEmpty()) {
            throw IllegalArgumentException(errors.joinToString("; ") { "${it.field}: ${it.message}" })
        }
        return allocationRepository.update(userId, id, request)
    }

    @Transactional
    fun deleteAllocation(id: UUID) {
        val userId = RequestContext.get()
        allocationRepository.delete(userId, id)
    }

    @Transactional
    fun replaceAllAllocations(requests: List<TargetAllocationRequest>): List<TargetAllocationResponse> {
        val userId = RequestContext.get()
        val errors = AllocationValidator.validate(requests)
        if (errors.isNotEmpty()) {
            throw IllegalArgumentException(errors.joinToString("; ") { "${it.field}: ${it.message}" })
        }
        allocationRepository.replaceAll(userId, requests)
        return allocationRepository.findAll(userId)
    }
}
