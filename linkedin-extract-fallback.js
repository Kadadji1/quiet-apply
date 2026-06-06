"use strict";

(() => {
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

  const TITLE_SELECTORS = [
    '[data-testid="job-details-jobs-unified-top-card__job-title"]',
    ".jobs-unified-top-card__job-title",
    "h1.jobs-unified-top-card__job-title",
  ];

  const COMPANY_SELECTORS = [
    '[data-testid="job-details-jobs-unified-top-card__company-name"]',
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
  ];

  const REJECTED_TITLES = new Set([
    "position description",
    "responsibilities",
    "qualifications",
    "employer industry",
  ]);

  const MIN_DESC = 30;
  const MAX_JOB_CHARS = 12000;

  function normalizeText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  function textFromElement(el) {
    return el ? normalizeText(el.innerText || "") : "";
  }

  function isVisible(el) {
    if (!el || !el.isConnected) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    if (rect.width < 20 || rect.height < 10) {
      return false;
    }
    if (rect.left + rect.width / 2 < vw * 0.25) {
      return false;
    }
    return rect.bottom > 0 && rect.top < (window.innerHeight || 800);
  }

  function isInFeed(el) {
    return Boolean(
      el &&
        el.closest(
          ".jobs-search-results__list, .job-card-container, [data-occludable-job-id]"
        )
    );
  }

  function findDescription() {
    let best = null;
    let bestArea = 0;

    for (const sel of DESCRIPTION_SELECTORS) {
      for (const el of document.querySelectorAll(sel)) {
        if (!isVisible(el) || isInFeed(el)) {
          continue;
        }
        const text = textFromElement(el);
        if (text.length < MIN_DESC) {
          continue;
        }
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > bestArea) {
          bestArea = area;
          best = { el, sel, text };
        }
      }
    }

    return best;
  }

  function findHeaderZone(descEl) {
    if (!descEl) {
      return null;
    }

    const markers = [
      ".jobs-unified-top-card",
      ".job-details-jobs-unified-top-card",
      "[data-job-id]",
    ];

    for (let node = descEl; node && node !== document.body; node = node.parentElement) {
      for (const sel of markers) {
        if (node.matches && node.matches(sel)) {
          return node;
        }
      }
    }

    return descEl.parentElement;
  }

  function findTitle(descEl) {
    const zone = findHeaderZone(descEl);
    if (!zone || !descEl) {
      return "";
    }

    const descTop = descEl.getBoundingClientRect().top;

    for (const sel of TITLE_SELECTORS) {
      for (const el of zone.querySelectorAll(sel)) {
        const text = textFromElement(el);
        const rect = el.getBoundingClientRect();
        if (
          text &&
          text.length < 120 &&
          rect.bottom <= descTop + 64 &&
          !REJECTED_TITLES.has(text.toLowerCase()) &&
          !/^position\s+description$/i.test(text)
        ) {
          return text;
        }
      }
    }

    let best = "";
    let bestSize = 0;

    for (const el of zone.querySelectorAll("h1, h2")) {
      if (descEl.contains(el)) {
        continue;
      }

      const text = textFromElement(el);
      const rect = el.getBoundingClientRect();
      if (
        !text ||
        text.length >= 120 ||
        rect.bottom > descTop + 64 ||
        REJECTED_TITLES.has(text.toLowerCase())
      ) {
        continue;
      }

      const size = rect.width * rect.height;
      if (size > bestSize) {
        bestSize = size;
        best = text;
      }
    }

    return best;
  }

  function findCompany(descEl) {
    const zone = findHeaderZone(descEl);
    if (!zone || !descEl) {
      return "";
    }

    const descTop = descEl.getBoundingClientRect().top;

    for (const sel of COMPANY_SELECTORS) {
      for (const el of zone.querySelectorAll(sel)) {
        const text = textFromElement(el);
        const rect = el.getBoundingClientRect();
        if (
          text &&
          text.length < 200 &&
          rect.bottom <= descTop + 48 &&
          !/^employer\s+industry/i.test(text)
        ) {
          return text;
        }
      }
    }

    return "";
  }

  const desc = findDescription();
  const currentJobText = desc
    ? desc.text.substring(0, MAX_JOB_CHARS)
    : "";
  const currentJobTitle = desc ? findTitle(desc.el) : "";
  const currentCompanyName = desc ? findCompany(desc.el) : "";
  const currentJobDetectedAt = Date.now();

  return {
    ok: Boolean(currentJobText && currentJobText.trim()),
    text: currentJobText.substring(0, 5000),
    title: currentJobTitle,
    company: currentCompanyName,
    currentJobText,
    currentJobTitle,
    currentCompanyName,
    currentJobDetectedAt,
  };
})();
