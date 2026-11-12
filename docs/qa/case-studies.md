# QA case studies: Quiet Apply

These are retrospective summaries of failures documented during development, reconstructed from the project's career-evidence notes and README. They are not original issue tickets or a newly executed test run. No historical dates, severity ratings, or pass counts have been invented.

## 1. Analysis disappears when the popup closes

**Observed:** the analysis result disappeared after closing and reopening the extension popup.
**Expected:** the most recent analysis remains available after reopening.
**Cause:** popup JavaScript memory is destroyed when the popup closes.
**Resolution:** persist the analysis and associated UI state in Chrome Storage and restore it on open.
**Documented verification:** popup closure/reopening, tab switching, LinkedIn refresh, browser restart, and Chrome relaunch.

## 2. Job extraction fails after dynamic LinkedIn navigation

**Observed:** a single hard-coded selector failed for some vacancies and after switching jobs without a full page reload.
**Expected:** the extension extracts the currently selected job description, including after dynamic navigation.
**Investigation:** Chrome DevTools DOM comparison, logging, and timing checks.
**Resolution:** multiple extraction selectors, fallback extraction, delayed/empty-state handling, text cleanup, and dynamic-job-switch support.
**Documented verification:** multiple vacancies, navigation paths, page reloads, and loading speeds.

## 3. AI response structure breaks parsing

**Observed:** additional prose, markdown-wrapped JSON, missing fields, or changed labels caused parsing/display failures.
**Expected:** a structured result or a clear recoverable error; the popup must not silently break.
**Investigation:** compared raw successful and failed responses against the expected fields.
**Resolution:** stricter output instructions, standardized field names, required-field validation, recoverable parsing, and improved error handling.
**Documented verification:** varied resumes and vacancies, sequential requests, missing fields, partial output, and malformed responses.

## Scope and evidence

The historical project records describe approximately 40–60 manual scenarios and approximately 10–15 substantial defects fixed before publication. Those are estimates, not a claim that the checklist below contains the complete original test log.

See [regression checklist](regression-checklist.md) for a reusable, unexecuted checklist. Current architecture should be checked against the repository: older notes describe an earlier MVP; the current README documents a separate server-side API backend.
