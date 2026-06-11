const API = "https://support-crm-production-cb3b.up.railway.app/api";
/* -------------------------------------------------- */
/*  STATE                                              */
/* -------------------------------------------------- */
let currentFilter = "All";
let searchTimer   = null;

/* -------------------------------------------------- */
/*  UTILS                                              */
/* -------------------------------------------------- */
function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

function badgeClass(status) {
  return {
    "Open":        "badge-open",
    "In Progress": "badge-inprogress",
    "Closed":      "badge-closed"
  }[status] ?? "badge-default";
}

function setBtn(btn, loading, defaultText) {
  btn.disabled  = loading;
  btn.textContent = loading ? "Please wait…" : defaultText;
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearError(el) {
  el.textContent = "";
  el.classList.add("hidden");
}

/* -------------------------------------------------- */
/*  CREATE TICKET                                      */
/* -------------------------------------------------- */
const submitForm    = document.getElementById("submitForm");
const submitBtn     = document.getElementById("submitBtn");
const submitSuccess = document.getElementById("submitSuccess");
const submitError   = document.getElementById("submitError");
const newTicketId   = document.getElementById("newTicketId");

submitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError(submitError);
  submitSuccess.classList.add("hidden");
  setBtn(submitBtn, true, "Submit Ticket");

  const payload = {
    customer_name:  document.getElementById("customer_name").value.trim(),
    customer_email: document.getElementById("customer_email").value.trim(),
    subject:        document.getElementById("subject").value.trim(),
    description:    document.getElementById("description").value.trim(),
  };

  try {
    const res  = await fetch(`${API}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.detail || "Failed to create ticket");

    // Show success — never pass raw create response to displayTicket
    // (create returns {ticket_id, created_at, message} — not a full ticket object)
    newTicketId.textContent = data.ticket_id;
    submitSuccess.classList.remove("hidden");
    submitForm.reset();

  } catch (err) {
    showError(submitError, err.message);
  } finally {
    setBtn(submitBtn, false, "Submit Ticket");
  }
});

/* -------------------------------------------------- */
/*  LOOKUP TICKET                                      */
/* -------------------------------------------------- */
const lookupForm   = document.getElementById("lookupForm");
const lookupBtn    = document.getElementById("lookupBtn");
const lookupError  = document.getElementById("lookupError");
const lookupResult = document.getElementById("lookupResult");

lookupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError(lookupError);
  lookupResult.classList.add("hidden");
  setBtn(lookupBtn, true, "Track Ticket");

  const ticketId = document.getElementById("lookup_ticket_id").value.trim();
  const email    = document.getElementById("lookup_email").value.trim();

  try {
    const res  = await fetch(
      `${API}/tickets/lookup?ticket_id=${encodeURIComponent(ticketId)}&email=${encodeURIComponent(email)}`
    );
    const data = await res.json();

    if (!res.ok) throw new Error(data.detail || "Unable to locate ticket");

    renderLookupResult(data);

  } catch (err) {
    showError(lookupError, err.message);
  } finally {
    setBtn(lookupBtn, false, "Track Ticket");
  }
});

function renderLookupResult(ticket) {
  // Basic fields
  document.getElementById("result_ticket_id").textContent  = ticket.ticket_id;
  document.getElementById("result_customer").textContent   = ticket.customer_name;
  document.getElementById("result_email").textContent      = ticket.customer_email;
  document.getElementById("result_subject").textContent    = ticket.subject;
  document.getElementById("result_description").textContent = ticket.description;
  document.getElementById("result_created").textContent    = fmt(ticket.created_at);

  // Status badge
  const badge = document.getElementById("statusBadge");
  badge.textContent = ticket.status;
  badge.className   = "badge " + badgeClass(ticket.status);

  // Notes — build with DocumentFragment to avoid XSS and repeated reflows
  const container = document.getElementById("notesContainer");
  const noteCount = document.getElementById("noteCount");
  container.innerHTML = "";

  if (!ticket.notes || ticket.notes.length === 0) {
    noteCount.textContent = "0 updates";
    const empty = document.createElement("p");
    empty.className   = "empty-notes";
    empty.textContent = "No updates yet.";
    container.appendChild(empty);
  } else {
    noteCount.textContent = `${ticket.notes.length} update${ticket.notes.length > 1 ? "s" : ""}`;

    const frag = document.createDocumentFragment();
    ticket.notes.forEach(note => {
      const card = document.createElement("div");
      card.className = "note-card";

      const ts = document.createElement("p");
      ts.className   = "note-ts";
      ts.textContent = fmt(note.created_at);

      const txt = document.createElement("p");
      txt.className   = "note-text";
      txt.textContent = note.note_text; // textContent — safe, no XSS

      card.appendChild(ts);
      card.appendChild(txt);
      frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  lookupResult.classList.remove("hidden");
}
