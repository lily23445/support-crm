from enum import Enum


class TicketStatus(str, Enum):
  
    open        = "Open"
    in_progress = "In Progress"
    closed      = "Closed"