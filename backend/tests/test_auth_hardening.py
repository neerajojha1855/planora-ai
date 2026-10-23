import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_password_length_bounds():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Password too short (< 8 chars)
        res_short = await client.post(
            "/api/v1/auth/register",
            json={"email": f"short_{uuid.uuid4().hex[:6]}@example.com", "password": "Ab1"},
        )
        assert res_short.status_code == 422

        # Password without uppercase letter
        res_no_upper = await client.post(
            "/api/v1/auth/register",
            json={"email": f"noupper_{uuid.uuid4().hex[:6]}@example.com", "password": "password123"},
        )
        assert res_no_upper.status_code == 422

        # Password without digit
        res_no_digit = await client.post(
            "/api/v1/auth/register",
            json={"email": f"nodigit_{uuid.uuid4().hex[:6]}@example.com", "password": "PasswordOnly"},
        )
        assert res_no_digit.status_code == 422

@pytest.mark.asyncio
async def test_email_case_insensitivity_and_trimming():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_email = f"CaseTester_{uuid.uuid4().hex[:6]}@DOMAIN.com"
        # Register with mixed-case and whitespace
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={"email": f"  {unique_email}  ", "password": "ValidPassword123"},
        )
        assert reg_res.status_code == 201

        # Login with lower-case variant
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email.lower(), "password": "ValidPassword123"},
        )
        assert login_res.status_code == 200

@pytest.mark.asyncio
async def test_logout_session_revocation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"logout_{uuid.uuid4().hex[:6]}@example.com"
        await client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "ValidPassword123"},
        )

        # Confirm authenticated
        me_res = await client.get("/api/v1/auth/me")
        assert me_res.status_code == 200

        # Perform logout
        logout_res = await client.post("/api/v1/auth/logout")
        assert logout_res.status_code == 200

        # Subsequent authenticated request MUST return 401
        me_after_res = await client.get("/api/v1/auth/me")
        assert me_after_res.status_code == 401
