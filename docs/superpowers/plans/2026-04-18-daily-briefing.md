# Daily Portfolio Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily portfolio briefing delivered as `GET /api/briefing/daily` and a new `DAILY_BRIEFING` Telegram scheduled message type — fully deterministic, no Claude API.

**Architecture:** `DailyBriefingDataCollector` gathers all inputs (snapshot diff, per-holding day change from Yahoo, sector info, news headlines, market indices); `DailyBriefingFormatter` (pure domain object) formats them into Markdown; `DailyBriefingController` exposes the REST endpoint; the existing `TelegramScheduledMessageContentGenerator` gets a new `DAILY_BRIEFING` case. Sector is resolved via manual override on `target_allocations.sector`, then Yahoo `quoteSummary`, then "Other".

**Tech Stack:** Kotlin, Spring Boot, jOOQ, Flyway, Yahoo Finance (no API key), JUnit 5.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `backend/src/main/resources/db/migration/V14__add_sector_to_allocations.sql` | Schema: nullable sector column |
| Modify | `backend/src/main/kotlin/com/investment/domain/PriceQuote.kt` | Add `dayChangePercent: BigDecimal?` |
| Modify | `backend/src/main/kotlin/com/investment/infrastructure/market/YahooFinanceAdapter.kt` | Parse `dayChangePercent`; add `fetchSectorInfo`; add `fetchNewsHeadlines` |
| Modify | `backend/src/main/kotlin/com/investment/api/dto/TargetAllocationRequest.kt` | Add `sector: String?` |
| Modify | `backend/src/main/kotlin/com/investment/api/dto/TargetAllocationResponse.kt` | Add `sector: String?` |
| Modify | `backend/src/main/kotlin/com/investment/application/AllocationService.kt` | Forward `sector` in `toRequest()` |
| Modify | `backend/src/main/kotlin/com/investment/infrastructure/AllocationRepository.kt` | Include `sector` in SQL insert, update, mapping |
| Modify | `backend/src/main/kotlin/com/investment/infrastructure/SnapshotRepository.kt` | Add `findByDate(date)` |
| Create | `backend/src/main/kotlin/com/investment/domain/DailyBriefingData.kt` | Domain value types for briefing |
| Create | `backend/src/main/kotlin/com/investment/domain/DailyBriefingFormatter.kt` | Pure Markdown formatter |
| Create | `backend/src/test/kotlin/com/investment/domain/DailyBriefingFormatterTest.kt` | Unit tests for formatter |
| Create | `backend/src/test/kotlin/com/investment/infrastructure/market/YahooFinanceAdapterParseTest.kt` | Unit tests for new Yahoo parse methods |
| Create | `backend/src/main/kotlin/com/investment/application/DailyBriefingDataCollector.kt` | Data orchestration service |
| Create | `backend/src/main/kotlin/com/investment/api/dto/DailyBriefingResponse.kt` | REST response DTO |
| Create | `backend/src/main/kotlin/com/investment/api/DailyBriefingController.kt` | `GET /api/briefing/daily` |
| Modify | `backend/src/main/kotlin/com/investment/application/TelegramScheduledMessageContentGenerator.kt` | Add `DAILY_BRIEFING` case |

---

## Task 1: DB Migration — Add `sector` to `target_allocations`

**Files:**
- Create: `backend/src/main/resources/db/migration/V14__add_sector_to_allocations.sql`

- [ ] **Step 1: Write migration**

```sql
-- V14__add_sector_to_allocations.sql
ALTER TABLE target_allocations ADD COLUMN sector TEXT;
```

- [ ] **Step 2: Run migration**

```bash
cd backend && ./gradlew flywayMigrate
```

Expected: `Successfully applied 1 migration` (or migration runs cleanly on app start).

- [ ] **Step 3: Verify column exists**

```bash
psql -d investment_db -c "\d target_allocations" | grep sector
```

Expected: a line containing `sector | text`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V14__add_sector_to_allocations.sql
git commit -m "feat: add sector column to target_allocations"
```

---

## Task 2: Extend `PriceQuote` + Parse `dayChangePercent` in `YahooFinanceAdapter`

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/domain/PriceQuote.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/market/YahooFinanceAdapter.kt`
- Create: `backend/src/test/kotlin/com/investment/infrastructure/market/YahooFinanceAdapterParseTest.kt`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/kotlin/com/investment/infrastructure/market/YahooFinanceAdapterParseTest.kt`:

```kotlin
package com.investment.infrastructure.market

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class YahooFinanceAdapterParseTest {

    @Test
    fun `parseDayChangePercent returns value when present`() {
        val meta = mapOf("regularMarketChangePercent" to 1.234567)
        val result = YahooFinanceAdapter.parseDayChangePercent(meta)
        assertEquals(BigDecimal("1.2346"), result)
    }

    @Test
    fun `parseDayChangePercent returns null when absent`() {
        val meta = emptyMap<String, Any>()
        val result = YahooFinanceAdapter.parseDayChangePercent(meta)
        assertNull(result)
    }

    @Test
    fun `parseSectorInfo extracts sector from assetProfile`() {
        val assetProfile = mapOf("sector" to "Technology")
        val result = YahooFinanceAdapter.parseSectorInfo(assetProfile)
        assertEquals("Technology", result)
    }

    @Test
    fun `parseSectorInfo returns null when sector blank`() {
        val assetProfile = mapOf("sector" to "")
        val result = YahooFinanceAdapter.parseSectorInfo(assetProfile)
        assertNull(result)
    }

    @Test
    fun `parseSectorInfo returns null when sector absent`() {
        val result = YahooFinanceAdapter.parseSectorInfo(emptyMap<String, Any>())
        assertNull(result)
    }

    @Test
    fun `parseNewsHeadlines returns up to 2 titles`() {
        val newsItems = listOf(
            mapOf("title" to "Headline One"),
            mapOf("title" to "Headline Two"),
            mapOf("title" to "Headline Three")
        )
        val result = YahooFinanceAdapter.parseNewsHeadlines(newsItems)
        assertEquals(listOf("Headline One", "Headline Two"), result)
    }

    @Test
    fun `parseNewsHeadlines skips items with blank title`() {
        val newsItems = listOf(
            mapOf("title" to ""),
            mapOf("title" to "Real Headline")
        )
        val result = YahooFinanceAdapter.parseNewsHeadlines(newsItems)
        assertEquals(listOf("Real Headline"), result)
    }

    @Test
    fun `parseNewsHeadlines returns empty when list is empty`() {
        val result = YahooFinanceAdapter.parseNewsHeadlines(emptyList<Map<String, Any>>())
        assertEquals(emptyList<String>(), result)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./gradlew test --tests "com.investment.infrastructure.market.YahooFinanceAdapterParseTest" 2>&1 | tail -20
```

Expected: compilation error — `parseDayChangePercent`, `parseSectorInfo`, `parseNewsHeadlines` not yet defined.

- [ ] **Step 3: Extend `PriceQuote`**

Replace the full content of `backend/src/main/kotlin/com/investment/domain/PriceQuote.kt`:

```kotlin
package com.investment.domain

import java.math.BigDecimal
import java.time.Instant

data class PriceQuote(
    val symbol: String,
    val price: BigDecimal,
    val currency: String,
    val timestamp: Instant,
    val source: String,
    val dayChangePercent: BigDecimal? = null,
)
```

- [ ] **Step 4: Extend `YahooFinanceAdapter`**

In `backend/src/main/kotlin/com/investment/infrastructure/market/YahooFinanceAdapter.kt`:

Add a `companion object` with the three parse methods, extend `parseQuote` to populate `dayChangePercent`, and add two new public fetch methods.

Replace the entire file with:

```kotlin
package com.investment.infrastructure.market

import com.investment.domain.OhlcBar
import com.investment.domain.PriceQuote
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@Component
class YahooFinanceAdapter(
    @Qualifier("marketDataRestClient") private val restClient: RestClient,
) : MarketDataProvider {

    private val log = LoggerFactory.getLogger(javaClass)
    private val marketTz = ZoneId.of("America/New_York")
    private val AGORA_DIVISOR = BigDecimal("100")

    override val sourceName: String = "YAHOO"

    override fun fetchQuote(symbol: String): PriceQuote? {
        return try {
            val url = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=1d"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return null
            parseQuote(symbol, body)
        } catch (e: Exception) {
            log.warn("YahooFinance quote fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    fun fetchSectorInfo(symbol: String): String? {
        return try {
            val url = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/$symbol?modules=assetProfile"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return null
            @Suppress("UNCHECKED_CAST")
            val result = (body["quoteSummary"] as? Map<*, *>)
                ?.let { (it["result"] as? List<*>)?.firstOrNull() as? Map<*, *> }
                ?.let { it["assetProfile"] as? Map<*, *> }
                ?: return null
            parseSectorInfo(result)
        } catch (e: Exception) {
            log.warn("YahooFinance sector fetch failed for {}: {}", symbol, e.message)
            null
        }
    }

    fun fetchNewsHeadlines(symbol: String): List<String> {
        return try {
            val url = "https://query1.finance.yahoo.com/v1/finance/search?q=$symbol&newsCount=3"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return emptyList()
            @Suppress("UNCHECKED_CAST")
            val newsItems = body["news"] as? List<*> ?: return emptyList()
            @Suppress("UNCHECKED_CAST")
            parseNewsHeadlines(newsItems.filterIsInstance<Map<String, Any>>())
        } catch (e: Exception) {
            log.warn("YahooFinance news fetch failed for {}: {}", symbol, e.message)
            emptyList()
        }
    }

    override fun fetchHistoricalPrices(symbol: String, fromDate: LocalDate, toDate: LocalDate): Map<LocalDate, BigDecimal> {
        val daySpan = toDate.toEpochDay() - fromDate.toEpochDay()
        val range = when {
            daySpan <= 35   -> "1mo"
            daySpan <= 95   -> "3mo"
            daySpan <= 190  -> "6mo"
            daySpan <= 370  -> "1y"
            daySpan <= 740  -> "2y"
            daySpan <= 1830 -> "5y"
            daySpan <= 3660 -> "10y"
            else            -> "max"
        }
        return try {
            val url = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=$range"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return emptyMap()
            parseHistorical(body, fromDate, toDate)
        } catch (e: Exception) {
            log.warn("YahooFinance historical fetch failed for {}: {}", symbol, e.message)
            emptyMap()
        }
    }

    override fun fetchOhlcBars(symbol: String, from: LocalDate, to: LocalDate): List<OhlcBar> {
        val daySpan = to.toEpochDay() - from.toEpochDay()
        val range = when {
            daySpan <= 35   -> "1mo"
            daySpan <= 95   -> "3mo"
            daySpan <= 190  -> "6mo"
            daySpan <= 370  -> "1y"
            daySpan <= 740  -> "2y"
            daySpan <= 1830 -> "5y"
            daySpan <= 3660 -> "10y"
            else            -> "max"
        }
        return try {
            val url = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=$range"
            val body = restClient.get().uri(url).retrieve().body(Map::class.java) ?: return emptyList()
            parseOhlc(body, from, to)
        } catch (e: Exception) {
            log.warn("YahooFinance OHLC fetch failed for {}: {}", symbol, e.message)
            emptyList()
        }
    }

    private fun isIsraeliMarket(meta: Map<*, *>): Boolean {
        val exchangeName = meta["exchangeName"] as? String ?: ""
        val market = meta["market"] as? String ?: ""
        return exchangeName.equals("TLV", ignoreCase = true) ||
               market.equals("il_market", ignoreCase = true)
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseQuote(symbol: String, body: Map<*, *>): PriceQuote? {
        return try {
            val chart = body["chart"] as? Map<*, *> ?: return null
            val results = chart["result"] as? List<*> ?: return null
            val first = results.firstOrNull() as? Map<*, *> ?: return null
            val meta = first["meta"] as? Map<*, *> ?: return null

            val rawPrice = meta["regularMarketPrice"] ?: return null
            var price = when (rawPrice) {
                is Number -> BigDecimal(rawPrice.toString())
                else -> return null
            }
            var currency = meta["currency"] as? String ?: "USD"

            if (isIsraeliMarket(meta) || currency.equals("ILA", ignoreCase = true)) {
                price = price.divide(AGORA_DIVISOR, 4, RoundingMode.HALF_UP)
                currency = "ILS"
            }

            PriceQuote(
                symbol = symbol.uppercase(),
                price = price,
                currency = currency,
                timestamp = Instant.now(),
                source = sourceName,
                dayChangePercent = parseDayChangePercent(meta)
            )
        } catch (e: Exception) {
            log.warn("YahooFinance response parse failed for {}: {}", symbol, e.message)
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseHistorical(
        body: Map<*, *>,
        fromDate: LocalDate,
        toDate: LocalDate
    ): Map<LocalDate, BigDecimal> {
        return try {
            val chart = body["chart"] as? Map<*, *> ?: return emptyMap()
            val results = chart["result"] as? List<*> ?: return emptyMap()
            val first = results.firstOrNull() as? Map<*, *> ?: return emptyMap()

            val meta = first["meta"] as? Map<*, *> ?: emptyMap<String, Any>()
            val currency = meta["currency"] as? String ?: "USD"
            val isAgora = isIsraeliMarket(meta) || currency.equals("ILA", ignoreCase = true)

            val timestamps = first["timestamp"] as? List<*> ?: return emptyMap()
            val indicators = first["indicators"] as? Map<*, *> ?: return emptyMap()

            val adjcloseBlock = (indicators["adjclose"] as? List<*>)?.firstOrNull() as? Map<*, *>
            val prices: List<*>? = (adjcloseBlock?.get("adjclose") as? List<*>)
                ?: ((indicators["quote"] as? List<*>)?.firstOrNull() as? Map<*, *>)?.get("close") as? List<*>

            if (prices == null) return emptyMap()

            val result = mutableMapOf<LocalDate, BigDecimal>()
            for (i in timestamps.indices) {
                val ts = timestamps[i] as? Number ?: continue
                val rawPrice = prices.getOrNull(i) as? Number ?: continue
                val date = Instant.ofEpochSecond(ts.toLong()).atZone(marketTz).toLocalDate()
                if (date.isBefore(fromDate) || date.isAfter(toDate)) continue
                var p = BigDecimal(rawPrice.toString()).setScale(4, RoundingMode.HALF_UP)
                if (isAgora) p = p.divide(AGORA_DIVISOR, 4, RoundingMode.HALF_UP)
                result[date] = p
            }
            result
        } catch (e: Exception) {
            log.warn("YahooFinance historical parse failed: {}", e.message)
            emptyMap()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseOhlc(body: Map<*, *>, fromDate: LocalDate, toDate: LocalDate): List<OhlcBar> {
        return try {
            val chart = body["chart"] as? Map<*, *> ?: return emptyList()
            val results = chart["result"] as? List<*> ?: return emptyList()
            val first = results.firstOrNull() as? Map<*, *> ?: return emptyList()

            val meta = first["meta"] as? Map<*, *> ?: emptyMap<String, Any>()
            val currency = meta["currency"] as? String ?: "USD"
            val isAgora = isIsraeliMarket(meta) || currency.equals("ILA", ignoreCase = true)

            val timestamps = first["timestamp"] as? List<*> ?: return emptyList()
            val indicators = first["indicators"] as? Map<*, *> ?: return emptyList()
            val quote = (indicators["quote"] as? List<*>)?.firstOrNull() as? Map<*, *> ?: return emptyList()

            val opens = quote["open"] as? List<*> ?: return emptyList()
            val highs = quote["high"] as? List<*> ?: return emptyList()
            val lows = quote["low"] as? List<*> ?: return emptyList()
            val closes = quote["close"] as? List<*> ?: return emptyList()
            val volumes = quote["volume"] as? List<*> ?: emptyList<Any>()

            val bars = mutableListOf<OhlcBar>()
            for (i in timestamps.indices) {
                val ts = timestamps[i] as? Number ?: continue
                val o = opens.getOrNull(i) as? Number ?: continue
                val h = highs.getOrNull(i) as? Number ?: continue
                val l = lows.getOrNull(i) as? Number ?: continue
                val c = closes.getOrNull(i) as? Number ?: continue
                val v = (volumes.getOrNull(i) as? Number)?.toLong() ?: 0L

                val date = Instant.ofEpochSecond(ts.toLong()).atZone(marketTz).toLocalDate()
                if (date.isBefore(fromDate) || date.isAfter(toDate)) continue

                fun adj(n: Number): BigDecimal {
                    var p = BigDecimal(n.toString()).setScale(4, RoundingMode.HALF_UP)
                    if (isAgora) p = p.divide(AGORA_DIVISOR, 4, RoundingMode.HALF_UP)
                    return p
                }

                bars.add(OhlcBar(date = date, open = adj(o), high = adj(h), low = adj(l), close = adj(c), volume = v))
            }
            bars.sortedBy { it.date }
        } catch (e: Exception) {
            log.warn("YahooFinance OHLC parse failed: {}", e.message)
            emptyList()
        }
    }

    companion object {
        fun parseDayChangePercent(meta: Map<*, *>): BigDecimal? {
            val raw = meta["regularMarketChangePercent"] ?: return null
            return when (raw) {
                is Number -> BigDecimal(raw.toString()).setScale(4, RoundingMode.HALF_UP)
                else -> null
            }
        }

        fun parseSectorInfo(assetProfile: Map<*, *>): String? {
            val sector = assetProfile["sector"] as? String ?: return null
            return sector.takeIf { it.isNotBlank() }
        }

        fun parseNewsHeadlines(newsItems: List<Map<String, Any>>): List<String> {
            return newsItems
                .mapNotNull { it["title"] as? String }
                .filter { it.isNotBlank() }
                .take(2)
        }
    }
}
```

- [ ] **Step 5: Run tests**

```bash
cd backend && ./gradlew test --tests "com.investment.infrastructure.market.YahooFinanceAdapterParseTest" 2>&1 | tail -20
```

Expected: `8 tests completed, 0 failures`.

- [ ] **Step 6: Compile check**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/kotlin/com/investment/domain/PriceQuote.kt \
        backend/src/main/kotlin/com/investment/infrastructure/market/YahooFinanceAdapter.kt \
        backend/src/test/kotlin/com/investment/infrastructure/market/YahooFinanceAdapterParseTest.kt
git commit -m "feat: add dayChangePercent to PriceQuote and extend YahooFinanceAdapter"
```

---

## Task 3: Extend Allocation DTOs, Repository, and Service with `sector`

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/api/dto/TargetAllocationRequest.kt`
- Modify: `backend/src/main/kotlin/com/investment/api/dto/TargetAllocationResponse.kt`
- Modify: `backend/src/main/kotlin/com/investment/application/AllocationService.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/AllocationRepository.kt`

- [ ] **Step 1: Update `TargetAllocationRequest`**

Replace full content of `backend/src/main/kotlin/com/investment/api/dto/TargetAllocationRequest.kt`:

```kotlin
package com.investment.api.dto

import java.math.BigDecimal

data class TargetAllocationRequest(
    val symbol: String,
    val assetType: String,
    val targetPercentage: BigDecimal,
    val label: String,
    val displayOrder: Int = 0,
    val parentId: String? = null,
    val sector: String? = null,
)
```

- [ ] **Step 2: Update `TargetAllocationResponse`**

Replace full content of `backend/src/main/kotlin/com/investment/api/dto/TargetAllocationResponse.kt`:

```kotlin
package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class TargetAllocationResponse(
    val id: UUID,
    val symbol: String,
    val assetType: String,
    val targetPercentage: BigDecimal,
    val label: String,
    val displayOrder: Int,
    val parentId: UUID? = null,
    val isCategory: Boolean = false,
    val sector: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant,
)
```

- [ ] **Step 3: Update `AllocationService` — forward `sector` in `toRequest()`**

In `backend/src/main/kotlin/com/investment/application/AllocationService.kt`, replace the `toRequest()` extension function (lines 11–18):

```kotlin
private fun TargetAllocationResponse.toRequest() = TargetAllocationRequest(
    symbol = symbol,
    assetType = assetType,
    targetPercentage = targetPercentage,
    label = label,
    displayOrder = displayOrder,
    parentId = parentId?.toString(),
    sector = sector,
)
```

- [ ] **Step 4: Update `AllocationRepository` — SQL insert, update, and mapping**

Replace the full content of `backend/src/main/kotlin/com/investment/infrastructure/AllocationRepository.kt`:

```kotlin
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
```

- [ ] **Step 5: Compile check**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Run existing tests to verify no regressions**

```bash
cd backend && ./gradlew test 2>&1 | tail -20
```

Expected: all existing tests pass (the `TargetAllocationResponse` constructor change is backward-compatible because `sector` defaults to `null`).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/kotlin/com/investment/api/dto/TargetAllocationRequest.kt \
        backend/src/main/kotlin/com/investment/api/dto/TargetAllocationResponse.kt \
        backend/src/main/kotlin/com/investment/application/AllocationService.kt \
        backend/src/main/kotlin/com/investment/infrastructure/AllocationRepository.kt
git commit -m "feat: add sector field to target allocations"
```

---

## Task 4: Add `SnapshotRepository.findByDate()`

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/SnapshotRepository.kt`

- [ ] **Step 1: Add `findByDate` method**

In `backend/src/main/kotlin/com/investment/infrastructure/SnapshotRepository.kt`, add after the existing `findAllOrderedByDate()` method (before the closing brace of the class):

```kotlin
fun findByDate(date: LocalDate): SnapshotRecord? {
    return dsl.fetchOne(
        "SELECT date, total_value, daily_pnl, snapshot_source FROM portfolio_snapshots WHERE date = ?",
        Date.valueOf(date)
    )?.let {
        SnapshotRecord(
            date = it.get("date", Date::class.java).toLocalDate(),
            totalValue = it.get("total_value", BigDecimal::class.java),
            dailyPnl = it.get("daily_pnl", BigDecimal::class.java),
            snapshotSource = it.get("snapshot_source", String::class.java)
        )
    }
}
```

- [ ] **Step 2: Compile check**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/investment/infrastructure/SnapshotRepository.kt
git commit -m "feat: add SnapshotRepository.findByDate"
```

---

## Task 5: Domain Types + `DailyBriefingFormatter` + Tests

**Files:**
- Create: `backend/src/main/kotlin/com/investment/domain/DailyBriefingData.kt`
- Create: `backend/src/main/kotlin/com/investment/domain/DailyBriefingFormatter.kt`
- Create: `backend/src/test/kotlin/com/investment/domain/DailyBriefingFormatterTest.kt`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/test/kotlin/com/investment/domain/DailyBriefingFormatterTest.kt`:

```kotlin
package com.investment.domain

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate

class DailyBriefingFormatterTest {

    private val date = LocalDate.of(2026, 4, 18)

    private fun fullData() = DailyBriefingData(
        date = date,
        currency = "USD",
        portfolioChangeAbsolute = BigDecimal("847.50"),
        portfolioChangePercent = BigDecimal("1.23"),
        portfolioTotal = BigDecimal("69000.00"),
        topGainers = listOf(
            HoldingMover("NVDA", BigDecimal("4.20"), BigDecimal("12400.00")),
            HoldingMover("AAPL", BigDecimal("1.80"), BigDecimal("8200.00"))
        ),
        topLosers = listOf(
            HoldingMover("BNDX", BigDecimal("-0.30"), BigDecimal("3200.00"))
        ),
        sectorBreakdown = listOf(
            SectorAllocation("Technology", BigDecimal("42.10")),
            SectorAllocation("Bonds", BigDecimal("18.30"))
        ),
        marketIndices = listOf(
            MarketIndex("^GSPC", "S&P 500", BigDecimal("0.87")),
            MarketIndex("^IXIC", "NASDAQ", BigDecimal("1.12"))
        ),
        newsHeadlines = listOf(
            NewsHeadline("NVDA", "Nvidia hits record on AI demand surge"),
            NewsHeadline("AAPL", "Apple expands manufacturing in India")
        )
    )

    @Test
    fun `full data produces all sections`() {
        val text = DailyBriefingFormatter.format(fullData())
        assertTrue(text.contains("Daily Portfolio Briefing"))
        assertTrue(text.contains("+\$847.50"))
        assertTrue(text.contains("+1.23%"))
        assertTrue(text.contains("S&P 500"))
        assertTrue(text.contains("NVDA"))
        assertTrue(text.contains("BNDX"))
        assertTrue(text.contains("Technology"))
        assertTrue(text.contains("Nvidia hits record"))
    }

    @Test
    fun `null portfolio change omits change line`() {
        val data = fullData().copy(portfolioChangeAbsolute = null, portfolioChangePercent = null)
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("+\$847"))
        assertTrue(text.contains("Daily Portfolio Briefing"))
    }

    @Test
    fun `empty news omits headlines section`() {
        val data = fullData().copy(newsHeadlines = emptyList())
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("Headlines"))
        assertTrue(text.contains("NVDA"))
    }

    @Test
    fun `empty gainers and losers omits top movers section`() {
        val data = fullData().copy(topGainers = emptyList(), topLosers = emptyList())
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("Gainers"))
        assertFalse(text.contains("Losers"))
    }

    @Test
    fun `empty market indices omits market section`() {
        val data = fullData().copy(marketIndices = emptyList())
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("S&P 500"))
    }

    @Test
    fun `positive change prefixed with plus sign`() {
        val text = DailyBriefingFormatter.format(fullData())
        assertTrue(text.contains("+\$847.50 (+1.23%)"))
    }

    @Test
    fun `negative change shows minus sign`() {
        val data = fullData().copy(
            portfolioChangeAbsolute = BigDecimal("-300.00"),
            portfolioChangePercent = BigDecimal("-0.45")
        )
        val text = DailyBriefingFormatter.format(data)
        assertTrue(text.contains("-\$300.00 (-0.45%)"))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && ./gradlew test --tests "com.investment.domain.DailyBriefingFormatterTest" 2>&1 | tail -20
```

Expected: compilation error — `DailyBriefingData`, `DailyBriefingFormatter`, etc. not yet defined.

- [ ] **Step 3: Create domain value types**

Create `backend/src/main/kotlin/com/investment/domain/DailyBriefingData.kt`:

```kotlin
package com.investment.domain

import java.math.BigDecimal
import java.time.LocalDate

data class DailyBriefingData(
    val date: LocalDate,
    val currency: String,
    val portfolioChangeAbsolute: BigDecimal?,
    val portfolioChangePercent: BigDecimal?,
    val portfolioTotal: BigDecimal,
    val topGainers: List<HoldingMover>,
    val topLosers: List<HoldingMover>,
    val sectorBreakdown: List<SectorAllocation>,
    val marketIndices: List<MarketIndex>,
    val newsHeadlines: List<NewsHeadline>,
)

data class HoldingMover(
    val symbol: String,
    val dayChangePercent: BigDecimal,
    val portfolioValue: BigDecimal,
)

data class SectorAllocation(
    val sector: String,
    val portfolioPercent: BigDecimal,
)

data class MarketIndex(
    val symbol: String,
    val label: String,
    val dayChangePercent: BigDecimal,
)

data class NewsHeadline(
    val symbol: String,
    val headline: String,
)
```

- [ ] **Step 4: Create the formatter**

Create `backend/src/main/kotlin/com/investment/domain/DailyBriefingFormatter.kt`:

```kotlin
package com.investment.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.format.DateTimeFormatter

object DailyBriefingFormatter {

    private val DATE_FORMAT = DateTimeFormatter.ofPattern("MMM d, yyyy")

    fun format(data: DailyBriefingData): String = buildString {
        appendLine("*Daily Portfolio Briefing — ${data.date.format(DATE_FORMAT)}*")
        appendLine()

        if (data.portfolioChangeAbsolute != null && data.portfolioChangePercent != null) {
            val absStr = formatMoney(data.portfolioChangeAbsolute)
            val pctStr = formatPercent(data.portfolioChangePercent)
            appendLine("Portfolio: $absStr ($pctStr) today")
            appendLine()
        }

        if (data.marketIndices.isNotEmpty()) {
            appendLine("*Market*")
            append(data.marketIndices.joinToString("  |  ") { idx ->
                "${idx.label} ${formatPercent(idx.dayChangePercent)}"
            })
            appendLine()
            appendLine()
        }

        val hasMovers = data.topGainers.isNotEmpty() || data.topLosers.isNotEmpty()
        if (hasMovers) {
            appendLine("*Top Movers*")
            if (data.topGainers.isNotEmpty()) {
                val gainersStr = data.topGainers.joinToString("  ") { "${it.symbol} ${formatPercent(it.dayChangePercent)}" }
                appendLine("📈 Gainers: $gainersStr")
            }
            if (data.topLosers.isNotEmpty()) {
                val losersStr = data.topLosers.joinToString("  ") { "${it.symbol} ${formatPercent(it.dayChangePercent)}" }
                appendLine("📉 Losers:  $losersStr")
            }
            appendLine()
        }

        if (data.sectorBreakdown.isNotEmpty()) {
            appendLine("*Sector Breakdown*")
            append(data.sectorBreakdown.joinToString("  |  ") { "${it.sector} ${it.portfolioPercent.setScale(1, RoundingMode.HALF_UP)}%" })
            appendLine()
            appendLine()
        }

        if (data.newsHeadlines.isNotEmpty()) {
            appendLine("*Headlines*")
            data.newsHeadlines.forEach { news ->
                appendLine("• ${news.symbol}: ${news.headline}")
            }
        }
    }.trimEnd()

    private fun formatMoney(amount: BigDecimal): String {
        val scaled = amount.setScale(2, RoundingMode.HALF_UP)
        return if (scaled >= BigDecimal.ZERO) "+\$$scaled" else "-\$${scaled.abs()}"
    }

    private fun formatPercent(pct: BigDecimal): String {
        val scaled = pct.setScale(2, RoundingMode.HALF_UP)
        return if (scaled >= BigDecimal.ZERO) "+${scaled}%" else "${scaled}%"
    }
}
```

- [ ] **Step 5: Run tests**

```bash
cd backend && ./gradlew test --tests "com.investment.domain.DailyBriefingFormatterTest" 2>&1 | tail -20
```

Expected: `7 tests completed, 0 failures`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/kotlin/com/investment/domain/DailyBriefingData.kt \
        backend/src/main/kotlin/com/investment/domain/DailyBriefingFormatter.kt \
        backend/src/test/kotlin/com/investment/domain/DailyBriefingFormatterTest.kt
git commit -m "feat: add DailyBriefingData types and DailyBriefingFormatter"
```

---

## Task 6: `DailyBriefingDataCollector`

**Files:**
- Create: `backend/src/main/kotlin/com/investment/application/DailyBriefingDataCollector.kt`

- [ ] **Step 1: Create the collector**

Create `backend/src/main/kotlin/com/investment/application/DailyBriefingDataCollector.kt`:

```kotlin
package com.investment.application

import com.investment.api.dto.TargetAllocationResponse
import com.investment.domain.DailyBriefingData
import com.investment.domain.HoldingMover
import com.investment.domain.MarketIndex
import com.investment.domain.NewsHeadline
import com.investment.domain.SectorAllocation
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.market.YahooFinanceAdapter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneOffset

@Service
class DailyBriefingDataCollector(
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val snapshotRepository: SnapshotRepository,
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService,
    private val yahooFinanceAdapter: YahooFinanceAdapter,
    private val clock: Clock,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        private val INDEX_SYMBOLS = listOf(
            "^GSPC" to "S&P 500",
            "^IXIC" to "NASDAQ",
            "^RUT"  to "Russell 2000"
        )
    }

    fun collect(): DailyBriefingData {
        val today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC)
        val profile = userProfileService.getProfile()
        val currency = profile?.preferredCurrency ?: "USD"

        val holdings = holdingsRepository.findAll().filter { it.track.uppercase() == "LONG" }
        val allocationsBySym = allocationRepository.findAll()
            .associateBy { it.symbol.uppercase() }

        // Portfolio value and per-holding day changes
        val quotes = holdings.associate { h ->
            h.symbol.uppercase() to try {
                marketDataService.getQuote(h.symbol)
            } catch (e: Exception) {
                log.warn("Could not fetch quote for {}: {}", h.symbol, e.message)
                null
            }
        }

        val holdingValues = holdings.associate { h ->
            val price = quotes[h.symbol.uppercase()]?.price ?: BigDecimal.ZERO
            h.symbol.uppercase() to (price * h.netQuantity).setScale(2, RoundingMode.HALF_UP)
        }
        val portfolioTotal = holdingValues.values.fold(BigDecimal.ZERO, BigDecimal::add)

        // Today's portfolio change from snapshot
        val todaySnapshot = snapshotRepository.findByDate(today)
        val portfolioChangeAbsolute: BigDecimal? = todaySnapshot?.dailyPnl
        val portfolioChangePercent: BigDecimal? = if (todaySnapshot != null) {
            val prevValue = todaySnapshot.totalValue - todaySnapshot.dailyPnl
            if (prevValue.compareTo(BigDecimal.ZERO) != 0) {
                todaySnapshot.dailyPnl.divide(prevValue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
            } else null
        } else null

        // Top gainers and losers by day change percent
        val movers = holdings.mapNotNull { h ->
            val dayChange = quotes[h.symbol.uppercase()]?.dayChangePercent ?: return@mapNotNull null
            val value = holdingValues[h.symbol.uppercase()] ?: BigDecimal.ZERO
            HoldingMover(h.symbol.uppercase(), dayChange.setScale(2, RoundingMode.HALF_UP), value)
        }
        val topGainers = movers.filter { it.dayChangePercent > BigDecimal.ZERO }
            .sortedByDescending { it.dayChangePercent }.take(3)
        val topLosers = movers.filter { it.dayChangePercent < BigDecimal.ZERO }
            .sortedBy { it.dayChangePercent }.take(3)

        // Sector breakdown
        val sectorBreakdown = buildSectorBreakdown(holdings.map { it.symbol }, holdingValues, allocationsBySym, portfolioTotal)

        // Market indices
        val marketIndices = INDEX_SYMBOLS.mapNotNull { (sym, label) ->
            try {
                val quote = marketDataService.getQuote(sym)
                val pct = quote.dayChangePercent ?: return@mapNotNull null
                MarketIndex(sym, label, pct.setScale(2, RoundingMode.HALF_UP))
            } catch (e: Exception) {
                log.warn("Could not fetch index {}: {}", sym, e.message)
                null
            }
        }

        // News headlines
        val newsHeadlines = holdings.flatMap { h ->
            try {
                yahooFinanceAdapter.fetchNewsHeadlines(h.symbol)
                    .map { headline -> NewsHeadline(h.symbol.uppercase(), headline) }
            } catch (e: Exception) {
                log.warn("Could not fetch news for {}: {}", h.symbol, e.message)
                emptyList()
            }
        }

        return DailyBriefingData(
            date = today,
            currency = currency,
            portfolioChangeAbsolute = portfolioChangeAbsolute,
            portfolioChangePercent = portfolioChangePercent,
            portfolioTotal = portfolioTotal,
            topGainers = topGainers,
            topLosers = topLosers,
            sectorBreakdown = sectorBreakdown,
            marketIndices = marketIndices,
            newsHeadlines = newsHeadlines,
        )
    }

    private fun buildSectorBreakdown(
        symbols: List<String>,
        holdingValues: Map<String, BigDecimal>,
        allocationsBySym: Map<String, TargetAllocationResponse>,
        portfolioTotal: BigDecimal,
    ): List<SectorAllocation> {
        if (portfolioTotal.compareTo(BigDecimal.ZERO) == 0) return emptyList()

        val sectorValues = mutableMapOf<String, BigDecimal>()
        for (sym in symbols) {
            val upperSym = sym.uppercase()
            val value = holdingValues[upperSym] ?: BigDecimal.ZERO
            val sector = resolveSector(upperSym, allocationsBySym)
            sectorValues[sector] = (sectorValues[sector] ?: BigDecimal.ZERO) + value
        }

        return sectorValues.entries
            .sortedByDescending { it.value }
            .map { (sector, value) ->
                val pct = value.divide(portfolioTotal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100")).setScale(1, RoundingMode.HALF_UP)
                SectorAllocation(sector, pct)
            }
    }

    private fun resolveSector(symbol: String, allocationsBySym: Map<String, TargetAllocationResponse>): String {
        val manual = allocationsBySym[symbol]?.sector?.takeIf { it.isNotBlank() }
        if (manual != null) return manual

        return try {
            yahooFinanceAdapter.fetchSectorInfo(symbol)?.takeIf { it.isNotBlank() } ?: "Other"
        } catch (e: Exception) {
            log.warn("Could not fetch sector for {}: {}", symbol, e.message)
            "Other"
        }
    }
}
```

- [ ] **Step 2: Compile check**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/investment/application/DailyBriefingDataCollector.kt
git commit -m "feat: add DailyBriefingDataCollector"
```

---

## Task 7: REST Endpoint — `DailyBriefingController`

**Files:**
- Create: `backend/src/main/kotlin/com/investment/api/dto/DailyBriefingResponse.kt`
- Create: `backend/src/main/kotlin/com/investment/api/DailyBriefingController.kt`

- [ ] **Step 1: Create the response DTO**

Create `backend/src/main/kotlin/com/investment/api/dto/DailyBriefingResponse.kt`:

```kotlin
package com.investment.api.dto

import java.math.BigDecimal
import java.time.LocalDate

data class DailyBriefingResponse(
    val date: LocalDate,
    val currency: String,
    val portfolioChangePercent: BigDecimal?,
    val portfolioChangeAbsolute: BigDecimal?,
    val portfolioTotal: BigDecimal,
    val marketIndices: List<MarketIndexDto>,
    val topGainers: List<HoldingMoverDto>,
    val topLosers: List<HoldingMoverDto>,
    val sectorBreakdown: List<SectorBreakdownDto>,
    val newsHeadlines: List<NewsHeadlineDto>,
    val briefingText: String,
)

data class MarketIndexDto(
    val symbol: String,
    val label: String,
    val dayChangePercent: BigDecimal,
)

data class HoldingMoverDto(
    val symbol: String,
    val dayChangePercent: BigDecimal,
    val portfolioValue: BigDecimal,
)

data class SectorBreakdownDto(
    val sector: String,
    val portfolioPercent: BigDecimal,
)

data class NewsHeadlineDto(
    val symbol: String,
    val headline: String,
)
```

- [ ] **Step 2: Create the controller**

Create `backend/src/main/kotlin/com/investment/api/DailyBriefingController.kt`:

```kotlin
package com.investment.api

import com.investment.api.dto.DailyBriefingResponse
import com.investment.api.dto.HoldingMoverDto
import com.investment.api.dto.MarketIndexDto
import com.investment.api.dto.NewsHeadlineDto
import com.investment.api.dto.SectorBreakdownDto
import com.investment.application.DailyBriefingDataCollector
import com.investment.domain.DailyBriefingFormatter
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/briefing")
class DailyBriefingController(
    private val dataCollector: DailyBriefingDataCollector,
) {

    @GetMapping("/daily")
    fun getDailyBriefing(): ResponseEntity<DailyBriefingResponse> {
        val data = dataCollector.collect()
        val briefingText = DailyBriefingFormatter.format(data)

        val response = DailyBriefingResponse(
            date = data.date,
            currency = data.currency,
            portfolioChangePercent = data.portfolioChangePercent,
            portfolioChangeAbsolute = data.portfolioChangeAbsolute,
            portfolioTotal = data.portfolioTotal,
            marketIndices = data.marketIndices.map { MarketIndexDto(it.symbol, it.label, it.dayChangePercent) },
            topGainers = data.topGainers.map { HoldingMoverDto(it.symbol, it.dayChangePercent, it.portfolioValue) },
            topLosers = data.topLosers.map { HoldingMoverDto(it.symbol, it.dayChangePercent, it.portfolioValue) },
            sectorBreakdown = data.sectorBreakdown.map { SectorBreakdownDto(it.sector, it.portfolioPercent) },
            newsHeadlines = data.newsHeadlines.map { NewsHeadlineDto(it.symbol, it.headline) },
            briefingText = briefingText,
        )
        return ResponseEntity.ok(response)
    }
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Run full test suite**

```bash
cd backend && ./gradlew test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/kotlin/com/investment/api/dto/DailyBriefingResponse.kt \
        backend/src/main/kotlin/com/investment/api/DailyBriefingController.kt
git commit -m "feat: add GET /api/briefing/daily endpoint"
```

---

## Task 8: Telegram `DAILY_BRIEFING` Message Type

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/application/TelegramScheduledMessageContentGenerator.kt`

- [ ] **Step 1: Inject `DailyBriefingDataCollector` and add the new case**

In `backend/src/main/kotlin/com/investment/application/TelegramScheduledMessageContentGenerator.kt`:

Add `private val briefingDataCollector: DailyBriefingDataCollector` to the constructor parameters (after `clock: Clock`):

```kotlin
@Service
class TelegramScheduledMessageContentGenerator(
    private val contextBuilder: TelegramContextBuilder,
    private val claudeClient: ClaudeClient,
    private val portfolioSummaryService: PortfolioSummaryService,
    private val analyticsService: AnalyticsService,
    private val allocationService: AllocationService,
    private val monthlyInvestmentService: MonthlyInvestmentService,
    private val transactionRepository: TransactionRepository,
    private val userProfileService: UserProfileService,
    private val briefingDataCollector: DailyBriefingDataCollector,
    private val clock: Clock,
)
```

Add `"DAILY_BRIEFING"` to the `generate()` switch:

```kotlin
fun generate(messageType: String): String {
    return when (messageType.uppercase()) {
        "PORTFOLIO_SUMMARY"   -> generatePortfolioSummary()
        "PERFORMANCE_REPORT"  -> generatePerformanceReport()
        "ALLOCATION_CHECK"    -> generateAllocationCheck()
        "INVESTMENT_REMINDER" -> generateInvestmentReminder()
        "TOP_MOVERS"          -> generateTopMovers()
        "DAILY_BRIEFING"      -> generateDailyBriefing()
        else -> "Unknown scheduled message type: $messageType"
    }
}
```

Add the new private method at the end of the class (before the closing brace), after `callClaude`:

```kotlin
private fun generateDailyBriefing(): String {
    return try {
        val data = briefingDataCollector.collect()
        DailyBriefingFormatter.format(data)
    } catch (e: Exception) {
        log.warn("Failed to generate daily briefing: {}", e.message)
        "*Daily Portfolio Briefing*\n\nBriefing unavailable — please check back later."
    }
}
```

Also add the missing import at the top of the file:

```kotlin
import com.investment.domain.DailyBriefingFormatter
```

- [ ] **Step 2: Compile check**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Run full test suite**

```bash
cd backend && ./gradlew test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/investment/application/TelegramScheduledMessageContentGenerator.kt
git commit -m "feat: add DAILY_BRIEFING Telegram scheduled message type"
```

---

## Task 9: Smoke Test the Endpoint

- [ ] **Step 1: Start the backend**

```bash
cd backend && ./gradlew bootRun
```

Wait for `Started InvestmentApplication`.

- [ ] **Step 2: Call the endpoint**

```bash
curl -s http://localhost:8080/api/briefing/daily | python3 -m json.tool | head -40
```

Expected: JSON response with `date`, `briefingText`, `marketIndices`, `topGainers`, `topLosers`, `sectorBreakdown`, `newsHeadlines`.

- [ ] **Step 3: Verify `briefingText` is readable**

```bash
curl -s http://localhost:8080/api/briefing/daily | python3 -c "import sys,json; print(json.load(sys.stdin)['briefingText'])"
```

Expected: Formatted Markdown with `*Daily Portfolio Briefing*` header and at least one populated section.

- [ ] **Step 4: Final commit (if anything was adjusted)**

```bash
git add -p && git commit -m "chore: smoke test fixes for daily briefing"
```

Only needed if any adjustments were made during smoke testing.
