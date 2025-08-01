chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "JOB_SUBMITTED") {
    const job = msg.job;

    chrome.storage.local.get(["jobs"], (data) => {
      const jobs = data.jobs || [];
      jobs.unshift({ ...job, id: Date.now(), status: "Applied" });
      chrome.storage.local.set({ jobs }, () => {
        console.log("✅ Job saved.");

        // 🟢 Show a Chrome notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "✅ Job Saved!",
          message: `${job.title} at ${job.company} has been logged from ${job.source}.`,
          priority: 2,
        });
      });
    });
  }
});
