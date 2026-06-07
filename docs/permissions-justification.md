# Quiet Apply — Permissions Justification

This document explains why Quiet Apply requests each permission. Use these
explanations in the Chrome Web Store "Privacy practices" / permission
justification fields during review.

Manifest summary (Manifest V3):

- `permissions`: `activeTab`, `scripting`, `storage`, `tabs`
- `host_permissions`: `https://www.linkedin.com/*`
- Content script runs only on `https://www.linkedin.com/jobs/*` pages.

---

## `storage`

**Why it's needed:** Quiet Apply stores the most recently synced job description,
optional job title/company, your resume text, and the latest analysis result in
Chrome's local storage so the popup can display them without re-reading the page
every time.

**Scope:** Local to the user's browser (`chrome.storage.local`). No remote sync.

**User benefit:** Your job context and results persist while you move between the
page and the popup.

---

## `activeTab`

**Why it's needed:** When you open the popup or press **Refresh Job**, Quiet
Apply needs to read the job description from the LinkedIn tab you are actively
viewing.

**Scope:** Grants temporary access to the current tab in response to your action,
rather than broad standing access to all tabs.

**User benefit:** The extension can analyze the exact job you're looking at, on
demand.

---

## `tabs`

**Why it's needed:** The extension identifies the active LinkedIn job tab and
sends it a message to extract the visible job description (so the popup and the
content script can communicate about the right page).

**Scope:** Used to locate and message the relevant LinkedIn job tab. It is not
used to track your browsing history across sites.

**User benefit:** Reliable syncing between the popup and the LinkedIn job page
you're viewing.

---

## `scripting`

**Why it's needed:** Quiet Apply uses scripting to run its extraction logic in
the LinkedIn job page context (including a fallback extraction path) so it can
read the visible job description text.

**Scope:** Injected only into LinkedIn job pages covered by the host permission
and content-script match patterns.

**User benefit:** Robust job-description detection across LinkedIn's job page
layouts.

---

## `host_permissions: https://www.linkedin.com/*`

**Why it's needed:** Quiet Apply only works on LinkedIn job postings. This host
permission allows the content script and messaging to operate on LinkedIn job
pages so the extension can read the visible job description.

**Scope:** Limited to `linkedin.com`. The content script itself is further scoped
to `https://www.linkedin.com/jobs/*` paths. The extension does not run on any
other website.

**User benefit:** The extension activates exactly where it's useful — LinkedIn
job pages — and nowhere else.

---

## What we do NOT access

- No LinkedIn credentials, passwords, or login sessions.
- No LinkedIn messages, connections, or private profile data.
- No access to non-LinkedIn websites.
- No cross-site browsing tracking.

## Data transmission note

To produce an analysis, the resume text and job description text are sent to the
Quiet Apply backend over an encrypted connection, which may use third-party AI
providers to generate results. This transmission happens only when you run an
analysis. Data is not sold.
