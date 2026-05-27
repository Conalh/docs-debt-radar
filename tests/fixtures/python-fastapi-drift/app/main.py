import os

from fastapi import APIRouter, FastAPI

app = FastAPI()
router = APIRouter()
database_url = os.environ["DATABASE_URL"]


@app.get("/health")
def health():
    return {"ok": True, "database": bool(database_url)}


@router.get("/api/users")
def list_users():
    return [{"id": 1}]


app.include_router(router)
