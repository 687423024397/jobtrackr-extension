/**********************
 * 1) Small helpers
 **********************/
const HOST = location.hostname;
const SUCCESS_STRINGS = [
  "Your application has been submitted!",
  "Application submitted",
  "You successfully applied",
  "You’ve successfully applied",
  "You applied"
];
const CLEAN_LIMIT = 140;

const clean = (s = "") => s.replace(/\s+/g, " ").trim();
const looksLikeCss = (s = "") => /{.*:.*;/.test(s);

function getText(selectors = []) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el || ["STYLE", "SCRIPT"].includes(el.tagName)) continue;
    let v = el.innerText || el.textContent || el.content || "";
    v = clean(v);
    if (!v || v.length > CLEAN_LIMIT || looksLikeCss(v)) continue;
    if (el.offsetParent === null && el.getClientRects().length === 0) continue;
    return v;
  }
  return "";
}

function stripTitle(t) {
  return clean(t.replace(/-+\s*job post$/i, ""));
}

function stripCompany(c) {
  return clean(c.split("\n")[0].split("·")[0]);
}

function getFromLDJSON() {
  try {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const block of scripts) {
      const parsed = JSON.parse(block.textContent.trim());
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const jp = arr.find(o => o && o["@type"] === "JobPosting");
      if (jp) {
        return {
          title: jp.title || "",
          company: jp.hiringOrganization?.name || ""
        };
      }
    }
  } catch (_) {}
  return { title: "", company: "" };
}

/**********************
 * 2) Extract job data
 **********************/
function extractJobData() {
  let title = "", company = "";

  if (HOST.includes("linkedin.com")) {
    // primary selectors for title
    title = getText([
      "h1.topcard__title",
      "h2.jobs-unified-top-card__job-title",
      ".topcard__content-left h1"
    ]);

    // primary selectors for company (added the new one)
    company = getText([
      ".topcard__org-name-link",
      "a.jobs-unified-top-card__company-name-link",
      ".jobs-unified-top-card__company-name",
      ".job-details-jobs-unified-top-card__company-name"
    ]);

    // fallback using the “display-flex…mt2” wrapper
    const wrap = document.querySelector(
      "div.display-flex.justify-space-between.flex-wrap.mt2"
    );
    if (wrap && (!title || !company)) {
      const parts = clean(wrap.innerText).split("·");
      title   = title   || clean(parts[0] || "");
      company = company || clean(parts[1] || "");
    }
  }
  else if (HOST.includes("indeed.")) {
    const ld = getFromLDJSON();
    title   = ld.title;
    company = ld.company;

    if (!title) {
      title = getText([
        'meta[property="og:title"]',
        'meta[name="twitter:title"]'
      ]);
    }
    if (!title) {
      title = getText([
        '.jobsearch-JobInfoHeader-title-container h1',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        'h1.jobsearch-JobInfoHeader-title',
        'h1'
      ]);
    }
    if (!company) {
      company = getText([
        '[data-testid="jobsearch-CompanyInfoContainer"] a',
        'a[href*="/cmp/"]',
        '.jobsearch-CompanyInfoWithoutHeaderImage div'
      ]);
    }
  }

  title   = title   ? stripTitle(title)     : "Unknown Title";
  company = company ? stripCompany(company) : "Unknown Company";

  return {
    title,
    company,
    source: HOST,
    status: "Applied",
    url: location.href
  };
}

/**********************
 * 3) save/get pending
 **********************/
function savePending(job) {
  if (chrome?.storage?.local) {
    chrome.storage.local.set({ pendingJob: job });
  }
}
function getPending(cb) {
  if (chrome?.storage?.local) {
    chrome.storage.local.get("pendingJob", ({ pendingJob }) => {
      cb(pendingJob);
      chrome.storage.local.remove("pendingJob");
    });
  } else cb(null);
}

/**********************
 * 4) In-page toast
 **********************/
function showDialog(message = "✅ Job saved!") {
  if (document.getElementById("job-tracker-dialog")) return;
  const div = document.createElement("div");
  div.id = "job-tracker-dialog";
  div.innerHTML = `
    <div style="
      position: fixed;
      top: 20px; left: 50%;
      transform: translateX(-50%);
      background: white; border: 1px solid #ccc;
      padding: 16px 24px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      font-family: sans-serif; font-size: 15px;
      z-index: 99999;
    ">
      ${message}
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 6000);
}

/**********************
 * 5) Global “Apply” click handler
 **********************/
document.body.addEventListener("click", e => {
  let el = e.target;
  while (el && el !== document.body) {
    const txt = clean(el.innerText || el.textContent || "");
    const isApplyButton = el.matches("button, a");
    const isLinkedInWrapper = el.classList?.contains("jobs-s-apply");
    if ((isApplyButton || isLinkedInWrapper) &&
        /apply now|easy apply|apply on company site|submit application|apply/i.test(txt)
    ) {
      const job = extractJobData();

      if (HOST.includes("linkedin.com")) {
        // LinkedIn: immediate confirm
        const ok = window.confirm(
          `Track this application?\n\n${job.title}\n at ${job.company}`
        );
        if (ok) {
          chrome.runtime.sendMessage({ type: "JOB_SUBMITTED", job });
          showDialog(`✅ Saved "${job.title}" at ${job.company}`);
        }
      } else {
        // Indeed: old pending→confirm flow
        savePending(job);
        console.log("[Job Tracker] pending saved on click:", job);
      }
      break;
    }
    el = el.parentElement;
  }
}, true);

/**********************
 * 6) Initial capture (Indeed only)
 **********************/
if (HOST.includes("indeed.") && document.querySelector("h1")) {
  savePending(extractJobData());
}

/**********************
 * 7) Confirm observer (Indeed only)
 **********************/
if (HOST.includes("indeed.")) {
  const confObs = new MutationObserver(() => {
    const header = document.querySelector("h1")?.innerText.trim();
    if (header && SUCCESS_STRINGS.includes(header)) {
      getPending(pending => {
        const job = pending || extractJobData();
        chrome.runtime.sendMessage({ type: "JOB_SUBMITTED", job });
        showDialog(`✅ Saved "${job.title}" at ${job.company}`);
      });
      confObs.disconnect();
    }
  });
  confObs.observe(document.body, { childList: true, subtree: true });
}
