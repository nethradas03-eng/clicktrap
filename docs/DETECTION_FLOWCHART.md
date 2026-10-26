# ClickTrap – Detection Engine Flowchart & Process Pipeline

This document details the multi-stage detection pipeline implemented within `detector.js`, `content.js`, and `rules.js`.

---

## 1. High-Level Detection Flowchart

```mermaid
flowchart TD
    START([User clicks 'Scan Webpage Now']) --> INJECT{Is Content Script\nInjected?}
    INJECT -- No --> DO_INJECT[Inject rules.js, detector.js, content.js]
    DO_INJECT --> DISPATCH[Send RUN_SCAN Message]
    INJECT -- Yes --> DISPATCH

    DISPATCH --> DOM_QUERY[1. Traverse Inspectable DOM Nodes\nbuttons, links, text, inputs, dialogs]
    
    subgraph Detection Engine [detector.js]
        DOM_QUERY --> FILTER_HIDDEN{Is element hidden\nor off-screen?}
        FILTER_HIDDEN -- Yes --> SKIP_NODE[Skip Node]
        FILTER_HIDDEN -- No --> RUN_PATTERNS[2. Run Pattern Rules\nRegex evaluation against text content]
        
        RUN_PATTERNS --> MATCH_PATTERN{Pattern Match?}
        MATCH_PATTERN -- Yes --> ADD_PATTERN_FINDING[Record Finding & Rule Weight]
        MATCH_PATTERN -- No --> RUN_HEURISTICS
        ADD_PATTERN_FINDING --> RUN_HEURISTICS[3. Execute Structural Heuristics]

        RUN_HEURISTICS --> H_TIMER[Countdown Timer Detector]
        RUN_HEURISTICS --> H_COOKIE[Cookie Asymmetry & Missing Reject]
        RUN_HEURISTICS --> H_PRECHECK[Pre-Checked Tracking / Add-ons]
        
        H_TIMER --> DEDUP[4. Deduplication & Signal Saturation]
        H_COOKIE --> DEDUP
        H_PRECHECK --> DEDUP

        DEDUP --> NORMALIZE[5. Calculate Normalized Risk Score\nRange 0-100 & Assign Risk Tier]
    end

    NORMALIZE --> SERIALIZE[6. Detach DOM Nodes & Serialize JSON Report]
    SERIALIZE --> POPUP_DISPLAY[Render Score Gauge, Risk Badge, Findings in Popup]
    
    POPUP_DISPLAY --> CHECK_AUTO_HL{Highlighting\nEnabled?}
    CHECK_AUTO_HL -- Yes --> APPLY_HL[Apply Non-Destructive Outlines & Badges]
    CHECK_AUTO_HL -- No --> STORE_HISTORY
    APPLY_HL --> STORE_HISTORY[Save Scan to Local History via Background Worker]
    STORE_HISTORY --> FINISH([Scan Complete - Ready for Review])
```

---

## 2. Evidence Highlighting & Reversibility Subsystem

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Popup as Extension Popup (popup.js)
    participant Content as Content Script (content.js)
    participant DOM as Webpage DOM (Live Page)
    
    User->>Popup: Clicks "Highlight on Page"
    Popup->>Content: Sends TOGGLE_HIGHLIGHTS (payload: true)
    
    Content->>DOM: querySelectorAll('.clicktrap-highlighted') (Clean prior)
    loop For each detected finding
        Content->>DOM: Locate target element by selector or reference
        Content->>DOM: Add class .clicktrap-highlighted
        Content->>DOM: Set data-clicktrap-severity="high|medium|low"
        Content->>DOM: Append .clicktrap-badge with data-tooltip
    end
    Content-->>Popup: Returns { highlightsActive: true }
    Popup-->>User: Toggles button to "Hide Highlights" (Active State)

    Note over User, DOM: Later: User clears scan or clicks "Hide Highlights"
    User->>Popup: Clicks "Hide Highlights" or "Clear Scan"
    Popup->>Content: Sends REMOVE_HIGHLIGHTS
    Content->>DOM: Remove .clicktrap-highlighted class
    Content->>DOM: Restore original element inline position styles
    Content->>DOM: Remove all .clicktrap-badge DOM nodes
    Content-->>Popup: Returns { highlightsActive: false }
    Popup-->>User: Restores clean UI state
```

---

## 3. Detailed Algorithmic Step Description

### Phase 1: DOM Querying and Filtering
1. The engine collects potential interaction points using targeted selectors:
   `button, a, p, span, div, h1..h6, label, strong, [role="button"], [role="alert"], .banner, .modal`.
2. Evaluates visibility via `getBoundingClientRect()` and `getComputedStyle()`. Elements with `display: none`, `visibility: hidden`, or `opacity: 0` are excluded to avoid inspecting hidden script containers or off-screen modals.
3. Restricts text processing to terminal nodes or small containers (under 8 children and under 500 characters) to prevent repetitive ancestor matching.

### Phase 2: Pattern Scans & Heuristic Execution
1. **Linguistic Scans:** Each node's text is evaluated against compiled category regexes defined in `rules.js`. Once a rule matches an element, evaluation for that specific rule on that node terminates to prevent redundant findings.
2. **Structural Cookie Heuristics:**
   - Locates consent dialog wrappers via `[class*="cookie"]`, `[id*="consent"]`, and `[role="dialog"]`.
   - Compares the primary "Accept" button against available "Reject" or "Manage" options.
   - If an "Accept All" button exists with zero "Reject" option, or if the "Reject" option is downgraded to a low-contrast text hyperlink, flags `CC_ASYMMETRIC_CHOICE` or `CC_MISSING_REJECT`.
3. **Pre-Checked State Scans:**
   - Queries `input[type="checkbox"]:checked`.
   - Inspects associated `<label>` text for commercial keywords (e.g., "marketing", "profiling", "partners", "damage protection", "insurance").

### Phase 3: Score Normalization and Deduplication
1. Duplicate occurrences of the same rule signature on the same DOM element are suppressed.
2. Repeated occurrences across different elements receive diminishing fractional weights (25% contribution) to prevent score distortion on pages with repetitive promotional cards.
3. The raw point sum is transformed through the saturation function:
   $$S = \min\left(100, \text{round}\left(100 \times \left(1 - e^{-\frac{\text{rawScore}}{42}}\right)\right)\right)$$
4. Maps score $S$ to risk tier:
   - Low: $0 \le S \le 24$
   - Moderate: $25 \le S \le 49$
   - High: $50 \le S \le 74$
   - Very High: $75 \le S \le 100$
