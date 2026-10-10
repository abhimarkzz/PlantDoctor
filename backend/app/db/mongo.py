"""MongoDB connection management and health monitoring."""

import logging
from typing import Optional, Tuple
import certifi
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from ..config import settings

logger = logging.getLogger("plantdoctor.db")

_client: Optional[MongoClient] = None


def get_mongo_client() -> Optional[MongoClient]:
    """Returns singleton MongoClient if configured, or None if unconfigured."""
    global _client
    if not settings.is_mongodb_configured:
        return None

    if _client is None:
        try:
            _client = MongoClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000,
                tlsCAFile=certifi.where(),
                appname="PlantDoctor",
            )
        except Exception as e:
            logger.warning(f"Could not initialize MongoClient: {e}")
            _client = None

    return _client


def close_mongo_client():
    """Closes MongoClient connection pool on shutdown and resets service singletons."""
    global _client
    if _client is not None:
        try:
            _client.close()
        except Exception:
            pass
        _client = None

    try:
        from ..deps import reset_services
        reset_services()
    except Exception:
        pass


def get_database() -> Optional[Database]:
    """Returns PyMongo Database instance, or None if not configured/reachable."""
    client = get_mongo_client()
    if client is None:
        return None
    return client[settings.mongodb_db_name]


def check_mongo_health() -> Tuple[str, Optional[str]]:
    """
    Returns (status, error_message).
    Status values: 'connected', 'unconfigured', 'unavailable'.
    """
    if not settings.is_mongodb_configured:
        return "unconfigured", "MONGODB_URI is not set in environment."

    client = get_mongo_client()
    if client is None:
        return "unavailable", "Could not instantiate MongoDB client."

    try:
        # Send a quick ping with short timeout
        client.admin.command("ping")
        return "connected", None
    except ServerSelectionTimeoutError as e:
        return "unavailable", f"Server selection timeout: {e}"
    except PyMongoError as e:
        return "unavailable", f"Database error: {e}"
    except Exception as e:
        return "unavailable", f"Unexpected error pinging database: {e}"
