import pytest
import httpx
import asyncio

API_URL = "http://localhost:8000/device"

@pytest.mark.asyncio
async def test_device_api_full_lifecycle():
    async with httpx.AsyncClient() as client:
        device = {"name": "TestDevice", "address": "00:11:22:33:44:55"}

        # 1. 디바이스 스캔 (mock 환경에서는 빈 리스트일 수 있음)
        resp = await client.get(f"{API_URL}/search")
        assert resp.status_code == 200, f"Scan failed: {resp.text}"
        assert "devices" in resp.json()

        # 2. 디바이스 등록
        resp = await client.post(f"{API_URL}/register_device", json=device)
        assert resp.status_code == 200, f"Register failed: {resp.text}"
        assert resp.json()["status"] == "success"

        # 3. 중복 등록 (덮어쓰기 허용 시 200, 아니면 400)
        resp2 = await client.post(f"{API_URL}/register_device", json=device)
        assert resp2.status_code in (200, 400), f"Duplicate register: {resp2.text}"

        # 4. 디바이스 연결 시도 (실제 BLE 환경이 아니면 실패할 수 있음)
        resp3 = await client.post(f"{API_URL}/connect", json={"address": device["address"]})
        # 연결 실패 시 400, 성공 시 200
        assert resp3.status_code in (200, 400), f"Connect: {resp3.text}"

        # 5. 상태 확인
        resp4 = await client.get(f"{API_URL}/status")
        assert resp4.status_code == 200, f"Status: {resp4.text}"
        # 상태 응답은 dict이며, 최소한 status 또는 address 필드가 있어야 함
        assert isinstance(resp4.json(), dict)

        # 6. 디바이스 연결 해제 시도
        resp5 = await client.post(f"{API_URL}/disconnect")
        assert resp5.status_code in (200, 400), f"Disconnect: {resp5.text}"

        # 7. 디바이스 해지
        resp6 = await client.post(f"{API_URL}/unregister_device", json={"address": device["address"]})
        assert resp6.status_code == 200, f"Unregister failed: {resp6.text}"
        assert resp6.json()["status"] == "success"

        # 8. 없는 디바이스 해지 시도 (400)
        resp7 = await client.post(f"{API_URL}/unregister_device", json={"address": device["address"]})
        assert resp7.status_code == 400, f"Unregister non-existent: {resp7.text}"
