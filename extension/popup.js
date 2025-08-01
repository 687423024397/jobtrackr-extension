// Ask content script for job data
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, "GET_JOB_DATA", (response) => {
    if (chrome.runtime.lastError || !response) {
      document.getElementById("title").innerText = "N/A";
      document.getElementById("company").innerText = "N/A";
      document.getElementById("source").innerText = "N/A";
      return;
    }

    // Fill in popup
    document.getElementById("title").innerText = response.title;
    document.getElementById("company").innerText = response.company;
    document.getElementById("source").innerText = response.source;

    // Save to localStorage
    document.getElementById("saveBtn").addEventListener("click", () => {
      chrome.storage.local.get(["jobs"], (data) => {
        const jobs = data.jobs || [];
        jobs.unshift({ ...response, id: Date.now(), status: "Applied" });
        chrome.storage.local.set({ jobs }, () => {
          alert("Saved!");
        });
      });
    });
  });
});
