"use strict";

console.log("[Quiet Apply] content script loaded", location.href);

// ---------------------------------------------------------------------------
// STABLE AUTO-SYNC (rolled back to simple, reliable behavior).
//
// The ONLY required field for job sync is currentJobText. Title/company are
// best-effort optional metadata with safe fallbacks ("LinkedIn job" / "").
// Every trigger calls the SAME function: extractVisibleJobDescriptionAndStore.
// Storage is NEVER cleared on a failed/empty extraction pass.
// ---------------------------------------------------------------------------

const MAX_JOB_CHARS = 12000;
const MIN_DESCRIPTION_CHARS = 200;

const DESCRIPTION_SELECTORS = [
  '[data-testid="job-details-job-description"]',
  ".jobs-description-content__text",
  ".jobs-box__html-content",
  ".jobs-description__text",
  "article.jobs-description__container",
  '[data-testid="job-description"]',
  ".jobs-description",
  '[class*="jobs-description"]',
  '[data-testid="expandable-text-box"]',
];

// Best-effort only — NOT important right now. Falls back to "LinkedIn job".
const TITLE_SELECTORS = [
  '[data-testid="job-details-jobs-unified-top-card__job-title"]',
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title",
  "h1.jobs-unified-top-card__job-title",
];

const COMPANY_SELECTORS = [
  '[data-testid="job-details-jobs-unified-top-card__company-name"]',
  ".job-details-jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
];

const JOB_FEED_SELECTORS =
  ".jobs-search-results-list, .jobs-search-results__list, .job-card-container, [data-occludable-job-id]";

const JOB_CLICK_SELECTORS =
  'a[href*="/jobs/view/"], .job-card-container, [data-occludable-job-id], ' +
  ".jobs-search-results__list-item, .scaffold-layout__list";

// Areas that never contain the job description (used to reject fallback candidates).
const EXCLUDE_CONTAINER_SELECTORS =
  "nav, header, footer, [role='navigation'], [role='banner'], [role='dialog'], " +
  "[aria-modal='true'], .artdeco-modal, aside, [role='complementary'], " +
  ".global-nav, .jobs-similar-jobs, .jobs-company__box, " +
  ".jobs-search-results-list, .jobs-search-results__list, .job-card-container, " +
  "[data-occludable-job-id], .scaffold-layout__list";

// Phrases that signal a real job-description body (case-insensitive).
const JOB_DESC_KEYWORDS = [
  "responsibilities",
  "qualifications",
  "requirements",
  "about the job",
  "about this role",
  "what you'll do",
  "what you will do",
  "who you are",
  "position description",
  "job description",
  "preferred qualifications",
  "minimum qualifications",
  "basic qualifications",
];

function normalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isVisible(el) {
  if (!el || !el.isConnected) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 20) {
    return false;
  }

  const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
  const vh = window.innerHeight || document.documentElement.clientHeight || 800;

  // Vertical + horizontal viewport intersection (allow partially off-screen).
  if (rect.bottom <= 0 || rect.top >= vh) {
    return false;
  }
  if (rect.right <= 0 || rect.left >= vw) {
    return false;
  }

  // Walk ancestors: computed display/visibility/opacity + aria-hidden.
  let node = el;
  let depth = 0;
  while (node && node instanceof Element && depth < 40) {
    let style;
    try {
      style = window.getComputedStyle(node);
    } catch (_err) {
      style = null;
    }
    if (style) {
      if (style.display === "none") {
        return false;
      }
      if (style.visibility === "hidden" || style.visibility === "collapse") {
        return false;
      }
      if (parseFloat(style.opacity) === 0) {
        return false;
      }
    }
    if (node.getAttribute && node.getAttribute("aria-hidden") === "true") {
      return false;
    }
    node = node.parentElement;
    depth += 1;
  }

  return true;
}

function isInFeed(el) {
  return Boolean(el && el.closest(JOB_FEED_SELECTORS));
}

function isInExcludedArea(el) {
  return Boolean(el && el.closest(EXCLUDE_CONTAINER_SELECTORS));
}

function countJobKeywords(lowerText) {
  let count = 0;
  for (const kw of JOB_DESC_KEYWORDS) {
    if (lowerText.includes(kw)) {
      count += 1;
    }
  }
  return count;
}

// Fallback scanner: used only when fixed selectors fail or produce short text.
// Inspects visible main/article/section/div blocks that look like a JD body.
function scanFallbackDescription() {
  let best = null;
  let bestScore = 0;
  let fallbackCandidateCount = 0;
  const rejected = { excluded: 0, short: 0, noKeyword: 0, invisible: 0 };

  const nodeSet = new Set();
  for (const sel of ["main", "[role='main']", "article", "section", "div"]) {
    let nodes;
    try {
      nodes = document.querySelectorAll(sel);
    } catch (_err) {
      continue;
    }
    for (const el of nodes) {
      nodeSet.add(el);
    }
  }

  for (const el of nodeSet) {
    // Cheap pre-filters first (textContent: no layout reflow).
    const rawText = el.textContent || "";
    if (rawText.length <= MIN_DESCRIPTION_CHARS) {
      rejected.short += 1;
      continue;
    }
    if (isInFeed(el) || isInExcludedArea(el)) {
      rejected.excluded += 1;
      continue;
    }
    const kwCount = countJobKeywords(rawText.toLowerCase());
    if (kwCount === 0) {
      rejected.noKeyword += 1;
      continue;
    }
    if (!isVisible(el)) {
      rejected.invisible += 1;
      continue;
    }

    const text = normalizeText(el.innerText || "");
    if (text.length <= MIN_DESCRIPTION_CHARS) {
      rejected.short += 1;
      continue;
    }

    fallbackCandidateCount += 1;

    const rect = el.getBoundingClientRect();
    const area = Math.max(0, rect.width) * Math.max(0, rect.height);
    const score = text.length + kwCount * 500 + Math.min(area / 1000, 500);

    if (score > bestScore) {
      bestScore = score;
      best = { el, sel: "fallback", text };
    }
  }

  return { best, fallbackCandidateCount, rejected };
}

function findVisibleJobDescription() {
  const perSelector = [];
  let best = null;
  let bestLen = 0;
  let candidatesFound = 0;
  let visibleCandidates = 0;
  let rejectedCandidates = 0;

  for (const sel of DESCRIPTION_SELECTORS) {
    let nodes;
    try {
      nodes = document.querySelectorAll(sel);
    } catch (_err) {
      const errEntry = {
        selector: sel,
        totalMatches: 0,
        visibleMatches: 0,
        longestTextLength: 0,
        preview: "",
        rejected: "selector-error",
      };
      perSelector.push(errEntry);
      console.log("[Quiet Apply] selector check", errEntry);
      continue;
    }

    const total = nodes.length;
    candidatesFound += total;

    let selVisible = 0;
    let selLongest = 0;
    let selPreview = "";
    let inFeedCount = 0;
    let invisibleCount = 0;

    for (const el of nodes) {
      if (isInFeed(el)) {
        inFeedCount += 1;
        rejectedCandidates += 1;
        continue;
      }
      if (!isVisible(el)) {
        invisibleCount += 1;
        rejectedCandidates += 1;
        continue;
      }

      selVisible += 1;
      visibleCandidates += 1;

      const text = normalizeText(el.innerText || "");
      if (text.length > selLongest) {
        selLongest = text.length;
        selPreview = text.slice(0, 120);
      }
      if (text.length > bestLen) {
        bestLen = text.length;
        best = { el, sel, text };
      }
    }

    let rejected = null;
    if (total === 0) {
      rejected = "no-matches";
    } else if (selVisible === 0) {
      if (inFeedCount > 0 && invisibleCount === 0) {
        rejected = "all-in-feed";
      } else if (invisibleCount > 0 && inFeedCount === 0) {
        rejected = "all-invisible";
      } else {
        rejected = "all-rejected(feed+invisible)";
      }
    } else if (selLongest <= MIN_DESCRIPTION_CHARS) {
      rejected = "under-200";
    }

    const entry = {
      selector: sel,
      totalMatches: total,
      visibleMatches: selVisible,
      longestTextLength: selLongest,
      preview: selPreview,
      rejected,
    };
    perSelector.push(entry);
    console.log("[Quiet Apply] selector check", entry);
  }

  const primarySelectorCandidateCount = visibleCandidates;
  let bestCandidateSource = best ? "selector" : null;
  let fallbackCandidateCount = 0;
  let fallbackRejected = null;

  // Run fallback only when fixed selectors fail or produce short text.
  if (!best || bestLen <= MIN_DESCRIPTION_CHARS) {
    const fb = scanFallbackDescription();
    fallbackCandidateCount = fb.fallbackCandidateCount;
    fallbackRejected = fb.rejected;

    if (fb.best && fb.best.text.length > bestLen) {
      best = fb.best;
      bestLen = fb.best.text.length;
      bestCandidateSource = "fallback";
    }

    console.log("[Quiet Apply] fallback scan", {
      fallbackCandidateCount,
      rejected: fallbackRejected,
      picked: bestCandidateSource === "fallback",
      bestLen,
    });
  }

  const diagnostics = {
    selectorsChecked: DESCRIPTION_SELECTORS.length,
    primarySelectorCandidateCount,
    fallbackCandidateCount,
    candidatesFound,
    visibleCandidates,
    rejectedCandidates,
    bestCandidateSource,
    bestCandidateSelector: best ? best.sel : null,
    bestCandidateLength: bestLen,
    bestCandidatePreview: best ? best.text.slice(0, 120) : "",
    rejectionSummary: {
      selectors: perSelector.map((p) => ({
        selector: p.selector,
        rejected: p.rejected,
      })),
      fallback: fallbackRejected,
    },
    perSelector,
  };

  return { best, diagnostics };
}

function firstShortText(selectors, maxLen) {
  for (const sel of selectors) {
    let el;
    try {
      el = document.querySelector(sel);
    } catch (_err) {
      continue;
    }
    if (!el || isInFeed(el)) {
      continue;
    }
    const text = normalizeText(el.innerText || "");
    if (text && text.length <= maxLen) {
      return text;
    }
  }
  return "";
}

// Titles that are clearly section headings / generic, never a real job title.
const REJECTED_TITLES = new Set([
  "position description",
  "responsibilities",
  "qualifications",
  "about the job",
  "job description",
  "requirements",
  "employer industry",
  "why consider this job opportunity",
  "linkedin",
  "jobs",
]);

function isValidTitleText(text) {
  const t = normalizeText(text);
  if (!t || t.length > 160) {
    return false;
  }
  if (REJECTED_TITLES.has(t.toLowerCase())) {
    return false;
  }
  return true;
}

// Optional display metadata only. Never blocks sync. Falls back to "LinkedIn job".
function getJobTitleSafe() {
  // 1. LinkedIn top-card selectors.
  for (const sel of TITLE_SELECTORS) {
    let el;
    try {
      el = document.querySelector(sel);
    } catch (_err) {
      continue;
    }
    if (!el || isInFeed(el)) {
      continue;
    }
    const text = normalizeText(el.innerText || "");
    if (isValidTitleText(text)) {
      console.log("[Quiet Apply] title fallback used", {
        source: "selector",
        title: text,
      });
      return text;
    }
  }

  // 2. document.title before "|" (e.g. "AI Data Intern | ReasonCore AI | LinkedIn").
  const docTitle = String(document.title || "");
  if (docTitle.includes("|")) {
    const first = normalizeText(docTitle.split("|")[0]);
    if (isValidTitleText(first)) {
      console.log("[Quiet Apply] title fallback used", {
        source: "document-title",
        title: first,
      });
      return first;
    }
  }

  // 3. Safe generic fallback.
  console.log("[Quiet Apply] title fallback used", {
    source: "fallback",
    title: "LinkedIn job",
  });
  return "LinkedIn job";
}

function getCompanySafe() {
  return firstShortText(COMPANY_SELECTORS, 120);
}

let lastSyncedText = "";

// THE single stable function. All triggers + manual Refresh call this.
function extractVisibleJobDescriptionAndStore(reason) {
  const trigger = reason || "unknown";
  const { best, diagnostics } = findVisibleJobDescription();
  const text = best ? best.text.slice(0, MAX_JOB_CHARS) : "";

  let failureReason = null;
  if (!best || text.length <= MIN_DESCRIPTION_CHARS) {
    if (
      diagnostics.candidatesFound === 0 &&
      diagnostics.fallbackCandidateCount === 0
    ) {
      failureReason = "no-selector-or-fallback-matched";
    } else if (
      diagnostics.visibleCandidates === 0 &&
      diagnostics.fallbackCandidateCount === 0
    ) {
      failureReason = "matched-but-invisible-or-in-feed";
    } else if (diagnostics.bestCandidateLength <= MIN_DESCRIPTION_CHARS) {
      failureReason = "text-under-200";
    } else {
      failureReason = "unknown";
    }
  }

  const attempt = {
    reason: trigger,
    url: location.href,
    selectorsChecked: diagnostics.selectorsChecked,
    primarySelectorCandidateCount: diagnostics.primarySelectorCandidateCount,
    fallbackCandidateCount: diagnostics.fallbackCandidateCount,
    candidatesFound: diagnostics.candidatesFound,
    visibleCandidates: diagnostics.visibleCandidates,
    rejectedCandidates: diagnostics.rejectedCandidates,
    bestCandidateSource: diagnostics.bestCandidateSource,
    bestCandidateSelector: diagnostics.bestCandidateSelector,
    bestCandidateLength: diagnostics.bestCandidateLength,
    bestCandidatePreview: diagnostics.bestCandidatePreview,
    rejectionSummary: diagnostics.rejectionSummary,
    failureReason,
  };
  console.log("[Quiet Apply] extraction attempt", attempt);

  if (!text || text.length <= MIN_DESCRIPTION_CHARS) {
    console.log("[Quiet Apply] extract skipped (no stable description; storage preserved)", {
      trigger,
      failureReason,
    });
    return {
      ok: false,
      text: "",
      title: "",
      company: "",
      failureReason,
      diagnostics: attempt,
    };
  }

  const title = getJobTitleSafe();
  const company = getCompanySafe();

  const result = {
    ok: true,
    text,
    title,
    company,
    currentJobDetectedAt: Date.now(),
    diagnostics: attempt,
  };

  // Skip redundant writes (avoids storage churn from the MutationObserver).
  if (text === lastSyncedText) {
    return result;
  }
  lastSyncedText = text;

  const payload = {
    currentJobText: text,
    currentJobTitle: title || "LinkedIn job",
    currentCompanyName: company || "",
    currentJobPageKey: `${location.pathname}${location.search}`,
    currentJobDetectedAt: result.currentJobDetectedAt,
    lastSyncTrigger: trigger,
  };

  chrome.storage.local.set(payload, () => {
    if (chrome.runtime.lastError) {
      console.warn(
        "[Quiet Apply] storage set error",
        chrome.runtime.lastError.message
      );
      return;
    }
    console.log("[Quiet Apply] job synced", {
      trigger,
      len: text.length,
      title: payload.currentJobTitle,
    });
  });

  return result;
}

// --- Triggers (all funnel into the same function) --------------------------

let extractDebounceTimer = null;
function scheduleExtract(reason, delayMs) {
  if (extractDebounceTimer !== null) {
    clearTimeout(extractDebounceTimer);
  }
  extractDebounceTimer = setTimeout(() => {
    extractDebounceTimer = null;
    extractVisibleJobDescriptionAndStore(reason);
  }, typeof delayMs === "number" ? delayMs : 600);
}

// c) URL change detection (LinkedIn SPA).
let lastHref = location.href;
function watchUrlChanges() {
  setInterval(() => {
    if (location.href === lastHref) {
      return;
    }
    lastHref = location.href;
    console.log("[Quiet Apply] url change detected", location.href);
    extractVisibleJobDescriptionAndStore("url-change");
    setTimeout(() => extractVisibleJobDescriptionAndStore("url-change-delayed"), 1500);
  }, 800);
}

// d) Click detection on job links / cards.
function onJobClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (!target.closest(JOB_CLICK_SELECTORS)) {
    return;
  }
  console.log("[Quiet Apply] click detected (job card/link)");
  setTimeout(() => extractVisibleJobDescriptionAndStore("job-card-click"), 1200);
}

// e) MutationObserver backup.
function installMutationBackup() {
  const observer = new MutationObserver(() => {
    scheduleExtract("mutation", 700);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function startAutoSync() {
  console.log("[Quiet Apply] auto-sync enabled");

  // a) initial extraction after page load
  extractVisibleJobDescriptionAndStore("initial");

  // b) delayed extraction after 2.5s (DOM settles)
  setTimeout(() => extractVisibleJobDescriptionAndStore("delayed-2500"), 2500);

  // c) URL change detection
  try {
    watchUrlChanges();
  } catch (err) {
    console.warn("[Quiet Apply] url watch failed (non-fatal)", err && err.message);
  }

  // d) click detection (capture phase)
  try {
    document.addEventListener("click", onJobClick, true);
  } catch (err) {
    console.warn("[Quiet Apply] click listener failed (non-fatal)", err && err.message);
  }

  // e) MutationObserver backup
  try {
    installMutationBackup();
  } catch (err) {
    console.warn("[Quiet Apply] mutation observer failed (non-fatal)", err && err.message);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAutoSync, { once: true });
} else {
  startAutoSync();
}

// --- Manual Refresh Job (popup) → SAME function ----------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== "extractJobForPopup") {
    return;
  }

  console.log("[Quiet Apply] manual refresh requested");
  const r = extractVisibleJobDescriptionAndStore("manual");

  if (r.ok) {
    sendResponse({
      ok: true,
      text: r.text.slice(0, 5000),
      title: r.title,
      company: r.company,
      currentJobDetectedAt: r.currentJobDetectedAt,
    });
  } else {
    sendResponse({
      ok: false,
      error: "No visible LinkedIn job description found",
      diagnostics: r.diagnostics || null,
    });
  }
});

// Temporary DevTools helper. Run window.__quietApplyDebugExtract() from the
// console (select the Quiet Apply content-script context if not in page world).
try {
  window.__quietApplyDebugExtract = () =>
    extractVisibleJobDescriptionAndStore("debug-console");
} catch (_err) {
  /* non-fatal */
}
