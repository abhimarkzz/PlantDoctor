"""Pytest fixtures for backend testing."""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.deps import init_services


@pytest.fixture(scope="session", autouse=True)
def setup_test_services():
    """Initializes in-memory repositories and seeds baseline agricultural corpus."""
    init_services(db=None)


@pytest.fixture
def client():
    """FastAPI test client."""
    with TestClient(app) as c:
        yield c
