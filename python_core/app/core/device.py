# device.py
import asyncio
import logging
from bleak import BleakScanner, BleakClient
from typing import Callable, Dict, Any, List, Optional
from collections import deque
from bleak.backends.device import BLEDevice
from bleak.backends.characteristic import BleakGATTCharacteristic
from enum import Enum, auto
import time

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
PPG_SAMPLE_RATE = 50
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
        self.last_battery_level: Optional[int] = None  # 이전 배터리 값 저장

        # 각 센서별 독립적인 버퍼 (FIFO 큐로 사용)
        self.eeg_buffer = []
        self.ppg_buffer = []
        self.acc_buffer = []
        self.battery_buffer = []
        
        # 각 센서별 버퍼 크기 제한
        self.EEG_BUFFER_SIZE = 2500  # 250Hz * 10s
        self.PPG_BUFFER_SIZE = 600   # 60Hz * 10s
        self.ACC_BUFFER_SIZE = 300   # 30Hz * 10s
        self.BATTERY_BUFFER_SIZE = 10  # 배터리 값 10개 저장

        self.eeg_sample_count = 0
        self.ppg_sample_count = 0
        self.acc_sample_count = 0
        self.bat_sample_count = 0
        self.last_sample_log_time = time.time()

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
            # First, try to discover the device
            devices = await BleakScanner.discover(timeout=5.0)
            device = next((dev for dev in devices if dev.address == address), None)
            
            if not device:
                self.logger.error(f"Device with address {address} not found during scanning")
                return False

            self.client = BleakClient(device, disconnected_callback=self._handle_disconnect)
            
            try:
                await self.client.connect(timeout=10.0)
            except Exception as connect_error:
                self.logger.error(f"Failed to connect to device: {connect_error}")
                await self._cleanup_connection()
                return False

            self.is_connected_flag = self.client.is_connected
            if self.is_connected_flag:
                # Ensure address and name are stored as strings immediately
                self.device_address = str(address) 
                raw_name = getattr(self.client, 'name', None) or device.name
                self.device_name = str(raw_name) if raw_name is not None else self.device_address
                self.logger.info(f"Successfully connected to {self.device_name} ({self.device_address})")
                
                # 배터리 모니터링 먼저 시작
                battery_success = await self.start_battery_monitoring()
                if not battery_success:
                    self.logger.warning("Failed to start battery monitoring")
                
                # 연결 성공 후 자동으로 데이터 수집 시작
                acquisition_success = await self.start_data_acquisition()
                if not acquisition_success:
                    self.logger.error("Failed to start data acquisition")
                    await self._cleanup_connection()
                    return False
                
                return True
            else:
                self.logger.error(f"Failed to connect to {address}.")
                await self._cleanup_connection()
                return False
                
        except Exception as e:
            self.logger.error(f"Error connecting to {address}: {e}", exc_info=True)
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
        loop = asyncio.get_event_loop()
        loop.create_task(self._cleanup_connection())
        
        # Notify the server about the disconnection
        if self.server_disconnect_callback:
            address = self.device_address
            loop.create_task(self.server_disconnect_callback(address))

    async def _cleanup_connection(self):
        """Clean up connection resources."""
        # Stop data acquisition if it's running
        if self._notifications_started:
            try:
                await self.stop_data_acquisition()
            except Exception as e:
                self.logger.error(f"Error stopping data acquisition during cleanup: {e}")

        # Stop battery monitoring if it's running
        if self.battery_running:
            try:
                await self.stop_battery_monitoring()
            except Exception as e:
                self.logger.error(f"Error stopping battery monitoring during cleanup: {e}")

        # Clear all buffers and reset counters
        self.eeg_buffer.clear()
        self.ppg_buffer.clear()
        self.acc_buffer.clear()
        self.battery_buffer.clear()
        
        # Reset sample counters
        self.eeg_sample_count = 0
        self.ppg_sample_count = 0
        self.acc_sample_count = 0
        self.bat_sample_count = 0
        
        # Reset all flags and references
        self.is_connected_flag = False
        self._notifications_started = False
        self.battery_running = False
        self.battery_level = None  # 현재 배터리 값만 초기화하고 이전 값은 유지
        
        # Store the device info temporarily for disconnect notification
        device_info = self.get_device_info()
        
        # Clear device info
        self.client = None
        self.device_address = None
        self.device_name = None
        
        self.logger.info("Connection resources cleaned up.")
        return device_info  # Return device info for notification purposes

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
        success = True

        # 서비스가 초기화되어 있는지 확인
        if self.client.services is None:
            self.logger.warning("Services not initialized, skipping stop_notify calls.")
            self._notifications_started = False
            return True

        try:
            await self.client.stop_notify(EEG_NOTIFY_CHAR_UUID)
        except Exception as e:
            self.logger.error(f"Error stopping EEG notify: {e}")
            success = False

        try:
            await self.client.stop_notify(PPG_CHAR_UUID)
        except Exception as e:
            self.logger.error(f"Error stopping PPG notify: {e}")
            success = False

        try:
            await self.client.stop_notify(ACCELEROMETER_CHAR_UUID)
        except Exception as e:
            self.logger.error(f"Error stopping ACC notify: {e}")
            success = False

        # 상태 플래그는 항상 초기화
        self._notifications_started = False
        
        if success:
            self.logger.info("Data acquisition stopped successfully.")
        else:
            self.logger.warning("Data acquisition stop completed with some errors.")
        
        return success

    # --- Data Handling Callbacks --- (Simplified data structure for callback)

    def _add_to_buffer(self, buffer: List, data: Any, max_size: int):
        """Add data to a buffer with size limit."""
        buffer.append(data)
        if len(buffer) > max_size:
            buffer.pop(0)

    def _handle_eeg(self, sender, data: bytearray):
        """Handle incoming EEG data, storing in buffer."""
        try:
            self.logger.debug(f"Received EEG data: {len(data)} bytes")
            if len(data) < 8:  # Minimum expected data length (4 bytes timestamp + 4 bytes EEG)
                self.logger.warning(f"EEG data too short: {len(data)} bytes")
                return

            time_raw = int.from_bytes(data[0:4], 'little')
            base_timestamp = time_raw / TIMESTAMP_CLOCK
            
            # 데이터 구조: 7바이트 단위로 반복 (1바이트 leadoff + 3바이트 ch1 + 3바이트 ch2)
            # 총 25개의 샘플이면 25 * 7 = 175바이트 + 앞 4바이트 헤더 = 179 바이트
            num_samples = (len(data) - 4) // 7

            self.logger.debug(f"EEG data: base_timestamp={base_timestamp}, num_samples={num_samples}")

            samples_to_add = []
            for i in range(num_samples):
                offset = 4 + i * 7
                if offset + 7 > len(data):
                    self.logger.warning(f"EEG data shorter than expected for sample {i}. Skipping remaining.")
                    break

                # Lead-off 상태 처리 (1바이트)
                leadoff_raw = data[offset]
                # bit 3: ch2 p, bit 2: ch2 n, bit 1: ch1 p, bit 0: ch1 n
                # 1이면 떨어짐, 0이면 접촉
                leadoff_ch1 = bool(leadoff_raw & 0x01)  # ch1 n
                leadoff_ch2 = bool(leadoff_raw & 0x04)  # ch2 n

                # 채널 1 (3바이트 → 24bit → 정수로 변환)
                ch1_raw = (data[offset+1] << 16 | data[offset+2] << 8 | data[offset+3])
                ch2_raw = (data[offset+4] << 16 | data[offset+5] << 8 | data[offset+6])

                # 24bit signed 처리 (MSB 기준 음수 보정)
                if ch1_raw & 0x800000:
                    ch1_raw -= 0x1000000
                if ch2_raw & 0x800000:
                    ch2_raw -= 0x1000000

                # 전압값(uV)로 변환
                ch1_uv = ch1_raw * 4.033 / 12 / (2**23 - 1) * 1e6
                ch2_uv = ch2_raw * 4.033 / 12 / (2**23 - 1) * 1e6

                sample_timestamp = base_timestamp + i / EEG_SAMPLE_RATE
                
                sample = {
                    "timestamp": sample_timestamp,
                    "ch1": ch1_uv,
                    "ch2": ch2_uv,
                    "leadoff_ch1": leadoff_ch1,
                    "leadoff_ch2": leadoff_ch2
                }
                samples_to_add.append(sample)
                self.logger.debug(f"EEG sample {i}: {sample}")

            if samples_to_add:
                for sample in samples_to_add:
                    self._add_to_buffer(self.eeg_buffer, sample, self.EEG_BUFFER_SIZE)
                self.logger.debug(f"Added {len(samples_to_add)} EEG samples to buffer")
                self.eeg_sample_count += len(samples_to_add)

        except Exception as e:
            self.logger.error(f"Error processing EEG data: {e}", exc_info=True)

    def _handle_ppg(self, sender, data: bytearray):
        """Handle incoming PPG data, storing in buffer."""
        try:
            self.logger.debug(f"Received PPG data: {len(data)} bytes")
            if len(data) < 7:  # Minimum expected data length (4 bytes timestamp + 3 bytes PPG)
                self.logger.warning(f"PPG data too short: {len(data)} bytes")
                return

            # Timestamp conversion (4 bytes)
            time_raw = (data[3] << 24 | data[2] << 16 | data[1] << 8 | data[0])
            base_timestamp = time_raw / 32.768 / 1000  # Convert to seconds

            self.logger.debug(f"PPG data: base_timestamp={base_timestamp}")

            samples_to_add = []
            # Process data in 6-byte chunks (3 bytes RED + 3 bytes IR)
            for i in range(4, len(data), 6):
                if i + 6 > len(data):
                    self.logger.warning(f"PPG data shorter than expected at offset {i}. Skipping remaining.")
                    break

                # Read RED PPG (3 bytes)
                ppg_red = (data[i] << 16 | data[i+1] << 8 | data[i+2])
                # Read IR PPG (3 bytes)
                ppg_ir = (data[i+3] << 16 | data[i+4] << 8 | data[i+5])

                sample_timestamp = base_timestamp + (i - 4) / (6 * PPG_SAMPLE_RATE)

                sample = {
                    "timestamp": sample_timestamp,
                    "red": ppg_red,
                    "ir": ppg_ir
                }
                samples_to_add.append(sample)
                self.logger.debug(f"PPG sample: {sample}")

            if samples_to_add:
                for sample in samples_to_add:
                    self._add_to_buffer(self.ppg_buffer, sample, self.PPG_BUFFER_SIZE)
                self.logger.debug(f"Added {len(samples_to_add)} PPG samples to buffer")
                self.ppg_sample_count += len(samples_to_add)

        except Exception as e:
            self.logger.error(f"Error processing PPG data: {e}", exc_info=True)

    def _handle_acc(self, sender, data: bytearray):
        """Handle incoming accelerometer data, storing in buffer."""
        try:
            self.logger.debug(f"Received ACC data: {len(data)} bytes")
            if len(data) < 10:  # Minimum expected data length (4 bytes timestamp + 6 bytes ACC)
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
                x_raw = int.from_bytes(data[offset:offset+2], 'little', signed=True)
                y_raw = int.from_bytes(data[offset+2:offset+4], 'little', signed=True)
                z_raw = int.from_bytes(data[offset+4:offset+6], 'little', signed=True)
                sample_timestamp = base_timestamp + i / ACC_SAMPLE_RATE

                sample = {
                    "timestamp": sample_timestamp,
                    "x": x_raw,
                    "y": y_raw,
                    "z": z_raw
                }
                samples_to_add.append(sample)
                self.logger.debug(f"ACC sample {i}: {sample}")

            if samples_to_add:
                for sample in samples_to_add:
                    self._add_to_buffer(self.acc_buffer, sample, self.ACC_BUFFER_SIZE)
                self.logger.debug(f"Added {len(samples_to_add)} ACC samples to buffer")
                self.acc_sample_count += len(samples_to_add)

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
            # 먼저 현재 배터리 수준을 읽어옴
            battery_data = await self.client.read_gatt_char(BATTERY_CHAR_UUID)
            initial_battery_level = int.from_bytes(battery_data, 'little')
            
            # 초기 배터리 값을 버퍼에 추가
            timestamp = time.time()
            battery_data = {
                "timestamp": timestamp,
                "level": initial_battery_level
            }
            self._add_to_buffer(self.battery_buffer, battery_data, self.BATTERY_BUFFER_SIZE)
            self.logger.info(f"Initial battery level: {initial_battery_level}%")
            
            # 배터리 수준 변경 알림 시작
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
            # 서비스가 초기화되어 있는지 확인
            if self.client.services is None:
                self.logger.warning("Services not initialized, skipping stop_notify.")
                self.battery_running = False
                self.battery_level = None
                return True

            await self.client.stop_notify(BATTERY_CHAR_UUID)
            self.battery_running = False
            self.battery_level = None
            self.logger.info("Battery monitoring stopped successfully.")
            return True
        except Exception as e:
            self.logger.error(f"Error stopping battery monitoring: {e}", exc_info=True)
            # 에러가 발생해도 배터리 모니터링 상태는 초기화
            self.battery_running = False
            self.battery_level = None
            return False

    def _handle_battery(self, sender, data: bytearray):
        """Handle incoming battery data."""
        try:
            if len(data) >= 1:
                new_battery_level = int.from_bytes(data[0:1], 'little')
                if new_battery_level is not None:
                    timestamp = time.time()
                    battery_data = {
                        "timestamp": timestamp,
                        "level": new_battery_level
                    }
                    self.battery_level = new_battery_level
                    
                    self._add_to_buffer(self.battery_buffer, battery_data, self.BATTERY_BUFFER_SIZE)
                    # self.bat_sample_count += 1
                    self.logger.info(f"Battery level updated: {new_battery_level}% (Buffer size: {len(self.battery_buffer)})")
                    
        except Exception as e:
            self.logger.error(f"Error processing battery data: {e}", exc_info=True)

    async def get_and_clear_eeg_buffer(self) -> List[Any]:
        """Get a copy of the EEG buffer and clear it."""
        buffer_copy = self.eeg_buffer.copy()
        self.eeg_buffer.clear()
        self.logger.debug(f"Getting and clearing EEG buffer: {len(buffer_copy)} samples")
        return buffer_copy

    async def get_and_clear_ppg_buffer(self) -> List[Any]:
        """Get a copy of the PPG buffer and clear it."""
        buffer_copy = self.ppg_buffer.copy()
        self.ppg_buffer.clear()
        self.logger.debug(f"Getting and clearing PPG buffer: {len(buffer_copy)} samples")
        return buffer_copy

    async def get_and_clear_acc_buffer(self) -> List[Any]:
        """Get a copy of the accelerometer buffer and clear it."""
        buffer_copy = self.acc_buffer.copy()
        self.acc_buffer.clear()
        self.logger.debug(f"Getting and clearing ACC buffer: {len(buffer_copy)} samples")
        return buffer_copy

    async def get_and_clear_battery_buffer(self) -> List[Any]:
        """Get a copy of the battery buffer and clear it."""
        buffer_copy = self.battery_buffer.copy()
        self.battery_buffer.clear()
        self.logger.debug(f"Getting and clearing battery buffer: {len(buffer_copy)} samples")
        return buffer_copy

    # Legacy method - use specific getters instead
    async def get_buffered_data(self) -> Dict[str, Any]:
        """Get all buffered data and clear buffers."""
        return {
            "eeg": await self.get_and_clear_eeg_buffer(),
            "ppg": await self.get_and_clear_ppg_buffer(),
            "acc": await self.get_and_clear_acc_buffer(),
            "battery": await self.get_and_clear_battery_buffer()
        }

    def clear_buffers(self):
        """Clear all data buffers."""
        self.eeg_buffer.clear()
        self.ppg_buffer.clear()
        self.acc_buffer.clear()
        self.battery_buffer.clear()
        self.logger.info("All data buffers cleared")

    # 샘플링 속도 계산 및 로그 (1초마다)
    def _calculate_sampling_rate(self):
        from app.core.ws_singleton import ws_server
        now = time.time()
        if now - self.last_sample_log_time >= 0.2:
            ws_server.data_stream_stats(
                eeg=self.eeg_sample_count,
                ppg=self.ppg_sample_count,
                acc=self.acc_sample_count,
                bat=self.bat_sample_count,
                bat_level=self.battery_level
            )
            print(f"[샘플링 속도] EEG: {self.eeg_sample_count} samples/sec, "
                  f"PPG: {self.ppg_sample_count} samples/sec, "
                  f"ACC: {self.acc_sample_count} samples/sec, "
                  f"BAT: {self.bat_sample_count} samples/sec, "
                  f"Battery: {self.battery_level}%")
            self.eeg_sample_count = 0
            self.ppg_sample_count = 0
            self.acc_sample_count = 0
            self.bat_sample_count = 0
            self.last_sample_log_time = now
