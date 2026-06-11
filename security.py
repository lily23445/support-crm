from fastapi import Header, HTTPException
from typing import Annotated
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")



async def verify_admin_token(
    x_admin_token: Annotated[str | None, Header()] = None
):
  
    if x_admin_token is None:
        raise HTTPException(
            status_code=403,
            detail="Missing X-Admin-Token header"
        )
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Invalid X-Admin-Token"
        )
    return x_admin_token
