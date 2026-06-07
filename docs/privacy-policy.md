# Quiet Apply — Privacy Policy

**Last updated:** June 6, 2026
**Applies to:** Quiet Apply Chrome Extension (free beta / testing version)

Quiet Apply ("the extension", "we", "us") helps you analyze LinkedIn job
descriptions against your resume. This policy explains exactly what data the
extension handles, where it goes, and what we do **not** do with it.

> This is a free beta release intended for testing. Behavior and this policy may
> change as the product evolves.

---

## 1. What the extension does

- Reads the **visible job description text** on LinkedIn job pages you open.
- Lets you **upload or paste your resume** inside the extension popup.
- Sends your resume text and the job description text to the **Quiet Apply
  backend**, which uses AI to produce a match score, matched skills, missing
  skills, recommendations, and a professional summary.
- Stores recent job context and your resume locally in your browser so the
  popup can display results.

## 2. Data we process

| Data | Source | Purpose | Where it goes |
|------|--------|---------|---------------|
| Visible job description text | The LinkedIn job page you are viewing | Job analysis | Stored locally; sent to Quiet Apply backend when you run an analysis |
| Job title / company (best-effort) | LinkedIn page or fallback metadata | Display only | Stored locally; may be sent with the analysis request |
| Resume text | You (upload or paste) | Job analysis | Stored locally; sent to Quiet Apply backend when you run an analysis |
| Analysis results | Quiet Apply backend | Shown in the popup | Stored locally in your browser |

The job title and company may use **fallback metadata** (for example a generic
"LinkedIn job" label) when the page does not clearly expose them. This does not
affect the analysis, which relies on the job description text.

## 3. Data we do NOT collect

- We do **not** collect your LinkedIn credentials, passwords, or login session.
- We do **not** read your LinkedIn messages, connections, or private profile
  data.
- We do **not** track your browsing across other websites.
- We do **not** sell your data to anyone.
- We do **not** run on pages other than LinkedIn job pages.

## 4. Where your data is sent

To generate an analysis, your **resume text** and the **job description text**
are sent over an encrypted connection to the Quiet Apply backend. The backend
may forward this text to **third-party AI providers** solely to produce the
analysis result. This text is processed to return your results and is not used
to build advertising profiles or sold to third parties.

## 5. Local storage

The extension uses Chrome's local storage (`chrome.storage.local`) on your own
device to hold the most recent job description, optional title/company, your
resume text, and the latest analysis. You can clear this at any time by removing
the extension or clearing extension data in Chrome.

## 6. Data retention

- **Local data** stays on your device until you clear it or remove the
  extension.
- **Backend processing** is performed to return your analysis. Because this is a
  beta, retention on the backend may change; we keep only what is needed to
  provide and improve the analysis feature and do not sell it.

## 7. Your choices

- Don't want text sent for analysis? Simply don't run an analysis — the
  extension will not send resume or job text unless you trigger it.
- Want to stop all data handling? Remove the extension from Chrome.

## 8. Children

Quiet Apply is not directed to children under 13 and should not be used by them.

## 9. Changes to this policy

We may update this policy as the beta evolves. Material changes will be
reflected by updating the "Last updated" date above.

## 10. Contact

For privacy questions or data requests related to this beta, contact the
developer at vladkononov99@gmail.com.
