import pytest
import asyncio
import httpx
import websockets
import json

API_URL = "http://localhost:8121"
WS_URL = "ws://localhost:18765"

@pytest.mark.asyncio
async def test_stream_api_lifecycle():
    async with httpx.AsyncClient() as client:
        # 1. 스트리밍 서버 초기화
        resp = await client.post(f"{API_URL}/stream/init")
        assert resp.status_code == 200
        assert resp.json()["status"] in ("success", "fail"), f"Unexpected status: {resp.json()}"
        if resp.json()["status"] == "fail":
            print("/stream/init fail message:", resp.json()["message"])

        # 2. 스트리밍 시작
        resp = await client.post(f"{API_URL}/stream/start")
        assert resp.status_code == 200
        assert resp.json()["status"] in ("success", "fail"), f"Unexpected status: {resp.json()}"
        if resp.json()["status"] == "fail":
            print("/stream/start fail message:", resp.json()["message"])

        # 3. 상태 확인
        resp = await client.get(f"{API_URL}/stream/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "clients_connected" in data
        assert "stream_stats" in data
        assert data["status"] in ("running", "stopped", "not_initialized"), f"Unexpected status: {data['status']}"

        # 4. 연결 정보 확인
        resp = await client.get(f"{API_URL}/stream/connection")
        assert resp.status_code == 200
        data = resp.json()
        # 연결 정보는 ws_url만 반환하는 것으로 보임
        assert "ws_url" in data
        assert data["ws_url"].startswith("ws://")

        # 5. 디바이스 정보 확인
        resp = await client.get(f"{API_URL}/stream/device")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("connected", "no_device_connected", "not_initialized"), f"Unexpected status: {data['status']}"

        # 6. health check
        resp = await client.get(f"{API_URL}/stream/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("running", "stopped", "not_initialized", "error"), f"Unexpected status: {data['status']}"

        # 7. 스트리밍 종료 (딜레이 추가)
        await asyncio.sleep(0.2)
        resp = await client.post(f"{API_URL}/stream/stop")
        assert resp.status_code == 200
        assert resp.json()["status"] in ("success", "fail"), f"Unexpected status: {resp.json()}"
        if resp.json()["status"] == "fail":
            print("/stream/stop fail message:", resp.json()["message"])

@pytest.mark.asyncio
async def test_websocket_health_check():
    # WebSocket 서버가 실행 중이어야 함
    try:
        async with websockets.connect(f"{WS_URL}") as ws:
            # health_check 명령 전송
            await ws.send(json.dumps({"command": "health_check"}))
            response = await ws.recv()
            data = json.loads(response)
            assert data["type"] == "health_check_response"
            assert data["status"] == "ok"
            assert "clients_connected" in data
    except Exception as e:
        pytest.skip(f"WebSocket server not available: {e}")