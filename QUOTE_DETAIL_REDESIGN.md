# Quote Detail Page — Redesign Working Doc

Page: `/app/quotes/:id`
Source: `apps/web/src/pages/customer/quote-detail.tsx`
Child components: `apps/web/src/components/quote/detail/*`

Working document capturing the design critique findings and the punch list we're working against. Check items off as we ship them.

---

## Context

Internal-facing quote detail page for a UK memorial masonry CRM. Operator is a stonemason or office admin building a price quote for a customer (often a grieving family) or a funeral director, for a headstone, re-cut lettering, or refurbishment. The operator works under production pressure; the *output* lands with someone at the worst moment of their life. Internally the tool needs to be fast and dense. Externally it needs to look considered.

The operator opening this page is usually doing one of three things:

1. Starting a new quote and filling in fields.
2. Coming back to adjust pricing before marking Ready.
3. Reviewing before sending to a customer.

The current layout does not optimize for any of the three.

---

## Findings

### Visual design

- **Four competing background treatments.** White (page), white with border (outer cards), `bg-muted` (Quote Context field blocks + Product strip), `border-orange-200 bg-orange-50` (Internal Notes), and orange type (Draft status, "No technique set — pricing unavailable"). None carry a consistent meaning. Orange/amber especially is used for Draft status, Internal Notes background, *and* missing-data warnings.
- **Nested card-in-card frames.** "Pricing Options" is a Card. Inside it is the option tab bar. Below that is a `bg-muted` rounded "Product" strip. Below *that* the Pricing summary is another bordered Card. The user's eye crosses four container edges to read a single number.
- **Typographic hierarchy collapses.** "Pricing Options", "Stone Components", "Lettering (2 items)", "Sundries", "Custom Line Items", and "Documents" render at nearly the same size/weight. Six headings read as peers; nothing says "Pricing Options" is the parent of the others.
- **Status indicator does double duty badly.** The orange dot + "Draft" label + four-pip progress bar reads as two status indicators side by side. The dot and the first filled pip are redundant. The bar uses the same orange whether the quote is Draft or in a failure state (rejected/expired also map onto the four pips).
- **Horizontal scroll on the Lettering table.** A scrollbar under the Inscription table clips the "L..." column. Horizontal scroll inside a card inside a page is a maze.
- **Icon usage is uneven.** Customer Response card uses MessageSquare. Internal Notes has no icon. None of the section headers do.

### Interface design

- **No focusing mechanism.** No element says "start here." The £0.00 Total is buried in a right-sidebar card at 18px bold, while "Q-00029" is shown three times in a 200px band.
- **Page has no top-level answer.** Header shows four pieces of metadata (Q-00029 · Rhys Griffiths · £0.00 · Draft). It does not show what's blocking this from being Ready, even though the page knows: "No technique set" is buried in the lettering table, "Select method…" sits in Quote Context.
- **Progressive disclosure is inverted.** Most-edited things (line items, pricing) sit at the bottom. Least-edited things (Created/Updated dates, Internal Notes) take prominent right-sidebar real estate. "Created 10 Apr 2026 / Updated 10 Apr 2026" on identical days is a near-zero-value card.
- **Option tab bar is under-designed.** Tabs contain three runs of text: "Q-00029" + "(Option A)" + "£0.00". The quote number stem is shared across all options — it's noise inside the tab. And there's no way to *compare* options, which is the main reason the data model exists.
- **Redundant labels and descriptions.** "Shared information across all options" under "Quote Context". "Files and documents for this quote" under "Documents". "Pricing Options" over a card that already shows prices.
- **Empty states are full-width cards.** "No sundries added yet. Add one now" and "No custom line items added yet. Add one now" each claim a full-width card on quotes that will never use them. Could collapse to inline "+ Sundries | + Custom line" chips.

### Consistency & conventions

- **Four different "add" patterns coexist.** Components: `+ Add Component` button above the table. Lettering: `+ Add Lettering` button in section header. Sundries: inline empty-state "Add one now" link. Custom Line Items: inline empty-state "Add one now" link.
- **Four different action surfaces in one view.** Option tab has a hidden chevron for Clone/Delete. Components have a trash can per row. Lettering has edit/trash per row. Header has MoreHorizontal. The global list-view "View" convention from `CLAUDE.md` doesn't carry here.
- **Grid shifts mid-scroll.** Pricing Summary sidebar ends at the bottom of the Components table; the rest of the option content (Lettering, Sundries, Custom) renders at full width. The layout doesn't commit to two-column vs one-column.
- **Internal metrics mixed with customer-facing totals.** The Pricing card shows Subtotal / VAT / Total (customer-facing) immediately followed by Total Cost / Gross Margin / Margin % (internal only) in the same card. Cannot share the screen without leaking margin.

### User context

- For a fresh quote (use case 1): no sense of "what's next." Required fields are buried.
- For adjusting pricing (use case 2): Total is hidden in a sidebar; margin is tangled with customer totals.
- For pre-send review (use case 3): no side-by-side preview of what the customer will see. "Customer View" is a button with no structural relation to the body below.

---

## Top opportunities (ranked)

Ordered by impact — roughly structural → behavioral → visual.

### 1. Kill the card-in-card nesting

Make the top-level page flow a single stack of sections with hairline dividers and strong `<h2>`/`<h3>` hierarchy. Reserve Card framing for the two things that actually need to "float": the Pricing summary and Internal Notes. Everything else is a section, not a card.

Files: `quote-detail.tsx`, `option-content.tsx`, `shared-context-card.tsx`, section components.

### 2. Pull the Total into the page header

Replace the "Q-00029 / Rhys Griffiths • £0.00 / Draft" line with a two-line hero:

- Line 1: quote number + customer.
- Line 2: **large Total** + Draft badge + "N fields missing" hint linking to the blocker.

This is the one question every operator has on arrival.

Files: `quote-detail.tsx` (header section, lines ~383–421).

### 3. Split internal metrics from customer pricing

Customer-facing Subtotal/VAT/Total stays in the Pricing card. Move Cost / Gross Margin / Margin % into a separate "Internal" block, visually subordinate, with an "eye-off" affordance so screen-shares are safe.

Files: `option-content.tsx` (lines ~155–206).

### 4. Collapse empty optional sections

Sundries and Custom Line Items when empty render as two chips under Lettering (`+ Sundries` / `+ Custom line`), not full-height cards. Expand them only once an item is added.

Files: `sundries-section.tsx`, `custom-line-items-section.tsx`, `option-content.tsx`.

### 5. Fix the status indicator

One component. Either a status pill (Draft / Ready / Presented / Accepted) *or* a 4-step stepper — not both side-by-side with the same color. Favor the stepper: it communicates remaining work, not just current state. Use distinct colors for failure states (rejected / expired) instead of re-coloring the stepper.

Files: `quote-detail.tsx` (lines ~401–420).

### 6. Rework the option tab bar

Tabs read `Option A — £1,240` (no Q-number inside the tab; the stem is already in the header). Add a "Compare options" action once there are ≥2 options. Side-by-side comparison is the main value prop of the quote-package data model.

Files: `quote-detail.tsx` (lines ~537–585), possibly a new `option-compare.tsx`.

### 7. Unify action surfaces

One "add" pattern across Components / Lettering / Sundries / Custom Line Items — pick the section-header button and apply it everywhere. One row-action pattern — follow the `CLAUDE.md` "View" convention where possible; where we need edit/delete inline, use a single icon-dropdown, not mixed icon buttons.

Files: all four section components.

### 8. Commit the grid

Either the sidebar runs the full height of the page (Pricing summary sticky on the right; main column holds Components + Lettering + Sundries + Custom + Documents) or the page is one column with Pricing inline. No mid-scroll reflow.

Files: `option-content.tsx`, `quote-detail.tsx` (sidebar block lines ~614–690).

### 9. Strip redundant descriptions

Remove `CardDescription`s that restate the title ("Shared information across all options", "Files and documents for this quote"). Remove the "Details" card entirely when Created == Updated and there's nothing else to show.

Files: `shared-context-card.tsx`, `quote-detail.tsx` (Details card lines ~673–688), `DocumentsCard` usage.

### 10. Prioritize the readiness blocker

A thin top banner when the quote is Draft: "N fields need attention before this can be marked Ready" with jump links to the missing fields (Production Method, lettering technique, etc.).

Files: `quote-detail.tsx` (new banner above the options block).

---

## Working order

Suggested sequence for this session:

1. **#2 Header + Total** — smallest change, biggest clarity win, no data-model impact.
2. **#1 De-nest the cards** — touches every child component; do it as one pass so styles stay coherent.
3. **#3 Split internal metrics** — isolated to the Pricing card.
4. **#5 Status indicator** — isolated to the header.
5. **#4 Empty-state collapse** + **#7 Unify add/action patterns** — bundle since they touch the same section components.
6. **#8 Commit the grid** — do last; depends on which sections survive the empty-state collapse.
7. **#6 Option tabs** and **#10 Readiness banner** — either order, both isolated.
8. **#9 Strip redundant descriptions** — cleanup pass at the end.

---

## Out of scope for this pass

- Customer View (`customer-view.tsx`) — separate critique when we get to it.
- `quote-document.tsx` (PDF rendering) — unchanged.
- New mutations or data-model changes — redesign is layout/styling only.
