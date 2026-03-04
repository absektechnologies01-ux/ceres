from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, admin, sessions, submissions, marking, schemes, institution
from app.database import engine
from app import models

# Create all tables (dev only — use Alembic in production)
models.user.Base.metadata.create_all(bind=engine)
models.institution.Base.metadata.create_all(bind=engine)
models.session.Base.metadata.create_all(bind=engine)
models.submission.Base.metadata.create_all(bind=engine)
models.marking.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ceres API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(sessions.router)
app.include_router(submissions.router)
app.include_router(marking.router)
app.include_router(schemes.router)
app.include_router(institution.router)


@app.get("/health")
def health():
    return {"status": "ok"}
