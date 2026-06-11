from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime, timezone
from database import Base
from enums import TicketStatus
 
class Ticket(Base):
    __tablename__ = "tickets"
    id             = Column(Integer, primary_key=True)
    ticket_id      = Column(String, unique=True, index=True)  
    customer_name  = Column(String(100), nullable=False)
    customer_email = Column(String(200), nullable=False)
    subject        = Column(String(200), nullable=False)
    description    = Column(Text)
    status         = Column(String(20), default=TicketStatus.open.value)       # Open / In Progress / Closed
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                            onupdate=lambda: datetime.now(timezone.utc))

class Note(Base):
    __tablename__ = "notes"
    id         = Column(Integer, primary_key=True)
    ticket_id  = Column(String, ForeignKey("tickets.ticket_id"))
    note_text  = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))