package com.investment.api

import com.investment.api.dto.UserProfileRequest
import com.investment.api.dto.UserProfileResponse
import com.investment.application.UserProfileService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/profile")
class ProfileController(
    private val userProfileService: UserProfileService
) {

    @GetMapping
    fun getProfile(): ResponseEntity<UserProfileResponse> {
        val profile = userProfileService.getProfile()
        return if (profile != null) {
            ResponseEntity.ok(profile)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PostMapping
    fun createProfile(@RequestBody request: UserProfileRequest): ResponseEntity<UserProfileResponse> {
        val profile = userProfileService.createProfile(request)
        return ResponseEntity.status(201).body(profile)
    }

    @PutMapping
    fun updateProfile(@RequestBody request: UserProfileRequest): ResponseEntity<UserProfileResponse> {
        val profile = userProfileService.updateProfile(request)
        return ResponseEntity.ok(profile)
    }

    @PostMapping("/complete-onboarding")
    fun completeOnboarding(): ResponseEntity<UserProfileResponse> {
        val profile = userProfileService.completeOnboarding()
        return ResponseEntity.ok(profile)
    }
}
