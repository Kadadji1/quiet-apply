# Quiet Apply

Quiet Apply is a published Manifest V3 Chrome extension that helps job seekers compare a resume with a LinkedIn job description and receive structured AI-assisted application insights.

The project was designed, built, tested, and published as a personal product and QA portfolio project.

## What it does

- Extracts job descriptions from LinkedIn job pages
- Accepts pasted resume text and uploaded PDF/DOCX resumes
- Compares resume content with job requirements
- Returns a structured match score, detected requirements, matched skills, missing skills, and resume recommendations
- Stores the current resume, job context, latest analysis, settings, and request usage in Chrome Storage
- Preserves analysis state after the popup closes
- Applies a daily analysis limit and validates boundary behavior

## Current status

- Published in the Chrome Web Store
- Public frontend repository
- Live AI analysis workflow
- Secure server-side API integration through a separate backend
- Approximately 10 installs at the time of this update

The backend repository is private because it contains deployment configuration and server-side integration details. API secrets are not stored in this public extension repository.

## Architecture

### Chrome extension

- Manifest V3
- Popup interface built with JavaScript, HTML, and CSS
- Content script for LinkedIn DOM extraction
- Chrome Storage for persistence and request tracking
- PDF/DOCX resume parsing
- Structured rendering of AI analysis results

### AI backend

- Node.js and Express
- OpenAI API integration
- Hosted API endpoint
- Server-side secret management
- Structured response contract and error handling

## QA and testing

The extension was tested through approximately 40–60 manual scenarios covering:

- Functional testing
- Negative testing
- Integration testing
- Regression testing
- Exploratory testing
- Boundary testing
- File validation
- Popup lifecycle and state persistence
- Dynamic LinkedIn DOM behavior
- Request-limit reset and blocking behavior
- Missing, malformed, partial, and delayed API responses

Approximately 10–15 substantial defects were identified and fixed before publication.

## Example failure uncovered

During testing, the model occasionally returned malformed or structurally inconsistent output. Required fields such as match score, skill gaps, or recommendations could be missing, renamed, or returned in an unexpected format, which caused parser failures in the popup.

The issue was reproduced across different resumes and LinkedIn job descriptions by comparing raw API responses with the expected response structure. Longer and less structured inputs made the failure easier to reproduce.

The fix included:

- Tightening the prompt and response requirements
- Defining a stricter structured response contract
- Adding client-side response validation
- Adding fallback parsing for recoverable output
- Returning a clear user-facing error when recovery was not possible
- Retesting missing, partial, malformed, and nonconforming response scenarios

## Other reliability work

- Added validation for empty job descriptions and insufficient resume text
- Added handling for unsupported, unreadable, oversized, and low-text files
- Added timeout handling for delayed backend responses
- Added fallbacks for dynamic or incomplete LinkedIn page states
- Persisted resume and analysis state across popup closures
- Tested the daily request limit, sixth-request blocking, persistence after restart, and daily reset behavior

## Tech stack

### Frontend

- JavaScript
- HTML
- CSS
- Chrome Extension APIs
- Chrome Storage

### Backend

- Node.js
- Express
- OpenAI API
- Hosted deployment

### Testing and development

- Chrome DevTools
- Manual test design
- Linear
- Git and GitHub
- Cursor and ChatGPT as development assistants, with manual validation of generated code and behavior

## Privacy and security

- No login or user account is required for the current MVP
- Resume text and extension state are stored locally in Chrome Storage
- API credentials are managed server-side and are not included in the public repository
- The extension requests only the permissions required for LinkedIn job extraction, local storage, tabs, and scripting

## Known limitations

- LinkedIn DOM changes can require selector or fallback updates
- The current MVP supports one active resume profile
- AI output can still be incomplete or incorrect, so recommendations should be reviewed by the user
- Uploaded resume quality depends on extractable text in the source file
- The extension is an MVP and has limited production usage data

## Project ownership

I defined the product scope, user flow, popup UX, Manifest V3 configuration, content-script behavior, resume parsing, storage model, request-limit logic, prompt and response structure, API integration, error handling, testing strategy, privacy documentation, Chrome Web Store listing, and publication workflow.

Cursor and ChatGPT were used as coding assistants. I reviewed, tested, debugged, and validated the implementation and final behavior.

## Repository

This repository contains the public Chrome extension code. The backend is maintained separately in a private repository.
