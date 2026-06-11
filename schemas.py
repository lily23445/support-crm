from pydantic import BaseModel, EmailStr
from datetime import datetime
from enums import TicketStatus

class TicketCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    subject: str
    description: str

class TicketUpdate(BaseModel):
    status: TicketStatus          
    note: str | None = None

class NoteOut(BaseModel):
    note_text: str
    created_at: datetime
    model_config = {"from_attributes": True}

class TicketOut(BaseModel):
    ticket_id: str
    customer_name: str
    customer_email: EmailStr
    subject: str
    description: str
    status: TicketStatus
    created_at: datetime
    updated_at: datetime 
    notes: list[NoteOut] = []
    model_config = {"from_attributes": True}