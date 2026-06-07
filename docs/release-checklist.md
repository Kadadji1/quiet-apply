# Quiet Apply — Beta Release Checklist (Chrome Web Store)

Use this checklist to prepare and submit the Quiet Apply beta to the Chrome Web
Store. Do not create the ZIP yet — this list is preparation only.

---

## 1. Pre-submission code & manifest review

- [ ] `manifest.json` version is correct and bumped if needed (currently `1.0`).
- [ ] `name`, `description`, and icons are present and correct.
- [ ] Permissions are minimal: `activeTab`, `scripting`, `storage`, `tabs`.
- [ ] Host permission limited to `https://www.linkedin.com/*`.
- [ ] Content script matches limited to `https://www.linkedin.com/jobs/*` paths.
- [ ] `DEBUG_EXTRACT` is `false` in `content.js` for the release build.
- [ ] No leftover `console.log` noise beyond the intended beta logs.
- [ ] No test/dev-only files or secrets included in the package.
- [ ] Backend endpoint used by the extension points to the correct (production/beta) URL.

## 2. Functional smoke test (manual)

- [ ] Open a LinkedIn job with a visible description → auto-sync populates the popup.
- [ ] Switch to a different job (click another card) → context updates.
- [ ] Press **Refresh Job** → re-extracts the current job.
- [ ] Upload a resume → analysis runs and returns a match score.
- [ ] Paste resume text → analysis runs and returns a match score.
- [ ] Matched skills, missing skills, recommendations, and summary all render.
- [ ] Job with missing/odd title still analyzes (fallback metadata acceptable).
- [ ] Failed extraction does NOT wipe previously synced job data.
- [ ] Extension does not activate on non-LinkedIn or non-job pages.

## 3. Required listing assets

- [ ] **Icon**: 128×128 PNG (already in `icons/`).
- [ ] **Screenshots**: 1280×800 or 640×400 PNG/JPEG (see screenshot checklist below).
- [ ] **Short description** (≤132 chars) — from `docs/store-description.md`.
- [ ] **Detailed description** — from `docs/store-description.md`.
- [ ] **Category** selected (suggested: Productivity).
- [ ] **Promotional tile** (optional, 440×280) if you want a richer listing.

## 4. Privacy & compliance (Chrome Web Store requirements)

- [ ] **Privacy policy URL** published and reachable (content in `docs/privacy-policy.md`).
- [ ] **Permission justifications** ready (from `docs/permissions-justification.md`).
- [ ] Data-usage disclosures in the Developer Dashboard match reality:
  - [ ] Collects "Personally identifiable information" → resume text (yes).
  - [ ] Collects "Web content" → job description text (yes).
  - [ ] Data is NOT sold to third parties.
  - [ ] Data IS transmitted to backend / AI providers for analysis (disclose).
- [ ] Confirm single purpose statement: analyze LinkedIn job descriptions vs. resume.
- [ ] Confirm honest beta framing (free testing version).

## 4a. Publishing the privacy policy (GitHub Pages)

The Chrome Web Store requires a publicly reachable privacy policy URL. Publish
`docs/privacy-policy.html` via GitHub Pages:

- [ ] 1. Replace `[YOUR SUPPORT EMAIL]` in `docs/privacy-policy.html` and
      `docs/privacy-policy.md` with the real support email.
- [ ] 2. Commit and push `docs/privacy-policy.html` (and the updated `.md`).
- [ ] 3. In the GitHub repo, go to **Settings → Pages**.
- [ ] 4. Under **Source**, choose **Deploy from a branch**.
- [ ] 5. Set **Branch** to `main`.
- [ ] 6. Set **Folder** to `/docs`.
- [ ] 7. Click **Save** and wait for the Pages build to finish.
- [ ] 8. Confirm the privacy policy URL resolves:
      `https://kadadji1.github.io/quiet-apply/privacy-policy.html`
- [ ] 9. Paste that URL into the **Privacy policy URL** field in the Chrome Web
      Store Developer Dashboard.

**Optional — root URL opens the policy directly:** If you want
`https://kadadji1.github.io/quiet-apply/` to open the policy without the
`privacy-policy.html` path, create `docs/index.html` that redirects to (or links
to) `privacy-policy.html`.

## 5. Screenshot checklist (1280×800 recommended)

Capture at least 3–5 screenshots showing real product behavior:

- [ ] **Auto-synced job** — popup open on a LinkedIn job page showing the synced
      job title/company and description context.
- [ ] **Resume upload/paste** — the resume input state in the popup.
- [ ] **Match score** — the score view after running an analysis.
- [ ] **Matched skills + missing skills** — the skills breakdown clearly visible.
- [ ] **AI recommendations** — recommendations and/or professional summary view.
- [ ] (Optional) **Refresh Job** — showing manual refresh control.

Screenshot tips:
- [ ] Use a real (or realistic) job posting and a sample resume.
- [ ] Blur or use dummy personal data (name, email, phone) in the resume.
- [ ] Keep the UI clean; crop to the popup where appropriate.
- [ ] Consistent sizing across all screenshots.

## 6. Final packaging (do AFTER this checklist — not yet)

- [ ] Remove `docs/`, `.git/`, and any non-shipping files from the package set.
- [ ] Confirm the package contains: `manifest.json`, `popup.html`, `popup.js`,
      `styles.css`, `content.js`, `linkedin-extract-fallback.js`, `icons/`,
      and required `libs/` (e.g. `libs/pdfjs/`).
- [ ] Create the ZIP from the extension root (not a parent folder).
- [ ] Upload to the Chrome Web Store Developer Dashboard.
- [ ] Fill in privacy practices, justifications, and listing copy.
- [ ] Submit for review and note the expected review turnaround.

## 7. Post-submission

- [ ] Save a tagged git commit of the exact released build.
- [ ] Record the submitted version and date.
- [ ] Monitor the dashboard for review feedback and respond promptly.
