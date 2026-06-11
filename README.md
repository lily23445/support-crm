![Python](https://img.shields.io/badge/Python-3.13-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![SQLite](https://img.shields.io/badge/SQLite-Database-lightgrey)
![Railway](https://img.shields.io/badge/Deployed-Railway-purple)

# Support CRM

A full-stack customer support ticketing system built with **FastAPI**, **SQLite**, and **HTML + Tailwind CSS**.

The system has two distinct interfaces: a **public customer portal** where users submit and track their own tickets, and a **private admin dashboard** secured by a token header where support staff manage all tickets.

---

## Live Demo

- **Frontend:** [https://support-crm-frontend-production.up.railway.app/admin.html]
                [https://support-crm-frontend-production.up.railway.app/public.html]
- **Backend API:** [https://support-crm-production-cb3b.up.railway.app/docs]

---

## Screenshots

### Customer Portal
![Customer Portal](screenshots/customer-portal.png)

### Admin Dashboard
![Admin Dashboard](screenshots/admin-dashboard.png)

---

## Features

- Submit support tickets as a customer
- Track tickets using Ticket ID + Email (no account needed)
- Admin dashboard for full ticket management
- Ticket status workflow (Open → In Progress → Closed)
- Internal support notes per ticket
- Search and filtering across all tickets
- Environment-based admin authentication via `X-Admin-Token`
- REST API documentation via Swagger UI at `/docs`

---

## Architecture

```
Frontend (HTML + Tailwind CSS + Vanilla JS)
                ↓ fetch()
        FastAPI REST API
                ↓ SQLAlchemy ORM
          SQLite Database

Deployment:
  Frontend  → Railway Static Site
  Backend   → Railway FastAPI Service
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13 + FastAPI |
| Database | SQLite via SQLAlchemy ORM |
| Frontend | HTML + Tailwind CSS + Vanilla JS |
| Auth | `X-Admin-Token` header (set via `.env`) |
| Deployment | Railway.app |

---

## Project Structure

```
support-crm/
├── frontend/
│   ├── public.html          # Customer portal — submit & track tickets
│   └── admin.html          # Admin dashboard — manage all tickets
├── routers/
│   └── tickets.py          # All API routes (public + admin)
├── main.py                 # FastAPI app entry point, CORS config
├── models.py               # SQLAlchemy models (Ticket, Note)
├── schemas.py              # Pydantic request/response schemas
├── database.py             # DB engine, session, Base
├── enums.py                # TicketStatus enum
├── security.py             # X-Admin-Token verification dependency
├── requirements.txt
├── .env.example
└── .python-version
```

---

## Local Setup

**1. Clone the repo**

```bash
git clone https://github.com/lily23445/support-crm.git
cd support-crm
```

**2. Create and activate a virtual environment**

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Set up environment variables**

```bash
cp .env.example .env
```

Open `.env` and set your admin token:

```
ADMIN_TOKEN=your_secret_token_here
```

**5. Start the server**

```bash
uvicorn main:app --reload
```

The API will be running at `http://localhost:8000`.  
Interactive API docs are available at `http://localhost:8000/docs`.

---

## Frontend Development

Serve the frontend locally using VS Code Live Server or any static file server.

Default URL:
```
http://localhost:5500
```

Ensure the FastAPI backend is running on:
```
http://localhost:8000
```

---

## API Reference

### Public Routes — no authentication required

#### `POST /api/tickets`
Submit a new support ticket.

**Request body:**
```json
{
  "customer_name": "Priya Sharma",
  "customer_email": "priya@example.com",
  "subject": "Cannot log in",
  "description": "Getting a 403 error on the login page since yesterday."
}
```

**Response:**
```json
{
  "ticket_id": "TKT-0001",
  "created_at": "2025-06-10T14:30:00",
  "message": "Ticket created. Use your ticket ID and email to track it."
}
```

---

#### `GET /api/tickets/lookup?ticket_id=TKT-0001&email=abc@example.com`
Customers can look up their own ticket using their ticket ID and the email they registered with.

Returns the full ticket including any notes left by the support team. Returns `403` if the ID and email don't match.

---

### Admin Routes — require `X-Admin-Token` header

All admin routes require the header:
```
X-Admin-Token: your_secret_token_here
```

#### `GET /api/tickets/`
List all tickets. Supports optional query parameters:

| Parameter | Description |
|---|---|
| `status` | Filter by `Open`, `In Progress`, or `Closed` |
| `search` | Search by name, email, ticket ID, or description |

**Example:**
```
GET /api/tickets/?status=Open&search=login
```

---

#### `GET /api/tickets/{ticket_id}`
Get full detail for a single ticket including the complete note history.

---

#### `PUT /api/tickets/{ticket_id}`
Update a ticket's status and/or add a note.

**Request body:**
```json
{
  "status": "In Progress",
  "note": "Reproduced the issue locally. Investigating session token expiry."
}
```

**Response:**
```json
{
  "success": true,
  "updated_at": "2025-06-10T15:00:00"
}
```

---

## Security Notes

- Admin routes are protected by an environment-based token.
- Sensitive values are stored in environment variables and are not committed to Git.
- Customer ticket lookup requires both Ticket ID and Email verification.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ADMIN_TOKEN` | Secret token required to access all admin API routes |

See `.env.example` for the template.

---

## Deployment (Railway)

1. Push the repo to GitHub
2. Create a new project at [railway.app](https://railway.app) and connect your repo
3. Add the environment variable `ADMIN_TOKEN` in Railway's settings
4. Set the start command:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Deploy — Railway will install dependencies from `requirements.txt` automatically

For the frontend, deploy the `frontend/` folder as a separate Railway static site and update the API base URL in your JS to point to the live backend URL.

---

## Future Improvements

- User authentication and role-based access control
- PostgreSQL migration for production use
- Email notifications on ticket updates
- File attachment support
- Pagination for large ticket volumes
- JWT-based authentication

---

## License

MIT
