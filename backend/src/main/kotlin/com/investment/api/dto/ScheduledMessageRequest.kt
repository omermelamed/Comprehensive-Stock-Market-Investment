package com.investment.api.dto

data class ScheduledMessageRequest(
    val messageType: String,      // PORTFOLIO_SUMMARY | PERFORMANCE_REPORT | ALLOCATION_CHECK | INVESTMENT_REMINDER | TOP_MOVERS
    val label: String,
    val frequency: String,        // WEEKLY | BIWEEKLY | MONTHLY
    val dayOfWeek: Int? = null,   // 0-6, required for WEEKLY + BIWEEKLY
    val biweeklyWeek: Int? = null,// 1 or 2, required for BIWEEKLY
    val dayOfMonth: Int? = null,  // 1-28, required for MONTHLY
    val sendTime: String          // "HH:mm"
)
