from fastapi import APIRouter
from datetime import datetime
import psutil

router = APIRouter()


@router.get("")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ml-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": f"{psutil.Process().create_time()}",
        "memory": {
            "used_mb": round(psutil.Process().memory_info().rss / 1024 / 1024, 2),
            "percent": psutil.Process().memory_percent(),
        },
        "cpu_percent": psutil.cpu_percent(interval=1),
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes"""
    # Check if models are loaded, databases are accessible, etc.
    return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}


@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}
