import asyncio
import json
import logging
import websockets
import time # For timestamping batched data
from typing import Set, Dict, Any, Optional
from enum import Enum, auto
from datetime import datetime
from device import DeviceManager, DeviceStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 전역 변수 (좋은 방법은 아니지만 테스트 목적)
_current_server_instance = None

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

class WebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.is_streaming = False
        self.server: Optional[websockets.WebSocketServer] = None
        self.stream_task: Optional[asyncio.Task] = None # Task for stream_data loop
        self.device_manager = DeviceManager(server_disconnect_callback=self.handle_unexpected_disconnect)

    async def initialize(self):
        logger.info("Initializing WebSocket server...")
        self.server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port
        )
        logger.info(f"WebSocket server initialized on {self.host}:{self.port}")

    async def handle_client(self, websocket: websockets.WebSocketServerProtocol):
        """Handle new client connections (Instance Method)"""
        self.clients.add(websocket)
        logger.info(f"Client connected from {websocket.remote_address}. Total clients: {len(self.clients)}")

        try:
            await self._send_current_device_status(websocket)

            async for message in websocket:
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client connection closed from {websocket.remote_address}.")
        except Exception as e:
            logger.error(f"Error handling client {websocket.remote_address}: {e}", exc_info=True)
        finally:
            if websocket in self.clients:
                self.clients.remove(websocket)
                logger.info(f"Client disconnected from {websocket.remote_address}. Total clients: {len(self.clients)}")

    async def _send_current_device_status(self, websocket: websockets.WebSocketServerProtocol):
        """Send the current device connection status to a specific client."""
        device_info = self.device_manager.get_device_info()
        status_data = {
            "connected": self.device_manager.is_connected(),
            "device_info": device_info
        }
        await self.send_event_to_client(websocket, EventType.DEVICE_INFO, status_data)

    async def handle_unexpected_disconnect(self, device_address: Optional[str]):
        logger.warning(f"Handling unexpected disconnect for address: {device_address}")
        if self.is_streaming:
            await self.stop_streaming()
        await self.broadcast_event(EventType.DEVICE_DISCONNECTED, {
            "device_address": device_address,
            "reason": "unexpected_disconnect"
        })

    async def start(self):
        """Start the WebSocket server"""
        if not self.server:
            await self.initialize()
        logger.info("WebSocket server started")

    async def stop(self):
        """Stop the WebSocket server and disconnect BLE device if connected."""
        logger.info("Stopping WebSocket server...")
        if self.stream_task: # Stop streaming task first
            self.stream_task.cancel()
            try: await self.stream_task
            except asyncio.CancelledError: pass
            self.stream_task = None
        if self.device_manager.is_connected():
            logger.info("Disconnecting BLE device during server shutdown...")
            await self.device_manager.disconnect()

        if self.server:
            self.server.close()
            try:
                await asyncio.wait_for(self.server.wait_closed(), timeout=5.0)
                logger.info("WebSocket server stopped gracefully.")
            except asyncio.TimeoutError:
                logger.warning("WebSocket server close timed out.")
        else:
            logger.warning("Server object not found, already stopped?")

    async def handle_client_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """Handle messages from clients"""
        try:
            data = json.loads(message)
            command = data.get("command")
            payload = data.get("payload", {})
            logger.debug(f"Received command: {command} with payload: {payload}")

            if command == "check_device_connection":
                await self._send_current_device_status(websocket)

            elif command == "scan_devices":
                asyncio.create_task(self._run_scan_and_notify(websocket))

            elif command == "connect_device":
                address = payload.get("address")
                if address:
                    asyncio.create_task(self._run_connect_and_notify(address))
                else:
                    await self.send_error_to_client(websocket, "Address is required for connect_device command.")

            elif command == "disconnect_device":
                asyncio.create_task(self._run_disconnect_and_notify(websocket))

            elif command == "start_streaming":
                await self.start_streaming(websocket)

            elif command == "stop_streaming":
                await self.stop_streaming()

            elif command == "health_check":
                await websocket.send(json.dumps({
                    "type": "health_check_response",
                    "status": "ok",
                    "clients_connected": len(self.clients),
                    "is_streaming": self.is_streaming,
                    "device_connected": self.device_manager.is_connected()
                }))
            else:
                logger.warning(f"Unknown command received: {command}")
                await self.send_error_to_client(websocket, f"Unknown command: {command}")

        except json.JSONDecodeError:
            logger.error("Invalid JSON message received")
            await self.send_error_to_client(websocket, "Invalid JSON format.")
        except Exception as e:
            logger.error(f"Error handling client message: {e}", exc_info=True)
            await self.send_error_to_client(websocket, f"Server error processing message: {e}")

    async def _run_scan_and_notify(self, websocket):
        await self.send_event_to_client(websocket, EventType.SCAN_RESULT, {"status": "scanning"})
        try:
            devices = await self.device_manager.scan_devices()
            await self.send_event_to_client(websocket, EventType.SCAN_RESULT, {"status": "completed", "devices": devices})
        except Exception as e:
            logger.error(f"Scan failed: {e}", exc_info=True)
            await self.send_event_to_client(websocket, EventType.SCAN_RESULT, {"status": "failed", "error": str(e)})

    async def _run_connect_and_notify(self, device_address: str):
        """Connect to device and start notifications."""
        try:
            # Connect to device
            if not await self.device_manager.connect(device_address):
                logger.error("Failed to connect to device")
                return

            # Start data acquisition
            if not await self.device_manager.start_data_acquisition():
                logger.error("Failed to start data acquisition")
                return

            # Start battery monitoring
            if not await self.device_manager.start_battery_monitoring():
                logger.error("Failed to start battery monitoring")
                return

            # Get device info and broadcast connection event
            device_info = self.device_manager.get_device_info()
            if device_info:
                # Create a new dictionary with only string values
                safe_device_info = {
                    "name": str(device_info["name"]),
                    "address": str(device_info["address"])
                }
                await self.broadcast_event(EventType.DEVICE_CONNECTED, safe_device_info)
                logger.info(f"Device connected: {safe_device_info}")
            else:
                logger.error("Failed to get device info after connection")

        except Exception as e:
            logger.error(f"Error in _run_connect_and_notify: {e}", exc_info=True)
            await self._cleanup_connection()

    async def _cleanup_connection(self):
        """Clean up connection resources."""
        try:
            # Stop battery monitoring
            await self.device_manager.stop_battery_monitoring()
            
            # Stop data acquisition
            await self.device_manager.stop_data_acquisition()
            
            # Disconnect device
            await self.device_manager.disconnect()
            
            # Broadcast disconnection event
            await self.broadcast_event(EventType.DEVICE_DISCONNECTED, None)
            logger.info("Device disconnected and resources cleaned up")
        except Exception as e:
            logger.error(f"Error in _cleanup_connection: {e}", exc_info=True)

    async def _run_disconnect_and_notify(self, websocket):
        device_info = self.device_manager.get_device_info()
        if not device_info:
            await self.send_error_to_client(websocket, "No device currently connected.")
            return

        if self.is_streaming:
            await self.stop_streaming()

        try:
            success = await self.device_manager.disconnect()
            if success:
                await self.broadcast_event(EventType.DEVICE_DISCONNECTED, {"device_info": device_info, "reason": "user_request"})
            else:
                await self.send_error_to_client(websocket, f"Failed to disconnect device {device_info['address']}")
        except Exception as e:
            logger.error(f"Disconnection failed with exception: {e}", exc_info=True)
            await self.send_error_to_client(websocket, f"Error during disconnect: {str(e)}")

    async def start_streaming(self, websocket: Optional[websockets.WebSocketServerProtocol] = None):
        """Start the streaming task if conditions are met."""
        if not self.device_manager.is_connected():
            msg = "Cannot start streaming: Device not connected."
            logger.warning(msg)
            if websocket: await self.send_error_to_client(websocket, msg)
            return
        if not self.device_manager._notifications_started:
            msg = "Cannot start streaming: Data acquisition not started or failed."
            logger.warning(msg)
            if websocket: await self.send_error_to_client(websocket, msg)
            return

        if not self.is_streaming:
            self.is_streaming = True
            # Start the stream_data task if not already running
            if self.stream_task is None or self.stream_task.done():
                self.stream_task = asyncio.create_task(self.stream_data())
                logger.info("Created and started stream_data task.")
            else:
                logger.warning("stream_data task already exists.") # Should not happen if logic is correct

            await self.broadcast_event(EventType.STREAM_STARTED, {"status": "streaming_started"})
            logger.info("Streaming started flag set.")
        else:
            logger.info("Streaming is already active.")

    async def stop_streaming(self):
        """Stop the streaming task."""
        if self.is_streaming:
            self.is_streaming = False
            if self.stream_task:
                self.stream_task.cancel()
                try:
                    await self.stream_task # Wait for task to finish cancellation
                except asyncio.CancelledError:
                    logger.info("Streaming task successfully cancelled.")
                except Exception as e:
                    logger.error(f"Error during stream_task cancellation: {e}")
                self.stream_task = None # Clear the task reference
            await self.broadcast_event(EventType.STREAM_STOPPED, {"status": "streaming_stopped"})
            logger.info("Streaming stopped flag set.")
        else:
            logger.info("Streaming is not currently active.")

    async def stream_data(self):
        """Periodically fetches buffered data and broadcasts it."""
        logger.info("Stream data task started.")
        SEND_INTERVAL = 1.0 # Send data every 1 second
        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break # Check flag again after sleep

                # Fetch buffered data from DeviceManager
                data_batch = await self.device_manager.get_buffered_data()

                # Only send if there's actually data in the batch
                if data_batch["eeg"] or data_batch["ppg"] or data_batch["acc"]:
                    message = {
                        "type": "sensor_data",
                        "timestamp": time.time(), # Timestamp when the batch is sent
                        "eeg": data_batch["eeg"],
                        "ppg": data_batch["ppg"],
                        "acc": data_batch["acc"]
                    }
                    try:
                        await self.broadcast(json.dumps(message))
                        logger.debug(f"Sent batch: {len(data_batch['eeg'])} EEG, {len(data_batch['ppg'])} PPG, {len(data_batch['acc'])} ACC")
                    except Exception as e:
                        logger.error(f"Error broadcasting sensor data batch: {e}")

                # Add a small yield to prevent tight loop if interval is very small
                await asyncio.sleep(0.01)

        except asyncio.CancelledError:
            logger.info("Stream data task received cancellation.")
        except Exception as e:
            logger.error(f"Error in stream_data loop: {e}", exc_info=True)
            # Optionally stop streaming on error
            await self.stop_streaming()
        finally:
            logger.info("Stream data task finished.")

    async def send_event_to_client(self, websocket: websockets.WebSocketServerProtocol, event_type: EventType, data: Dict[str, Any]):
        """Send an event message to a specific client."""
        if not websocket:
            logger.warning("Attempted to send event to None websocket.")
            return
        message = {
            "type": "event",
            "event_type": event_type.value,
            "data": data
        }
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"Connection closed while sending event to {websocket.remote_address}")
            self.clients.discard(websocket)
        except Exception as e:
            logger.error(f"Error sending event to client {websocket.remote_address}: {e}")

    async def send_error_to_client(self, websocket: websockets.WebSocketServerProtocol, error_message: str):
        """Send an error event to a specific client."""
        await self.send_event_to_client(websocket, EventType.ERROR, {"error": error_message})

    async def broadcast_event(self, event_type: EventType, data: Dict[str, Any]):
        """Broadcast an event message to all connected clients."""
        message = {
            "type": "event",
            "event_type": event_type.value,
            "data": data
        }
        await self.broadcast(json.dumps(message))

    async def broadcast(self, message: str):
        """Broadcast message to all connected clients using asyncio.gather."""
        if not self.clients:
            return

        client_list = list(self.clients)
        tasks = [client.send(message) for client in client_list]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        disconnected_clients = set()
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                client = client_list[i]
                logger.warning(f"Failed to send message to client {client.remote_address}: {result}")
                if isinstance(result, websockets.exceptions.ConnectionClosed):
                    disconnected_clients.add(client)

        self.clients.difference_update(disconnected_clients)
        if disconnected_clients:
            logger.info(f"Removed {len(disconnected_clients)} disconnected clients during broadcast.")

    def get_connected_clients(self) -> int:
        """Get the number of currently connected clients"""
        return len(self.clients)
