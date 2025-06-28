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
from app.core.signal_processing import SignalProcessor
from app.core.device_registry import DeviceRegistry

class Device:
    def __init__(self, address: str, name: str):
        self.address = address
        self.name = name
        self.status = DeviceStatus.DISCONNECTED
        self.client: Optional[BleakClient] = None

# Link Band SDK 통합 로깅 사용
from .logging_config import get_device_logger, LogTags, log_device_connection, log_error

logger = get_device_logger(__name__)

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
    def __init__(self, registry: DeviceRegistry, server_disconnect_callback: Optional[Callable] = None):
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        self.signal_processor = SignalProcessor()
        self.registry = registry
        
        self.devices: Dict[str, Device] = {}
        self.connection_callbacks: List[Callable] = []
        self.disconnection_callbacks: List[Callable] = []
        self.server_disconnect_callback = server_disconnect_callback
        self._client: Optional[BleakClient] = None
        self._notifications_started = False
        self.battery_running = False
        
        # Raw data buffers
        self._eeg_buffer: List[Dict[str, Any]] = []
        self._ppg_buffer: List[Dict[str, Any]] = []
        self._acc_buffer: List[Dict[str, Any]] = []
        self._battery_buffer: List[Dict[str, Any]] = []
        
        # Processed data buffers
        self._processed_eeg_buffer: List[Dict[str, Any]] = []
        self._processed_ppg_buffer: List[Dict[str, Any]] = []
        self._processed_acc_buffer: List[Dict[str, Any]] = []
        
        self._battery_level: Optional[int] = None
        self._last_eeg_timestamp = 0
        self._last_ppg_timestamp = 0
        self._last_acc_timestamp = 0
        self._last_battery_timestamp = 0
        self._eeg_sampling_rate = 0
        self._ppg_sampling_rate = 0
        self._acc_sampling_rate = 0
        self._battery_sampling_rate = 0
        self._device_info: Optional[Dict[str, Any]] = None
        self._connection_status = DeviceStatus.DISCONNECTED
        self.scan_results: List[Dict[str, Any]] = []
        
        # 버퍼 크기 상수 추가
        self.EEG_BUFFER_SIZE = 1000
        self.PPG_BUFFER_SIZE = 1000
        self.ACC_BUFFER_SIZE = 1000
        self.BATTERY_BUFFER_SIZE = 100
        self.PROCESSED_BUFFER_SIZE = 1000  # 처리된 데이터 버퍼 크기
        
        # 데이터 처리 상태 플래그
        self._is_processing = False
        self._last_eeg_time = 0
        self._last_ppg_time = 0
        self._last_acc_time = 0
        self._last_battery_time = 0
        
        # 데이터 수집 상태
        self._data_acquisition_started = False
        self._battery_monitoring_started = False

        # 샘플 카운터 초기화
        self.eeg_sample_count = 0
        self.ppg_sample_count = 0
        self.acc_sample_count = 0
        self.bat_sample_count = 0
        self.last_sample_log_time = time.time()

        self.processed_data_callbacks = []

        # 스캔 캐시 (스캔 결과를 일정 시간 캐시)
        self._cached_devices: List[Any] = []
        self._cache_timestamp = 0
        self._cache_duration = 30  # 30초간 캐시 유지

    @property
    def battery_buffer(self):
        return self._battery_buffer

    async def scan_devices(self) -> List[Dict[str, Any]]:
        """Scan for available BLE devices."""
        import platform
        
        # 모든 플랫폼에서 일관된 타임아웃 사용 (Windows는 조금 더 길게)
        is_windows = platform.system() == "Windows"
        timeout = 12.0 if is_windows else 8.0
        
        self.logger.info(f"Scanning for BLE devices... (ONLY FOR LOOXID LINK BANDs)")
        if is_windows:
            self.logger.info(f"Windows detected: Using extended timeout ({timeout}s)")
            print(f"Windows BLE scan starting with {timeout}s timeout...")
        
        try:
            # Windows에서 더 자세한 로깅
            if is_windows:
                print("Checking Bluetooth adapter availability...")
                
            devices = await BleakScanner.discover(timeout=timeout)
            
            if is_windows:
                print(f"Raw scan found {len(devices)} total BLE devices")
                if devices:
                    print("All discovered devices:")
                    for i, dev in enumerate(devices):
                        print(f"  {i+1}. {dev.name or 'Unknown'} ({dev.address})")
                else:
                    print("No BLE devices found. Possible issues:")
                    print("  1. Bluetooth permissions not granted")
                    print("  2. No BLE devices in range")
                    print("  3. Bluetooth adapter issues")
                    print("  Run: python scripts/windows-bluetooth-check.py")
            
            # Filter for Link Band devices (LXB prefix)
            lx_devices = [dev for dev in devices if dev.name and dev.name.startswith("LXB")]
            
            # 스캔 결과를 캐시에 저장
            self._cached_devices = devices  # 전체 디바이스 목록 캐시
            self._cache_timestamp = time.time()
            
            self.logger.info(f"Scan found {len(lx_devices)} Link Band devices.")
            
            if is_windows:
                if lx_devices:
                    print(f"Found {len(lx_devices)} Link Band devices:")
                    for dev in lx_devices:
                        print(f"  - {dev.name} ({dev.address})")
                else:
                    print("No Link Band devices found.")
                    if devices:
                        print("Make sure your Link Band device:")
                        print("  1. Is powered on")
                        print("  2. Is in pairing mode")
                        print("  3. Is within range (< 10 meters)")
                        print("  4. Has sufficient battery")
            
            # 필요한 정보만 추출 (이름, 주소) + 이름이 "LXB"로 시작하는 장치만 필터링
            return [{"name": dev.name, "address": dev.address} for dev in lx_devices]
            
        except Exception as e:
            self.logger.error(f"Error during BLE scan: {e}")
            if is_windows:
                print(f"BLE scan error: {e}")
                print("Troubleshooting steps:")
                print("  1. Run as Administrator")
                print("  2. Check Windows Bluetooth permissions")
                print("  3. Restart Bluetooth service")
                print("  4. Run: python scripts/windows-bluetooth-check.py")
            return []

    async def connect(self, address: str, use_cached_device: bool = False) -> bool:
        """Connect to a specific BLE device by address."""
        if self._connection_status == DeviceStatus.CONNECTED and self._client:
            print(f"Already connected to {self.device_address}")
            return False

        print(f"Connecting to {address}...")
        try:
            import platform
            is_windows = platform.system() == "Windows"
            
            # Windows에서는 더 긴 타임아웃 사용
            find_timeout = 15.0 if is_windows else 10.0
            connect_timeout = 25.0 if is_windows else 15.0
            max_retries = 2 if is_windows else 1
            
            if is_windows:
                print(f"Windows detected: Using extended timeouts (find: {find_timeout}s, connect: {connect_timeout}s, retries: {max_retries})")
            
            device = None
            
            # 캐시된 디바이스가 있고 use_cached_device가 True면 스캔 건너뛰기
            if use_cached_device and hasattr(self, '_cached_devices'):
                device = next((dev for dev in self._cached_devices if dev.address.upper() == address.upper()), None)
                if device:
                    print(f"Using cached device: {device.name} ({device.address})")
            
            # 캐시된 디바이스가 없으면 최근 스캔 결과도 확인
            if not device and hasattr(self, '_cached_devices') and hasattr(self, '_cache_timestamp'):
                # 캐시가 5분 이내라면 사용
                if time.time() - self._cache_timestamp < 300:  # 5분
                    device = next((dev for dev in self._cached_devices if dev.address.upper() == address.upper()), None)
                    if device:
                        print(f"Using recent cached device: {device.name} ({device.address})")
            
            # 캐시된 디바이스가 없으면 스캔 시도
            if not device:
                for attempt in range(max_retries + 1):
                    if attempt > 0:
                        print(f"Retry attempt {attempt}/{max_retries}")
                        await asyncio.sleep(2)  # 재시도 전 잠시 대기
                    
                    try:
                        # 첫 번째 시도: find_device_by_address 사용
                        print(f"Attempting find_device_by_address for {address}...")
                        device = await BleakScanner.find_device_by_address(address, timeout=find_timeout)
                        
                        if device:
                            print(f"Found device via find_device_by_address: {device.name} ({device.address})")
                            break
                        else:
                            print(f"find_device_by_address failed for {address}")
                            
                            # 두 번째 시도: 일반 스캔으로 폴백
                            print(f"Fallback: Trying general device discovery...")
                            devices = await BleakScanner.discover(timeout=find_timeout)
                            print(f"Discovered {len(devices)} devices total")
                            
                            # 주소 매칭 (대소문자 무시)
                            device = next((dev for dev in devices if dev.address.upper() == address.upper()), None)
                            
                            if device:
                                print(f"Found device via general scan: {device.name} ({device.address})")
                                break
                            else:
                                print(f"Device {address} not found in general scan")
                                # 발견된 디바이스들 로깅 (디버깅용)
                                if devices:
                                    print("Available devices:")
                                    for dev in devices[:5]:  # 처음 5개만 표시
                                        print(f"  - {dev.name or 'Unknown'} ({dev.address})")
                                    if len(devices) > 5:
                                        print(f"  ... and {len(devices) - 5} more devices")
                                else:
                                    print("No devices found during scan")
                                    
                    except Exception as scan_error:
                        print(f"Scan attempt {attempt + 1} failed: {scan_error}")
                        if attempt == max_retries:
                            print(f"All scan attempts failed")
            
            if not device:
                print(f"Device {address} not found after all attempts")
                if is_windows:
                    print("Windows troubleshooting:")
                    print("  1. Make sure device is in pairing mode")
                    print("  2. Try running as Administrator")
                    print("  3. Check Windows Bluetooth permissions")
                    print("  4. Run: python scripts/windows-bluetooth-check.py")
                    print("  5. Try restarting Bluetooth adapter")
                    print("  6. Make sure device is not connected to another application")
                return False

            print(f"Found device: {device.name} ({device.address})")
            self._client = BleakClient(device, disconnected_callback=self._handle_disconnect)
            
            try:
                if is_windows:
                    print("Attempting connection with extended timeout...")
                await self._client.connect(timeout=connect_timeout)  # Windows에서 더 긴 타임아웃
            except Exception as connect_error:
                print(f"Connection failed: {connect_error}")
                if is_windows:
                    print("Windows connection troubleshooting:")
                    print("  1. Try restarting Bluetooth adapter")
                    print("  2. Remove device from Windows Bluetooth settings and retry")
                    print("  3. Run as Administrator")
                    print("  4. Check for Windows updates")
                await self._cleanup_connection()
                return False

            # 연결 상태 확인
            if not self._client or not self._client.is_connected:
                print(f"Connection verification failed")
                await self._cleanup_connection()
                return False

            print(f"BLE connection established")
            
            # 서비스 디스커버리 명시적 수행 및 대기
            print("Performing service discovery...")
            try:
                # 서비스 디스커버리 수행
                services = await self._client.get_services()
                if not services:
                    print("No services found")
                    await self._cleanup_connection()
                    return False
                
                print(f"Service discovery completed. Found {len(services.services)} services")
                
                # 중요한 특성들이 존재하는지 확인
                required_chars = [EEG_NOTIFY_CHAR_UUID, PPG_CHAR_UUID, ACCELEROMETER_CHAR_UUID]
                missing_chars = []
                
                for char_uuid in required_chars:
                    try:
                        char = services.get_characteristic(char_uuid)
                        if not char:
                            missing_chars.append(char_uuid)
                    except Exception:
                        missing_chars.append(char_uuid)
                
                if missing_chars:
                    print(f"Missing required characteristics: {missing_chars}")
                    await self._cleanup_connection()
                    return False
                
                print("All required characteristics found")
                
                # 서비스가 완전히 준비될 때까지 잠시 대기
                print("Waiting for services to stabilize...")
                await asyncio.sleep(2)
                
            except Exception as service_error:
                print(f"Service discovery failed: {service_error}")
                await self._cleanup_connection()
                return False

            # Ensure address and name are stored as strings immediately
            self.device_address = str(address) 
            raw_name = getattr(self._client, 'name', None) or device.name
            self.device_name = str(raw_name) if raw_name is not None else self.device_address
            self._connection_status = DeviceStatus.CONNECTED
            print(f"Connected to {self.device_name} ({self.device_address})")
            
            # 배터리 모니터링 먼저 시작 (실패해도 계속 진행)
            print("Starting battery monitoring...")
            battery_success = await self.start_battery_monitoring()
            if not battery_success:
                print("Battery monitoring failed, but continuing...")
            else:
                print("Battery monitoring started")
            
            # 연결 성공 후 자동으로 데이터 수집 시작
            print("Starting data acquisition...")
            acquisition_success = await self.start_data_acquisition()
            if not acquisition_success:
                print("Data acquisition failed")
                await self._cleanup_connection()
                return False
            else:
                print("Data acquisition started")
            
            return True
                
        except Exception as e:
            self.logger.error(f"Error connecting to {address}: {e}", exc_info=True)
            await self._cleanup_connection()
            return False

    async def disconnect(self) -> bool:
        """Disconnect from the currently connected BLE device."""
        if self._client and self.is_connected():
            self.logger.info(f"Disconnecting from {self.device_name} ({self.device_address})...")
            try:
                # 데이터 수집 중지 먼저 시도
                await self.stop_data_acquisition()
                await self._client.disconnect()
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
        self._eeg_buffer.clear()
        self._ppg_buffer.clear()
        self._acc_buffer.clear()
        self._battery_buffer.clear()
        
        # Reset sample counters
        self.eeg_sample_count = 0
        self.ppg_sample_count = 0
        self.acc_sample_count = 0
        self.bat_sample_count = 0
        
        # Reset all flags and references
        self._notifications_started = False
        self.battery_running = False
        self.battery_level = None  # 현재 배터리 값만 초기화하고 이전 값은 유지
        
        # Store the device info temporarily for disconnect notification
        device_info = self.get_device_info()
        
        # Clear device info
        self._client = None
        self.device_address = None
        self.device_name = None
        
        self.logger.info("Connection resources cleaned up.")
        return device_info  # Return device info for notification purposes

    def is_connected(self) -> bool:
        """Check if a device is currently connected."""
        # Ensure we return a boolean value, not a _DeprecatedIsConnectedReturn object
        return bool(self._connection_status == DeviceStatus.CONNECTED and self._client is not None and self._client.is_connected)

    def get_device_info(self) -> Optional[Dict[str, Any]]:
        """Get information about the connected device."""
        if self.is_connected():
            # Ensure name and address are explicitly converted to strings
            name = str(self.device_name) if self.device_name is not None else "Unknown"
            address = str(self.device_address) if self.device_address is not None else "Unknown"
            return {"name": name, "address": address}
        return None

    async def start_data_acquisition(self):
        """Start receiving data notifications from the device."""
        if not self.is_connected() or not self._client:
            self.logger.warning("Cannot start data acquisition: Not connected.")
            return False
        if self._notifications_started:
            self.logger.warning("Data acquisition already started.")
            return True

        self.logger.info("Starting data acquisition (EEG, PPG, ACC)...")
        
        # Windows 디버깅
        import platform
        if platform.system() == 'Windows':
            self.logger.info(f"[WINDOWS DEBUG] Running on Windows, BleakClient: {self._client}")
            self.logger.info(f"[WINDOWS DEBUG] Services available: {self._client.services is not None}")
        
        # 서비스가 준비되었는지 확인
        if not self._client.services:
            self.logger.warning("Services not ready for data acquisition")
            return False
        
        success = True
        try:
            self.logger.info(f"Starting notify for EEG ({EEG_NOTIFY_CHAR_UUID})...")
            
            # Windows 디버깅: start_notify 전후 상태 확인
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] Before EEG start_notify")
            
            await self._client.start_notify(EEG_NOTIFY_CHAR_UUID, self._handle_eeg)
            
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] After EEG start_notify - SUCCESS")
            
            self.logger.info("EEG notify started.")

            self.logger.info(f"Starting notify for PPG ({PPG_CHAR_UUID})...")
            
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] Before PPG start_notify")
            
            await self._client.start_notify(PPG_CHAR_UUID, self._handle_ppg)
            
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] After PPG start_notify - SUCCESS")
            
            self.logger.info("PPG notify started.")

            self.logger.info(f"Starting notify for ACC ({ACCELEROMETER_CHAR_UUID})...")
            
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] Before ACC start_notify")
            
            await self._client.start_notify(ACCELEROMETER_CHAR_UUID, self._handle_acc)
            
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] After ACC start_notify - SUCCESS")
            
            self.logger.info("ACC notify started.")

            self._notifications_started = True
            self.logger.info("Data acquisition started successfully.")
            
            # Windows: 잠시 대기하여 notification이 시작되도록 함
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] Waiting 1 second for notifications to stabilize...")
                await asyncio.sleep(1.0)
                self.logger.info(f"[WINDOWS DEBUG] Wait complete")
                
        except Exception as e:
            self.logger.error(f"Error starting notifications: {e}", exc_info=True)
            success = False
            # 실패 시 부분적으로 시작된 알림 중지 시도
            await self.stop_data_acquisition()
        return success

    async def stop_data_acquisition(self):
        """Stop receiving data notifications."""
        # Check connection status before attempting to stop notifications
        if not self.is_connected() or not self._client:
            self.logger.info("Cannot stop data acquisition: Not connected.")
            return False
        if not self._notifications_started:
             self.logger.info("Data acquisition not running.")
             return True # Already stopped is considered success

        self.logger.info("Stopping data acquisition...")
        success = True

        # 서비스가 초기화되어 있는지 확인
        if self._client.services is None:
            self.logger.warning("Services not initialized, skipping stop_notify calls.")
            self._notifications_started = False
            return True

        try:
            await self._client.stop_notify(EEG_NOTIFY_CHAR_UUID)
        except Exception as e:
            self.logger.error(f"Error stopping EEG notify: {e}")
            success = False

        try:
            await self._client.stop_notify(PPG_CHAR_UUID)
        except Exception as e:
            self.logger.error(f"Error stopping PPG notify: {e}")
            success = False

        try:
            await self._client.stop_notify(ACCELEROMETER_CHAR_UUID)
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

    async def _handle_eeg(self, sender, data: bytearray):
        """Handle incoming EEG data, storing in buffer."""
        try:
            # Windows 디버깅: 콜백 호출 확인
            import platform
            if platform.system() == 'Windows':
                self.logger.info(f"[WINDOWS DEBUG] EEG callback called! Data length: {len(data)} bytes")
            
            self.logger.debug(f"Received EEG data: {len(data)} bytes")
            if len(data) < 8:  # Minimum expected data length (4 bytes timestamp + 4 bytes EEG)
                self.logger.warning(f"EEG data too short: {len(data)} bytes")
                return

            time_raw = int.from_bytes(data[0:4], 'little')
            base_timestamp = time_raw / TIMESTAMP_CLOCK
            
            # 데이터 구조: 7바이트 단위로 반복 (1바이트 leadoff + 3바이트 ch1 + 3바이트 ch2)
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
                # Raw data buffer에 추가
                for sample in samples_to_add:
                    self._add_to_buffer(self._eeg_buffer, sample, self.EEG_BUFFER_SIZE)
                self.eeg_sample_count += len(samples_to_add)
                
                # Raw data WebSocket 브로드캐스트
                raw_data_package = {
                    "timestamp": time.time(),
                    "samples": samples_to_add,
                    "count": len(samples_to_add)
                }
                await self._notify_raw_data("eeg", raw_data_package)
                
                # SignalProcessor 버퍼에 추가
                self.signal_processor.add_to_buffer("eeg", samples_to_add)
                # self.logger.info(f"Added {len(samples_to_add)} EEG samples to SignalProcessor buffer")

                processed_data = await self.signal_processor.process_eeg_data()
                # self.logger.info(f"Processed EEG data: {processed_data}")
                if processed_data:
                    # 처리된 데이터를 processed buffer에 저장
                    self._add_to_buffer(self._processed_eeg_buffer, processed_data, self.PROCESSED_BUFFER_SIZE)
                    # self.logger.info(f"Added {processed_data['ch1_mean']} processed EEG samples to buffer")
                    
                    # WebSocket으로 브로드캐스트하기 위해 콜백 호출
                    await self._notify_processed_data("eeg", processed_data)
                
        except Exception as e:
            self.logger.error(f"Error handling EEG data: {e}")
            raise

    async def _handle_ppg(self, sender, data: bytearray):
        """Handle incoming PPG data, storing in buffer."""
        try:
            self.logger.debug(f"Received PPG data: {len(data)} bytes")
            if len(data) < 8:  # Minimum expected data length (4 bytes timestamp + 4 bytes PPG)
                self.logger.warning(f"PPG data too short: {len(data)} bytes")
                return

            time_raw = (data[3] << 24 | data[2] << 16 | data[1] << 8 | data[0])
            base_timestamp = time_raw / 32.768 / 1000
            
            # 데이터 구조: 4바이트 타임스탬프 + 6바이트씩 반복 (3바이트 red + 3바이트 ir)
            num_samples = (len(data) - 4) // 6

            self.logger.debug(f"PPG data: base_timestamp={base_timestamp}, num_samples={num_samples}")

            samples_to_add = []
            for sample_idx in range(num_samples):
                byte_offset = 4 + sample_idx * 6
                if byte_offset + 6 > len(data):
                    self.logger.warning(f"PPG data shorter than expected for sample {sample_idx}. Skipping remaining.")
                    break

                # Read 24-bit values for red and ir (3 bytes each)
                red_raw = (data[byte_offset] << 16 | data[byte_offset+1] << 8 | data[byte_offset+2])
                ir_raw = (data[byte_offset+3] << 16 | data[byte_offset+4] << 8 | data[byte_offset+5])
                
                # Use correct sample index for timestamp calculation
                sample_timestamp = base_timestamp + sample_idx / PPG_SAMPLE_RATE

                sample = {
                    "timestamp": sample_timestamp,
                    "red": red_raw,
                    "ir": ir_raw
                }
                samples_to_add.append(sample)
                self.logger.debug(f"PPG sample {sample_idx}: {sample}")

            if samples_to_add:
                # Raw data buffer에 추가
                for sample in samples_to_add:
                    self._add_to_buffer(self._ppg_buffer, sample, self.PPG_BUFFER_SIZE)
                self.ppg_sample_count += len(samples_to_add)
                
                # Raw data WebSocket 브로드캐스트
                raw_data_package = {
                    "timestamp": time.time(),
                    "samples": samples_to_add,
                    "count": len(samples_to_add)
                }
                await self._notify_raw_data("ppg", raw_data_package)
                
                # SignalProcessor 버퍼에 추가
                self.signal_processor.add_to_buffer("ppg", samples_to_add)
                self.logger.debug(f"Added {len(samples_to_add)} PPG samples to SignalProcessor buffer")
                
                # Process PPG data in a separate task
                processed_data = await self.signal_processor.process_ppg_data()
                if processed_data:
                    self._add_to_buffer(self._processed_ppg_buffer, processed_data, self.PROCESSED_BUFFER_SIZE)
                    
                    # WebSocket으로 브로드캐스트하기 위해 콜백 호출
                    await self._notify_processed_data("ppg", processed_data)

        except Exception as e:
            self.logger.error(f"Error processing PPG data: {e}", exc_info=True)

    async def _handle_acc(self, sender, data: bytearray):
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
                # Raw data buffer에 추가
                for sample in samples_to_add:
                    self._add_to_buffer(self._acc_buffer, sample, self.ACC_BUFFER_SIZE)
                self.acc_sample_count += len(samples_to_add)
                
                # Raw data WebSocket 브로드캐스트
                raw_data_package = {
                    "timestamp": time.time(),
                    "samples": samples_to_add,
                    "count": len(samples_to_add)
                }
                await self._notify_raw_data("acc", raw_data_package)
                
                # SignalProcessor 버퍼에 추가
                self.signal_processor.add_to_buffer("acc", samples_to_add)
                self.logger.debug(f"Added {len(samples_to_add)} ACC samples to SignalProcessor buffer")

                processed_data = await self.signal_processor.process_acc_data()
                if processed_data:
                    self._add_to_buffer(self._processed_acc_buffer, processed_data, self.PROCESSED_BUFFER_SIZE)
                    
                    # WebSocket으로 브로드캐스트하기 위해 콜백 호출
                    await self._notify_processed_data("acc", processed_data)
                
                

        except Exception as e:
            self.logger.error(f"Error processing ACC data: {e}", exc_info=True)

    async def start_battery_monitoring(self) -> bool:
        """Start monitoring battery level."""
        if not self.is_connected() or not self._client:
            self.logger.warning("Cannot start battery monitoring: Not connected.")
            return False
        if self.battery_running:
            self.logger.warning("Battery monitoring already started.")
            return True

        try:
            self.logger.info("Starting battery monitoring...")
            
            # 서비스가 준비되었는지 확인
            if not self._client.services:
                self.logger.warning("Services not ready, attempting to get services...")
                try:
                    await self._client.get_services()
                except Exception as service_error:
                    self.logger.error(f"Failed to get services for battery monitoring: {service_error}")
                    return False
            
            # 배터리 특성이 존재하는지 확인
            try:
                battery_char = self._client.services.get_characteristic(BATTERY_CHAR_UUID)
                if not battery_char:
                    self.logger.warning("Battery characteristic not found, skipping battery monitoring")
                    return False
            except Exception as char_error:
                self.logger.warning(f"Error accessing battery characteristic: {char_error}")
                return False
            
            # 먼저 현재 배터리 수준을 읽어옴
            try:
                battery_data = await self._client.read_gatt_char(BATTERY_CHAR_UUID)
                initial_battery_level = int.from_bytes(battery_data, 'little')
                
                # 초기 배터리 값을 버퍼에 추가
                timestamp = time.time()
                battery_data = {
                    "timestamp": timestamp,
                    "level": initial_battery_level
                }
                self._add_to_buffer(self._battery_buffer, battery_data, self.BATTERY_BUFFER_SIZE)
                self.logger.info(f"Initial battery level: {initial_battery_level}%")
            except Exception as read_error:
                self.logger.warning(f"Could not read initial battery level: {read_error}")
                # 초기 읽기 실패는 치명적이지 않음
            
            # 배터리 수준 변경 알림 시작
            try:
                await self._client.start_notify(BATTERY_CHAR_UUID, self._handle_battery)
                self.battery_running = True
                self.logger.info("Battery monitoring started successfully.")
                return True
            except Exception as notify_error:
                self.logger.warning(f"Could not start battery notifications: {notify_error}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error starting battery monitoring: {e}", exc_info=True)
            return False

    async def stop_battery_monitoring(self) -> bool:
        """Stop monitoring battery level."""
        if not self.is_connected() or not self._client:
            self.logger.warning("Cannot stop battery monitoring: Not connected.")
            return False
        if not self.battery_running:
            self.logger.warning("Battery monitoring not running.")
            return True

        try:
            self.logger.info("Stopping battery monitoring...")
            # 서비스가 초기화되어 있는지 확인
            if self._client.services is None:
                self.logger.warning("Services not initialized, skipping stop_notify.")
                self.battery_running = False
                self.battery_level = None
                return True

            await self._client.stop_notify(BATTERY_CHAR_UUID)
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
                    
                    self._add_to_buffer(self._battery_buffer, battery_data, self.BATTERY_BUFFER_SIZE)
                    # self.bat_sample_count += 1
                    self.logger.info(f"Battery level updated: {new_battery_level}% (Buffer size: {len(self._battery_buffer)})")
                    
                    # Raw data WebSocket 브로드캐스트 (배터리는 raw = processed)
                    raw_data_package = {
                        "timestamp": timestamp,
                        "samples": [battery_data],  # 배터리는 단일 값이므로 리스트로 감싸기
                        "count": 1
                    }
                    asyncio.create_task(self._notify_raw_data("battery", raw_data_package))
                    
                    # WebSocket으로 브로드캐스트하기 위해 콜백 호출
                    asyncio.create_task(self._notify_processed_data("battery", battery_data))
                    
        except Exception as e:
            self.logger.error(f"Error processing battery data: {e}", exc_info=True)

    def get_and_clear_eeg_buffer(self) -> List[Any]:
        """Get a copy of the EEG buffer and clear it."""
        buffer_copy = self._eeg_buffer.copy()
        self._eeg_buffer.clear()
        self.logger.debug(f"Getting and clearing EEG buffer: {len(buffer_copy)} samples")
        return buffer_copy

    def get_and_clear_ppg_buffer(self) -> List[Any]:
        """Get a copy of the PPG buffer and clear it."""
        buffer_copy = self._ppg_buffer.copy()
        self._ppg_buffer.clear()
        self.logger.debug(f"Getting and clearing PPG buffer: {len(buffer_copy)} samples")
        return buffer_copy

    def get_and_clear_acc_buffer(self) -> List[Any]:
        """Get a copy of the accelerometer buffer and clear it."""
        buffer_copy = self._acc_buffer.copy()
        self._acc_buffer.clear()
        self.logger.debug(f"Getting and clearing ACC buffer: {len(buffer_copy)} samples")
        return buffer_copy

    def get_and_clear_battery_buffer(self) -> List[Any]:
        """Get a copy of the battery buffer and clear it."""
        buffer_copy = self._battery_buffer.copy()
        self._battery_buffer.clear()
        self.logger.debug(f"Getting and clearing battery buffer: {len(buffer_copy)} samples")
        return buffer_copy

    # Legacy method - use specific getters instead
    def get_buffered_data(self) -> Dict[str, Any]:
        """Get all buffered data and clear buffers."""
        return {
            "eeg": self.get_and_clear_eeg_buffer(),
            "ppg": self.get_and_clear_ppg_buffer(),
            "acc": self.get_and_clear_acc_buffer(),
            "battery": self.get_and_clear_battery_buffer()
        }

    def clear_buffers(self):
        """Clear all data buffers."""
        self._eeg_buffer.clear()
        self._ppg_buffer.clear()
        self._acc_buffer.clear()
        self._battery_buffer.clear()
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

    def add_processed_data_callback(self, callback):
        """Add a callback function to be called when data is processed"""
        if callback not in self.processed_data_callbacks:
            self.processed_data_callbacks.append(callback)
            self.logger.info("Added new processed data callback")

    def remove_processed_data_callback(self, callback):
        """Remove a callback function"""
        if callback in self.processed_data_callbacks:
            self.processed_data_callbacks.remove(callback)
            self.logger.info("Removed processed data callback")

    async def _notify_processed_data(self, data_type: str, processed_data: dict):
        """Notify all callbacks with processed data"""
        # 클라이언트가 기대하는 processed data 형식으로 변경 (data를 배열로 감싸기)
        message_data = {
            "type": "processed_data",
            "sensor_type": data_type,
            "data": [processed_data],  # 배열로 감싸기
            "timestamp": processed_data.get("timestamp", time.time())
        }
        
        # 데이터 저장 로직 추가
        try:
            from app.core.ws_singleton import ws_server
            if ws_server and ws_server.data_recorder and ws_server.data_recorder.is_recording:
                self.logger.info(f"[DATA_STORAGE_DEBUG] Adding processed {data_type} data to recorder")
                ws_server.data_recorder.add_data(data_type, message_data)
            else:
                self.logger.debug(f"[DATA_STORAGE_DEBUG] Not recording - ws_server: {ws_server is not None}, data_recorder: {ws_server.data_recorder is not None if ws_server else False}, is_recording: {ws_server.data_recorder.is_recording if ws_server and ws_server.data_recorder else False}")
        except Exception as e:
            self.logger.error(f"Error saving processed data: {e}")
        
        for callback in self.processed_data_callbacks:
            try:
                # 직접 WebSocket으로 브로드캐스트하기 위해 특별한 키 사용
                await callback("processed_data_broadcast", message_data)
            except Exception as e:
                self.logger.error(f"Error in processed data callback: {e}")

    async def _notify_raw_data(self, data_type: str, raw_data: dict):
        """Notify callbacks about new raw data"""
        # 클라이언트가 기대하는 형식으로 변경
        message_data = {
            "type": "raw_data",
            "sensor_type": data_type,
            "data": raw_data["samples"],
            "timestamp": raw_data["timestamp"],
            "count": raw_data["count"]
        }
        
        # 데이터 저장 로직 추가
        try:
            from app.core.ws_singleton import ws_server
            if ws_server and ws_server.data_recorder and ws_server.data_recorder.is_recording:
                self.logger.info(f"[DATA_STORAGE_DEBUG] Adding raw {data_type} data to recorder")
                ws_server.data_recorder.add_data(data_type, message_data)
            else:
                self.logger.debug(f"[DATA_STORAGE_DEBUG] Not recording raw data - ws_server: {ws_server is not None}, data_recorder: {ws_server.data_recorder is not None if ws_server else False}, is_recording: {ws_server.data_recorder.is_recording if ws_server and ws_server.data_recorder else False}")
        except Exception as e:
            self.logger.error(f"Error saving raw data: {e}")
        
        for callback in self.processed_data_callbacks:
            try:
                # 직접 WebSocket으로 브로드캐스트하기 위해 특별한 키 사용
                await callback("raw_data_broadcast", message_data)
            except Exception as e:
                self.logger.error(f"Error in raw data callback: {e}")

    async def get_and_clear_processed_eeg_buffer(self) -> List[Any]:
        """Get a copy of the processed EEG buffer and clear it."""
        buffer_copy = self._processed_eeg_buffer.copy()
        self._processed_eeg_buffer.clear()
        self.logger.debug(f"Getting and clearing processed EEG buffer: {len(buffer_copy)} samples")
        return buffer_copy

    async def get_and_clear_processed_ppg_buffer(self) -> List[Any]:
        """Get a copy of the processed PPG buffer and clear it."""
        buffer_copy = self._processed_ppg_buffer.copy()
        self._processed_ppg_buffer.clear()
        self.logger.debug(f"Getting and clearing processed PPG buffer: {len(buffer_copy)} samples")
        return buffer_copy

    async def get_and_clear_processed_acc_buffer(self) -> List[Any]:
        """Get a copy of the processed ACC buffer and clear it."""
        buffer_copy = self._processed_acc_buffer.copy()
        self._processed_acc_buffer.clear()
        self.logger.debug(f"Getting and clearing processed ACC buffer: {len(buffer_copy)} samples")
        return buffer_copy
