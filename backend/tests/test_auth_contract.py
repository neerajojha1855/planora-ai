import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    payload = {
        "email": "Planner.User@Example.com",
        "password": "SecurePassword123",
        "full_name": "Alex Morgan",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "planner.user@example.com"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    payload = {
        "email": "not-an-email",
        "password": "SecurePassword123",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    payload = {
        "email": "user@example.com",
        "password": "short",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success_shape(client: AsyncClient):
    payload = {
        "email": "user@example.com",
        "password": "SecurePassword123",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "message" in data


@pytest.mark.asyncio
async def test_unauthenticated_me_returns_401(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
