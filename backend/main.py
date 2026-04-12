from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import init_db
from routers.api import router as api_router

app = FastAPI(
    title="AURA Backend",
    version="2.0",
    description="AI Life Coach — 4-agent pipeline for daily wellness coaching",
)


@app.on_event("startup")
def on_startup():
    init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "version": "2.0"}
