package com.investment.api

import com.investment.api.dto.TargetAllocationRequest
import com.investment.api.dto.TargetAllocationResponse
import com.investment.application.AllocationService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/allocations")
class AllocationController(
    private val allocationService: AllocationService
) {

    @GetMapping
    fun getAllocations(): ResponseEntity<List<TargetAllocationResponse>> {
        return ResponseEntity.ok(allocationService.getAllocations())
    }

    @PostMapping
    fun addAllocation(@RequestBody request: TargetAllocationRequest): ResponseEntity<TargetAllocationResponse> {
        val allocation = allocationService.addAllocation(request)
        return ResponseEntity.status(201).body(allocation)
    }

    @PutMapping("/{id}")
    fun updateAllocation(
        @PathVariable id: UUID,
        @RequestBody request: TargetAllocationRequest
    ): ResponseEntity<TargetAllocationResponse> {
        val allocation = allocationService.updateAllocation(id, request)
        return ResponseEntity.ok(allocation)
    }

    @DeleteMapping("/{id}")
    fun deleteAllocation(@PathVariable id: UUID): ResponseEntity<Void> {
        allocationService.deleteAllocation(id)
        return ResponseEntity.noContent().build()
    }

    @PutMapping
    fun replaceAllAllocations(
        @RequestBody requests: List<TargetAllocationRequest>
    ): ResponseEntity<List<TargetAllocationResponse>> {
        val allocations = allocationService.replaceAllAllocations(requests)
        return ResponseEntity.ok(allocations)
    }
}
