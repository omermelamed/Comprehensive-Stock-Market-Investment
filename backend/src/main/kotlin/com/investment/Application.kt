package com.investment

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class InvestmentApplication

fun main(args: Array<String>) {
    runApplication<InvestmentApplication>(*args)
}
