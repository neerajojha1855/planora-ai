import uuid
from datetime import date, timedelta
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Pre-authenticate client with active session cookie
        await ac.post(
            "/api/v1/auth/register",
            json={
                "email": f"contract_tester_{uuid.uuid4().hex[:6]}@example.com",
                "password": "Password123",
            },
        )
        yield ac


@pytest.mark.asyncio
async def test_unauthenticated_plan_request_returns_401():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as unauth_client:
        res = await unauth_client.post("/api/v1/plans", json={})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_create_plan_wedding_success(client: AsyncClient):
    future_date = (date.today() + timedelta(days=180)).isoformat()
    payload = {
        "title": "Sarah & Alex Autumn Wedding",
        "event_type": "wedding",
        "event_date": future_date,
        "location": "Napa Valley, CA",
        "guest_count": 120,
        "budget_amount": 45000.0,
        "budget_currency": "USD",
        "priorities": ["Photography", "Fine Dining", "Live Music"],
        "style": "Rustic Chic & Candlelight",
    }
    response = await client.post("/api/v1/plans", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["event_type"] == "wedding"
    assert data["status"] == "completed"
    assert "plan_data" in data

    plan = data["plan_data"]
    assert "summary" in plan
    assert "budget" in plan
    assert len(plan["budget"]["items"]) > 0
    assert "timeline" in plan
    assert len(plan["timeline"]) > 0
    assert "vendor_checklist" in plan
    assert len(plan["vendor_checklist"]) > 0
    assert "personalized_ideas" in plan
    assert len(plan["personalized_ideas"]) > 0


@pytest.mark.asyncio
async def test_create_plan_birthday_success(client: AsyncClient):
    future_date = (date.today() + timedelta(days=30)).isoformat()
    payload = {
        "title": "Liam's 30th Rooftop Bash",
        "event_type": "birthday",
        "event_date": future_date,
        "location": "Austin, TX",
        "guest_count": 50,
        "budget_amount": 5000.0,
        "budget_currency": "USD",
    }
    response = await client.post("/api/v1/plans", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["event_type"] == "birthday"
    assert data["plan_data"]["budget"]["total_budget"] == 5000.0


@pytest.mark.asyncio
async def test_create_plan_community_success(client: AsyncClient):
    future_date = (date.today() + timedelta(days=90)).isoformat()
    payload = {
        "title": "Oakridge Annual Harvest Festival",
        "event_type": "community",
        "event_date": future_date,
        "location": "Oakridge Town Square",
        "guest_count": 800,
        "budget_amount": 12000.0,
        "budget_currency": "USD",
    }
    response = await client.post("/api/v1/plans", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["event_type"] == "community"
    assert len(data["plan_data"]["timeline"]) > 0


@pytest.mark.asyncio
async def test_create_plan_invalid_event_type(client: AsyncClient):
    payload = {
        "title": "Invalid Event",
        "event_type": "rave_party",
        "event_date": (date.today() + timedelta(days=10)).isoformat(),
        "location": "Miami",
        "guest_count": 50,
        "budget_amount": 2000.0,
    }
    response = await client.post("/api/v1/plans", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_past_date(client: AsyncClient):
    past_date = (date.today() - timedelta(days=1)).isoformat()
    payload = {
        "title": "Past Wedding",
        "event_type": "wedding",
        "event_date": past_date,
        "location": "San Francisco",
        "guest_count": 50,
        "budget_amount": 10000.0,
    }
    response = await client.post("/api/v1/plans", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_negative_budget(client: AsyncClient):
    payload = {
        "title": "Budget Test",
        "event_type": "birthday",
        "event_date": (date.today() + timedelta(days=20)).isoformat(),
        "location": "Chicago",
        "guest_count": 20,
        "budget_amount": -500.0,
    }
    response = await client.post("/api/v1/plans", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_impossible_guest_count(client: AsyncClient):
    payload = {
        "title": "Guest Count Test",
        "event_type": "community",
        "event_date": (date.today() + timedelta(days=20)).isoformat(),
        "location": "Boston",
        "guest_count": 0,
        "budget_amount": 1000.0,
    }
    response = await client.post("/api/v1/plans", json=payload)
    assert response.status_code == 422
