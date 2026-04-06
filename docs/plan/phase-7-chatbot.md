# Phase 7 — Portfolio Chatbot

**Goal:** Floating AI assistant available on every page. Fully aware of the user's actual portfolio, allocation gaps, and risk profile. Answers natural language investment questions.

**Prerequisite:** Phase 6 complete. Shared context builder exists and is well-tested.

**Status:** ✅ Complete

---

## Backend Tasks

### Chat Endpoint
- [x] `POST /api/chat` — request: `{ message: String, history: List<{ role, content }> }`
  - injects full portfolio context as system prompt on every call
  - passes full conversation history on each call
  - response: `{ reply: String }`
- [x] `ChatService` — builds system prompt with full portfolio context, calls ClaudeClient
- [x] `ChatRequest` / `ChatResponse` DTOs

### Context Injection
- [x] System prompt includes (all from DB, nothing hardcoded):
  - full current holdings with live prices, quantity, and % of portfolio
  - target allocations and current gaps
  - risk level and monthly budget
  - enabled tracks
  - AI boundary declared: can explain/analyze, cannot create transactions or modify data
- [x] Watchlist signals included in context
- [x] Latest recommendations from `ai_recommendation_cache` injected — `ChatService.buildSystemPrompt()` loads fresh cached recommendations via `RecommendationCacheRepository.findFresh()`

---

## Frontend Tasks

### Chat UI Shell
- [x] `ChatButton` — floating button bottom-right on all pages (MessageCircle icon, purple)
- [x] `ChatPanel` — slide-in panel from right, backdrop overlay
- [x] `useChatPanel` hook — open/close state, message list, send logic, loading state

### Chat Panel Content
- [x] `ChatMessageList` — scrollable message history with auto-scroll to bottom
- [x] `ChatMessage` — user bubble (right, primary bg) and assistant bubble (left, card bg with BrainCircuit icon)
- [x] `ChatInput` — textarea + send button (Enter to send, Shift+Enter for newline)
- [x] `ChatLoadingIndicator` — 3-dot bounce animation while waiting for response
- [x] Empty state with 3 starter prompt buttons ("What should I buy this month?", "How is my portfolio doing?", "Am I too concentrated?")
- [x] `ChatClearButton` — `RotateCcw` icon in header, calls `clear()` to reset messages and input
- [x] Markdown rendering — `react-markdown` with styled components for paragraphs, lists, bold, and code

### Conversation State
- [x] `useChatConversation` embedded in `useChatPanel` — manages message array, sends to API, appends response
- [x] Session history persisted in component state (cleared on page refresh)

### Pre-loaded Context (from other features)
- [x] "Ask AI" from watchlist → opens chat panel with message pre-filled via `ChatContext` + `openWithPrompt`
- [x] Chat button context-aware for current page — `useLocation()` maps routes to contextual labels shown on button and in panel header

### API Client
- [x] `api/chat.ts` — chat endpoint

---

## Validation Checklist

- [x] Chat panel opens without navigating away from current page
- [x] System prompt correctly contains user's actual holdings and gaps (not hardcoded examples)
- [x] Conversation history maintained within session
- [x] Chat still works if recommendations cache is empty (graceful degradation)
- [x] ClaudeClient reuse via new `completeWithHistory()` overload (existing `complete()` delegates to it)
- [x] Clearing conversation resets to empty state — explicit clear button in header resets messages
- [x] "Ask AI" from watchlist pre-loads the symbol context correctly — `openWithPrompt` pre-fills input
- [x] Markdown renders correctly — `react-markdown` with paragraph, list, bold, code components
