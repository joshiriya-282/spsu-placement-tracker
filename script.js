const STORAGE_KEY = "cpdms-drives-v1";
const seedDrives = [
  { id: "DRV-2048", company: "Northstar Technologies", role: "Graduate Software Engineer", package: "8.5", cgpa: "7.0", deadline: "2026-11-12" },
  { id: "DRV-2047", company: "Veridian Analytics", role: "Data Analyst", package: "7.2", cgpa: "6.5", deadline: "2026-11-20" },
  { id: "DRV-2046", company: "Fieldstone Labs", role: "Product Designer", package: "9.0", cgpa: "7.5", deadline: "2026-10-28" }
];
const form = document.getElementById("driveForm");
const modal = document.getElementById("modalBackdrop");
const search = document.getElementById("driveSearch");
let drives = loadDrives();
let activeFilter = "All";
let toastTimer;

function loadDrives() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDrives));
      return [...seedDrives];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...seedDrives];
  } catch {
    return [...seedDrives];
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function getStatus(drive) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${drive.deadline}T00:00:00`);
  if (Number.isNaN(deadline.getTime()) || deadline < today) return "Closed";
  const daysLeft = Math.ceil((deadline - today) / 86400000);
  return daysLeft <= 7 ? "Closing soon" : "Open";
}

function render() {
  const openCount = drives.filter((drive) => getStatus(drive) !== "Closed").length;
  const closingCount = drives.filter((drive) => getStatus(drive) === "Closing soon").length;
  document.getElementById("openDriveCount").textContent = openCount;
  document.getElementById("closingCount").textContent = closingCount;
  document.getElementById("driveTotal").textContent = drives.length;
  document.getElementById("allDriveCount").textContent = drives.length;
  document.getElementById("navDriveCount").textContent = drives.length;
  document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  const localToday = new Date();
  localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset());
  document.getElementById("deadline").min = localToday.toISOString().slice(0, 10);
  renderDrives();
}

function renderDrives() {
  const query = search.value.trim().toLowerCase();
  const visible = drives.filter((drive) => {
    const status = getStatus(drive);
    const statusMatch = activeFilter === "All" || status === activeFilter;
    return statusMatch && `${drive.company} ${drive.role}`.toLowerCase().includes(query);
  });
  const rows = document.getElementById("driveRows");
  rows.innerHTML = visible.map((drive) => {
    const status = getStatus(drive);
    const statusClass = status === "Open" ? "badge-open" : status === "Closing soon" ? "badge-closing" : "badge-closed";
    const deadline = new Date(`${drive.deadline}T00:00:00`);
    const formatted = Number.isNaN(deadline.getTime()) ? "—" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(deadline);
    return `<tr><td><span class="company-name">${escapeHTML(drive.company)}</span><small class="role-name">${escapeHTML(drive.role)}</small></td><td><span class="package-value">${escapeHTML(drive.package)} LPA</span></td><td>${escapeHTML(drive.cgpa)}</td><td><span class="deadline-value">${escapeHTML(formatted)}</span></td><td><span class="drive-badge ${statusClass}">${escapeHTML(status)}</span></td></tr>`;
  }).join("");
  document.getElementById("emptyState").hidden = visible.length > 0;
  rows.hidden = visible.length === 0;
  document.getElementById("resultsSummary").textContent = `Showing ${visible.length} of ${drives.length} drive${drives.length === 1 ? "" : "s"}`;
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".tab").forEach((tab) => {
    const selected = tab.dataset.filter === filter;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  renderDrives();
}

function openModal() {
  form.reset();
  clearErrors();
  document.getElementById("formFeedback").hidden = true;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("companyName").focus();
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

function clearErrors() {
  const fields = ["companyName", "jobRole", "packageLpa", "minCgpa", "deadline"];
  fields.forEach((field) => document.getElementById(field).removeAttribute("aria-invalid"));
  ["companyError", "roleError", "packageError", "cgpaError", "deadlineError"].forEach((id) => { document.getElementById(id).textContent = ""; });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showSection(section) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.nav === section));
  const sectionName = section === "drives" ? "Placement drives" : section === "applications" ? "Applications" : section === "companies" ? "Companies" : "Overview";
  document.getElementById("currentPage").textContent = sectionName;
  const target = section === "overview" ? document.getElementById("overview") : document.getElementById(section);
  target?.scrollIntoView({ behavior: "smooth" });
}

document.getElementById("openCreate").addEventListener("click", openModal);
document.getElementById("sectionCreate").addEventListener("click", openModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
document.querySelectorAll(".nav-item").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); showSection(link.dataset.nav); }));
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setFilter(tab.dataset.filter)));
search.addEventListener("input", renderDrives);
document.getElementById("resetFilters").addEventListener("click", () => { search.value = ""; setFilter("All"); });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = {
    company: document.getElementById("companyName").value.trim(),
    role: document.getElementById("jobRole").value.trim(),
    package: document.getElementById("packageLpa").value,
    cgpa: document.getElementById("minCgpa").value,
    deadline: document.getElementById("deadline").value
  };
  const localToday = new Date();
  localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset());
  const todayISO = localToday.toISOString().slice(0, 10);
  const errors = {
    company: values.company ? "" : "Company name is required.",
    role: values.role ? "" : "Job role is required.",
    package: Number(values.package) > 0 ? "" : "Package must be greater than 0 LPA.",
    cgpa: values.cgpa !== "" && Number(values.cgpa) >= 0 && Number(values.cgpa) <= 10 ? "" : "Minimum CGPA must be between 0 and 10.",
    deadline: values.deadline && values.deadline > todayISO ? "" : "Deadline must be a future date."
  };
  const errorIds = { company: "companyError", role: "roleError", package: "packageError", cgpa: "cgpaError", deadline: "deadlineError" };
  const fieldIds = { company: "companyName", role: "jobRole", package: "packageLpa", cgpa: "minCgpa", deadline: "deadline" };
  Object.entries(errors).forEach(([key, message]) => {
    document.getElementById(errorIds[key]).textContent = message;
    document.getElementById(fieldIds[key]).setAttribute("aria-invalid", String(Boolean(message)));
  });
  const invalid = Object.keys(errors).find((key) => errors[key]);
  const feedback = document.getElementById("formFeedback");
  if (invalid) {
    feedback.hidden = true;
    document.getElementById(fieldIds[invalid]).focus();
    return;
  }
  const drive = { id: `DRV-${Date.now().toString().slice(-6)}`, ...values, createdAt: new Date().toISOString() };
  try {
    const nextDrives = [drive, ...drives];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrives));
    drives = nextDrives;
    render();
    closeModal();
    showToast(`Drive ${drive.id} created successfully.`);
  } catch {
    feedback.classList.add("error");
    feedback.textContent = "We could not save your changes. Please try again.";
    feedback.hidden = false;
  }
});

render();