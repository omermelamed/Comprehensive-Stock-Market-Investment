package com.investment.config

import com.investment.domain.UnauthorizedException
import java.util.UUID

object RequestContext {
    private val userId = ThreadLocal<UUID?>()

    fun set(id: UUID) = userId.set(id)
    fun get(): UUID = userId.get() ?: throw UnauthorizedException()
    fun getOrNull(): UUID? = userId.get()
    fun clear() = userId.remove()
}
