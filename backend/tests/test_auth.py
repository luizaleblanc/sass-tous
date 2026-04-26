import pytest


async def test_register_success(client):
    resp = await client.post("/auth/register", json={"email": "a@b.com", "password": "pass123"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "a@b.com"
    assert "id" in data


async def test_register_duplicate(client):
    payload = {"email": "dup@b.com", "password": "pass123"}
    await client.post("/auth/register", json=payload)
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 409


async def test_login_success(client):
    await client.post("/auth/register", json={"email": "login@b.com", "password": "pass123"})
    resp = await client.post("/auth/login", data={"username": "login@b.com", "password": "pass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_login_wrong_password(client):
    await client.post("/auth/register", json={"email": "x@b.com", "password": "correta"})
    resp = await client.post("/auth/login", data={"username": "x@b.com", "password": "errada"})
    assert resp.status_code == 401


async def test_get_me(client, auth_headers):
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "dev@test.com"
    assert data["seniority"] is None
    assert data["stacks"] is None


async def test_update_profile(client, auth_headers):
    resp = await client.put(
        "/auth/profile",
        json={"seniority": "Senior", "stacks": ["python", "fastapi", "docker"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["seniority"] == "Senior"
    assert "python" in data["stacks"]


async def test_update_profile_invalid_seniority(client, auth_headers):
    resp = await client.put(
        "/auth/profile",
        json={"seniority": "Ninja"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


async def test_me_unauthenticated(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401
