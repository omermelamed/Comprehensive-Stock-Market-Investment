# Onboarding UX Specification — Premium Dark Fintech

Implementation target: React + TypeScript + Tailwind CSS v4 + Framer Motion.  
Reference implementation: `frontend/src/features/onboarding/ProfileSetup.tsx`, `frontend/src/pages/OnboardingPage.tsx`.

This document is the single source of truth for visual hierarchy, motion parameters, and per-control behavior for the five **outer** steps and the five **inner** Profile sub-steps.

---

## 1. Visual Concept

### Overall feel

- **Calm, analytical workstation** — not a marketing landing page. Every screen is a **structured panel**: headline → primary control surface (cards) → supporting context → navigation.
- **Depth through layering**, not heavy chrome: background → optional subtle vignette → main column → **Surface 1** cards → **Surface 2** nested panels (projections, summaries).
- **Purple** signals *system structure*: step labels, active navigation, focus rings, primary CTAs, selected non-money UI (e.g. currency card border when selected).
- **Green** is *strictly reserved* for **validity / completion / positive selection state** on inputs and checklist-style affordances (valid name, selected track check badge, completed outer-step checkmarks). Do not use green for decorative profit/loss semantics in onboarding.

### Layering strategy

| Layer | Token | Role |
|-------|--------|------|
| App background | `#09090F` or `#0A0A0F` | Full viewport; use one consistently per session (`OnboardingPage` uses `#09090F`). |
| Sidebar (desktop) | `#0C0C17` + `border rgba(255,255,255,0.05)` | Sits beside main; slightly lighter than bg for separation. |
| Primary content column | Transparent over bg | Max width **~36rem (`max-w-xl`)** for readability; Profile inner column **max 520px** (`max-w-[520px]`). |
| Surface 1 | `#0F0F1A` | Primary cards: name field, currency grid cells, textarea wrapper, horizon result card, monthly range card, allocation rows, confirmation sections. |
| Surface 2 | `#141420` | Secondary emphasis: projection card, disabled CTA fill, subtle nested summaries. |
| Borders | `rgba(255,255,255,0.06)` | Default 1–1.5px; stronger when focused/selected (see §7). |

**Elevation** is communicated with:

- **Border + optional soft shadow** on interactive cards (`box-shadow` using purple at low alpha for selected/focused states).
- **1px hairline dividers** inside cards (`border-top` with same border token) rather than thick separators.
- **No large empty hero regions** — if space remains, fill with **dense, staggered micro-cards** (e.g. three feature tiles on Identity) so the screen always feels “tooled,” not sparse.

---

## 2. Multi-step Layout

### Outer flow (5 steps)

1. Profile (includes 5 inner sub-steps)  
2. Risk Profile (7 questions)  
3. Target Allocations  
4. Initial Holdings (optional)  
5. Confirmation  

### Desktop (≥ `lg`)

- **Left sidebar** (~`18rem` / `w-72`): logo lockup, step list, active step description, footer trust copy.
- **Main column**: vertically centered block (`flex flex-col items-center justify-center`) with horizontal padding (`p-6 lg:p-12`).
- **Active step row** in sidebar: background `#6C63FF` at **12% opacity** (`#6C63FF12`), step index in **purple** filled circle for active; **completed** steps show **green** check on **green-tinted** circle background (`#00FF8730` fill, `#00FF87` icon).
- **Inactive** step numbers: fill `#1A1A2E`, text `#3D3D5C`.

### Mobile (`lg:hidden`)

- **Segmented progress bar** at top of main: **5** segments, height **2px** (`h-0.5`), `flex-1`, `rounded-full`. Filled segments use `#6C63FF`; unfilled `#1A1A2E`.
- Caption: `text-xs`, `Step {n} of 5 — {label}`, color `#3D3D5C`.

### Inner flow (Profile only)

- **Sub-step indicator**: row of **pill dots** + fraction `current/5`.
  - Inactive dot: **6px** wide, `#2E2E45`.
  - Active dot: **22px** wide, `#6C63FF`.
  - Completed segment styling: **animated width** on active dot; completed dots may rest at **w-6** with color `#2A2A45` (muted complete) — match `Dots` in `ProfileSetup.tsx`.
- **Sub-step content** replaces in place with **AnimatePresence** `mode="wait"`: horizontal slide + fade (see §4).
- **Outer sidebar** still shows **“Profile”** as active for all inner sub-steps; optional enhancement: sub-label “Profile · 3 of 5” in main only (not required for v1).

### Information architecture rule

- **One primary task per sub-step** (Identity: name; Financial: currency + goal; etc.). Secondary content (feature tiles, projection) supports trust, not competing CTAs.

---

## 3. Component Styling

Global typography (see §5 for tokens):

- **Step label**: `text-xs font-semibold uppercase tracking-widest`, color **purple** `#6C63FF`.
- **Screen title**: `text-2xl font-bold leading-tight`, **system UI font** (Tailwind default sans), `#EEEEFF`.
- **Subtitle**: `text-sm leading-relaxed`, `#5A5A7A`.

---

### 3.1 Name input (Identity)

- **Container**: Surface 1, `rounded-2xl`, `p-5`, `mb-5`, border **1.5px**.
- **Default border**: `rgba(255,255,255,0.06)`.
- **Focus or non-empty value**: border `#6C63FF` at **~50% alpha** (`#6C63FF80` or `${PURPLE}50` pattern), `box-shadow: 0 0 0 4px` with purple at **~7% alpha** (`#6C63FF12`).
- **Label**: `text-xs font-semibold uppercase tracking-widest`, `mb-3`, `#5A5A7A` (secondary label, not floating animation required for v1; if floating label added: float to **10px** top with scale **0.85** on focus/value).
- **Input**: `w-full bg-transparent`, `text-xl font-medium`, `#EEEEFF`, placeholder `#2A2A45` (slightly lighter than TEXT3 for legibility on dark).
- **Valid row** (trimmed non-empty): below input, **divider** `1px` border token; **green** circle **16×16**, `rounded-full`, bg `#00FF87`, check **9px** bold, fg `#09090F`; caption `text-xs`, `#00FF87`, copy “Hi {name}, let's keep going.” Animate with **height auto** + opacity (see §4).

### 3.2 Feature mini-cards (Identity, below name)

- Grid **3 columns**, `gap-2`, `mb-2`.
- Each: Surface 1, `rounded-xl`, `p-3`, `1px` border default.
- Stagger entrance (§4).

### 3.3 Currency selector

- Section label: uppercase tracking row (§3 intro).
- Grid **4 columns**, `gap-2` (`grid-cols-4`).
- **Card**: `rounded-2xl`, `py-4`, centered column; `flex flex-col items-center`.
- **Default**: Surface 1, border **1.5px** `rgba(255,255,255,0.06)`.
- **Selected**: bg `#6C63FF` at **~18%** (`#6C63FF2E`), border **1.5px** `#6C63FF` at **~70%** (`#6C63FFB3`), shadow `0 4px 20px #6C63FF25`.
- **Flag**: `text-2xl`, `mb-1.5`.
- **Short code**: `text-xs font-bold`, selected → `#EEEEFF`, else `#5A5A7A`.
- **Symbol**: `text-[10px]`, `#2E2E45`.
- **Interaction**: `whileTap { scale: 0.94 }`, spring **stiffness 400–600**, **damping ~30** (use **600/30** for taps on thumbs/small cards).

### 3.4 Investment goal

- Header row: label (uppercase) + **Optional** badge: `text-[10px]`, `px-2 py-0.5`, `rounded-full`, bg `#2E2E45` at **40%** + alpha, text `#5A5A7A`.
- **Textarea wrapper**: Surface 1, `rounded-2xl`, **1.5px** border; focus ring same as name (purple 50% border + 4px ring `#6C63FF10`).
- **Textarea**: `rows={2}`, `px-4 py-3.5`, `text-sm`, `resize-none`, placeholder `#2E2E45`.
- **Chips** (quick fills): `flex flex-wrap gap-2`.
  - Default: `transparent` bg, `1px` border `#2E2E45`, text `#5A5A7A`, `text-xs`, `px-3 py-1.5`, `rounded-full`.
  - **Active** (matches full string): bg `#6C63FF25`, border `#6C63FF` ~70%, text `#EEEEFF`; `whileTap scale 0.95`.

> **Semantic note:** Chip “selected” uses **purple** (structured choice), not green. Green remains for **valid checkmarks** and **completed** outer-step markers.

### 3.5 Time horizon — track + result card

- **Baseline**: horizontal line `1px`, `#2E2E45`, inset `left-2 right-2` from container; container `pt-2 pb-6 px-2`.
- **Filled segment**: absolutely positioned `h-px`, `origin-left`, width **0% → fillPct%**, bg `#6C63FF`, spring **stiffness 250**, **damping 28**.
- **Nodes**: buttons per horizon; unselected node **10×10** circle `#2E2E45`; selected **20×20**, `#6C63FF`, glow `0 0 14px #6C63FF70`. Label `text-[11px]`, selected `#EEEEFF` else `#5A5A7A`.
- **Result card** (when selected): Surface 1, `rounded-2xl`, `p-5`, `1px` border. Title row + **risk pill** (category colors allowed — **not** profit green; use distinct hues for risk tier readability).
- **Section “What this means”**: top border `1px`, `padding-top 16px`; small caps label `text-[10px] tracking-widest`, `#2E2E45`; bullets: **purple** dot `4px` circle, `text-xs` body `#5A5A7A`.
- **Empty state**: dashed border `1px dashed #2E2E45`, centered prompt `#2E2E45`.

### 3.6 Monthly range — dual slider + projection

- **Range card**: Surface 1, `rounded-2xl`, `p-6`, `mb-5`.
- **Headline numbers**: `text-4xl font-bold tabular-nums`, `#EEEEFF`; en-dash separator `text-xl`, `#2E2E45`.
- **Track**: full width `h-10` flex container; base track `h-1`, `rounded-full`, `#2E2E45`.
- **Active range fill**: gradient `linear-gradient(90deg, #6C63FF, #00FF87)` — purple → green communicates **system range** → **valid monetary band** (green as “valid band,” not P&L).
- **Thumbs**: `w-5 h-5`, white fill, border **2px** `#6C63FF`, shadow `0 2px 12px #6C63FF60`; `whileHover scale 1.25`, `whileTap scale 0.92`, spring **600/30**.
- **Axis labels**: `text-[11px]`, `#2E2E45`, min/max with currency symbol.
- **Projection card** (Surface 2): `rounded-2xl`, `p-4`, `1px` border; header uppercase `text-xs`, `#2E2E45`; grid **3 cols** stats; values `text-sm font-semibold tabular-nums`, `#EEEEFF`; disclaimer `text-[10px]`, `#2E2E45`. Opacity animates to **0.4** if max is 0 (disabled semantics).

### 3.7 Asset track cards

- Grid **2 columns**, `gap-2.5`, `mb-5`.
- Card: `rounded-2xl`, `p-4`, `text-left`, `relative`, `overflow-hidden`.
- **Unselected**: Surface 1, `1.5px` border default.
- **Selected**: track **accent** at **12%** bg, **60%** border, shadow `0 4px 18px {accent}20`.
- **Check badge** (top-right): when on — **spring** pop-in; bg **`#00FF87`** for toggled selections, fg `#09090F`, **10px** check; for **always-on** track, use accent-tinted badge (no misleading green).
- **Icon**: `text-2xl`, `mb-2.5`.
- **Title**: `text-sm font-semibold`, selected `#EEEEFF`, unselected muted `#6A6A8A`.
- **Subtitle**: `text-[11px]`, `#5A5A7A`.
- **Footer block**: top border (accent 30% when on else default); “AI covers” / risk pill row; risk colors **semantic for risk**, not stock P&L green/red — keep **red** for high/complex risk warning only.
- **Summary strip** below grid: Surface 1, `rounded-xl`, `px-4 py-3`; leading dot **`#00FF87`** + count copy; meta `#2E2E45`.

### 3.8 Questionnaire (Risk Profile)

- **Top progress**: track `h-1.5`, **Surface 2** or `#1A1A2E` fill; fill `#6C63FF` with **spring width** (replace plain CSS transition — stiffness **~300**, damping **35**). Label `text-xs tabular-nums`, `#5A5A7A`.
- **Question title**: `text-sm font-medium`, `#EEEEFF`; index prefix `#2E2E45`.
- **Options**: single-select **rows**, `gap-1.5`; each row Surface 1, `rounded-xl`, `1px` border, `px-4 py-3`, `flex items-center justify-between`.
- **Default**: border default, text `#5A5A7A`.
- **Hover**: border `#6C63FF40`, slight `translateY(-1px)` (optional).
- **Selected**: border `#6C63FF` ~80%, left **4px** accent bar `#6C63FF` **or** trailing **green** check in circle **only** when selected (pick one pattern consistently — **recommended**: purple border + **green** `✓` in circle for “answered/valid” row).
- **Risk summary card** (after all answered): Surface 1, pill + bar chart; use **tier colors** (yellow/blue/green tier) only for **risk band**, not mixed with allocation semantics.

### 3.9 Allocation table (Target Allocations)

- Prefer **card rows** over HTML `<table>` for motion: each row Surface 1, `rounded-xl`, `p-4`, `mb-2`, `1px` border.
- Columns: **Symbol** (mono `tabular-nums` / uppercase ticker), **Type** (select or badge), **Target %** (numeric input with `%` suffix).
- **Add row** button: secondary style, border `#2E2E45`, text `#5A5A7A`; hover border `#6C63FF50`.
- **Row total / validation**: footer bar Surface 2; if sum ≠ 100%, show **error** `#FF3B5C` text and border; when valid, **green** `✓` “100% allocated”.

### 3.10 Initial Holdings (optional)

- Reuse row card pattern; optional **Skip** as text button `#5A5A7A` → hover `#EEEEFF`.
- Quantity and price fields: mono, **green** border only when **valid** number (optional polish).

### 3.11 Confirmation

- **Grouped sections**: each Surface 1, `rounded-2xl`, `p-5`, `mb-4`, section title uppercase `text-xs tracking-widest` `#6C63FF`, body `#5A5A7A`.
- **Data lines**: label `#2E2E45`, value `#EEEEFF`; numbers **tabular-nums**.
- **Submit** CTA: same as Profile primary CTA (purple fill, white text, shadow `#6C63FF40`).

---

## 4. Motion System

All timings use **Framer Motion** unless noted.

### 4.1 Outer / inner step transition (Profile sub-steps & optional outer)

- **Variant pattern** (`custom` direction `d`):
  - `enter`: `x: d > 0 ? 48 : -48`, `opacity: 0`
  - `center`: `x: 0`, `opacity: 1`
  - `exit`: `x: d > 0 ? -48 : 48`, `opacity: 0`
- **Transition**: `duration: 0.26`, `ease: [0.25, 0.1, 0.25, 1]` (smooth deceleration).
- **Container**: `AnimatePresence mode="wait"` to avoid overlap.

### 4.2 Card / list entrance (stagger)

- **Container**: `staggerChildren: 0.07` (70ms).
- **Child**: from `opacity: 0`, `y: 12` → `opacity: 1`, `y: 0`; duration **0.32**, ease `[0.25, 0.1, 0.25, 1]`.

### 4.3 Tap feedback (buttons, cards)

- **Primary CTA / small cards**: `whileTap: { scale: 0.97 }` (range **0.94–0.97** allowed per control density).
- **Spring** (if using `spring` type on release): **stiffness 400–600**, **damping 28–32**.

### 4.4 Focus (inputs)

- **Border transition**: **200ms** (`transition-all duration-200`) to purple border + **4px** ring (`ring` simulated via `box-shadow`, not `outline`, for radius fidelity).

### 4.5 Progress (dots & bars)

- **Dot morph**: spring **stiffness 400**, **damping 30** (active pill width).
- **Questionnaire bar width**: spring **stiffness 300**, **damping 35** (recommended upgrade from linear CSS).

### 4.6 Slider thumbs

- **Hover**: scale **1.25** (spring **600/30**).
- **Drag**: `scale: 0.92` on active thumb; track uses **pointer capture** for smooth UX.

### 4.7 Number transitions (currency amounts)

- `useSpring` from `framer-motion` for displayed min/max:
  - **stiffness 220**, **damping 28** (matches `useAnimatedNumber` in `ProfileSetup.tsx`).
- Display **rounded integers** for monthly amounts in UI.

### 4.8 Presence (accents)

- Check badges, valid name row: `AnimatePresence` + height collapse; **opacity 200–220ms**; optional `layout` for reflow.

### 4.9 Reduced motion

- Respect `prefers-reduced-motion: reduce`: set slide distance to **≤8px** or fade-only; disable stagger; snap springs to **tween 0.15s**.

---

## 5. Color System

### 5.1 Core tokens

| Token | Hex | Usage |
|-------|-----|--------|
| `bg.app` | `#09090F` or `#0A0A0F` | Page background (pick one; current: `#09090F`). |
| `bg.sidebar` | `#0C0C17` | Desktop sidebar. |
| `surface.1` | `#0F0F1A` | Primary cards, inputs. |
| `surface.2` | `#141420` | Secondary panels, disabled CTA fill. |
| `border.subtle` | `rgba(255,255,255,0.06)` | Default borders. |
| `accent.purple` | `#6C63FF` | Structure, focus, primary CTA, active nav, selected currency, filled horizon track. |
| `accent.green` | `#00FF87` | **Valid** / **complete** / **selected affirmative** (checks, valid name, track check when applicable, completed step check, slider gradient end as “valid band”). |
| `accent.red` | `#FF3B5C` | Errors, destructive, high-risk emphasis where needed. |
| `text.primary` | `#EEEEFF` | Titles, values, active labels. |
| `text.secondary` | `#5A5A7A` | Body, descriptions. |
| `text.muted` | `#2E2E45` | Hints, disabled, axis labels, tertiary. |
| `text.placeholder` | `#2A2A45` | Input placeholder (slightly brighter than muted for contrast). |

### 5.2 Alpha helpers (implementation)

- Purple **50%** border on focus: `#6C63FF` + **80** in hex or `${PURPLE}50` in code.
- Purple **12%** ring: `#6C63FF12`.
- Purple **CTA shadow**: `0 4px 20px #6C63FF40`.

### 5.3 Semantic rules

1. **Purple**: navigation, focus, primary action, structural selection (currency, horizon track).
2. **Green**: validity, completion, positive confirmation affordances — **never** for generic decoration.
3. **Red**: errors and cautions; optional for “complex/high risk” badges (already in tracks).
4. **Yellow / blue / purple / fuchsia** in horizon **risk** and track **accents**: **category** differentiation — not P&L.
5. **Gradients**: only **slider** (purple → green) and **subtle** hero accents if ever added; no animated rainbow backgrounds.

---

## 6. Step 1 Rendered Description (Profile — 5 Sub-steps)

### Sub 1 — Identity

User sees **step label** “Step 1 of 5 — Profile” in **purple**, small caps. **Title** “Welcome to your investment platform” and **subtitle** explaining personalization. Below, **five dot indicators** with `1/5`.

Primary **name card** (Surface 1): label “YOUR NAME”, large input with placeholder “What should we call you?”. On typing, border **glows purple**; when non-empty, a **green** validation row slides open with check and greeting.

Below, caption “Here's what you're building” in **muted** tone, then **three** small feature cards in a row (icons + short benefit). **Continue** is **purple** pill, right-aligned; **Back** hidden on first sub-step.

### Sub 2 — Financial context

Label “Step 2 of 5 — Financial identity”. Title includes **their name** possessive. **Four** large currency tiles in one row: flag, code, symbol; **selected** tile gains purple fill tint + purple border + soft shadow. **Investment goal** block: optional badge, textarea, then **chip** row for quick goals; chips use **purple** when active.

**Back** (muted) left, **Continue** right.

### Sub 3 — Time horizon

Label “Step 3 of 5 — Timeline”. Horizontal **timeline** with baseline and **purple** progress fill to active node; nodes **spring** larger when selected. **Result card** shows horizon title, years label, **risk** pill, and **three** bullet explanations with purple dots.

### Sub 4 — Monthly budget

Label “Step 4 of 5 — Budget”. Large **tabular** min–max display with **spring-animated** numbers. **Dual-thumb** slider with purple/green gradient between thumbs; thumbs glow purple. Below, **projection** card (Surface 2) with three columns: average per month, per year, total over horizon — all **mono** aligned.

### Sub 5 — Asset tracks

Label “Step 5 of 5 — Investment universe”. **2×3** grid of track cards with icon, title, subtitle, footer “AI covers” + risk tag. Selected cards show tinted border + **green** check badge (except always-on policy — accent badge). Bottom **summary strip** with **green** dot and count. CTA: **“Finish profile”**.

---

## 7. Exact UI Decisions for Each Field

Legend: **W** = width behavior, **R** = radius, **B** = border, **F** = focus, **S** = selected/valid, **E** = error, **D** = disabled.

### Outer shell

| Element | Component | Dimensions & layout | Colors & border | States | Motion |
|---------|-----------|---------------------|-----------------|--------|--------|
| App root | `div.min-h-screen.flex` | Full viewport | `bg #09090F` | — | — |
| Sidebar | `aside.hidden lg:flex` | `w-72`, `p-8`, `border-r` | `bg #0C0C17`, `border rgba(255,255,255,0.05)` | Active row `#6C63FF12` | — |
| Sidebar step index | `div` circle | `w-6 h-6`, `rounded-full`, `text-xs` | Done: bg `#00FF8730`, fg `#00FF87`; Active: bg `#6C63FF`, fg `#fff`; Idle: bg `#1A1A2E`, fg `#3D3D5C` | — | — |
| Mobile progress | 5 × `flex-1` bars | `h-0.5`, `gap-1` | Fill `#6C63FF` if `step >= n` else `#1A1A2E` | — | Width change **spring** optional |
| Main column | `div.max-w-xl` | `w-full`, centered | Transparent | — | — |

### Profile — Sub 1

| Field | Type | Dimensions | Default | Hover | Focus | Selected/valid | Disabled | Animation |
|-------|------|------------|---------|-------|-------|----------------|----------|-----------|
| Name | text input in card | Card `rounded-2xl p-5`; input `text-xl` | B `1.5px` subtle | — | B purple 50%, ring `0 0 0 4px #6C63FF12` | Green row + check | — | Valid row expand |
| Feature tiles | static cards | `grid-cols-3 gap-2`, `rounded-xl p-3` | Surface 1 + subtle B | — | — | — | — | Stagger 70ms |
| Continue | `motion.button` | `px-7 py-2.5 rounded-xl` | If invalid: Surface 2, text muted | — | — | Valid: purple bg, white text, shadow `#6C63FF40` | `cursor not-allowed` when invalid | `whileTap scale 0.97` |

### Profile — Sub 2

| Field | Type | Dimensions | Default | Hover | Focus | Selected | Error | Animation |
|-------|------|------------|---------|-------|-------|----------|-------|-----------|
| Currency | 4 × `button` cards | `grid-cols-4`, `py-4`, `rounded-2xl` | Surface 1, subtle B | — | — | Purple tint + B + shadow | — | Stagger delay `i*60ms`, `whileTap 0.94` |
| Goal textarea | textarea in card | `rounded-2xl`, `rows=2`, `px-4 py-3.5` | Surface 1 | — | Purple B + ring | Non-empty optional (no green required) | — | — |
| Goal chips | `button` pills | `text-xs px-3 py-1.5 rounded-full` | Transparent, B muted | B purple 40% | — | Purple fill 25%, B 70% | — | `whileTap 0.95` |
| Back / Continue | buttons | CTA row `mt-8` | Back text secondary | Back text primary | — | Continue purple when allowed | — | Continue `whileTap 0.97` |

### Profile — Sub 3

| Field | Type | Dimensions | Default | Focus | Selected | Animation |
|-------|------|------------|---------|-------|----------|-----------|
| Horizon track | custom + buttons | Full width, `h-10` area | Baseline `#2E2E45` | — | Purple fill + large node | Fill width spring 250/28; node spring 500/28 |
| Result card | panel | `rounded-2xl p-5` | Surface 1 | — | Shows tier pill + bullets | Enter 220ms fade/y 8 |

### Profile — Sub 4

| Field | Type | Dimensions | Default | Focus | Valid | Animation |
|-------|------|------------|---------|-------|-------|-----------|
| Min/max display | text | `text-4xl tabular-nums` | `#EEEEFF` | — | — | `useSpring` 220/28 |
| Dual slider | range UI | Track `h-1`; thumbs `20px` | Track muted | Thumb border purple | Range gradient | Spring hover 600/30 |
| Projection stats | grid | `grid-cols-3 gap-3` | Surface 2 | — | Fades if max=0 | Optional opacity spring |

### Profile — Sub 5

| Field | Type | Dimensions | Default | Selected | Disabled | Animation |
|-------|------|------------|---------|----------|----------|-----------|
| Track card | `button` | `grid-cols-2`, `p-4`, `rounded-2xl` | Surface 1 | Accent tint + B + shadow | `alwaysOn`: no hover/tap | Enter `delay i*0.06`; hover `y -2`; tap `0.97` |
| Check badge | `motion.div` | `w-5 h-5`, `top-3 right-3` | — | Green `#00FF87` fg `#09090F` | Accent tint if locked | Spring pop 600/28 |

### Step 2 — Questionnaire (7 questions)

For each **question block** and **option row**:

| Field | Type | Dimensions | Default | Hover | Selected | Motion |
|-------|------|------------|---------|-------|----------|--------|
| Progress bar | div | `h-1.5`, full width | Track `#1A1A2E` | — | Fill `#6C63FF` | Spring width |
| Option row | `button` | `rounded-xl px-4 py-3`, flex between | Surface 1, B subtle | B `#6C63FF40`, `y-px` | B `#6C63FF` + green check OR left bar | `whileTap 0.98` |

Store answers as indices `1..n` per question; **Continue** enabled when `answeredCount === 7`.

### Step 3 — Target allocations

| Field | Type | Dimensions | Default | Focus | Valid | Error |
|-------|------|------------|---------|-------|-------|-------|
| Symbol | text | Mono, `uppercase`, `rounded-lg px-3 py-2` | Surface 1 | Purple ring | Green outline optional | Red border `#FF3B5C` if invalid ticker format |
| Type | select or segmented | Same row height | Surface 1 | Purple | — | — |
| Percent | number | `tabular-nums`, suffix `%` | — | Purple ring | Row green when 0–100 valid | Red if <0 or >100 |
| Add / remove | icon buttons | `h-8 w-8` | Muted | Purple | — | — |
| Footer sum | summary | — | — | — | Green check + “100%” | Red text if ≠100% |

### Step 4 — Initial holdings

| Field | Type | Default | Valid | Notes |
|-------|------|---------|-------|-------|
| Symbol | text | Surface 1 | Purple focus | Same as allocations |
| Quantity | number | Mono | Green border optional when >0 | Block sell semantics if not in scope |
| Cost basis | money | — | — | Currency symbol from Profile |
| Skip | text button | Muted | — | No green until explicitly “skipped” if you add confirmation |

### Step 5 — Confirmation

| Block | Content | Style |
|-------|---------|--------|
| Profile summary | name, currency, goal snippet, horizon, range, tracks | Section card, purple section label |
| Risk | score + band | Tier colors in **summary** only |
| Allocations | list or table | Row mono % |
| Holdings | optional list | Muted empty state |
| Submit | primary CTA | Purple + loading state (spinner white on purple) |

---

## Implementation checklist (frontend)

1. Centralize tokens in `index.css` as CSS variables **or** a single `onboardingTokens.ts` re-exported by screens — avoid drift from hardcoded duplicates.
2. Profile inner transitions: keep `custom` direction state synchronized with **forward/back**.
3. Questionnaire: align progress bar and option styling with §3.8 and §4.5.
4. Accessibility: focus order left-to-right, **visible focus** on all interactive elements; `aria-current` on active sidebar step; slider thumbs **keyboard** accessible (arrow nudge) — add if not present.
5. `prefers-reduced-motion` branch in a small `useReducedMotion` hook.

---

*End of specification.*
