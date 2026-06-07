# Quiet Apply — Chrome Web Store Developer Dashboard Answers

Copy-paste answers for the Chrome Web Store Developer Dashboard (Privacy practices
and listing fields). This is a **free beta / testing version** of Quiet Apply.

> Tip: Paste each block into the matching field in the dashboard. Keep wording
> consistent with `docs/privacy-policy.md` and `docs/permissions-justification.md`.

---

## 1. Single purpose description

```
Quiet Apply has a single purpose: to help users analyze a LinkedIn job posting
against their resume. On a LinkedIn job page, it reads the visible job
description and lets the user upload or paste their resume, then returns a match
score, matched skills, missing skills, AI recommendations, and a professional
summary. The extension only runs on LinkedIn job pages.
```

---

## 2. Permission justifications

### storage

```
Quiet Apply uses chrome.storage.local to save the most recently synced job
description, optional job title/company, the user's resume text, and the latest
analysis result on the user's own device. This lets the popup display the job
context and results without re-reading the page each time. Storage is local to
the browser and is not synced remotely.
```

### activeTab

```
When the user opens the popup or presses "Refresh Job," Quiet Apply needs to read
the job description from the LinkedIn tab the user is actively viewing. activeTab
grants temporary, user-initiated access to the current tab instead of broad
standing access to all tabs.
```

### tabs

```
Quiet Apply uses the tabs permission to locate the active LinkedIn job tab and
send it a message so the content script can extract the visible job description
and return it to the popup. It is used only to coordinate messaging with the
relevant LinkedIn job tab and is not used to track browsing history.
```

### scripting

```
Quiet Apply uses the scripting permission to run its job-description extraction
logic (including a fallback extraction path) in the LinkedIn job page context so
it can reliably read the visible job description across LinkedIn's job page
layouts. Scripting is limited to LinkedIn job pages covered by the host
permission and content-script match patterns.
```

### Host permission — https://www.linkedin.com/*

```
Quiet Apply only works on LinkedIn job postings. This host permission lets the
content script and messaging operate on LinkedIn pages so the extension can read
the visible job description. The content script is further scoped to
https://www.linkedin.com/jobs/* paths. The extension does not run on any other
website.
```

---

## 3. Data usage disclosure

### Data the extension processes

```
- LinkedIn job description text from the job page the user is viewing.
- Best-effort job title and company metadata (may use fallback values such as a
  generic "LinkedIn job" label when the page does not clearly expose them).
- Resume text uploaded or pasted by the user.
- AI analysis results (match score, matched skills, missing skills,
  recommendations, and professional summary).
```

### Data the extension does NOT collect

```
- LinkedIn passwords.
- LinkedIn credentials or login sessions.
- LinkedIn private messages.
- Browsing history outside LinkedIn job pages.
- Payment information.
```

### Suggested dashboard data-type selections

When completing the "What user data do you plan to collect?" section, select:

```
- Personally identifiable information: YES (resume text may contain name/contact details).
- Website content: YES (job description text).
- Authentication information: NO.
- Financial / payment information: NO.
- Health information: NO.
- Location: NO.
- Web history: NO.
- User activity (clicks, mouse, keystroke logging): NO.
```

---

## 4. Data transmission

```
To generate an analysis, Quiet Apply sends the user's resume text and the job
description text to the Quiet Apply backend over an encrypted (HTTPS) connection.
The backend may forward this text to third-party AI providers solely to produce
the analysis result that is returned to the user. This transmission happens only
when the user runs an analysis. The data is used to provide the analysis feature
and is not used for advertising profiles.
```

---

## 5. Data sale

```
Quiet Apply does not sell user data. Resume text, job description text, and
analysis results are used only to provide the job-analysis feature and are not
sold or transferred to third parties for advertising or unrelated purposes.
```

### Dashboard certification checkboxes

```
- I do not sell or transfer user data to third parties, outside of the approved use cases: CONFIRM.
- I do not use or transfer user data for purposes unrelated to my item's single purpose: CONFIRM.
- I do not use or transfer user data to determine creditworthiness or for lending purposes: CONFIRM.
```

---

## 6. Remote code

```
Quiet Apply does not use remote code. The extension does not download, inject, or
execute JavaScript, WebAssembly, or any other code from a remote server inside
the extension. All extension logic ships inside the packaged extension. The
extension only makes API requests (HTTPS) to the Quiet Apply backend to send
resume and job description text and receive analysis results as data.
```

When asked "Are you using remote code?" select:

```
No, I am not using remote code.
```

---

## 7. Beta disclaimer

```
Quiet Apply is currently a free beta / testing version. It works best on LinkedIn
job pages that show a visible job description. Job title and company may use
best-effort fallback metadata, which does not affect the analysis (the analysis
relies on the job description text). Features and behavior may change as the beta
develops.
```

---

## Quick reference — listing copy locations

- Short & long store descriptions: `docs/store-description.md`
- Full privacy policy (host this at a public URL and paste the URL into the
  dashboard "Privacy policy URL" field): `docs/privacy-policy.md`
- Detailed permission rationale: `docs/permissions-justification.md`
- Submission steps and screenshots: `docs/release-checklist.md`
