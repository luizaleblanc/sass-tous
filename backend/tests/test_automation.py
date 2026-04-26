import pytest
from sqlalchemy import insert
from app.models import Job
import uuid
from datetime import datetime


async def _create_job(db_session, owner_id: str, **kwargs) -> str:
    job_id = str(uuid.uuid4())
    defaults = dict(
        id=job_id,
        title="Software Engineer",
        company="Acme",
        url="https://example.com/job/1",
        status="Encontrada",
        platform="remoteok",
        application_type="platform",
        seniority="Senior",
        stacks=["python", "docker"],
        location_type="nacional",
        work_modality="presencial",
        owner_id=owner_id,
        created_at=datetime.utcnow(),
    )
    defaults.update(kwargs)
    await db_session.execute(insert(Job).values(**defaults))
    await db_session.commit()
    return job_id


async def _get_user_id(client, auth_headers) -> str:
    resp = await client.get("/auth/me", headers=auth_headers)
    return resp.json()["id"]


async def test_list_jobs_empty(client, auth_headers):
    resp = await client.get("/automation/jobs", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_start_automation_with_urls(client, auth_headers):
    resp = await client.post(
        "/automation/start",
        json={"target_urls": ["https://remoteok.com/remote-python-jobs"]},
        headers=auth_headers,
    )
    assert resp.status_code == 202
    assert "job_id" in resp.json()


async def test_start_automation_with_keywords(client, auth_headers):
    resp = await client.post(
        "/automation/start",
        json={"keywords": ["Product Manager", "Tech Lead"], "platforms": ["gupy", "remoteok"]},
        headers=auth_headers,
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "4 site(s)" in data["message"]


async def test_start_automation_empty_raises(client, auth_headers):
    resp = await client.post("/automation/start", json={}, headers=auth_headers)
    assert resp.status_code == 400


async def test_filter_by_platform(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    await _create_job(db_session, uid, platform="gupy", title="Dev Gupy")
    await _create_job(db_session, uid, platform="remoteok", title="Dev RemoteOK")

    resp = await client.get("/automation/jobs?platform=gupy", headers=auth_headers)
    assert resp.status_code == 200
    jobs = resp.json()
    assert len(jobs) == 1
    assert jobs[0]["platform"] == "gupy"


async def test_filter_by_seniority(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    await _create_job(db_session, uid, seniority="Junior", title="Junior Dev")
    await _create_job(db_session, uid, seniority="Senior", title="Senior Dev")

    resp = await client.get("/automation/jobs?seniority=Junior", headers=auth_headers)
    assert resp.status_code == 200
    jobs = resp.json()
    assert len(jobs) == 1
    assert jobs[0]["seniority"] == "Junior"


async def test_filter_by_stack(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    await _create_job(db_session, uid, stacks=["react", "typescript"], title="Frontend Dev")
    await _create_job(db_session, uid, stacks=["python", "django"], title="Backend Dev")

    resp = await client.get("/automation/jobs?stack=react", headers=auth_headers)
    assert resp.status_code == 200
    jobs = resp.json()
    assert len(jobs) == 1
    assert jobs[0]["title"] == "Frontend Dev"


async def test_matches_requires_profile(client, auth_headers):
    resp = await client.get("/automation/jobs/matches", headers=auth_headers)
    assert resp.status_code == 400


async def test_matches_returns_correct_jobs(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    await client.put(
        "/auth/profile",
        json={"seniority": "Senior", "stacks": ["python", "docker"]},
        headers=auth_headers,
    )
    await _create_job(db_session, uid, seniority="Senior", stacks=["python", "fastapi"], title="Match")
    await _create_job(db_session, uid, seniority="Junior", stacks=["java"], title="No Match")

    resp = await client.get("/automation/jobs/matches", headers=auth_headers)
    assert resp.status_code == 200
    jobs = resp.json()
    assert len(jobs) == 1
    assert jobs[0]["title"] == "Match"


async def test_delete_job(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    job_id = await _create_job(db_session, uid)

    resp = await client.delete(f"/automation/jobs/{job_id}", headers=auth_headers)
    assert resp.status_code == 204

    resp2 = await client.delete(f"/automation/jobs/{job_id}", headers=auth_headers)
    assert resp2.status_code == 404


async def test_delete_job_wrong_owner(client, db_session):
    await client.post("/auth/register", json={"email": "owner@test.com", "password": "pass"})
    resp = await client.post("/auth/login", data={"username": "owner@test.com", "password": "pass"})
    owner_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    owner_id = (await client.get("/auth/me", headers=owner_headers)).json()["id"]

    await client.post("/auth/register", json={"email": "attacker@test.com", "password": "pass"})
    resp2 = await client.post("/auth/login", data={"username": "attacker@test.com", "password": "pass"})
    attacker_headers = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

    job_id = await _create_job(db_session, owner_id)
    resp3 = await client.delete(f"/automation/jobs/{job_id}", headers=attacker_headers)
    assert resp3.status_code == 403


async def test_filter_by_location_type(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    await _create_job(db_session, uid, location_type="internacional", title="International Dev")
    await _create_job(db_session, uid, location_type="nacional", title="Local Dev")

    resp = await client.get("/automation/jobs?location_type=internacional", headers=auth_headers)
    assert resp.status_code == 200
    jobs = resp.json()
    assert len(jobs) == 1
    assert jobs[0]["location_type"] == "internacional"


async def test_filter_by_work_modality(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    await _create_job(db_session, uid, work_modality="remoto", title="Remote Dev")
    await _create_job(db_session, uid, work_modality="presencial", title="Presencial Dev")

    resp = await client.get("/automation/jobs?work_modality=remoto", headers=auth_headers)
    assert resp.status_code == 200
    jobs = resp.json()
    assert len(jobs) == 1
    assert jobs[0]["work_modality"] == "remoto"


async def test_apply_platform(client, auth_headers, db_session):
    uid = await _get_user_id(client, auth_headers)
    job_id = await _create_job(db_session, uid)

    resp = await client.post(
        "/automation/apply/platform",
        json={"job_ids": [job_id]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["job_id"] == job_id

    jobs_resp = await client.get("/automation/jobs?status=Aplicada", headers=auth_headers)
    assert any(j["id"] == job_id for j in jobs_resp.json())
