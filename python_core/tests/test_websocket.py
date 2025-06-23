import asyncio
import json
import websockets
import logging
import time
from typing import Dict, Any, List
from enum import Enum
from pathlib import Path
import sys
import pytest
import pytest_asyncio

# Add the parent directory to Python path
current_dir = Path(__file__).parent.parent
sys.path.append(str(current_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

TEST_DEVICE_ADDRESS = None

class EventType(Enum):
    DEVICE_DISCONNECTED = "device_disconnected"
    ERROR = "error"
    STREAM_STARTED = "stream_started"
    STREAM_STOPPED = "stream_stopped"
    SCAN_RESULT = "scan_result"
    DEVICE_CONNECTING = "device_connecting"
    DEVICE_CONNECTED = "device_connected"
    DEVICE_CONNECTION_FAILED = "device_connection_failed"
    DEVICE_INFO = "device_info"
    DATA_ACQUISITION_STARTED = "data_acquisition_started"
    DATA_ACQUISITION_STOPPED = "data_acquisition_stopped"

class WebSocketTestClient:
    def __init__(self, ws_url: str = "ws://localhost:18765"):
        self.ws_url = ws_url
        self.ws = None
        self.received_messages: List[Dict[str, Any]] = []
        self.last_scan_results = None

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url)
        asyncio.create_task(self._receive_messages())

    async def disconnect(self):
        if self.ws:
            await self.ws.close()
            self.ws = None

    async def _receive_messages(self):
        try:
            while True:
                if not self.ws:
                    break
                message = await self.ws.recv()
                data = json.loads(message)
                self.received_messages.append(data)
                
                # Handle scan results
                if data.get("event_type") == EventType.SCAN_RESULT.value:
                    self.last_scan_results = data.get("devices", [])
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error receiving messages: {e}")

    async def send_command(self, command: str, payload: Dict[str, Any] = None):
        if not self.ws:
            await self.connect()
        
        message = {"command": command}
        if payload:
            message.update(payload)
        
        await self.ws.send(json.dumps(message))

@pytest_asyncio.fixture
async def client():
    client = WebSocketTestClient()
    await client.connect()
    try:
        yield client
    finally:
        await client.disconnect()

@pytest.mark.asyncio
async def test_ble_functionality(client: WebSocketTestClient):
    """Runs a sequence of BLE-related tests."""
    logger.info("--- Starting BLE Functionality Test ---")

    logger.info("Step 1: Checking initial device status...")
    await client.send_command("check_device_connection")
    await asyncio.sleep(1)

    logger.info("Step 2: Scanning for devices...")
    await client.send_command("scan_devices")
    logger.info("Waiting for scan results (allow ~6 seconds)...")
    await asyncio.sleep(6)

    target_address = TEST_DEVICE_ADDRESS
    if target_address is None:
        if client.last_scan_results:
            target_address = client.last_scan_results[0]["address"]
            logger.info(f"No TEST_DEVICE_ADDRESS set, attempting to connect to first scanned device: {target_address}")
        else:
            logger.error("Cannot connect: No devices found in scan and TEST_DEVICE_ADDRESS not set.")
            logger.info("--- BLE Functionality Test Finished (Skipped Connection) ---")
            return

    if target_address:
        logger.info(f"Step 3: Connecting to device {target_address}...")
        await client.send_command("connect_device", {"address": target_address})
        logger.info("Waiting for connection result (allow ~12 seconds)...")
        await asyncio.sleep(12)

        logger.info("Step 4: Checking status after connect attempt...")
        await client.send_command("check_device_connection")
        await asyncio.sleep(1)

        connected_event_found = any(msg.get("event_type") == EventType.DEVICE_CONNECTED.value for msg in client.received_messages[-5:])
        if not connected_event_found:
            logger.warning("Device does not appear to be connected. Skipping streaming/disconnect tests.")
            logger.info("--- BLE Functionality Test Finished (Connection Failed/Timeout) ---")
            return

        logger.info("Step 5: Starting data streaming...")
        await client.send_command("start_streaming")
        await asyncio.sleep(1)
        logger.info("Streaming for 5 seconds...")
        await asyncio.sleep(5)

        logger.info("Step 6: Stopping data streaming...")
        await client.send_command("stop_streaming")
        await asyncio.sleep(1)
        logger.info("Stopped streaming, but device should still send data internally.")
        await asyncio.sleep(2)

        logger.info("Step 7: Disconnecting from device...")
        await client.send_command("disconnect_device")
        await asyncio.sleep(3)

        logger.info("Step 8: Checking status after disconnect...")
        await client.send_command("check_device_connection")
        await asyncio.sleep(1)

    logger.info("--- BLE Functionality Test Finished ---")

@pytest.mark.asyncio
async def test_original_commands(client: WebSocketTestClient):
    logger.info("--- Testing Original Commands ---")
    await client.send_command("health_check")
    await asyncio.sleep(1)

    logger.info("--- Original Commands Test Finished ---")
