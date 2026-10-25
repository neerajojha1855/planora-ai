"""Security, resilience, and boundary condition tests for Planora AI."""

import uuid
from datetime import date, timedelta
from unittest.mock import patch
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import OperationalError
from app.main import app
from app.core.rate_limit import SlidingWindowRateLimiter

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_security_headers_enforcement(client: AsyncClient):
    """Verifies that all defense-in-depth security headers are injected into HTTP responses."""
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers["permissions-policy"]
    assert res.headers["x-xss-protection"] == "1; mode=block"

@pytest.mark.asyncio
async def test_payload_ceiling_enforcement(client: AsyncClient):
    """Verifies that payloads exceeding 2MB are rejected with HTTP 413."""
    res = await client.post(
        "/api/v1/plans",
        headers={"content-length": "3000000"},
        content=b"test",
    )
    assert res.status_code == 413
    assert "Payload too large" in res.json()["detail"]

@pytest.mark.asyncio
async def test_health_check_db_degraded(client: AsyncClient):
    """Verifies that database connection failures return graceful degraded status without crashing."""
    with patch("app.main.check_database_connection", side_effect=OperationalError("connection failed", None, None)):
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unavailable"

@pytest.mark.asyncio
async def test_plan_budget_boundary_validation(client: AsyncClient):
    """Verifies that negative budgets are rejected by schema validators with HTTP 422."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": f"budget_{uuid.uuid4().hex[:6]}@example.com", "password": "Password123"},
    )
    res = await client.post(
        "/api/v1/plans",
        json={
            "title": "Invalid Budget Event",
            "event_type": "birthday",
            "event_date": (date.today() + timedelta(days=30)).isoformat(),
            "location": "Mumbai",
            "guest_count": 50,
            "budget_amount": -1000.0,
            "budget_currency": "INR",
        },
    )
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_plan_deletion_lifecycle():
    """Verifies complete creation, deletion, and subsequent 404 lifecycle of a plan."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={"email": f"del_{uuid.uuid4().hex[:6]}@example.com", "password": "Password123"},
        )
        create_res = await client.post(
            "/api/v1/plans",
            json={
                "title": "Plan to Delete",
                "event_type": "community",
                "event_date": (date.today() + timedelta(days=45)).isoformat(),
                "location": "Delhi",
                "guest_count": 200,
                "budget_amount": 100000.0,
                "budget_currency": "INR",
            },
        )
        assert create_res.status_code == 201
        plan_id = create_res.json()["id"]

        del_res = await client.delete(f"/api/v1/plans/{plan_id}")
        assert del_res.status_code == 204

        get_res = await client.get(f"/api/v1/plans/{plan_id}")
        assert get_res.status_code == 404

@pytest.mark.asyncio
async def test_cross_user_plan_deletion_isolation():
    """Verifies that User B cannot delete User A's plan, returning 404 anti-enumeration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client_a:
        await client_a.post(
            "/api/v1/auth/register",
            json={"email": f"owner_{uuid.uuid4().hex[:6]}@example.com", "password": "Password123"},
        )
        create_res = await client_a.post(
            "/api/v1/plans",
            json={
                "title": "Owner Plan",
                "event_type": "wedding",
                "event_date": (date.today() + timedelta(days=90)).isoformat(),
                "location": "Udaipur",
                "guest_count": 150,
                "budget_amount": 1500000.0,
                "budget_currency": "INR",
            },
        )
        plan_id = create_res.json()["id"]

    async with AsyncClient(transport=transport, base_url="http://test") as client_b:
        await client_b.post(
            "/api/v1/auth/register",
            json={"email": f"attacker_{uuid.uuid4().hex[:6]}@example.com", "password": "Password123"},
        )
        del_res = await client_b.delete(f"/api/v1/plans/{plan_id}")
        assert del_res.status_code == 404

def test_sliding_window_rate_limiter_unit():
    """Unit test for rate limiter reset and threshold verification."""
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=60)
    limiter.requests["127.0.0.1"] = [1.0, 2.0]
    assert len(limiter.requests["127.0.0.1"]) == 2
    limiter.reset()
    assert len(limiter.requests["127.0.0.1"]) == 0
