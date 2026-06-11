from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from enums import TicketStatus
from models import Note, Ticket
from schemas import NoteOut, TicketCreate, TicketOut, TicketUpdate
from security import verify_admin_token

# ---------------------------------------------------------------------------
# Two routers in one file — public and private
# ---------------------------------------------------------------------------

public_router = APIRouter(prefix="/api", tags=["public"])

private_router = APIRouter(
    prefix="/api/tickets",
    tags=["tickets — admin"],
    dependencies=[Depends(verify_admin_token)]
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_ticket_id(db: Session) -> str:
    count = db.query(Ticket).count() + 1
    return f"TKT-{count:04d}"


# ---------------------------------------------------------------------------
# PUBLIC routes
# ---------------------------------------------------------------------------

@public_router.post("/tickets", status_code=201)
def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    """Public: customer submits a new support ticket."""
    ticket = Ticket(**data.model_dump(), ticket_id=generate_ticket_id(db))
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {
        "ticket_id": ticket.ticket_id,
        "created_at": ticket.created_at,
        "message": "Ticket created. Use your ticket ID and email to track it."
    }


@public_router.get("/tickets/lookup", response_model=TicketOut)
def lookup_ticket(
    ticket_id: str,
    email: str,
    db: Session = Depends(get_db),
):
    """Public: customer tracks their own ticket using ticket_id + email."""
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()

    if not ticket or ticket.customer_email.strip().lower() != email.strip().lower():
        raise HTTPException(
            status_code=403,
            detail="No ticket found with that ID and email combination"
        )

    notes = db.query(Note).filter(
        Note.ticket_id == ticket_id
    ).order_by(Note.created_at.asc()).all()

    ticket.notes = notes
    return TicketOut.model_validate(ticket)


# ---------------------------------------------------------------------------
# PRIVATE routes — all require X-Admin-Token header
# ---------------------------------------------------------------------------

@private_router.get("/")
def list_tickets(
    status: TicketStatus | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """Admin: list all tickets with optional status filter and search."""
    q = db.query(Ticket)

    if status:
        q = q.filter(Ticket.status == status.value)

    if search:
        like = f"%{search}%"
        q = q.filter(
            Ticket.customer_name.ilike(like)
            | Ticket.customer_email.ilike(like)
            | Ticket.ticket_id.ilike(like)
            | Ticket.description.ilike(like)
        )

    return q.order_by(Ticket.created_at.desc()).all()


@private_router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    """Admin: fetch full ticket detail with complete note history."""
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    notes = db.query(Note).filter(
        Note.ticket_id == ticket_id
    ).order_by(Note.created_at.asc()).all()

    ticket.notes = notes
    return TicketOut.model_validate(ticket)


@private_router.put("/{ticket_id}")
def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: Session = Depends(get_db),
):
    """Admin: update ticket status and optionally append a note."""
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = data.status.value

    if data.note:
        db.add(Note(ticket_id=ticket_id, note_text=data.note))

    db.commit()
    db.refresh(ticket)
    return {"success": True, "updated_at": ticket.updated_at}