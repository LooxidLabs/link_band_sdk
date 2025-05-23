from enum import Enum

class EventType(Enum):
    """Event types for WebSocket communication"""
    DEVICE_CONNECTED = "device_connected"
    DEVICE_DISCONNECTED = "device_disconnected"
    DEVICE_CONNECTION_FAILED = "device_connection_failed"
    DEVICE_INFO = "device_info"
    SCAN_RESULT = "scan_result"
    BLUETOOTH_STATUS = "bluetooth_status"
    STREAM_STARTED = "stream_started"
    STREAM_STOPPED = "stream_stopped"
    DATA_RECEIVED = "data_received"
    ERROR = "error"
    REGISTERED_DEVICES = "registered_devices" 