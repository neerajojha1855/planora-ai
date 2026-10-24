import uuid
from datetime import date, timedelta
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_cross_user_plan_isolation_anti_enumeration():
    transport = ASGITransport(app=app)
    # User A creates a plan
    async with AsyncClient(transport=transport, base_url="http://test") as client_a:
        await client_a.post(
            "/api/v1/auth/register",
            json={"email": f"usera_{uuid.uuid4().hex[:6]}@example.com", "password": "Password123"},
        )
        plan_res = await client_a.post(
            "/api/v1/plans",
            json={
                "title": "User A Private Event",
                "event_type": "wedding",
                "event_date": (date.today() + timedelta(days=120)).isoformat(),
                "location": "Jaipur, India",
                "guest_count": 100,
                "budget_amount": 500000.0,
                "budget_currency": "INR",
            },
        )
        plan_id = plan_res.json()["id"]

    # User B tries to view or modify User A's plan
    async with AsyncClient(transport=transport, base_url="http://test") as client_b:
        await client_b.post(
            "/api/v1/auth/register",
            json={"email": f"userb_{uuid.uuid4().hex[:6]}@example.com", "password": "Password123"},
        )

        # GET User A's plan must return 404 (not 403, preventing resource enumeration)
        get_res = await client_b.get(f"/api/v1/plans/{plan_id}")
        assert get_res.status_code == 404

        # PATCH User A's plan must return 404
        patch_res = await client_b.patch(
            f"/api/v1/plans/{plan_id}",
            json={"title": "Hacked Title"},
        )
        assert patch_res.status_code == 404

        # Regenerating User A's plan must return 404
        regen_res = await client_b.post(
            f"/api/v1/plans/{plan_id}/regenerate/budget",
            json={"refinement_instruction": "Malicious Prompt"},
        )
        assert regen_res.status_code == 404

@pytest.mark.asyncio
async def test_invalid_section_regeneration_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={"email": f"regen_{uuid.uuid4().hex[:6]}@example.com", "password": "Password123"},
        )
        plan_res = await client.post(
            "/api/v1/plans",
            json={
                "title": "Valid Event",
                "event_type": "birthday",
                "event_date": (date.today() + timedelta(days=30)).isoformat(),
                "location": "Delhi, India",
                "guest_count": 25,
                "budget_amount": 30000.0,
                "budget_currency": "INR",
            },
        )
        plan_id = plan_res.json()["id"]

        # Call with invalid section name
        invalid_sec_res = await client.post(
            f"/api/v1/plans/{plan_id}/regenerate/nonexistent_section",
            json={"refinement_instruction": "Test"},
        )
        assert invalid_sec_res.status_code == 422
