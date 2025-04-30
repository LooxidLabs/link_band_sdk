# device.py
import asyncio
import logging
from bleak import BleakScanner, BleakClient
from typing import Callable, Dict, Any, List, Optional
from collections import deque
from bleak.backends.device import BLEDevice
from bleak.backends.characteristic import BleakGATTCharacteristic
from enum import Enum, auto

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DeviceStatus(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTING = "disconnecting"
    ERROR = "error"

# UUIDs (main.py에서 가져옴)
ACCELEROMETER_SERVICE_UUID = "75c276c3-8f97-20bc-a143-b354244886d4"
ACCELEROMETER_CHAR_UUID    = "d3d46a35-4394-e9aa-5a43-e7921120aaed"
EEG_NOTIFY_SERVICE_UUID = "df7b5d95-3afe-00a1-084c-b50895ef4f95"
EEG_NOTIFY_CHAR_UUID    = "00ab4d15-66b4-0d8a-824f-8d6f8966c6e5"
PPG_SERVICE_UUID = "1cc50ec0-6967-9d84-a243-c2267f924d1f"
PPG_CHAR_UUID    = "6c739642-23ba-818b-2045-bfe8970263f6"
BATTERY_SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb"
BATTERY_CHAR_UUID    = "00002a19-0000-1000-8000-00805f9b34fb"

# 데이터 샘플링 레이트 및 타임스탬프 계산용 (main.py 참고)
EEG_SAMPLE_RATE = 250
PPG_SAMPLE_RATE = 60
ACC_SAMPLE_RATE = 30
TIMESTAMP_CLOCK = 32768.0  # 32.768 kHz 클럭 기반 타임스탬프

class DeviceManager:
    def __init__(self, server_disconnect_callback: Optional[Callable[[Optional[str]], None]] = None):
        self.client: Optional[BleakClient] = None
        self.is_connected_flag: bool = False
        self.device_address: Optional[str] = None
        self.device_name: Optional[str] = None
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        self._notifications_started: bool = False
        self.server_disconnect_callback = server_disconnect_callback
        self.battery_running: bool = False
        self.battery_level: Optional[int] = None

        # Use deque for simple, non-blocking buffering from BLE callbacks
        self.eeg_buffer = deque()
        self.ppg_buffer = deque()
        self.acc_buffer = deque()
        self._buffer_lock = asyncio.Lock() # Lock for thread-safe buffer access

    async def scan_devices(self) -> List[Dict[str, Any]]:
        """Scan for available BLE devices."""
        self.logger.info("Scanning for BLE devices... (ONLY FOR LOOXID LINK BANDs)")
        try:
            devices = await BleakScanner.discover(timeout=5.0)
            lx_devices = [dev for dev in devices if dev.name and dev.name.startswith("LXB")]
            self.logger.info(f"Scan found {len(lx_devices)} devices.")
            # 필요한 정보만 추출 (이름, 주소) + 이름이 "LXB"로 시작하는 장치만 필터링
            return [{"name": dev.name, "address": dev.address} for dev in lx_devices]
        except Exception as e:
            self.logger.error(f"Error during BLE scan: {e}")
            return []

    async def connect(self, address: str) -> bool:
        """Connect to a specific BLE device by address."""
        if self.is_connected_flag and self.client:
            self.logger.warning(f"Already connected to {self.device_address}. Disconnect first.")
            return False

        self.logger.info(f"Attempting to connect to {address}...")
        try:
            self.client = BleakClient(address, disconnected_callback=self._handle_disconnect)
            await self.client.connect(timeout=10.0)
            self.is_connected_flag = self.client.is_connected
            if self.is_connected_flag:
                # Ensure address and name are stored as strings immediately
                self.device_address = str(address) 
                raw_name = getattr(self.client, 'name', None)
                self.device_name = str(raw_name) if raw_name is not None else self.device_address
                self.logger.info(f"Successfully connected to {self.device_name} ({self.device_address})")
                # 연결 성공 후 자동으로 데이터 수집 시작
                await self.start_data_acquisition()
                return True
            else:
                self.logger.error(f"Failed to connect to {address}.")
                await self._cleanup_connection()
                return False
        except Exception as e:
            self.logger.error(f"Error connecting to {address}: {e}", exc_info=True) # Add traceback
            await self._cleanup_connection()
            return False

    async def disconnect(self) -> bool:
        """Disconnect from the currently connected BLE device."""
        if self.client and self.is_connected_flag:
            self.logger.info(f"Disconnecting from {self.device_name} ({self.device_address})...")
            try:
                # 데이터 수집 중지 먼저 시도
                await self.stop_data_acquisition()
                await self.client.disconnect()
                # disconnected_callback이 호출되어 cleanup 수행
                # self._cleanup_connection() # 콜백에서 처리되므로 여기서 호출 안 함
                return True
            except Exception as e:
                self.logger.error(f"Error disconnecting: {e}")
                # 강제 cleanup 시도
                await self._cleanup_connection()
                return False
        else:
            self.logger.warning("No device connected to disconnect.")
            return False

    def _handle_disconnect(self, client: BleakClient):
        """Callback executed when the device unexpectedly disconnects."""
        self.logger.warning(f"Device {self.device_name} ({self.device_address}) disconnected unexpectedly.")
        # Ensure cleanup runs in the event loop associated with the client if possible
        # Or schedule it in a known running loop
        loop = asyncio.get_event_loop()
        loop.create_task(self._cleanup_connection())
        # TODO: Notify the server about the disconnection. Need a mechanism.
        # Example: self.server_disconnect_callback(self.device_address)

    async def _cleanup_connection(self):
        """Clean up connection resources."""
        self.is_connected_flag = False
        self.client = None
        self.device_address = None
        self.device_name = None
        self._notifications_started = False
        self.logger.info("Connection resources cleaned up.")


    def is_connected(self) -> bool:
        """Check if a device is currently connected."""
        # Ensure we return a boolean value, not a _DeprecatedIsConnectedReturn object
        return bool(self.is_connected_flag and self.client is not None and self.client.is_connected)

    def get_device_info(self) -> Optional[Dict[str, Any]]:
        """Get information about the connected device."""
        if self.is_connected():
            # Ensure name and address are explicitly converted to strings
            name = str(self.device_name) if self.device_name is not None else "Unknown"
            address = str(self.device_address) if self.device_address is not None else "Unknown"
            return {"name": name, "address": address}
        return None

    async def start_data_acquisition(self):
        """Start receiving data notifications from the connected device."""
        if not self.is_connected() or not self.client:
            self.logger.warning("Cannot start data acquisition: Not connected.")
            return False
        if self._notifications_started:
            self.logger.warning("Data acquisition already started.")
            return True

        self.logger.info("Starting data acquisition (EEG, PPG, ACC)...")
        success = True
        try:
            self.logger.info(f"Starting notify for EEG ({EEG_NOTIFY_CHAR_UUID})...")
            await self.client.start_notify(EEG_NOTIFY_CHAR_UUID, self._handle_eeg)
            self.logger.info("EEG notify started.")

            self.logger.info(f"Starting notify for PPG ({PPG_CHAR_UUID})...")
            await self.client.start_notify(PPG_CHAR_UUID, self._handle_ppg)
            self.logger.info("PPG notify started.")

            self.logger.info(f"Starting notify for ACC ({ACCELEROMETER_CHAR_UUID})...")
            await self.client.start_notify(ACCELEROMETER_CHAR_UUID, self._handle_acc)
            self.logger.info("ACC notify started.")

            self._notifications_started = True
            self.logger.info("Data acquisition started successfully.")
        except Exception as e:
            self.logger.error(f"Error starting notifications: {e}", exc_info=True)
            success = False
            # 실패 시 부분적으로 시작된 알림 중지 시도
            await self.stop_data_acquisition()
        return success

    async def stop_data_acquisition(self):
        """Stop receiving data notifications."""
        # Check connection status before attempting to stop notifications
        if not self.is_connected() or not self.client:
            self.logger.info("Cannot stop data acquisition: Not connected.")
            return False
        if not self._notifications_started:
             self.logger.info("Data acquisition not running.")
             return True # Already stopped is considered success

        self.logger.info("Stopping data acquisition...")
        try:
            await self.client.stop_notify(EEG_NOTIFY_CHAR_UUID)
        except Exception as e:
             self.logger.error(f"Error stopping EEG notify: {e}")
        try:
            await self.client.stop_notify(PPG_CHAR_UUID)
        except Exception as e:
             self.logger.error(f"Error stopping PPG notify: {e}")
        try:
            await self.client.stop_notify(ACCELEROMETER_CHAR_UUID)
        except Exception as e:
             self.logger.error(f"Error stopping ACC notify: {e}")

        self._notifications_started = False
        self.logger.info("Data acquisition stopped.")
        return True

    # --- Data Handling Callbacks --- (Simplified data structure for callback)

    def _handle_eeg(self, sender, data: bytearray):
        """Handle incoming EEG data, parsing logic aligned with main.py."""
        try:
            time_raw = int.from_bytes(data[0:4], 'little')
            base_timestamp = time_raw / TIMESTAMP_CLOCK # Base timestamp in seconds for the packet
            num_samples = (len(data) - 4) // 7 # Calculate number of samples dynamically

            samples_to_add = []
            for i in range(num_samples):
                offset = 4 + i * 7
                # Ensure we don't read past the end of the data buffer
                if offset + 7 > len(data):
                    self.logger.warning(f"EEG data shorter than expected for sample {i}. Skipping remaining.")
                    break

                # 1. Lead-off status (bit 3: ch2 p, bit 2: ch2 n, bit 1: ch1 p, bit 0: ch1 n)
                leadOff_raw = data[offset]
                # Extract lead-off status for each channel
                # If any of the positive or negative electrodes are disconnected (bit is 1), the channel is considered disconnected
                lead_off_ch1 = 1 if (leadOff_raw & 0x01) or (leadOff_raw & 0x02) else 0  # ch1 n or ch1 p
                lead_off_ch2 = 1 if (leadOff_raw & 0x04) or (leadOff_raw & 0x08) else 0  # ch2 n or ch2 p

                # 2. CH1 Raw (Read as unsigned, then apply manual 24-bit signed conversion)
                ch1_unsigned_raw = int.from_bytes(data[offset+1:offset+4], 'little', signed=False)
                if ch1_unsigned_raw & 0x800000: # Check MSB (bit 23)
                    ch1_raw = ch1_unsigned_raw - 0x1000000 # Apply two's complement adjustment
                else:
                    ch1_raw = ch1_unsigned_raw

                # 3. CH2 Raw (Read as unsigned, then apply manual 24-bit signed conversion)
                ch2_unsigned_raw = int.from_bytes(data[offset+4:offset+7], 'little', signed=False)
                if ch2_unsigned_raw & 0x800000: # Check MSB (bit 23)
                    ch2_raw = ch2_unsigned_raw - 0x1000000 # Apply two's complement adjustment
                else:
                    ch2_raw = ch2_unsigned_raw

                # 4. Voltage Conversion (uV) - Formula matches main.py
                ch1_uv = ch1_raw * 4.033 / 12 / (2**23 - 1) * 1e6
                ch2_uv = ch2_raw * 4.033 / 12 / (2**23 - 1) * 1e6

                # 5. Calculate timestamp for this specific sample
                sample_timestamp = base_timestamp + i / EEG_SAMPLE_RATE

                # 6. Add sample to list with separated lead-off status
                samples_to_add.append({
                    "timestamp": sample_timestamp,
                    "ch1": ch1_uv,
                    "ch2": ch2_uv,
                    "leadoff_ch1": lead_off_ch1,
                    "leadoff_ch2": lead_off_ch2
                })

            # Add all samples to the buffer
            if samples_to_add:
                self.eeg_buffer.extend(samples_to_add)

        except Exception as e:
            self.logger.error(f"Error processing EEG data: {e}", exc_info=True)

    def _handle_ppg(self, sender, data: bytearray):
        """Handle incoming PPG data, storing in buffer."""
        try:
            self.logger.debug(f"Received PPG data: {len(data)} bytes")
            if len(data) < 7:  # Minimum expected data length (4 bytes timestamp + 3 bytes PPG)
                self.logger.warning(f"PPG data too short: {len(data)} bytes")
                return

            time_raw = int.from_bytes(data[0:4], 'little')
            base_timestamp = time_raw / TIMESTAMP_CLOCK
            num_samples = (len(data) - 4) // 3  # Each sample is 3 bytes

            self.logger.debug(f"PPG data: base_timestamp={base_timestamp}, num_samples={num_samples}")

            samples_to_add = []
            for i in range(num_samples):
                offset = 4 + i * 3
                if offset + 3 > len(data):
                    self.logger.warning(f"PPG data shorter than expected for sample {i}. Skipping remaining.")
                    break

                # Read 24-bit unsigned value for PPG
                ppg_raw = int.from_bytes(data[offset:offset+3], 'little', signed=False)
                sample_timestamp = base_timestamp + i / PPG_SAMPLE_RATE

                sample = {
                    "timestamp": sample_timestamp,
                    "raw": ppg_raw
                }
                samples_to_add.append(sample)
                self.logger.debug(f"PPG sample {i}: {sample}")

            if samples_to_add:
                self.ppg_buffer.extend(samples_to_add)
                self.logger.debug(f"Added {len(samples_to_add)} PPG samples to buffer")

        except Exception as e:
            self.logger.error(f"Error processing PPG data: {e}", exc_info=True)

    def _handle_acc(self, sender, data: bytearray):
        """Handle incoming Accelerometer data, storing in buffer."""
        try:
            self.logger.debug(f"Received ACC data: {len(data)} bytes")
            if len(data) < 10:  # Minimum expected data length
                self.logger.warning(f"ACC data too short: {len(data)} bytes")
                return

            time_raw = int.from_bytes(data[0:4], 'little')
            base_timestamp = time_raw / TIMESTAMP_CLOCK
            num_samples = (len(data) - 4) // 6  # Each sample is 6 bytes (2 bytes per axis)

            self.logger.debug(f"ACC data: base_timestamp={base_timestamp}, num_samples={num_samples}")

            samples_to_add = []
            for i in range(num_samples):
                offset = 4 + i * 6
                if offset + 6 > len(data):
                    self.logger.warning(f"ACC data shorter than expected for sample {i}. Skipping remaining.")
                    break

                # Read 16-bit signed values for each axis
                acc_x = int.from_bytes(data[offset:offset+2], 'little', signed=True)
                acc_y = int.from_bytes(data[offset+2:offset+4], 'little', signed=True)
                acc_z = int.from_bytes(data[offset+4:offset+6], 'little', signed=True)

                # Calculate timestamp for this specific sample
                sample_timestamp = base_timestamp + i / ACC_SAMPLE_RATE

                sample = {
                    "timestamp": sample_timestamp,
                    "x": acc_x,
                    "y": acc_y,
                    "z": acc_z
                }
                samples_to_add.append(sample)
                self.logger.debug(f"ACC sample {i}: {sample}")

            if samples_to_add:
                self.acc_buffer.extend(samples_to_add)
                self.logger.debug(f"Added {len(samples_to_add)} ACC samples to buffer")

        except Exception as e:
            self.logger.error(f"Error processing ACC data: {e}", exc_info=True)

    async def start_battery_monitoring(self) -> bool:
        """Start monitoring battery level."""
        if not self.is_connected() or not self.client:
            self.logger.warning("Cannot start battery monitoring: Not connected.")
            return False
        if self.battery_running:
            self.logger.warning("Battery monitoring already started.")
            return True

        try:
            self.logger.info("Starting battery monitoring...")
            await self.client.start_notify(BATTERY_CHAR_UUID, self._handle_battery)
            self.battery_running = True
            self.logger.info("Battery monitoring started successfully.")
            return True
        except Exception as e:
            self.logger.error(f"Error starting battery monitoring: {e}", exc_info=True)
            return False

    async def stop_battery_monitoring(self) -> bool:
        """Stop monitoring battery level."""
        if not self.is_connected() or not self.client:
            self.logger.warning("Cannot stop battery monitoring: Not connected.")
            return False
        if not self.battery_running:
            self.logger.warning("Battery monitoring not running.")
            return True

        try:
            self.logger.info("Stopping battery monitoring...")
            await self.client.stop_notify(BATTERY_CHAR_UUID)
            self.battery_running = False
            self.battery_level = None
            self.logger.info("Battery monitoring stopped successfully.")
            return True
        except Exception as e:
            self.logger.error(f"Error stopping battery monitoring: {e}", exc_info=True)
            return False

    def _handle_battery(self, sender, data: bytearray):
        """Handle incoming battery data."""
        try:
            if len(data) >= 1:
                self.battery_level = int.from_bytes(data[0:1], 'little')
                self.logger.debug(f"Battery level: {self.battery_level}%")
        except Exception as e:
            self.logger.error(f"Error processing battery data: {e}", exc_info=True)

    async def get_buffered_data(self) -> Dict[str, Any]:
        """Atomically retrieve all data currently in the buffers and calculate averages."""
        async with self._buffer_lock:
            # Get all buffered data
            eeg_data = list(self.eeg_buffer)
            ppg_data = list(self.ppg_buffer)
            acc_data = list(self.acc_buffer)
            
            # Clear buffers
            self.eeg_buffer.clear()
            self.ppg_buffer.clear()
            self.acc_buffer.clear()

        # Calculate averages for each sensor type
        result = {
            "eeg": eeg_data,
            "ppg": ppg_data,
            "acc": acc_data,
            "battery": self.battery_level
        }

        return result
