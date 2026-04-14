package com.investment.application

import com.investment.api.dto.ScheduledMessageLogEntry
import com.investment.api.dto.ScheduledMessageRequest
import com.investment.api.dto.ScheduledMessageResponse
import com.investment.domain.NextSendAtCalculator
import com.investment.infrastructure.UserProfileRepository
import com.investment.infrastructure.WhatsAppScheduledMessageRepository
import org.springframework.stereotype.Service
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

@Service
class WhatsAppScheduledMessageService(
    private val repository: WhatsAppScheduledMessageRepository,
    private val userProfileRepository: UserProfileRepository
) {

    fun list(): List<ScheduledMessageResponse> = repository.findAll()

    fun create(request: ScheduledMessageRequest): ScheduledMessageResponse {
        val nextSendAt = computeNextSendAt(request)
        return repository.insert(request, nextSendAt)
    }

    fun update(id: UUID, request: ScheduledMessageRequest): ScheduledMessageResponse {
        val nextSendAt = computeNextSendAt(request)
        return repository.update(id, request, nextSendAt)
    }

    fun toggle(id: UUID, isActive: Boolean): ScheduledMessageResponse =
        repository.toggle(id, isActive)

    fun delete(id: UUID) = repository.delete(id)

    fun getHistory(id: UUID): List<ScheduledMessageLogEntry> = repository.getHistory(id)

    fun computeNextSendAt(request: ScheduledMessageRequest) =
        NextSendAtCalculator.compute(
            frequency    = request.frequency,
            dayOfWeek    = request.dayOfWeek,
            biweeklyWeek = request.biweeklyWeek,
            dayOfMonth   = request.dayOfMonth,
            sendTime     = LocalTime.parse(request.sendTime),
            timezone     = ZoneId.of(userProfileRepository.findTimezone() ?: "UTC")
        )
}
