const API = "http://127.0.0.1:8000/api";
const TOKEN_KEY = "admin_token";

/* -------------------------------------------------- */
/*  AUTH                                               */
/* -------------------------------------------------- */
function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function saveToken(t) {
  sessionStorage.setItem(TOKEN_KEY, t);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Admin-Token": getToken(),
  };
}

/* -------------------------------------------------- */
/*  VIEWS                                              */
/* -------------------------------------------------- */
const gateView      = document.getElementById("gateView");
const dashView      = document.getElementById("dashView");

function showGate(errorMsg) {
  gateView.classList.remove("hidden");
  dashView.classList.add("hidden");
  if (errorMsg) {
    const el = document.getElementById("gateError");
    el.textContent = errorMsg;
    el.classList.remove("hidden");
  }
}

function showDash() {
  gateView.classList.add("hidden");
  dashView.classList.remove("hidden");
  loadTickets();
}

/* -------------------------------------------------- */
/*  TOKEN GATE                                         */
/* -------------------------------------------------- */
document.getElementById("gateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = document.getElementById("tokenInput").value.trim();
  if (!token) return;

  const btn = document.getElementById("gateBtn");
  btn.disabled = true;
  btn.textContent = "Verifying…";

  try {
    // Verify token by hitting a real private endpoint
    const res = await fetch(`${API}/tickets`, {
      headers: { "X-Admin-Token": token },
    });

    if (res.status === 403) {
      document.getElementById("gateError").textContent = "Invalid token. Access denied.";
      document.getElementById("gateError").classList.remove("hidden");
      return;
    }

    // Token is valid — save and enter dashboard
    saveToken(token);
    showDash();

  } catch {
    document.getElementById("gateError").textContent = "Could not reach server.";
    document.getElementById("gateError").classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enter";
  }
});

/* -------------------------------------------------- */
/*  UTILS                                              */
/* -------------------------------------------------- */
function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function badgeClass(status) {
  return {
    "Open":        "badge-open",
    "In Progress": "badge-inprogress",
    "Closed":      "badge-closed",
  }[status] ?? "badge-default";
}

/* -------------------------------------------------- */
/*  STATS                                              */
/* -------------------------------------------------- */
function updateStats(tickets) {
  document.getElementById("statTotal").textContent      = tickets.length;
  document.getElementById("statOpen").textContent       = tickets.filter(t => t.status === "Open").length;
  document.getElementById("statInProgress").textContent = tickets.filter(t => t.status === "In Progress").length;
  document.getElementById("statClosed").textContent     = tickets.filter(t => t.status === "Closed").length;
}

/* -------------------------------------------------- */
/*  TICKET TABLE                                       */
/* -------------------------------------------------- */
let allTickets    = [];
let activeFilter  = "All";
let searchTimer   = null;

async function loadTickets() {
  try {
    const res = await fetch(`${API}/tickets/`, { headers: authHeaders() });

    // Token expired or invalid mid-session
    if (res.status === 403) { clearToken(); showGate("Session expired. Please log in again."); return; }

    allTickets = await res.json();
    updateStats(allTickets);
    renderTable(allTickets);
  } catch {
    renderTableError("Could not load tickets.");
  }
}

function applyFilters() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  let filtered = allTickets;

  if (activeFilter !== "All") {
    filtered = filtered.filter(t => t.status === activeFilter);
  }

  if (q) {
    filtered = filtered.filter(t =>
      t.ticket_id.toLowerCase().includes(q)      ||
      t.customer_name.toLowerCase().includes(q)  ||
      t.customer_email.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q)
    );
  }

  renderTable(filtered);
}

function renderTable(tickets) {
  const tbody = document.getElementById("ticketBody");
  tbody.innerHTML = "";

  if (!tickets.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-12 text-center text-sm text-slate-400">
          No tickets found.
        </td>
      </tr>`;
    return;
  }

  const frag = document.createDocumentFragment();
  tickets.forEach(t => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition";
    tr.innerHTML = `
      <td class="px-4 py-3 font-mono text-sm font-semibold text-slate-700">${esc(t.ticket_id)}</td>
      <td class="px-4 py-3 text-sm text-slate-800">${esc(t.customer_name)}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${esc(t.customer_email)}</td>
      <td class="px-4 py-3 text-sm text-slate-800">${esc(t.subject)}</td>
      <td class="px-4 py-3">
        <span class="badge ${badgeClass(t.status)}">${esc(t.status)}</span>
      </td>
      <td class="px-4 py-3 text-sm text-slate-500">${fmt(t.created_at)}</td>
    `;
    tr.addEventListener("click", () => openModal(t.ticket_id));
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function renderTableError(msg) {
  document.getElementById("ticketBody").innerHTML = `
    <tr><td colspan="6" class="px-4 py-12 text-center text-sm text-red-400">${msg}</td></tr>`;
}

// Safe escape — never use innerHTML with raw user data
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* -------------------------------------------------- */
/*  SEARCH & FILTER                                    */
/* -------------------------------------------------- */
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 280);
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("filter-active"));
    btn.classList.add("filter-active");
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

/* -------------------------------------------------- */
/*  MODAL — open                                       */
/* -------------------------------------------------- */
const modal         = document.getElementById("ticketModal");
const modalBackdrop = document.getElementById("modalBackdrop");
let   activeTicketId = null;

async function openModal(ticketId) {
  activeTicketId = ticketId;
  modal.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  // Reset
  document.getElementById("modalContent").classList.add("hidden");
  document.getElementById("modalLoader").classList.remove("hidden");
  document.getElementById("saveError").classList.add("hidden");
  document.getElementById("saveSuccess").classList.add("hidden");

  try {
    const res  = await fetch(`${API}/tickets/${ticketId}`, { headers: authHeaders() });
    if (res.status === 403) { clearToken(); closeModal(); showGate("Session expired."); return; }
    const data = await res.json();
    renderModal(data);
  } catch {
    document.getElementById("modalLoader").textContent = "Failed to load ticket.";
  }
}

function renderModal(t) {
  document.getElementById("modalTicketId").textContent  = t.ticket_id;
  document.getElementById("modalSubject").textContent   = t.subject;
  document.getElementById("modalCustomer").textContent  = t.customer_name;
  document.getElementById("modalEmail").textContent     = t.customer_email;
  document.getElementById("modalCreated").textContent   = fmt(t.created_at);
  document.getElementById("modalUpdated").textContent   = fmt(t.updated_at);
  document.getElementById("modalDescription").textContent = t.description;

  const badge = document.getElementById("modalStatusBadge");
  badge.textContent = t.status;
  badge.className   = "badge " + badgeClass(t.status);

  // Status dropdown — pre-select current status
  document.getElementById("statusSelect").value = t.status;

  // Notes
  const container = document.getElementById("modalNotes");
  const heading   = document.getElementById("notesHeading");
  container.innerHTML = "";

  const count = t.notes?.length ?? 0;
  heading.textContent = `NOTES HISTORY (${count})`;

  if (!count) {
    const p = document.createElement("p");
    p.className   = "text-sm text-slate-400";
    p.textContent = "No notes yet.";
    container.appendChild(p);
  } else {
    const frag = document.createDocumentFragment();
    t.notes.forEach(n => {
      const card = document.createElement("div");
      card.className = "note-card";

      const ts = document.createElement("p");
      ts.className   = "note-ts";
      ts.textContent = fmt(n.created_at);

      const txt = document.createElement("p");
      txt.className   = "note-text";
      txt.textContent = n.note_text;

      card.appendChild(ts);
      card.appendChild(txt);
      frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  document.getElementById("modalLoader").classList.add("hidden");
  document.getElementById("modalContent").classList.remove("hidden");
  document.getElementById("noteInput").value = "";
}

/* -------------------------------------------------- */
/*  MODAL — close                                      */
/* -------------------------------------------------- */
function closeModal() {
  modal.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  activeTicketId = null;
}

document.getElementById("closeModal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

/* -------------------------------------------------- */
/*  MODAL — save changes                               */
/* -------------------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", async () => {
  const status = document.getElementById("statusSelect").value;
  const note   = document.getElementById("noteInput").value.trim();
  const saveBtn = document.getElementById("saveBtn");
  const saveError   = document.getElementById("saveError");
  const saveSuccess = document.getElementById("saveSuccess");

  saveError.classList.add("hidden");
  saveSuccess.classList.add("hidden");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  try {
    const res = await fetch(`${API}/tickets/${activeTicketId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status, note: note || null }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Save failed");

    saveSuccess.classList.remove("hidden");

    // Re-fetch the ticket so notes and badge update live
    const refreshed = await fetch(`${API}/tickets/${activeTicketId}`, { headers: authHeaders() });
    renderModal(await refreshed.json());

    // Also refresh the table in background
    loadTickets();

  } catch (err) {
    saveError.textContent = err.message;
    saveError.classList.remove("hidden");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save changes";
  }
});

/* -------------------------------------------------- */
/*  REFRESH BUTTON                                     */
/* -------------------------------------------------- */
document.getElementById("refreshBtn").addEventListener("click", loadTickets);

/* -------------------------------------------------- */
/*  BOOT                                               */
/* -------------------------------------------------- */
// If token already in session (e.g. page refresh), go straight to dashboard
if (getToken()) {
  showDash();
} else {
  showGate();
}