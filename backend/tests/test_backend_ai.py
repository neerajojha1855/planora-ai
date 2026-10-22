import uuid
from datetime import date, timedelta
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_full_auth_and_plan_persistence_flow(client: AsyncClient):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123"

    # 1. Register
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password, "full_name": "Test Host"},
    )
    assert reg_res.status_code == 201
    assert "planora_session" in reg_res.cookies

    # 2. Get Profile (/me)
    me_res = await client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # 3. Create Plan (Persistent)
    future_date = (date.today() + timedelta(days=120)).isoformat()
    plan_res = await client.post(
        "/api/v1/plans",
        json={
            "title": "Summer Garden Wedding",
            "event_type": "wedding",
            "event_date": future_date,
            "location": "Seattle, WA",
            "guest_count": 80,
            "budget_amount": 25000.0,
            "budget_currency": "USD",
            "priorities": ["Gourmet Food", "Photography"],
        },
    )
    assert plan_res.status_code == 201
    plan_data = plan_res.json()
    plan_id = plan_data["id"]
    assert plan_data["status"] == "completed"

    # 4. List Plans
    list_res = await client.get("/api/v1/plans")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 5. Get Specific Plan
    get_res = await client.get(f"/api/v1/plans/{plan_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == plan_id

    # 6. Regenerate Section (Budget)
    regen_res = await client.post(
        f"/api/v1/plans/{plan_id}/regenerate/budget",
        json={"section": "budget", "refinement_instruction": "Add more acoustic music buffer"},
    )
    assert regen_res.status_code == 200
    assert "budget" in regen_res.json()["plan_data"]

    # 7. Logout
    logout_res = await client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # 8. Unauthenticated Me should now return 401
    unauth_res = await client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401


@pytest.mark.asyncio
async def test_cross_user_plan_access_isolation(client: AsyncClient):
    # User A creates plan
    user_a_email = f"user_a_{uuid.uuid4().hex[:8]}@example.com"
    await client.post("/api/v1/auth/register", json={"email": user_a_email, "password": "Password123"})
    future_date = (date.today() + timedelta(days=60)).isoformat()
    plan_res = await client.post(
        "/api/v1/plans",
        json={
            "title": "User A Private Birthday",
            "event_type": "birthday",
            "event_date": future_date,
            "location": "Denver, CO",
            "guest_count": 25,
            "budget_amount": 3000.0,
        },
    )
    user_a_plan_id = plan_res.json()["id"]

    # User B registers and tries to view User A's plan
    user_b_email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"
    await client.post("/api/v1/auth/register", json={"email": user_b_email, "password": "Password123"})
    cross_access_res = await client.get(f"/api/v1/plans/{user_a_plan_id}")

    # Must return 404 Not Found to prevent resource enumeration
    assert cross_access_res.status_code == 404
