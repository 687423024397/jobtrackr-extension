/**********************
 * 1) Small helpers
 **********************/
const HOST = location.hostname;
const SUCCESS_STRINGS = [
  "Your application has been submitted!",
  "Application submitted",
  "You successfully applied"
];
const CLEAN_LIMIT = 140;

const clean = (s = "") => s.replace(/\s+/g, " ").trim();
const looksLikeCss = (s = "") => /{.*:.*;/.test(s);

function getText(selectors = []) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (["STYLE", "SCRIPT"].includes(el.tagName)) continue;

    let v = el.innerText || el.textContent || el.content || "";
    v = clean(v);
    if (!v) continue;
    if (v.length > CLEAN_LIMIT || looksLikeCss(v)) continue;

    // skip invisible
    if (el.offsetParent === null && el.getClientRects().length === 0) continue;
    return v;
  }
  return "";
}

function stripTitle(t) {
  return clean(t.replace(/-+\s*job post$/i, ""));
}

function stripCompany(c) {
  // often "Company · rating" or has address – keep first chunk
  return clean(c.split("\n")[0].split("·")[0]);
}

function getFromLDJSON() {
  try {
    const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
    for (const b of blocks) {
      const parsed = JSON.parse(b.textContent.trim());
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
 * 2) Extract job info on list/detail page
 **********************/
function extractJobData() {
  // 1. Structured
  let { title, company } = getFromLDJSON();

  // 2. Meta fallbacks
  if (!title) title = getText(['meta[property="og:title"]', 'meta[name="twitter:title"]']);

  // 3. DOM fallbacks (new + old Indeed)
  if (!title) {
    title = getText([
      '.jobsearch-JobInfoHeader-title-container h1',          // ← from your screenshot
      '.jobsearch-JobInfoHeader-title-container',              // container itself
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1.jobsearch-JobInfoHeader-title',
      'h1'
    ]);
  }

  if (!company) {
    company = getText([
      '[data-testid="jobsearch-CompanyInfoContainer"] a',      // ← from your screenshot
      '[data-testid="jobsearch-CompanyInfoContainer"]',
      '[data-testid="inlineHeader-companyName"] a',
      'a[href*="/cmp/"]',
      '.css-1ygeylu a',
      '[data-company-name]',
      '.icl-u-lg-mr--sm span',
      '.jobsearch-CompanyInfoWithoutHeaderImage div'
    ]);
  }

  title = title ? stripTitle(title) : "Unknown Title";
  company = company ? stripCompany(company) : "Unknown Company";

  return {
    title,
    company,
    source: location.hostname,
    status: "Applied",
    url: location.href
  };
}

/**********************
 * 3) Save/restore pending job across nav
 **********************/
function savePending(job) {
  chrome.storage.local.set({ pendingJob: job });
}

function getPending(cb) {
  chrome.storage.local.get("pendingJob", ({ pendingJob }) => {
    cb(pendingJob);
    chrome.storage.local.remove("pendingJob");
  });
}

/**********************
 * 4) Dialog
 **********************/
function showDialog(message = "✅ Job saved!") {
  if (document.getElementById("job-tracker-dialog")) return;
  const div = document.createElement("div");
  div.id = "job-tracker-dialog";
  div.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 1px solid #ccc;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      font-family: sans-serif;
      font-size: 15px;
      z-index: 99999;
    ">
      ${message}
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 6000);
}

/**********************
 * 5) Hook “Apply” buttons
 **********************/
function hookApplyButtons() {
  const buttons = [...document.querySelectorAll("button, a")].filter((el) => {
    const txt = clean(el.innerText || el.textContent || "");
    return /apply now|easy apply|apply on company site/i.test(txt);
  });

  buttons.forEach((btn) => {
    if (btn.dataset.jtHooked) return;
    btn.dataset.jtHooked = "1";

    btn.addEventListener(
      "click",
      () => {
        const job = extractJobData();
        savePending(job);
        console.log("[Job Tracker] pending saved on Apply click:", job);
      },
      { capture: true } // run before navigation
    );
  });
}

/**********************
 * 6) Observe DOM changes (re-hook buttons)
 **********************/
const hookObserver = new MutationObserver(hookApplyButtons);
hookObserver.observe(document.body, { childList: true, subtree: true });
hookApplyButtons(); // first run

/**********************
 * 7) Capture on load (detail page)
 **********************/
(function initialCapture() {
  if (HOST.includes("indeed.") && document.querySelector("h1")) {
    const job = extractJobData();
    savePending(job);
    console.log("[Job Tracker] pending saved on load:", job);
  }
})();

/**********************
 * 8) Detect confirmation page & finalize
 **********************/
const confirmObserver = new MutationObserver(() => {
  const h1 = document.querySelector("h1");
  if (h1 && SUCCESS_STRINGS.includes(h1.innerText.trim())) {
    console.log("[Job Tracker] ✅ confirmation detected");

    getPending((pendingJob) => {
      const job = pendingJob || extractJobData();
      chrome.runtime.sendMessage({ type: "JOB_SUBMITTED", job });
      showDialog(`✅ Saved "${job.title}" at ${job.company}`);
    });

    confirmObserver.disconnect();
  }
});

confirmObserver.observe(document.body, { childList: true, subtree: true });
