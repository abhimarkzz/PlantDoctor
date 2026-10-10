"""FastAPI application entrypoint for Plant Doctor backend."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .db.mongo import close_mongo_client, get_database
from .db.indexes import ensure_indexes
from .deps import init_services
from .routers import health, questions, sources, packs, ingest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("plantdoctor")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info(f"Starting Plant Doctor backend in {settings.fastapi_env} mode...")
    db = get_database()
    if db is not None:
        try:
            logger.info("MongoDB Atlas connected. Ensuring database indexes...")
            ensure_indexes(db)
        except Exception as e:
            logger.warning(f"Could not ensure indexes on MongoDB startup: {e}")
    else:
        logger.info("MongoDB not configured or unreachable; operating in isolated test/memory mode.")

    # Initialize repositories, seed data and services
    init_services(db)

    yield

    # Shutdown sequence
    logger.info("Shutting down Plant Doctor backend...")
    close_mongo_client()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Plant Doctor Agricultural Evidence API",
        description="Offline-first, evidence-grounded agricultural assistant backend with deterministic Evidence Status Gate.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS configuration with explicit frontend origins and Cloudflare Pages regex
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Global Exception Handler (prevents stack traces & secrets from leaking to clients)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An internal server error occurred while processing the agricultural evidence request.",
                "path": request.url.path,
            },
        )

    # Register Routers
    app.include_router(health.router)
    app.include_router(questions.router)
    app.include_router(sources.router)
    app.include_router(packs.router)
    app.include_router(ingest.router)

    return app


app = create_app()
