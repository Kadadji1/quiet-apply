# Quiet Apply: regression checklist

Reusable checklist derived from documented testing scope. **Not executed as part of this documentation update.** Record the extension version, browser version, environment, date, expected/actual result, and evidence when running it. Use synthetic resumes and job descriptions; do not publish personal applicant data or API secrets.

| Area | Check | Expected behavior |
| --- | --- | --- |
| Extraction | Open a supported LinkedIn job | Current description is extracted |
| Dynamic navigation | Change the selected job without reloading | Old job text is not reused |
| Loading state | Description is delayed, hidden, or empty | Clear waiting/error state; no empty analysis |
| Resume | Import supported PDF and DOCX | Extracted text is usable or a clear validation error appears |
| File errors | Unsupported, corrupt, oversized, low-text file | Request is blocked with an explanation |
| Replacement | Replace active resume | Next analysis uses the replacement |
| Persistence | Close and reopen popup | Latest resume/context/result is restored |
| Restart | Restart browser | Persisted state remains consistent |
| API | Valid structured response | Required fields render correctly |
| API errors | Unauthorized, server failure, timeout | Loading ends; actionable error; no false success |
| Malformed output | Missing fields, partial JSON, prose wrappers | Validated fallback or clear error |
| Boundary | Reach daily request limit, then attempt another | Documented limit is enforced |
| Reset | Cross the next daily reset boundary | Counter resets consistently |
| New install | No active LinkedIn job / missing resume | Helpful initial state; no request with missing inputs |
| Regression | Retest extraction, parsing, and popup restoration after a fix | Existing supported flows remain intact |

Do not mark historical scenarios as passed without their original execution evidence.
