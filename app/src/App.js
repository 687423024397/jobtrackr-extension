import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Stack,
  TextField,
  Button,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  LinearProgress,
  Divider,
  Paper,
  CssBaseline,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from "@mui/icons-material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

function AppInner() {
  const [jobs, setJobs] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    source: "",
    notes: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOption, setSortOption] = useState("Newest");

  // --- helpers for age ---
  const safeAppliedAt = (job) =>
    job.appliedAt ? new Date(job.appliedAt).getTime() : job.id; // fallback to id timestamp
  const ageMs = (job) => Date.now() - safeAppliedAt(job);

  const formatDuration = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Load jobs on mount
  useEffect(() => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.get("jobs", (result) => {
        if (result.jobs) setJobs(result.jobs);
      });
    }
  }, []);

  // Save jobs whenever they change
  useEffect(() => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.set({ jobs });
    }
  }, [jobs]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Manual add -> set appliedAt
  const addJob = (e) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();
    const newJob = {
      id: Date.now(),
      title: formData.title.trim(),
      company: formData.company.trim(),
      source: formData.source.trim(),
      notes: formData.notes?.trim() || "",
      status: "Applied",
      appliedAt: nowIso,
    };
    if (!newJob.title || !newJob.company || !newJob.source) return;
    setJobs([newJob, ...jobs]);
    setFormData({ title: "", company: "", source: "", notes: "" });
  };

  const updateStatus = (id, newStatus) => {
    setJobs(jobs.map((j) => (j.id === id ? { ...j, status: newStatus } : j)));
  };

  const deleteJob = (id) => setJobs(jobs.filter((j) => j.id !== id));

  // Filtering + Sorting
  const filteredJobs = useMemo(() => {
    const out = jobs
      .filter((job) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          (job.notes || "").toLowerCase().includes(q);
        const matchesStatus = statusFilter === "All" || job.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortOption === "Newest") return b.id - a.id;
        if (sortOption === "Title") return a.title.localeCompare(b.title);
        if (sortOption === "Company") return a.company.localeCompare(b.company);
        if (sortOption === "Longest Waiting") return ageMs(b) - ageMs(a);
        if (sortOption === "Shortest Waiting") return ageMs(a) - ageMs(b);
        return 0;
      });
    return out;
  }, [jobs, searchQuery, statusFilter, sortOption]);

  const statusColor = (status) => {
    switch (status) {
      case "Interview":
        return "success";
      case "Offer":
        return "warning";
      case "Rejected":
        return "error";
      case "Closed":
        return "default";
      case "Applied":
      default:
        return "primary";
    }
  };

  return (
    <Box
      sx={{
        bgcolor: (t) => (t.palette.mode === "light" ? t.palette.grey[50] : t.palette.background.default),
        minHeight: "100vh",
        py: 5,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h4" fontWeight={700}>
            📋 Job Tracker
          </Typography>

          <HeaderRight />
        </Stack>

        {/* Add form */}
        <Paper elevation={3} sx={{ p: 2.5, mb: 2.5 }}>
          <form onSubmit={addJob}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Job Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Source (e.g. LinkedIn)"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={9}>
                <TextField
                  label="Notes (optional)"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3} display="flex" alignItems="stretch">
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<AddIcon />}
                >
                  Add Job
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        {/* Filters */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          mb={2.5}
        >
          <TextField
            placeholder="Search title / company / notes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Applied">Applied</MenuItem>
              <MenuItem value="Interview">Interview</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
              <MenuItem value="Offer">Offer</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 190 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              label="Sort"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <MenuItem value="Newest">Newest First</MenuItem>
              <MenuItem value="Title">Title A–Z</MenuItem>
              <MenuItem value="Company">Company A–Z</MenuItem>
              <MenuItem value="Longest Waiting">⏳ Longest Waiting</MenuItem>
              <MenuItem value="Shortest Waiting">⏱ Shortest Waiting</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* List */}
        {filteredJobs.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            No matching jobs found.
          </Paper>
        ) : (
          <Stack spacing={2}>
            {filteredJobs.map((job) => {
              const appliedTs = safeAppliedAt(job);
              const age = Date.now() - appliedTs;
              const since = formatDuration(age);
              const pct = Math.max(0, Math.min(100, Math.round((age / (60 * 864e5)) * 100)));

              return (
                <Card key={job.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardHeader
                    sx={{ pb: 1.5 }}
                    title={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6">{job.title}</Typography>
                        <Chip
                          size="small"
                          color={statusColor(job.status)}
                          label={job.status}
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                    }
                    action={
                      <IconButton
                        aria-label="delete"
                        color="error"
                        onClick={() => deleteJob(job.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <Grid container spacing={1.2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Company
                        </Typography>
                        <Typography>{job.company}</Typography>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Source
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" color="primary" variant="outlined" label={job.source} />
                          {job.url ? (
                            <Typography
                              component="a"
                              href={job.url}
                              target="_blank"
                              rel="noreferrer"
                              sx={{ textDecoration: "none" }}
                            >
                              Open ↗
                            </Typography>
                          ) : null}
                        </Stack>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Applied
                        </Typography>
                        <Typography>
                          {job.appliedAt ? new Date(job.appliedAt).toLocaleString() : "—"}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Waiting
                        </Typography>
                        <Chip size="small" label={`⏳ ${since}`} />
                      </Grid>

                      {job.notes && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Notes
                          </Typography>
                          <Typography>{job.notes}</Typography>
                        </Grid>
                      )}
                    </Grid>

                    <Box sx={{ mt: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {pct}% of a 60-day window
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>Update Status</InputLabel>
                      <Select
                        label="Update Status"
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value)}
                      >
                        <MenuItem value="Applied">Applied</MenuItem>
                        <MenuItem value="Interview">Interview</MenuItem>
                        <MenuItem value="Rejected">Rejected</MenuItem>
                        <MenuItem value="Offer">Offer</MenuItem>
                        <MenuItem value="Closed">Closed</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Container>
    </Box>
  );
}


function App() {
  const [mode, setMode] = useState(() => localStorage.getItem("mui-mode") || "light");

  useEffect(() => {
    localStorage.setItem("mui-mode", mode);
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === "light" ? "#2563eb" : "#60a5fa" },
        },
        shape: { borderRadius: 16 }, // global round corners
        components: {
          MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
          MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
          MuiButton: { styleOverrides: { root: { borderRadius: 12, textTransform: "none" } } },
          MuiTextField: { defaultProps: { variant: "outlined" } },
          MuiSelect: { defaultProps: { variant: "outlined" } },
        },
        typography: {
          fontFamily:
            'Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
        },
      }),
    [mode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ModeContext.Provider value={{ mode, setMode }}>
        <AppInner />
      </ModeContext.Provider>
    </ThemeProvider>
  );
}

const ModeContext = React.createContext({ mode: "light", setMode: () => {} });

function HeaderRight() {
  const { mode, setMode } = React.useContext(ModeContext);
  const isLight = mode === "light";
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {isLight ? "Light" : "Dark"} mode
      </Typography>
      <IconButton
        size="small"
        onClick={() => setMode(isLight ? "dark" : "light")}
        color={isLight ? "default" : "primary"}
        sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2 }}
        aria-label="toggle dark mode"
      >
        {isLight ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Stack>
  );
}

export default App;
