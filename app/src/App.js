import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [jobs, setJobs] = useState([]);
  const [formData, setFormData] = useState({ title: "", company: "", source: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOption, setSortOption] = useState("Newest");

  // Load jobs from storage on mount
  useEffect(() => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.get("jobs", (result) => {
        if (result.jobs) setJobs(result.jobs);
      });
    }
  }, []);

  // Save jobs to storage whenever they change
  useEffect(() => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.set({ jobs });
    }
  }, [jobs]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addJob = (e) => {
    e.preventDefault();
    const newJob = {
      id: Date.now(),
      title: formData.title,
      company: formData.company,
      source: formData.source,
      status: "Applied",
    };
    setJobs([newJob, ...jobs]);
    setFormData({ title: "", company: "", source: "" });
  };

  const updateStatus = (id, newStatus) => {
    setJobs(
      jobs.map((job) => (job.id === id ? { ...job, status: newStatus } : job))
    );
  };

  const deleteJob = (id) => {
    setJobs(jobs.filter((job) => job.id !== id));
  };

  const filteredJobs = jobs
    .filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOption === "Newest") return b.id - a.id;
      if (sortOption === "Title") return a.title.localeCompare(b.title);
      if (sortOption === "Company") return a.company.localeCompare(b.company);
      return 0;
    });

  return (
    <div className="app-container">
      <header className="header">
        <h1>📋 Job Tracker</h1>
        <div className="auth-box">
          <span>Welcome to Job Tracker!</span>
        </div>
      </header>

      <form onSubmit={addJob} className="job-form">
        <input
          type="text"
          name="title"
          placeholder="Job Title"
          value={formData.title}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="company"
          placeholder="Company"
          value={formData.company}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="source"
          placeholder="Source (e.g. LinkedIn)"
          value={formData.source}
          onChange={handleChange}
          required
        />
        <button type="submit">➕ Add Job</button>
      </form>

      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option>Applied</option>
          <option>Interview</option>
          <option>Rejected</option>
          <option>Offer</option>
        </select>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="Newest">Newest First</option>
          <option value="Title">Title A–Z</option>
          <option value="Company">Company A–Z</option>
        </select>
      </div>

      {filteredJobs.length === 0 ? (
        <p className="empty-state">No matching jobs found.</p>
      ) : (
        filteredJobs.map((job) => (
          <div className="job-card" key={job.id}>
            <h2>{job.title}</h2>
            <p><strong>Company:</strong> {job.company}</p>
            <p><strong>Status:</strong> {job.status}</p>
            <p><strong>Source:</strong> {job.source}</p>

            <select
              value={job.status}
              onChange={(e) => updateStatus(job.id, e.target.value)}
            >
              <option>Applied</option>
              <option>Interview</option>
              <option>Rejected</option>
              <option>Offer</option>
            </select>

            <button className="delete-btn" onClick={() => deleteJob(job.id)}>
              🗑️ Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
