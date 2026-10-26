/**
 * ClickTrap - Dark Pattern Detector
 * rules.js - Central Detection Rules Configuration
 * 
 * Defines rules across 6 core categories with weights, regex patterns,
 * DOM structural heuristics, explanations, and actionable user advice.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClickTrapRules = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CATEGORIES = {
    FAKE_URGENCY: {
      id: 'fake_urgency',
      name: 'Fake Urgency',
      description: 'Artificial time limits or countdown timers creating unjustified pressure to act quickly.',
      color: '#FF6B6B'
    },
    SCARCITY_MANIPULATION: {
      id: 'scarcity_manipulation',
      name: 'Scarcity Manipulation',
      description: 'Claims of low stock, limited availability, or exaggerated viewer numbers to trigger FOMO.',
      color: '#FFA94D'
    },
    COOKIE_CONSENT: {
      id: 'cookie_consent',
      name: 'Cookie Consent Manipulation',
      description: 'Asymmetric or deceptive consent dialogs designed to nudge users into accepting tracking.',
      color: '#748FFC'
    },
    HIDDEN_COSTS: {
      id: 'hidden_costs',
      name: 'Hidden or Late-Disclosed Costs',
      description: 'Undisclosed fees, mandatory service charges, or pre-selected add-ons revealed late in checkout.',
      color: '#F59F00'
    },
    CONFIRMSHAMING: {
      id: 'confirmshaming',
      name: 'Confirmshaming & Misleading Language',
      description: 'Guilt-inducing or manipulative language intended to shame users into compliance.',
      color: '#E64980'
    },
    OBSTRUCTIVE_CANCELLATION: {
      id: 'obstructive_cancellation',
      name: 'Obstructive Cancellation',
      description: 'Difficult, obscured, or multi-step barriers preventing easy subscription cancellation.',
      color: '#9775FA'
    }
  };

  const RISK_LEVELS = [
    { min: 0, max: 24, label: 'Low Suspicion', level: 'low', badgeClass: 'badge-low', color: '#35D6C2' },
    { min: 25, max: 49, label: 'Moderate Suspicion', level: 'moderate', badgeClass: 'badge-moderate', color: '#F59F00' },
    { min: 50, max: 74, label: 'High Suspicion', level: 'high', badgeClass: 'badge-high', color: '#FF922B' },
    { min: 75, max: 100, label: 'Very High Suspicion', level: 'very-high', badgeClass: 'badge-very-high', color: '#FF6B6B' }
  ];

  /**
   * Detection Rules Specification
   */
  const RULES = [
    // ----------------------------------------------------
    // Category A: Fake Urgency
    // ----------------------------------------------------
    {
      id: 'FU_COUNTDOWN_TMR',
      category: 'fake_urgency',
      name: 'Active Countdown Timer Element',
      weight: 20,
      severity: 'high',
      type: 'heuristic',
      explanation: 'A visual countdown timer was detected displaying ticking minutes or seconds. Marketers frequently reset these timers when the page reloads to induce artificial purchase panic.',
      recommendedAction: 'Do not rush your decision. Verify whether refreshing the page or checking another browser resets the timer.',
      heuristic: 'detectCountdownElement'
    },
    {
      id: 'FU_TIME_LIMIT',
      category: 'fake_urgency',
      name: 'Artificial Deadline Language',
      weight: 15,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\b(?:offer|deal|discount|sale)\s+(?:expires|ends)\s+in\s+\d+\s*(?:mins?|minutes?|secs?|seconds?|hours?)\b/i,
        /\b(?:buy|order|act)\s+now\s+before\s+(?:the\s+)?timer\s+ends\b/i,
        /\blast\s+chance\s+to\s+(?:buy|purchase|save|claim|order)\b/i,
        /\bflash\s+sale\s+ends\s+(?:today|soon|tonight|in\s+\d+)\b/i,
        /\bhurry[!,.]*\s*(?:only|offer|sale|deal)\b/i,
        /\bprices?\s+(?:increase|go\s+up)\s+in\s+\d+\s*(?:minutes?|hours?)\b/i,
        /\blimited\s+time\s+(?:offer|deal|opportunity)\b/i
      ],
      explanation: 'Text indicates an imminent expiration deadline or urgent window that frequently serves as a psychological pressure tactic rather than an authentic operational cutoff.',
      recommendedAction: 'Take your time to compare prices across alternative retailers before committing.'
    },
    {
      id: 'FU_ACTION_PRESSURE',
      category: 'fake_urgency',
      name: 'High-Pressure Urgency Callout',
      weight: 10,
      severity: 'low',
      type: 'pattern',
      patterns: [
        /\bact\s+fast(?:[,!]|\s+or)\b/i,
        /\bdon'?t\s+wait\s+another\s+(?:second|minute|moment)\b/i,
        /\bclaim\s+yours?\s+before\s+(?:it'?s|they'?re)\s+gone\b/i,
        /\btime\s+is\s+running\s+out\b/i
      ],
      explanation: 'Exclamatory phrasing designed to heighten adrenaline and bypass rational deliberation.',
      recommendedAction: 'Step back and determine if you genuinely need this purchase today.'
    },

    // ----------------------------------------------------
    // Category B: Scarcity Manipulation
    // ----------------------------------------------------
    {
      id: 'SM_LOW_STOCK',
      category: 'scarcity_manipulation',
      name: 'Low Stock Pressure Claim',
      weight: 15,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\bonly\s+\d+\s+(?:items?|units?|rooms?|seats?|tickets?|left|remaining|in\s+stock)\b/i,
        /\balmost\s+sold\s+out\b/i,
        /\blimited\s+stock\s+remaining\b/i,
        /\bonly\s+1\s+(?:item|room|seat|ticket)\s+left\b/i,
        /\bhurry,?\s+only\s+\d+\s+left\b/i,
        /\bless\s+than\s+\d+\s+(?:items?|units?)\s+(?:in\s+stock|available)\b/i
      ],
      explanation: 'The webpage highlights minimal stock quantity. Studies show websites frequently simulate stock numbers to induce fear of missing out (FOMO).',
      recommendedAction: 'Evaluate if the item is standard inventory and check third-party sellers to confirm true market availability.'
    },
    {
      id: 'SM_ACTIVITY_ALERT',
      category: 'scarcity_manipulation',
      name: 'Social Proof / High Demand Alert',
      weight: 12,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\b\d+\s+(?:other\s+)?people\s+are\s+(?:viewing|looking\s+at|watching)\s+this\b/i,
        /\bbooked\s+\d+\s+times?\s+in\s+the\s+last\s+(?:hour|24\s*hours?|day)\b/i,
        /\bin\s+high\s+demand\b/i,
        /\bpopular\s+choice:?\s+\d+\s+others?\s+have\s+in\s+(?:bag|cart|basket)\b/i,
        /\bsomeone\s+in\s+[\w\s,]+just\s+(?:purchased|booked|bought)\b/i
      ],
      explanation: 'Real-time viewer numbers or recent purchase badges are often fabricated or exaggerated to create synthetic competitive anxiety.',
      recommendedAction: 'Disregard social proof alerts as unverified marketing claims.'
    },

    // ----------------------------------------------------
    // Category C: Cookie Consent Manipulation
    // ----------------------------------------------------
    {
      id: 'CC_ASYMMETRIC_CHOICE',
      category: 'cookie_consent',
      name: 'Asymmetric Consent Buttons',
      weight: 25,
      severity: 'high',
      type: 'heuristic',
      explanation: 'The cookie banner exhibits visual asymmetry: an eye-catching, high-contrast button to "Accept All", while the option to "Reject" or "Manage" is rendered as a muted, tiny, or low-contrast text link.',
      recommendedAction: 'Look closely for subtle "Reject", "Settings", or "Decline Non-Essential" options hidden beneath prominent accept buttons.',
      heuristic: 'detectAsymmetricConsent'
    },
    {
      id: 'CC_MISSING_REJECT',
      category: 'cookie_consent',
      name: 'Missing Direct Reject Option',
      weight: 20,
      severity: 'high',
      type: 'heuristic',
      explanation: 'The consent dialog provides a single direct button to accept all cookies, but forces users into multi-step secondary submenus to refuse or adjust tracking.',
      recommendedAction: 'Do not click "Accept All" out of convenience. Open preferences and toggle off non-essential marketing and advertising cookies.',
      heuristic: 'detectMissingRejectOption'
    },
    {
      id: 'CC_PRESELECTED_BOXES',
      category: 'cookie_consent',
      name: 'Pre-Checked Consent Checkboxes',
      weight: 18,
      severity: 'medium',
      type: 'heuristic',
      explanation: 'Non-essential marketing, analytics, or behavioral profiling preferences appear checked by default rather than requiring voluntary user opt-in.',
      recommendedAction: 'Ensure all non-essential analytics and marketing checkboxes are deselected before saving.',
      heuristic: 'detectPrecheckedConsent'
    },
    {
      id: 'CC_DECEPTIVE_LABELS',
      category: 'cookie_consent',
      name: 'Deceptive Consent Framing',
      weight: 12,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\bi\s+accept\s+for\s+(?:the\s+)?best\s+experience\b/i,
        /\benable\s+all\s+for\s+optimal\s+browsing\b/i,
        /\baccepting\s+helps\s+support\s+free\s+content\b/i
      ],
      explanation: 'The banner frames data tracking as essential for site functionality or implies declining degrades core usability.',
      recommendedAction: 'Websites function normally without behavioral advertising trackers. Reject unnecessary cookies with confidence.'
    },

    // ----------------------------------------------------
    // Category D: Hidden or Late-Disclosed Costs
    // ----------------------------------------------------
    {
      id: 'HC_MANDATORY_FEE',
      category: 'hidden_costs',
      name: 'Mandatory Surcharge / Late-Added Fee',
      weight: 15,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\b(?:mandatory|undisclosed|additional)\s+(?:service|processing|booking|cleaning|handling|facility|resort)\s+fee\b/i,
        /\bfee\s+added\s+at\s+checkout\b/i,
        /\bprices?\s+(?:exclude|do\s+not\s+include)\s+(?:mandatory\s+fees|taxes\s+and\s+fees)\b/i,
        /\bextra\s+charge\s+of\s+[\$€£₹]\s*\d+/i,
        /\bservice\s+charge:\s*[\$€£₹]\s*\d+/i,
        /\bcleaning\s+fee:\s*[\$€£₹]\s*\d+/i
      ],
      explanation: 'Pricing breakdown reveals compulsory service charges, handling fees, or resort fees that were not factored into the upfront advertised price (drip pricing).',
      recommendedAction: 'Review the itemized summary on the final payment page. Calculate total cost per item before entering payment information.'
    },
    {
      id: 'HC_PRECHECKED_ADDON',
      category: 'hidden_costs',
      name: 'Pre-Selected Paid Add-on or Protection',
      weight: 18,
      severity: 'high',
      type: 'heuristic',
      explanation: 'A paid warranty, travel insurance, express packaging, or carbon offset checkbox was automatically pre-selected in your order summary.',
      recommendedAction: 'Uncheck any optional services that were added without your explicit consent.',
      heuristic: 'detectPrecheckedAddons'
    },
    {
      id: 'HC_AMBIGUOUS_RECURRING',
      category: 'hidden_costs',
      name: 'Ambiguous Recurring Subscription Clause',
      weight: 15,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\brenews?\s+automatically\s+at\s+[\$€£₹]\s*\d+\s*(?:\/|\s*per\s*)(?:month|year|week)\b/i,
        /\bbilled\s+(?:annually|monthly)\s+after\s+(?:trial|introductory)\b/i,
        /\bmembership\s+fee\s+applies\s+unless\s+canceled\b/i,
        /\bafter\s+\d+\s+days?,?\s+you\s+will\s+be\s+charged\b/i
      ],
      explanation: 'A one-time transaction or trial may automatically convert into a recurring subscription with little prominent notice.',
      recommendedAction: 'Set a calendar reminder for 2 days before trial expiration, or check if single-purchase options are available.'
    },

    // ----------------------------------------------------
    // Category E: Confirmshaming & Misleading Choice Language
    // ----------------------------------------------------
    {
      id: 'CS_GUILT_OPTOUT',
      category: 'confirmshaming',
      name: 'Guilt-Inducing Opt-Out Button',
      weight: 20,
      severity: 'high',
      type: 'pattern',
      patterns: [
        /\b(?:no\s+thanks,?\s+)?i\s+(?:don'?t\s+care\s+about|hate)\s+saving\s+money\b/i,
        /\b(?:no,?\s+)?i\s+prefer\s+(?:to\s+pay\s+full\s+price|paying\s+full\s+price|to\s+miss\s+out)\b/i,
        /\bno\s+thanks,?\s+i\s+don'?t\s+want\s+(?:great\s+deals|discounts?|to\s+save)\b/i,
        /\bi'?ll\s+pass\s+on\s+being\s+smart\b/i,
        /\b(?:no,?\s+)?i\s+hate\s+discounts\b/i,
        /\bno\s+thanks,?\s+i\s+don'?t\s+need\s+more\s+(?:sales|traffic|leads|customers|success)\b/i,
        /\bi\s+prefer\s+bad\s+habits\b/i,
        /\b(?:no,?\s+)?i\s+prefer\s+losing\s+money\b/i
      ],
      explanation: 'The opt-out link uses emotionally manipulative, shaming prose intended to make the user feel foolish or guilty for declining.',
      recommendedAction: 'Click through without guilt; this is an automated psychological manipulation technique known as Confirmshaming.'
    },
    {
      id: 'CS_CONFUSING_ACTION',
      category: 'confirmshaming',
      name: 'Deceptive Double-Negative / Confusing Choice',
      weight: 14,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\buncheck\s+(?:this\s+)?box\s+(?:to\s+not|if\s+you\s+do\s+not\s+wish\s+to)\b/i,
        /\bcheck\s+if\s+you\s+do\s+not\s+want\b/i,
        /\bclick\s+here\s+if\s+you\s+would\s+prefer\s+not\s+to\s+receive\b/i,
        /\bopt-?out\s+by\s+leaving\s+this\s+blank\b/i
      ],
      explanation: 'Language uses inverted logic or double negatives to trick users into subscribing or sharing personal data.',
      recommendedAction: 'Carefully re-read the checkbox sentence to verify whether checking or unchecking agrees to communication.'
    },

    // ----------------------------------------------------
    // Category F: Obstructive Cancellation
    // ----------------------------------------------------
    {
      id: 'OC_BURIED_CANCEL',
      category: 'obstructive_cancellation',
      name: 'Severe Cancellation Obstacle (Roach Motel)',
      weight: 22,
      severity: 'high',
      type: 'pattern',
      patterns: [
        /\bto\s+cancel,?\s+please\s+(?:call|phone|contact)\b/i,
        /\bcancellations?\s+(?:must\s+be\s+requested|only\s+accepted)\s+via\s+(?:phone|mail|letter)\b/i,
        /\bcancellation\s+requires\s+(?:mailing|calling|writing|speaking)\b/i,
        /\bcall\s+(?:us|our\s+support|\d{3}|1-800|between)\b.*?\bto\s+cancel\b/i,
        /\bcontact\s+(?:our\s+)?(?:account\s+representative|customer\s+support|help\s+desk)\s+to\s+cancel\b/i
      ],
      explanation: 'While sign-up is instant online, cancellation is obstructed by requiring phone calls during restrictive business hours or physical mail.',
      recommendedAction: 'Document attempts to cancel. Review credit card consumer protection options if manual hurdles block account closure.'
    },
    {
      id: 'OC_FRICTION_MAZE',
      category: 'obstructive_cancellation',
      name: 'Multi-Step Cancellation Friction Maze',
      weight: 15,
      severity: 'medium',
      type: 'pattern',
      patterns: [
        /\bare\s+you\s+sure\??\s+you\s+will\s+lose\s+all\s+(?:your\s+)?(?:benefits|data|savings|perks)\b/i,
        /\bpause\s+subscription\s+instead\s+of\s+canceling\b/i,
        /\bcomplete\s+all\s+\d+\s+steps\s+to\s+finalize\s+cancellation\b/i,
        /\bdon'?t\s+leave\s+us!\s+here'?s\s+\d+%\s+off\s+to\s+stay\b/i
      ],
      explanation: 'Interface introduces excessive retention hurdles, loss-aversion fear tactics, and deceptive multi-step retention screens.',
      recommendedAction: 'Persist through confirmation dialogs until you receive a specific cancellation reference number and confirmation email.'
    }
  ];

  return {
    CATEGORIES,
    RISK_LEVELS,
    RULES,
    getRiskLevel: function (score) {
      const normalized = Math.max(0, Math.min(100, Math.round(score)));
      for (const level of RISK_LEVELS) {
        if (normalized >= level.min && normalized <= level.max) {
          return { ...level, score: normalized };
        }
      }
      return { ...RISK_LEVELS[0], score: normalized };
    }
  };
});
