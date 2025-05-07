import asyncio
import json
import websockets
import logging
import time
from typing import Dict, Any
from enum import Enum
from pathlib import Path
import sys

# Add the parent directory to Python path
current_dir = Path(__file__).parent
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
    def __init__(self, uri: str = "ws://localhost:18765"):
        self.uri = uri
        self.websocket: websockets.WebSocketClientProtocol = None
        self.received_messages = []
        self.listener_task = None
        self.last_scan_results = []

    async def connect(self):
        """Connect to the WebSocket server"""
        try:
            self.websocket = await websockets.connect(self.uri, ping_interval=20, ping_timeout=20)
            logger.info("Connected to WebSocket server")
            self.listener_task = asyncio.create_task(self.receive_messages())
            logger.info("Message listener started.")
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            raise

    async def disconnect(self):
        """Disconnect from the WebSocket server"""
        if self.listener_task:
            self.listener_task.cancel()
            try:
                await self.listener_task
            except asyncio.CancelledError:
                logger.info("Message listener stopped.")
            self.listener_task = None

        if self.websocket:
            try:
                await self.websocket.close()
                logger.info("Disconnected from WebSocket server")
            except Exception as e:
                logger.error(f"Error closing websocket: {e}")
        self.websocket = None

    async def send_command(self, command: str, payload: Dict[str, Any] = None):
        """Send a command to the server"""
        if not self.websocket:
            logger.error("Cannot send command: WebSocket is not connected.")
            return
        message = {"command": command}
        if payload:
            message["payload"] = payload
        try:
            await self.websocket.send(json.dumps(message))
            logger.info(f"Sent command: {command}, Payload: {payload}")
        except websockets.exceptions.ConnectionClosed as e:
            logger.error(f"Connection closed while sending command {command}: {e}")
        except Exception as e:
            logger.error(f"Error sending command {command}: {e}")

    async def receive_messages(self):
        """Receive and log messages from the server"""
        logger.info("Listening for messages from server...")
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    self.received_messages.append(data)
                    logger.info(f"Received message: {json.dumps(data, indent=2)}")

                    if data.get("type") == "event":
                        event_type = data.get("event_type")
                        event_data = data.get("data", {})
                        if event_type == EventType.SCAN_RESULT.value and event_data.get("status") == "completed":
                            self.last_scan_results = event_data.get("devices", [])
                            logger.info(f"Scan completed. Found {len(self.last_scan_results)} devices.")
                        elif event_type == EventType.DEVICE_CONNECTED.value:
                            logger.info(f"Event: Device connected - {event_data.get('device_info')}")
                        elif event_type == EventType.DEVICE_DISCONNECTED.value:
                            logger.info(f"Event: Device disconnected - {event_data.get('device_info')}")
                        elif event_type == EventType.ERROR.value:
                            logger.error(f"Event: Server Error - {event_data}")

                    elif data.get("type") == "sensor_data":
                        ts = data.get("timestamp", time.time())
                        data_types = [k for k in data if k not in ["type", "timestamp"]]
                        logger.debug(f"Received sensor data at {ts:.2f}: Types={data_types}")

                except json.JSONDecodeError:
                    logger.error(f"Received non-JSON message: {message}")
                    self.received_messages.append(message)
                except Exception as e:
                    logger.error(f"Error processing received message: {e}")

        except websockets.exceptions.ConnectionClosedOK:
            logger.info("Server closed the connection normally.")
        except websockets.exceptions.ConnectionClosedError as e:
            logger.error(f"Connection closed with error: {e}")
        except asyncio.CancelledError:
            logger.info("Message listener task cancelled.")
        except Exception as e:
            logger.error(f"Unexpected error in message listener: {e}")
        finally:
            logger.info("Message listener finished.")

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

async def test_original_commands(client: WebSocketTestClient):
    logger.info("--- Testing Original Commands ---")
    await client.send_command("health_check")
    await asyncio.sleep(1)

    logger.info("--- Original Commands Test Finished ---")

async def main_test_flow():
    client = WebSocketTestClient()
    try:
        await client.connect()

        await test_ble_functionality(client)

    except websockets.exceptions.ConnectionClosedError as e:
        logger.error(f"Test flow interrupted by connection error: {e}")
    except Exception as e:
        logger.error(f"Test failed with unexpected error: {e}", exc_info=True)
    finally:
        logger.info("Disconnecting test client...")
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main_test_flow()) 