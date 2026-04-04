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
    displayOrder = displayOrder
)

@Service
class AllocationService(
    private val allocationRepository: AllocationRepository
) {

    fun getAllocations(): List<TargetAllocationResponse> {
        return allocationRepository.findAll()
    }

    @Transactional
    fun addAllocation(request: TargetAllocationRequest): TargetAllocationResponse {
        val existing = allocationRepository.findAll().map { it.toRequest() } + request
        val errors = AllocationValidator.validate(existing)
        if (errors.isNotEmpty()) {
            throw IllegalArgumentException(errors.joinToString("; ") { "${it.field}: ${it.message}" })
        }
        return allocationRepository.insert(request)
    }

    @Transactional
    fun updateAllocation(id: UUID, request: TargetAllocationRequest): TargetAllocationResponse {
        val existing = allocationRepository.findAll()
            .filter { it.id != id }
            .map { it.toRequest() } + request

        val errors = AllocationValidator.validate(existing)
        if (errors.isNotEmpty()) {
            throw IllegalArgumentException(errors.joinToString("; ") { "${it.field}: ${it.message}" })
        }
        return allocationRepository.update(id, request)
    }

    @Transactional
    fun deleteAllocation(id: UUID) {
        allocationRepository.delete(id)
    }

    @Transactional
    fun replaceAllAllocations(requests: List<TargetAllocationRequest>): List<TargetAllocationResponse> {
        val errors = AllocationValidator.validate(requests)
        if (errors.isNotEmpty()) {
            throw IllegalArgumentException(errors.joinToString("; ") { "${it.field}: ${it.message}" })
        }
        allocationRepository.replaceAll(requests)
        return allocationRepository.findAll()
    }
}
