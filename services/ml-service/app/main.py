from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from loguru import logger
import sys
import time

from app.config import settings
from app.api.v1 import predictions, health, models, anomalies

# Configure logging
logger.remove()
logger.add(sys.stdout, level=settings.log_level)
logger.add(
    settings.log_file,
    rotation="500 MB",
    retention="10 days",
    level=settings.log_level,
)

# Create FastAPI app
app = FastAPI(
    title="MediConnect Pro - ML Service",
    description="Machine Learning service for medical predictions and analytics",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"{request.method} {request.url.path} - {process_time:.3f}s")
    return response


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting MediConnect ML Service")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Model path: {settings.model_path}")
    logger.info(f"MongoDB: {settings.mongodb_uri}")
    # Initialize models and load pre-trained models
    logger.info("✅ ML Service started successfully")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down ML Service")


# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Predictions"])
app.include_router(models.router, prefix="/api/v1/models", tags=["Models"])
app.include_router(anomalies.router, prefix="/api/v1/anomalies", tags=["Anomalies"])


# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "MediConnect Pro - ML Service",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/api/docs",
    }
