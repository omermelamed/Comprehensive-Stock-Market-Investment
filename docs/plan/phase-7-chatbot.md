# Phase 7 — Portfolio Chatbot

**Goal:** Floating AI assistant available on every page. Fully aware of the user's actual portfolio, allocation gaps, and risk profile. Answers natural language investment questions.

**Prerequisite:** Phase 6 complete. Shared context builder exists and is well-tested.

**Status:** ⬜ Not started

---

## Backend Tasks

### Chat Endpoint
- [ ] `POST /api/chat` — request: `{ messages: [{ role, content }] }`
  - injects full shared context as system prompt on first call
  - passes full conversation history on each call
  - response: `{ role: "assistant", content: String }`
- [ ] `ChatService` — builds system prompt with shared context, calls Anthropic API
- [ ] `ChatRequest` / `ChatResponse` DTOs
- [ ] `ChatSessionContext` — builds the system prompt from `SharedContextBuilder` + latest recommendations

### Context Injection
- [ ] System prompt includes (all from DB, nothing hardcoded):
  - user display name and investment goal
  - full current holdings (symbol, quantity, value, P&L)
  - target allocation vs current allocation (gaps)
  - risk level and time horizon
  - monthly investment range
  - enabled tracks
  - latest recommendations from `ai_recommendation_cache` (if available)

---

## Frontend Tasks

### Chat UI Shell
- [ ] `ChatButton` — floating button bottom-right on all pages (💬 icon + unread badge)
- [ ] `ChatPanel` — slide-in panel from right (does not navigate away from current page)
- [ ] `useChatPanel` hook — open/close state, accessible from any page via context

### Chat Panel Content
- [ ] `ChatMessageList` — scrollable message history
- [ ] `ChatMessage` — user or assistant bubble with markdown rendering
- [ ] `ChatInput` — text input + send button (Enter to send, Shift+Enter for newline)
- [ ] `ChatClearButton` — clears conversation history
- [ ] `ChatLoadingIndicator` — typing indicator while waiting for response

### Conversation State
- [ ] `useChatConversation` hook — manages message array, sends to API, appends response
- [ ] Session history persisted in component state (cleared on page refresh or "Clear" button)

### Pre-loaded Context (from other features)
- [ ] "Ask AI" from watchlist → opens chat panel with message pre-filled: "Tell me about [symbol]"
- [ ] Chat button context-aware: if on a specific page, can include page context in first message

### API Client
- [ ] `api/chat.ts` — chat endpoint

---

## Validation Checklist

- [ ] Chat panel opens without navigating away from current page
- [ ] System prompt correctly contains user's actual holdings and gaps (not hardcoded examples)
- [ ] Chatbot answers reference real portfolio data (e.g. "Your VOO position is up 12%")
- [ ] Conversation history maintained within session
- [ ] Clearing conversation resets to empty state
- [ ] Chat still works if recommendations cache is empty (graceful degradation)
- [ ] "Ask AI" from watchlist pre-loads the symbol context correctly
- [ ] Markdown renders correctly (tables, bullet points, bold text)
