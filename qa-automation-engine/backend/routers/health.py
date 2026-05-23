from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
def health_check():
    """Basic health endpoint to confirm the API is running."""
    return {
        "status": "ok",
        "service": "QA Automation Engine API",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
    }
