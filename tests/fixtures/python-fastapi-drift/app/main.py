import os

from fastapi import FastAPI

app = FastAPI()
database_url = os.environ["DATABASE_URL"]


@app.get("/health")
def health():
    return {"ok": True, "database": bool(database_url)}
