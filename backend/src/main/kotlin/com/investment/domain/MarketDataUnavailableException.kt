package com.investment.domain

class MarketDataUnavailableException(symbol: String) :
    RuntimeException("No market data available for $symbol")
