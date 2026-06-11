from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers.tickets import public_router, private_router
import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Support CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://support-crm-frontend-production.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# public first — so /lookup is matched before /{ticket_id}
app.include_router(public_router)
app.include_router(private_router)

