// --- DOM references ---
const jobTextArea = document.getElementById("jobText");
const resumeTextArea = document.getElementById("resumeText");
const resumeViewPanel = document.getElementById("resumeViewPanel");

const profileStatus = document.getElementById("profileStatus");
const extractStatus = document.getElementById("extractStatus");
const analysisStatus = document.getElementById("analysisStatus");

const jobContextCard = document.getElementById("jobContextCard");
const syncDot = document.getElementById("syncDot");
const syncRole = document.getElementById("syncRole");
const syncCompany = document.getElementById("syncCompany");
const syncMeta = document.getElementById("syncMeta");

const resumeContextCard = document.getElementById("resumeContextCard");
const resumeContextTitle = document.getElementById("resumeContextTitle");
const resumeContextSub = document.getElementById("resumeContextSub");
const resumeContextMeta = document.getElementById("resumeContextMeta");

const workspaceEmpty = document.getElementById("workspaceEmpty");
const insightsPrompt = document.getElementById("insightsPrompt");
const resultsEl = document.getElementById("results");
const matchScoreEl = document.getElementById("matchScore");
const scoreLabelEl = document.getElementById("scoreLabel");
const scoreConfidenceEl = document.getElementById("scoreConfidence");
const scoreRingFill = document.getElementById("scoreRingFill");
const experienceLevelEl = document.getElementById("experienceLevel");
const jobRequirementsEl = document.getElementById("jobRequirements");
const detectedSkillsEl = document.getElementById("detectedSkills");
const matchedSkillsEl = document.getElementById("matchedSkills");
const missingSkillsEl = document.getElementById("missingSkills");
const resumeSuggestionsEl = document.getElementById("resumeSuggestions");
const professionalSummaryEl = document.getElementById("professionalSummary");
const copySummaryBtn = document.getElementById("copySummaryBtn");
const uploadResumeBtn = document.getElementById("uploadResumeBtn");
const resumeFileInput = document.getElementById("resumeFileInput");
const clearWorkspaceBtn = document.getElementById("clearWorkspaceBtn");
const emptyRefreshBtn = document.getElementById("emptyRefreshBtn");
const emptyUploadBtn = document.getElementById("emptyUploadBtn");
const generateBtn = document.getElementById("generateBtn");
const analysisSpinner = document.getElementById("analysisSpinner");
const scoreCountsLine = document.getElementById("scoreCountsLine");
const resumeDot = document.getElementById("resumeDot");
const emptyOpenLinkedInBtn = document.getElementById("emptyOpenLinkedInBtn");

const SCORE_RING_RADIUS = 46;
const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * SCORE_RING_RADIUS;

const PILL_MAX_VISIBLE = 7;
const PILL_MAX_CHARS = 32;
const REC_MAX_VISIBLE = 4;
const REC_TITLE_MAX_CHARS = 42;

const pillRowExpandedState = new WeakMap();

let jobDescriptionUserDirty = false;
let jobFieldHydrationComplete = false;
let workspaceHasAnalysis = false;

const PDF_MAX_BYTES = 12 * 1024 * 1024;
const RESUME_AUTOSAVE_DEBOUNCE_MS = 500;

const EXPERIENCE_LABELS = {
  entry: "Entry",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
  unknown: "Not specified",
};

const LI_JOB_MAX_AGE_MS = 45 * 60 * 1000;

const LIVE_SYNC_DEBOUNCE_MS = 150;

const MIN_RESUME_TEXT_FOR_ANALYSIS = 20;

const ANALYSIS_FETCH_TIMEOUT_MS = 90000;

const LIVE_JOB_STORAGE_KEYS = [
  "currentJobText",
  "currentJobTitle",
  "currentCompanyName",
  "currentJobDetectedAt",
  "lastSyncTrigger",
];

let lastSyncedLiveFingerprint = "";
let lastSyncedDetectedAt = 0;
let liveJobSyncTimer = null;

function isLinkedInJobsUrl(url) {

  return typeof url === "string" && /linkedin\.com\/jobs\//i.test(url);

}

function isRecentJobDetection(ts) {

  return (
    typeof ts === "number" &&
    Number.isFinite(ts) &&
    Date.now() - ts >= 0 &&
    Date.now() - ts <= LI_JOB_MAX_AGE_MS
  );

}

function formatExtractStatusLine(prefix, title, company) {

  const c = String(company || "").trim();
  const t = String(title || "").trim();

  if (c && t) {
    return `${prefix} · ${c} — ${t}`;
  }

  if (t) {
    return `${prefix} · ${t}`;
  }

  if (c) {
    return `${prefix} · ${c}`;
  }

  return prefix;

}

function formatRelativeTime(ts, prefix) {

  const label = prefix || "Updated";

  if (typeof ts !== "number" || !Number.isFinite(ts)) {
    return `${label} just now`;
  }

  const sec = Math.floor((Date.now() - ts) / 1000);

  if (sec < 15) {
    return `${label} just now`;
  }

  if (sec < 60) {
    return `${label} ${sec}s ago`;
  }

  const min = Math.floor(sec / 60);

  if (min < 60) {
    return `${label} ${min}m ago`;
  }

  const hr = Math.floor(min / 60);

  return `${label} ${hr}h ago`;

}

function formatSyncedTime(ts) {

  return formatRelativeTime(ts, "Detected");

}

function inferJobLocation(jobText) {

  const t = String(jobText || "").slice(0, 1200);

  const remote = t.match(/\b(Remote)\b/i);
  if (remote) {
    return remote[1];
  }

  const hybrid = t.match(/\b(Hybrid)\b/i);
  if (hybrid) {
    return hybrid[1];
  }

  const onsite = t.match(/\b(On-?site)\b/i);
  if (onsite) {
    return "On-site";
  }

  return "";

}

function formatCompanyLine(company, jobText) {

  const c = String(company || "").trim();
  const loc = inferJobLocation(jobText);

  if (c && loc) {
    return `${c} · ${loc}`;
  }

  return c || loc || "";

}

const REJECTED_JOB_TITLE_EXACT = new Set([
  "position description",
  "responsibilities",
  "qualifications",
  "about the role",
  "about the job",
  "employer industry",
  "why consider this job opportunity",
  "job description",
  "requirements",
  "overview",
  "summary",
]);

const BAD_JOB_TITLE_PATTERNS = [
  /^employer\s+industry\b/i,
  /^job\s+function\b/i,
  /^seniority\s+level\b/i,
  /^employment\s+type\b/i,
  /^industry\s*:/i,
  /^applicants\b/i,
  /^reposted\b/i,
  /^posted\s+\d/i,
  /^about\s+the\s+(job|role)\b/i,
  /^skills?\s+match\b/i,
  /^recommended\b/i,
  /^position\s+description\b/i,
  /^responsibilit(y|ies)\b/i,
  /^qualifications?\b/i,
  /^why\s+consider\b/i,
  /^job\s+description\b/i,
  /^requirements?\b/i,
  /^overview\b/i,
  /^summary\b/i,
];

function looksLikeLabelValueLine(text) {

  const t = String(text || "").trim();
  if (!t.includes(":")) {
    return false;
  }

  const colon = t.indexOf(":");
  const label = t.slice(0, colon).trim();

  return (
    label.length >= 4 &&
    label.length <= 42 &&
    /^[A-Za-z][A-Za-z\s\-&]+$/.test(label)
  );

}

function isLikelyJobTitle(text) {

  const t = String(text || "").trim();

  if (t.length < 2 || t.length > 120) {
    return false;
  }

  const lower = t.toLowerCase().replace(/\s+/g, " ");
  if (REJECTED_JOB_TITLE_EXACT.has(lower)) {
    return false;
  }

  for (const pattern of BAD_JOB_TITLE_PATTERNS) {
    if (pattern.test(t)) {
      return false;
    }
  }

  if (looksLikeLabelValueLine(t)) {
    return false;
  }

  return true;

}

function isLikelyCompanyName(text) {

  const t = String(text || "").trim();

  if (t.length < 1 || t.length > 80) {
    return false;
  }

  if (/^employer\s+industry\b/i.test(t) || /^industry\s*:/i.test(t)) {
    return false;
  }

  if (looksLikeLabelValueLine(t)) {
    return false;
  }

  return true;

}

function resolveJobTitleForDisplay(source) {

  const fromStorage = String(
    source?.currentJobTitle || source?.title || ""
  ).trim();

  if (fromStorage && isLikelyJobTitle(fromStorage)) {
    return fromStorage;
  }

  return "";

}

function resolveCompanyForDisplay(source) {

  const company = String(
    source?.currentCompanyName || source?.company || ""
  ).trim();

  if (company && isLikelyCompanyName(company)) {
    return company;
  }

  return "";

}

function formatFileSize(bytes) {

  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 1) {
    return "";
  }

  if (n < 1024) {
    return `${n} B`;
  }

  if (n < 1024 * 1024) {
    return `${Math.round(n / 1024)} KB`;
  }

  return `${(n / (1024 * 1024)).toFixed(1)} MB`;

}

function formatResumeFileLine(fileName, fileSize) {

  const name = String(fileName || "").trim();
  const extMatch = name.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toUpperCase() : "TXT";
  const size = formatFileSize(fileSize);

  if (size) {
    return `${ext} · ${size}`;
  }

  return ext;

}

function displayResumeFileName(fileName, text) {

  const name = String(fileName || "").trim();
  if (name) {
    return name;
  }

  return "Pasted resume";

}

function updateJobContextCard(source) {

  const title = resolveJobTitleForDisplay(source);
  const company = resolveCompanyForDisplay(source);
  const text = String(
    source?.currentJobText || source?.text || jobTextArea?.value || ""
  ).trim();
  const ts = source?.currentJobDetectedAt;
  const hasJob = Boolean(text);

  if (jobContextCard) {
    jobContextCard.classList.toggle("context-card--live", hasJob);
  }

  if (syncDot) {
    syncDot.classList.toggle("context-card__dot--pulse", hasJob);
  }

  if (hasJob) {
    syncRole.textContent = title || "LinkedIn job";
    const companyLine = formatCompanyLine(company, text);
    syncCompany.textContent =
      companyLine || (company ? company : "Company unavailable");
    const syncedTime = formatSyncedTime(ts);
    const trigger = String(source?.lastSyncTrigger || "").trim();
    syncMeta.textContent = trigger
      ? `${syncedTime} · trigger: ${trigger}`
      : syncedTime;
  } else {
    syncRole.textContent = "No job synced";
    syncCompany.textContent = "Open a job on LinkedIn";
    syncMeta.textContent = "";
  }

}

function updateResumeContextCard(meta) {

  const text = String(resumeTextArea?.value || "").trim();
  const hasResume = Boolean(text);
  const fileName = meta?.savedResumeFileName || "";
  const fileSize = meta?.savedResumeFileSize;
  const updatedAt = meta?.savedResumeUpdatedAt;

  if (resumeContextCard) {
    resumeContextCard.classList.toggle("context-card--live", hasResume);
  }

  if (resumeDot) {
    resumeDot.classList.toggle("context-card__dot--loaded", hasResume);
  }

  if (hasResume) {
    resumeContextTitle.textContent = displayResumeFileName(fileName, text);
    resumeContextSub.textContent = formatResumeFileLine(fileName, fileSize);
    resumeContextMeta.textContent = formatRelativeTime(updatedAt, "Updated");
    if (resumeViewPanel) {
      resumeViewPanel.classList.remove("hidden");
    }
  } else {
    resumeContextTitle.textContent = "No resume yet";
    resumeContextSub.textContent = "Upload to enable analysis";
    resumeContextMeta.textContent = "";
    if (resumeViewPanel) {
      resumeViewPanel.classList.add("hidden");
      resumeViewPanel.open = false;
    }
  }

}

function hasWorkspaceSources() {

  const hasJob = Boolean(String(jobTextArea?.value || "").trim());
  const hasResume = Boolean(String(resumeTextArea?.value || "").trim());
  return hasJob || hasResume;

}

function updateWorkspaceView() {

  const hasSources = hasWorkspaceSources();
  const hasJob = Boolean(String(jobTextArea?.value || "").trim());
  const hasResume = Boolean(String(resumeTextArea?.value || "").trim());

  if (workspaceEmpty) {
    workspaceEmpty.classList.toggle("hidden", hasSources);
  }

  if (insightsPrompt) {
    insightsPrompt.classList.toggle(
      "hidden",
      !hasJob || !hasResume || workspaceHasAnalysis
    );
  }

  if (resultsEl) {
    resultsEl.classList.toggle("hidden", !workspaceHasAnalysis);
  }

}

function showInsightsPanel(show) {

  workspaceHasAnalysis = show;
  updateWorkspaceView();

}

function getMatchQualifier(score) {

  if (score >= 85) {
    return "Excellent Match";
  }

  if (score >= 72) {
    return "Strong Match";
  }

  if (score >= 58) {
    return "Good Match";
  }

  if (score >= 42) {
    return "Moderate Match";
  }

  return "Room to Grow";

}

function getScoreConfidence(score) {

  if (score >= 80) {
    return "High confidence alignment";
  }

  if (score >= 60) {
    return "Solid alignment with role";
  }

  if (score >= 40) {
    return "Partial alignment — review gaps";
  }

  return "Limited alignment detected";

}

function formatExperienceDisplay(code) {

  const label = formatExperienceLevel(code);
  if (!label || label === EXPERIENCE_LABELS.unknown) {
    return "";
  }

  if (label === "Mid-level") {
    return "Mid-level role";
  }

  if (label === "Not specified") {
    return "";
  }

  return `${label}-level role`;

}

function shortenPillLabel(text) {

  const t = String(text || "").trim();
  if (t.length <= PILL_MAX_CHARS) {
    return t;
  }

  const words = t.split(/\s+/);
  let out = "";

  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > PILL_MAX_CHARS) {
      break;
    }
    out = next;
  }

  return out || t.slice(0, PILL_MAX_CHARS);

}

function updateScoreCountsLine(matched, missing) {

  if (!scoreCountsLine) {
    return;
  }

  const m = Number(matched) || 0;
  const n = Number(missing) || 0;

  if (m === 0 && n === 0) {
    scoreCountsLine.textContent = "";
    return;
  }

  scoreCountsLine.textContent = `${m} matched · ${n} missing`;

}

function updateScoreRing(pct) {

  if (!scoreRingFill) {
    return;
  }

  const clamped = Math.min(100, Math.max(0, pct));
  const offset =
    SCORE_RING_CIRCUMFERENCE * (1 - clamped / 100);

  scoreRingFill.style.strokeDasharray = `${SCORE_RING_CIRCUMFERENCE}`;
  scoreRingFill.style.strokeDashoffset = `${offset}`;

}

const PILL_EMPTY_MESSAGES = {
  matched: "No matched skills yet.",
  missing: "No missing skills identified.",
};

function createSkillPill(text) {

  const label = String(text || "").trim();
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.setAttribute("role", "listitem");
  pill.title = label;

  const display = shortenPillLabel(label);
  pill.textContent = display;

  if (display !== label) {
    pill.setAttribute("aria-label", label);
  }

  return pill;

}

function fillPills(container, items, variant) {

  if (!container) {
    return;
  }

  const list = normalizeStringArray(items);
  const expanded = Boolean(pillRowExpandedState.get(container));
  container.replaceChildren();
  container.classList.toggle("pill-row--expanded", expanded);

  if (list.length === 0) {
    container.classList.remove("pill-row--expanded");
    pillRowExpandedState.delete(container);
    const empty = document.createElement("span");
    empty.className = "pill-row__empty";
    empty.textContent = PILL_EMPTY_MESSAGES[variant] || "None yet.";
    container.appendChild(empty);
    return;
  }

  const overflowCount = Math.max(0, list.length - PILL_MAX_VISIBLE);
  const visibleItems = expanded ? list : list.slice(0, PILL_MAX_VISIBLE);

  for (const text of visibleItems) {
    container.appendChild(createSkillPill(text));
  }

  if (overflowCount > 0) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pill pill--more";
    toggle.setAttribute("role", "listitem");
    toggle.setAttribute(
      "aria-expanded",
      expanded ? "true" : "false"
    );
    toggle.textContent = expanded
      ? "Show less"
      : `+${overflowCount} more`;

    toggle.addEventListener("click", () => {
      pillRowExpandedState.set(container, !expanded);
      fillPills(container, items, variant);
    });

    container.appendChild(toggle);
  } else {
    pillRowExpandedState.delete(container);
    container.classList.remove("pill-row--expanded");
  }

}

function productizeRecommendation(text) {

  let raw = String(text || "").trim();
  raw = raw.replace(/^[\s\-•]+/, "");
  raw = raw.replace(
    /^(Include|Add|Highlight|Consider|Explicitly mention|Mention|Emphasize|Showcase|You should|Try to)\s+/i,
    ""
  );
  raw = raw.replace(/\.$/, "");

  const split = raw.split(/\s*[—–]\s*|\s*:\s+/);
  let title = (split[0] || raw).trim();
  let subtext = (split[1] || "").trim();

  if (subtext.length > 56) {
    subtext = "";
  }

  if (subtext && subtext.length < 12) {
    subtext = "";
  }

  if (!subtext && title.length > 40) {
    const comma = title.indexOf(",");
    if (comma > 12 && comma < 40) {
      subtext = title.slice(comma + 1).trim();
      title = title.slice(0, comma).trim();
      if (subtext.length > 56) {
        subtext = "";
      }
    }
  }

  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title: title || raw,
    subtext,
  };

}

function fillRecommendationCards(container, items) {

  if (!container) {
    return;
  }

  const list = normalizeStringArray(items);
  container.replaceChildren();

  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rec-list__empty";
    empty.textContent = "Run an analysis to generate AI insights.";
    container.appendChild(empty);
    return;
  }

  const visible = list.slice(0, REC_MAX_VISIBLE);

  for (const text of visible) {
    const parsed = productizeRecommendation(text);
    const card = document.createElement("article");
    card.className = "rec-card";

    const titleEl = document.createElement("p");
    titleEl.className = "rec-card__title";
    titleEl.textContent = parsed.title;
    titleEl.title = String(text || "").trim();

    card.appendChild(titleEl);

    if (parsed.subtext) {
      const sub = document.createElement("p");
      sub.className = "rec-card__sub";
      sub.textContent = parsed.subtext;
      card.appendChild(sub);
    }

    container.appendChild(card);
  }

}

function shouldApplyLinkedInLiveJob(live) {

  return (
    isRecentJobDetection(live.currentJobDetectedAt) &&
    typeof live.currentJobText === "string" &&
    live.currentJobText.trim()
  );

}

function liveJobFingerprint(live) {

  const ts = live.currentJobDetectedAt || 0;
  const title = String(live.currentJobTitle || "");
  const company = String(live.currentCompanyName || "");
  const text = String(live.currentJobText || "");
  return `${ts}|${title}|${company}|${text.length}:${text.slice(0, 120)}`;

}

function recordLiveJobSynced(live) {

  lastSyncedDetectedAt =
    typeof live.currentJobDetectedAt === "number" &&
    Number.isFinite(live.currentJobDetectedAt)
      ? live.currentJobDetectedAt
      : 0;
  lastSyncedLiveFingerprint = liveJobFingerprint(live);

}

function applyLiveLinkedInJob(live) {

  jobDescriptionUserDirty = false;

  const jd = String(live.currentJobText || "").trim().substring(0, 5000);
  jobTextArea.value = jd;
  chrome.storage.local.set({ savedJobText: jd });
  extractStatus.textContent = formatExtractStatusLine(
    "LinkedIn job detected",
    live.currentJobTitle,
    live.currentCompanyName
  );

  updateJobContextCard(live);
  updateWorkspaceView();
  recordLiveJobSynced(live);

}

function trySyncLiveLinkedInJob(live) {

  if (!shouldApplyLinkedInLiveJob(live)) {
    return;
  }

  const detectedAt = live.currentJobDetectedAt;

  if (
    typeof detectedAt === "number" &&
    Number.isFinite(detectedAt) &&
    detectedAt < lastSyncedDetectedAt
  ) {
    console.log(
      "[Quiet Apply popup] live sync skipped (stale timestamp)",
      detectedAt,
      "<",
      lastSyncedDetectedAt
    );
    return;
  }

  const fp = liveJobFingerprint(live);
  if (fp === lastSyncedLiveFingerprint) {
    return;
  }

  const nextJd = String(live.currentJobText || "").trim().substring(0, 5000);
  const sameTextarea =
    nextJd === String(jobTextArea.value || "").trim();

  updateJobContextCard(live);
  updateWorkspaceView();

  if (jobDescriptionUserDirty) {
    if (!sameTextarea) {
      extractStatus.textContent = formatExtractStatusLine(
        "LinkedIn job updated — keeping your edits",
        live.currentJobTitle,
        live.currentCompanyName
      );
    }
    return;
  }

  if (sameTextarea) {
    extractStatus.textContent = formatExtractStatusLine(
      "LinkedIn job detected",
      live.currentJobTitle,
      live.currentCompanyName
    );
    recordLiveJobSynced(live);
    return;
  }

  const prevFp = computeJobSourceFingerprint(jobTextArea.value);
  const nextFp = computeJobSourceFingerprint(nextJd);

  if (prevFp && nextFp && prevFp !== nextFp && workspaceHasAnalysis) {
    void invalidateStoredAnalysis();
  }

  console.log("[Quiet Apply popup] live sync applying LinkedIn job");
  applyLiveLinkedInJob(live);

}

function scheduleLiveJobStorageSync() {

  if (liveJobSyncTimer !== null) {
    clearTimeout(liveJobSyncTimer);
  }

  liveJobSyncTimer = setTimeout(() => {
    liveJobSyncTimer = null;
    void runLiveJobStorageSync();
  }, LIVE_SYNC_DEBOUNCE_MS);

}

async function runLiveJobStorageSync() {

  if (!jobFieldHydrationComplete) {
    return;
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const tabUrl = tab?.url || "";
  if (!isLinkedInJobsUrl(tabUrl)) {
    return;
  }

  chrome.storage.local.get(LIVE_JOB_STORAGE_KEYS, (live) => {

    if (chrome.runtime.lastError) {
      console.warn(
        "[Quiet Apply popup] live sync storage get:",
        chrome.runtime.lastError.message
      );
      return;
    }

    trySyncLiveLinkedInJob(live);

  });

}

chrome.storage.onChanged.addListener((changes, areaName) => {

  if (areaName !== "local") {
    return;
  }

  const touched = LIVE_JOB_STORAGE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(changes, key)
  );

  if (!touched) {
    return;
  }

  console.log("[Quiet Apply popup] storage.onChanged (live job keys)");
  scheduleLiveJobStorageSync();

});

function applyExtractResultToPopup(resp, statusPrefix) {

  jobDescriptionUserDirty = false;

  const jd = String(resp.text || "").trim().substring(0, 5000);
  const prevFp = computeJobSourceFingerprint(jobTextArea.value);
  const nextFp = computeJobSourceFingerprint(jd);

  if (prevFp && nextFp && prevFp !== nextFp && workspaceHasAnalysis) {
    void invalidateStoredAnalysis();
  }

  jobTextArea.value = jd;
  chrome.storage.local.set({ savedJobText: jd });
  extractStatus.textContent = formatExtractStatusLine(
    statusPrefix,
    resp.title,
    resp.company
  );

  updateJobContextCard({
    currentJobTitle: resp.title,
    currentCompanyName: resp.company,
    currentJobText: jd,
    currentJobDetectedAt: resp.currentJobDetectedAt || Date.now(),
  });
  updateWorkspaceView();

}

// --- storage ---
const WORKSPACE_STORAGE_KEYS = [
  "savedResume",
  "savedResumeFileName",
  "savedResumeFileSize",
  "savedResumeUpdatedAt",
  "savedJobText",
  "lastAnalysis",
  "lastAnalysisAt",
  "lastAnalysisSourceKey",
  "currentJobText",
  "currentJobTitle",
  "currentCompanyName",
  "currentJobDetectedAt",
  "currentJobPageKey",
];

const ANALYSIS_STORAGE_KEYS = [
  "lastAnalysis",
  "lastAnalysisAt",
  "lastAnalysisSourceKey",
];

function normalizeStringArray(value) {

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

}

function computeJobSourceFingerprint(jobText) {

  const t = String(jobText || "").trim();
  if (!t) {
    return "";
  }

  return `${t.length}:${t.slice(0, 160)}`;

}

function buildJobSourcePayload(source, textareaValue) {

  const text = String(
    source?.currentJobText ??
      source?.text ??
      textareaValue ??
      ""
  ).trim();

  return {
    currentJobText: text,
    currentJobTitle: source?.currentJobTitle ?? source?.title ?? "",
    currentCompanyName: source?.currentCompanyName ?? source?.company ?? "",
    currentJobDetectedAt: source?.currentJobDetectedAt,
  };

}

function hydrateJobTextareaFromStorage(result) {

  const live = {
    currentJobDetectedAt: result.currentJobDetectedAt,
    currentJobText: result.currentJobText,
  };

  if (shouldApplyLinkedInLiveJob(live)) {
    return String(result.currentJobText || "").trim().substring(0, 5000);
  }

  const saved = String(result.savedJobText || "").trim();
  if (saved) {
    return saved.substring(0, 5000);
  }

  return String(result.currentJobText || "").trim().substring(0, 5000);

}

function normalizeAnalysisPayload(data) {

  if (!data || typeof data !== "object") {
    return null;
  }

  const matchScore = Number(data.matchScore);
  if (!Number.isFinite(matchScore)) {
    return null;
  }

  return {
    matchScore: Math.min(100, Math.max(0, matchScore)),
    experienceLevel:
      typeof data.experienceLevel === "string"
        ? data.experienceLevel
        : "unknown",
    jobRequirements: normalizeStringArray(data.jobRequirements),
    detectedSkills: normalizeStringArray(data.detectedSkills),
    matchedSkills: normalizeStringArray(data.matchedSkills),
    missingSkills: normalizeStringArray(data.missingSkills),
    resumeImprovements: normalizeStringArray(data.resumeImprovements),
    professionalSummary: String(data.professionalSummary ?? "").trim(),
  };

}

function isRenderableAnalysisPayload(data) {

  const normalized = normalizeAnalysisPayload(data);
  if (!normalized) {
    return false;
  }

  const hasSkills =
    normalized.matchedSkills.length > 0 ||
    normalized.missingSkills.length > 0;
  const hasRecs = normalized.resumeImprovements.length > 0;
  const hasSummary = normalized.professionalSummary.length > 0;

  return hasSkills || hasRecs || hasSummary;

}

function analysisMatchesCurrentJob(storedKey, jobText) {

  const currentKey = computeJobSourceFingerprint(jobText);
  if (!currentKey) {
    return false;
  }

  if (!storedKey) {
    return true;
  }

  return storedKey === currentKey;

}

async function invalidateStoredAnalysis() {

  workspaceHasAnalysis = false;
  clearAnalysisUi();

  await new Promise((resolve) => {
    chrome.storage.local.remove(ANALYSIS_STORAGE_KEYS, resolve);
  });

  updateWorkspaceView();

}

function tryRestoreStoredAnalysis(result) {

  if (!isRenderableAnalysisPayload(result.lastAnalysis)) {
    return false;
  }

  const jobText = String(jobTextArea?.value || "").trim();
  if (
    !analysisMatchesCurrentJob(result.lastAnalysisSourceKey, jobText)
  ) {
    return false;
  }

  const ok = renderAnalysisData(normalizeAnalysisPayload(result.lastAnalysis));
  if (ok) {
    analysisStatus.textContent = "Last analysis restored";
  }

  return ok;

}

async function persistAnalysisResult(data, jobText) {

  await storageSetLocal({
    lastAnalysis: data,
    lastAnalysisAt: Date.now(),
    lastAnalysisSourceKey: computeJobSourceFingerprint(jobText),
  });

}

function stopAnalysisLoading() {

  setAnalysisLoading(false);

}

function handleAnalysisFailure(message) {

  workspaceHasAnalysis = false;
  clearAnalysisUi();
  updateWorkspaceView();
  stopAnalysisLoading();

  chrome.storage.local.remove(ANALYSIS_STORAGE_KEYS, () => {
    if (analysisStatus) {
      analysisStatus.textContent = message || "AI analysis failed.";
    }
  });

}

function getAnalysisInputError() {

  const jobText = String(jobTextArea?.value || "").trim();
  const resumeText = String(resumeTextArea?.value || "").trim();

  if (!resumeText) {
    return "Upload your resume before generating analysis.";
  }

  if (resumeText.length < MIN_RESUME_TEXT_FOR_ANALYSIS) {
    return "Upload a resume with more text before generating analysis.";
  }

  if (!jobText) {
    return "Sync a LinkedIn job description before generating analysis.";
  }

  return "";

}

chrome.storage.local.get(
  WORKSPACE_STORAGE_KEYS,
  (result) => {

    jobDescriptionUserDirty = false;
    jobFieldHydrationComplete = false;
    workspaceHasAnalysis = false;
    clearAnalysisUi();

    if (result.savedResume) {
      resumeTextArea.value = result.savedResume;
      profileStatus.textContent = "Profile autosaved locally";
    }

    updateResumeContextCard(result);

    const initialJobText = hydrateJobTextareaFromStorage(result);
    if (initialJobText) {
      jobTextArea.value = initialJobText;
    }

    updateJobContextCard(buildJobSourcePayload(result, jobTextArea.value));

    const finishInit = () => {

      updateJobContextCard(buildJobSourcePayload(result, jobTextArea.value));
      tryRestoreStoredAnalysis(result);
      jobFieldHydrationComplete = true;
      updateWorkspaceView();

    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {

      if (chrome.runtime.lastError) {
        console.warn(
          "[Quiet Apply popup] tabs.query:",
          chrome.runtime.lastError.message
        );
        finishInit();
        return;
      }

      const tabUrl = tabs && tabs[0] ? tabs[0].url || "" : "";
      console.log("[Quiet Apply popup] init active tab URL:", tabUrl);

      if (!isLinkedInJobsUrl(tabUrl)) {
        finishInit();
        return;
      }

      chrome.storage.local.get(LIVE_JOB_STORAGE_KEYS, (live) => {

        if (chrome.runtime.lastError) {
          console.warn(
            "[Quiet Apply popup] live job storage get:",
            chrome.runtime.lastError.message
          );
          finishInit();
          return;
        }

        if (shouldApplyLinkedInLiveJob(live)) {
          trySyncLiveLinkedInJob(live);
        }

        finishInit();

      });

    });

  }
);

let resumeAutosaveTimer = null;

function scheduleResumeAutosave() {

  if (resumeAutosaveTimer !== null) {
    clearTimeout(resumeAutosaveTimer);
  }

  resumeAutosaveTimer = setTimeout(() => {

    resumeAutosaveTimer = null;
    const text = resumeTextArea.value;

    const now = Date.now();
    chrome.storage.local.get(
      ["savedResumeFileName", "savedResumeFileSize"],
      (prev) => {

      chrome.storage.local.set(
        {
          savedResume: text,
          savedResumeUpdatedAt: now,
          savedResumeFileName: prev.savedResumeFileName || "",
          savedResumeFileSize: prev.savedResumeFileSize || 0,
        },
        () => {

          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            profileStatus.textContent = "Failed to save profile";
            return;
          }

          profileStatus.textContent = "Profile autosaved locally";
          updateResumeContextCard({
            savedResumeFileName: prev.savedResumeFileName,
            savedResumeFileSize: prev.savedResumeFileSize,
            savedResumeUpdatedAt: now,
          });
          updateWorkspaceView();

        }
      );

    }
    );

  }, RESUME_AUTOSAVE_DEBOUNCE_MS);

}

resumeTextArea.addEventListener("input", () => {

  scheduleResumeAutosave();
  updateResumeContextCard({
    savedResumeUpdatedAt: Date.now(),
  });
  updateWorkspaceView();

});

jobTextArea.addEventListener("input", () => {

  chrome.storage.local.set({
    savedJobText: jobTextArea.value,
  });

  updateJobContextCard({
    currentJobText: jobTextArea.value,
  });
  updateWorkspaceView();

  if (jobFieldHydrationComplete) {
    jobDescriptionUserDirty = true;
    if (workspaceHasAnalysis) {
      void invalidateStoredAnalysis();
    }
  }

});

async function clearWorkspace() {

  if (resumeAutosaveTimer !== null) {
    clearTimeout(resumeAutosaveTimer);
    resumeAutosaveTimer = null;
  }

  jobDescriptionUserDirty = false;
  workspaceHasAnalysis = false;
  lastSyncedLiveFingerprint = "";
  lastSyncedDetectedAt = 0;

  jobTextArea.value = "";
  resumeTextArea.value = "";

  await new Promise((resolve) => {
    chrome.storage.local.remove(WORKSPACE_STORAGE_KEYS, resolve);
  });

  clearAnalysisUi();
  updateJobContextCard({});
  updateResumeContextCard({});
  updateWorkspaceView();

  if (resumeViewPanel) {
    resumeViewPanel.open = false;
  }

  setAnalysisLoading(false);
  analysisStatus.textContent = "Workspace cleared";
  profileStatus.textContent = "Profile autosaved locally";
  extractStatus.textContent = "";

}

clearWorkspaceBtn.addEventListener("click", () => {
  void clearWorkspace();
});

if (emptyRefreshBtn) {
  emptyRefreshBtn.addEventListener("click", () => {
    document.getElementById("extractBtn").click();
  });
}

if (emptyUploadBtn) {
  emptyUploadBtn.addEventListener("click", () => {
    uploadResumeBtn.click();
  });
}

if (emptyOpenLinkedInBtn) {
  emptyOpenLinkedInBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://www.linkedin.com/jobs/" });
  });
}

// --- resume file upload ---
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    "libs/pdfjs/pdf.worker.min.js"
  );
}

async function readTxtFile(file) {

  return await new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result ?? ""));
    };

    reader.onerror = () => {
      reject(reader.error || new Error("FileReader failed"));
    };

    reader.readAsText(file, "UTF-8");

  });

}

function getResumeFileKind(file) {

  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return "pdf";
  }

  if (name.endsWith(".txt") || file.type === "text/plain") {
    return "txt";
  }

  return "unknown";

}

async function extractPdfText(file) {

  if (typeof pdfjsLib === "undefined") {
    throw new Error("pdf.js not loaded");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const parts = [];

  for (let i = 1; i <= pdf.numPages; i++) {

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const line = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    parts.push(line);

  }

  return parts.join("\n\n").trim();

}

function storageSetLocal(obj) {

  return new Promise((resolve, reject) => {

    chrome.storage.local.set(obj, () => {

      const err = chrome.runtime.lastError;

      if (err) {
        reject(err);
      } else {
        resolve();
      }

    });

  });

}

async function handleResumeFilePick(file) {

  if (!file) {
    return;
  }

  profileStatus.textContent = "Reading file...";

  try {

    if (file.size > PDF_MAX_BYTES) {
      profileStatus.textContent = "Failed to read file";
      return;
    }

    const kind = getResumeFileKind(file);

    let text = "";

    if (kind === "txt") {
      text = (await readTxtFile(file)).trim();
    } else if (kind === "pdf") {
      text = (await extractPdfText(file)).trim();
    } else {
      profileStatus.textContent = "Failed to read file";
      return;
    }

    if (!text) {
      profileStatus.textContent = "Failed to read file";
      return;
    }

    if (resumeAutosaveTimer !== null) {
      clearTimeout(resumeAutosaveTimer);
      resumeAutosaveTimer = null;
    }

    resumeTextArea.value = text;
    const now = Date.now();
    await storageSetLocal({
      savedResume: text,
      savedResumeFileName: file.name,
      savedResumeFileSize: file.size,
      savedResumeUpdatedAt: now,
    });
    profileStatus.textContent = "Resume uploaded successfully";
    updateResumeContextCard({
      savedResumeFileName: file.name,
      savedResumeFileSize: file.size,
      savedResumeUpdatedAt: now,
    });
    updateWorkspaceView();
    if (resumeViewPanel) {
      resumeViewPanel.open = false;
    }

  } catch (err) {

    console.error(err);
    profileStatus.textContent = "Failed to read file";

  } finally {

    resumeFileInput.value = "";

  }

}

uploadResumeBtn.addEventListener("click", () => {

  resumeFileInput.value = "";
  resumeFileInput.click();

});

resumeFileInput.addEventListener("change", () => {

  const file = resumeFileInput.files?.[0];

  void handleResumeFilePick(file);

});

// --- extraction (LinkedIn: content script primary, inject fallback) ---
document.getElementById("extractBtn").addEventListener("click", async () => {

  extractStatus.textContent = "Refreshing LinkedIn job…";

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const tabUrl = tab?.url || "";
  console.log("[Quiet Apply popup] Extract click, active tab URL:", tabUrl);

  if (!tab?.id) {
    extractStatus.textContent = "Could not read the active tab.";
    return;
  }

  if (!isLinkedInJobsUrl(tabUrl)) {
    extractStatus.textContent =
      "Open a LinkedIn job page to extract, or paste the description.";
    return;
  }

  let resp = null;

  try {
    resp = await chrome.tabs.sendMessage(tab.id, {
      action: "extractJobForPopup",
    });
    console.log("[Quiet Apply popup] sendMessage response:", resp);
  } catch (err) {
    console.warn(
      "[Quiet Apply popup] sendMessage failed:",
      err && err.message ? err.message : String(err)
    );
    resp = null;
  }

  if (resp?.ok && typeof resp.text === "string" && resp.text.trim()) {
    applyExtractResultToPopup(resp, "LinkedIn job refreshed");
    return;
  }

  try {

    const inj = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["linkedin-extract-fallback.js"],
    });

    const r = inj[0]?.result;
    console.log("[Quiet Apply popup] fallback executeScript result:", r);

    if (r?.ok && typeof r.text === "string" && r.text.trim()) {

      try {
        await storageSetLocal({
          currentJobText: r.currentJobText || r.text,
          currentJobTitle: r.currentJobTitle || "",
          currentCompanyName: r.currentCompanyName || "",
          currentJobDetectedAt: r.currentJobDetectedAt || Date.now(),
        });
      } catch (persistErr) {
        console.error(
          "[Quiet Apply popup] persist fallback extract failed",
          persistErr
        );
      }

      applyExtractResultToPopup(r, "LinkedIn job refreshed");
      return;
    }

    extractStatus.textContent =
      "Could not read this job page yet. Try again in a moment.";

  } catch (injErr) {

    console.error(
      "[Quiet Apply popup] fallback executeScript error:",
      injErr && injErr.message ? injErr.message : String(injErr)
    );
    extractStatus.textContent =
      "Extract failed. Reload the LinkedIn job page and try again.";

  }

});

function formatExperienceLevel(code) {

  if (typeof code !== "string" || !code) {
    return EXPERIENCE_LABELS.unknown;
  }

  return EXPERIENCE_LABELS[code] || code;

}

function clearAnalysisUi() {

  workspaceHasAnalysis = false;

  if (matchScoreEl) {
    matchScoreEl.textContent = "0%";
  }

  if (scoreLabelEl) {
    scoreLabelEl.textContent = "—";
  }

  if (scoreConfidenceEl) {
    scoreConfidenceEl.textContent = "";
  }

  if (experienceLevelEl) {
    experienceLevelEl.textContent = "";
  }

  if (jobRequirementsEl) {
    jobRequirementsEl.replaceChildren();
  }

  if (detectedSkillsEl) {
    detectedSkillsEl.replaceChildren();
  }

  fillPills(matchedSkillsEl, [], "matched");
  fillPills(missingSkillsEl, [], "missing");
  fillRecommendationCards(resumeSuggestionsEl, []);

  if (professionalSummaryEl) {
    professionalSummaryEl.textContent = "";
  }

  updateScoreCountsLine(0, 0);
  updateScoreRing(0);

}

function renderAnalysisData(data) {

  const normalized = normalizeAnalysisPayload(data);
  if (!normalized || !isRenderableAnalysisPayload(normalized)) {
    return false;
  }

  const pct = normalized.matchScore;

  if (matchScoreEl) {
    matchScoreEl.textContent = `${pct}%`;
  }

  if (scoreLabelEl) {
    scoreLabelEl.textContent = getMatchQualifier(pct);
  }

  if (scoreConfidenceEl) {
    scoreConfidenceEl.textContent = getScoreConfidence(pct);
  }

  if (experienceLevelEl) {
    experienceLevelEl.textContent = formatExperienceDisplay(
      normalized.experienceLevel
    );
  }

  updateScoreCountsLine(
    normalized.matchedSkills.length,
    normalized.missingSkills.length
  );

  if (jobRequirementsEl) {
    jobRequirementsEl.replaceChildren();
    for (const req of normalized.jobRequirements) {
      const span = document.createElement("span");
      span.textContent = req;
      jobRequirementsEl.appendChild(span);
    }
  }

  if (detectedSkillsEl) {
    detectedSkillsEl.replaceChildren();
    for (const skill of normalized.detectedSkills) {
      const span = document.createElement("span");
      span.textContent = skill;
      detectedSkillsEl.appendChild(span);
    }
  }

  fillPills(matchedSkillsEl, normalized.matchedSkills, "matched");
  fillPills(missingSkillsEl, normalized.missingSkills, "missing");
  fillRecommendationCards(
    resumeSuggestionsEl,
    normalized.resumeImprovements
  );

  if (professionalSummaryEl) {
    professionalSummaryEl.textContent = normalized.professionalSummary;
  }

  updateScoreRing(0);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateScoreRing(pct);
    });
  });

  showInsightsPanel(true);
  return true;

}

function setAnalysisLoading(isLoading) {

  if (generateBtn) {
    generateBtn.disabled = isLoading;
    generateBtn.classList.toggle("is-loading", isLoading);
  }

  if (analysisSpinner) {
    analysisSpinner.classList.toggle("hidden", !isLoading);
  }

}

// --- analysis ---
document.getElementById("generateBtn").addEventListener("click", async () => {

  const jobText = jobTextArea.value.trim();
  const resumeText = resumeTextArea.value.trim();

  const inputError = getAnalysisInputError();
  if (inputError) {
    if (analysisStatus) {
      analysisStatus.textContent = inputError;
    }
    if (extractStatus) {
      extractStatus.textContent = inputError;
    }
    return;
  }

  setAnalysisLoading(true);
  if (analysisStatus) {
    analysisStatus.textContent = "Analyzing resume...";
  }
  showInsightsPanel(false);
  clearAnalysisUi();
  updateWorkspaceView();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, ANALYSIS_FETCH_TIMEOUT_MS);

  try {

    const response = await fetch("https://quiet-apply-api.onrender.com/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jobDescription: jobText,
        resume: resumeText
      }),
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      handleAnalysisFailure("AI analysis failed.");
      return;
    }

    if (!response.ok) {
      handleAnalysisFailure(
        typeof data?.error === "string" ? data.error : "AI analysis failed."
      );
      return;
    }

    const normalized = normalizeAnalysisPayload(data);
    if (!normalized || !isRenderableAnalysisPayload(normalized)) {
      handleAnalysisFailure("Unexpected response from server.");
      return;
    }

    const rendered = renderAnalysisData(normalized);
    if (!rendered) {
      handleAnalysisFailure("Analysis data was incomplete.");
      return;
    }

    try {
      await persistAnalysisResult(normalized, jobText);
    } catch (persistErr) {
      console.error(persistErr);
    }

    if (analysisStatus) {
      analysisStatus.textContent = "AI analysis complete";
    }

  } catch (error) {

    console.error(error);

    if (error && error.name === "AbortError") {
      handleAnalysisFailure("Analysis timed out. Please try again.");
      return;
    }

    handleAnalysisFailure("AI analysis failed.");

  } finally {

    clearTimeout(timeoutId);
    stopAnalysisLoading();

  }

});

// --- utilities ---
copySummaryBtn.addEventListener("click", async () => {

  const text = professionalSummaryEl.textContent;

  await navigator.clipboard.writeText(text);

  copySummaryBtn.textContent = "Copied";

  setTimeout(() => {
    copySummaryBtn.textContent = "Copy";
  }, 1500);

});
