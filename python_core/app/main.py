import logging
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import JSONResponse
from app.api import router_device, router_stream, router_metrics, router_data_center, router_monitoring, router_history
from app.services.stream_service import StreamService
from fastapi.middleware.cors import CORSMiddleware
from app.core.integrated_optimizer import IntegratedOptimizer
from app.core.server import WebSocketServer
from app.data.data_recorder import DataRecorder
from app.services.recording_service import RecordingService
from app.core.device import DeviceManager
from app.core.device_registry import DeviceRegistry
from app.services.device_service import DeviceService
from app.database.db_manager import DatabaseManager
from fastapi.staticfiles import StaticFiles
import os
import sys
import asyncio
import platform
from pathlib import Path

# Windows에서 ProactorEventLoop 대신 SelectorEventLoop 강제 사용
# 이는 Windows에서 발생하는 WebSocket "ghost connection" 문제를 해결합니다
# 참조: https://bugs.python.org/issue39010
if platform.system() == 'Windows':
    # Windows 감지 로그를 나중에 logger가 초기화된 후 출력하도록 임시 저장
    _windows_detected = True
else:
    _windows_detected = False
    
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Link Band SDK 통합 로그 시스템 초기화
from app.core.logging_config import linkband_logger, get_system_logger, LogTags

# 환경 감지 및 로그 설정
environment = os.getenv('LINKBAND_ENV', 'development')
linkband_logger.configure(
    environment=environment,
    enable_history=True,
    console_level='INFO'
)

logger = get_system_logger(__name__)

# Windows 감지 로그 출력
if _windows_detected:
    logger.info(f"[{LogTags.SYSTEM}:{LogTags.START}] Windows detected: Using SelectorEventLoop to prevent WebSocket connection issues")

app = FastAPI(
    title="Link Band SDK API",
    description="""
    **Link Band SDK API** provides comprehensive control and data management for Looxid Labs' next-generation ultra-lightweight EEG headband (Link Band 2.0).

    ## Features

    ### Device Management
    - **Bluetooth Discovery**: Scan and discover nearby Link Band devices
    - **Connection Control**: Connect/disconnect devices with automatic pairing
    - **Device Registry**: Register frequently used devices for quick access
    - **Status Monitoring**: Real-time device status and battery monitoring

    ### Real-time Data Streaming
    - **WebSocket Server**: High-performance real-time data streaming
    - **Multi-sensor Data**: EEG, PPG, ACC, and battery data
    - **Signal Processing**: Real-time filtering and processing
    - **Multiple Clients**: Support for multiple concurrent WebSocket connections

    ### Data Recording & Management
    - **Session Recording**: Start/stop recording sessions with metadata
    - **Multi-format Storage**: JSON and CSV export options
    - **Session Management**: Browse, analyze, and export recorded sessions
    - **Data Quality**: Signal quality monitoring and validation

    ### System Monitoring
    - **Performance Metrics**: CPU, memory, and system health monitoring
    - **Data Quality Metrics**: Signal quality and error rate tracking
    - **Device Metrics**: Connection stability and device performance

    ## Quick Start

    1. **Initialize Streaming**: `POST /stream/init`
    2. **Scan for Devices**: `GET /device/scan`
    3. **Connect Device**: `POST /device/connect`
    4. **Start Streaming**: `POST /stream/start`
    5. **Start Recording**: `POST /data/start-recording`

    ## WebSocket Connection

    Connect to `ws://localhost:18765` for real-time data streaming after initializing the stream server.

    ## Data Types

    - **EEG**: Electroencephalography data (raw and processed)
    - **PPG**: Photoplethysmography for heart rate monitoring
    - **ACC**: 3-axis accelerometer data for movement tracking
    - **Battery**: Device battery status and power management

    ## Support

    For technical support and documentation, visit: [Looxid Labs](https://looxidlabs.com)
    """,
    version="2.0.0",
    contact={
        "name": "Looxid Labs",
        "url": "https://looxidlabs.com",
        "email": "support@looxidlabs.com"
    },
    license_info={
        "name": "Proprietary",
        "url": "https://looxidlabs.com/license"
    },
    servers=[
        {
            "url": "http://localhost:8121",
            "description": "Development server"
        }
    ],
    tags_metadata=[
        {
            "name": "device",
            "description": "Device management operations including scanning, connection, and registration"
        },
        {
            "name": "engine", 
            "description": "Streaming engine operations for real-time data transmission via WebSocket"
        },
        {
            "name": "data_center",
            "description": "Data recording and session management operations"
        },
        {
            "name": "metrics",
            "description": "System performance and health monitoring metrics"
        }
    ]
)

# Ensure the temp_exports directory exists and mount it for static file serving
# Check if we're running in a packaged environment
if sys.platform == 'darwin' and '/Contents/Resources/python_core' in __file__:
    # We're in a packaged macOS app, use user's home directory
    home_dir = os.path.expanduser("~")
    app_data_dir = os.path.join(home_dir, "Library", "Application Support", "Link Band SDK")
    TEMP_EXPORT_DIR = os.path.join(app_data_dir, "temp_exports")
elif sys.platform == 'win32' and '\\resources\\python_core' in __file__.lower():
    # We're in a packaged Windows app, use user's AppData directory
    app_data_dir = os.path.join(os.environ.get('APPDATA', ''), "Link Band SDK")
    TEMP_EXPORT_DIR = os.path.join(app_data_dir, "temp_exports")
elif sys.platform.startswith('linux') and '/resources/python_core' in __file__:
    # We're in a packaged Linux app, use user's home directory
    home_dir = os.path.expanduser("~")
    app_data_dir = os.path.join(home_dir, ".link-band-sdk")
    TEMP_EXPORT_DIR = os.path.join(app_data_dir, "temp_exports")
else:
    # Development environment or unpackaged
    TEMP_EXPORT_DIR = "temp_exports"

if not os.path.exists(TEMP_EXPORT_DIR):
    os.makedirs(TEMP_EXPORT_DIR, exist_ok=True)

app.mount("/exports", StaticFiles(directory=TEMP_EXPORT_DIR), name="exports")

# 전역 예외 핸들러 추가
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception for request {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["http://localhost:5173"]로 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_device.router, prefix="/device", tags=["device"])
app.include_router(router_stream.router, prefix="/stream", tags=["engine"])
app.include_router(router_metrics.router, prefix="/metrics", tags=["metrics"])
app.include_router(router_data_center.router, prefix="/data", tags=["data_center"])
app.include_router(router_monitoring.router, prefix="/monitoring", tags=["monitoring"])
app.include_router(router_history.router, prefix="/history", tags=["history"])

@app.on_event("startup")
async def startup_event():
    from app.core.utils import ensure_port_available
    
    logger.info(f"[{LogTags.SERVER}:{LogTags.START}] Starting Link Band SDK Server")

    # Ensure required ports are available
    ws_host = "localhost"  # localhost 사용으로 통일
    ws_port = 18765
    logger.info(f"[{LogTags.SERVER}] [1/8] Checking port availability...")
    if not ensure_port_available(ws_port):
        logger.error(f"[{LogTags.SERVER}:{LogTags.FAILED}] [1/8] Failed to free WebSocket port {ws_port}, server may fail to start")
    else:
        logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [1/8] Port {ws_port} is available")

    # Initialize core services
    logger.info(f"[{LogTags.SERVER}] [2/8] Initializing database...")
    db_manager_instance = DatabaseManager(db_path="database/data_center.db")
    app.state.db_manager = db_manager_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [2/8] Database initialized")

    logger.info(f"[{LogTags.SERVER}] [3/8] Initializing device registry...")
    device_registry_instance = DeviceRegistry()
    app.state.device_registry = device_registry_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [3/8] Device registry initialized")

    logger.info(f"[{LogTags.SERVER}] [4/8] Initializing data recorder...")
    data_recorder_instance = DataRecorder()
    app.state.data_recorder = data_recorder_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [4/8] Data recorder initialized")

    logger.info(f"[{LogTags.SERVER}] [5/8] Initializing device manager...")
    device_manager_instance = DeviceManager(device_registry_instance)
    app.state.device_manager = device_manager_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [5/8] Device manager initialized")

    logger.info(f"[{LogTags.SERVER}] [6/8] Initializing WebSocket server...")
    ws_server_instance = WebSocketServer(
        host=ws_host,
        port=ws_port,
        data_recorder=data_recorder_instance,
        device_manager=device_manager_instance,
        device_registry=device_registry_instance
    )
    app.state.ws_server = ws_server_instance
    
    # DeviceManager에 WebSocket 서버 인스턴스 설정
    device_manager_instance.ws_server = ws_server_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [6/8] WebSocket server initialized and linked to DeviceManager")

    logger.info(f"[{LogTags.SERVER}] [7/8] Initializing recording service...")
    # WebSocketServer의 data_recorder를 사용하여 RecordingService 초기화
    recording_service_instance = RecordingService(ws_server_instance.data_recorder, db_manager_instance, ws_server_instance)
    app.state.recording_service = recording_service_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [7/8] Recording service initialized")

    logger.info(f"[{LogTags.SERVER}] [8/8] Starting WebSocket server...")
    await ws_server_instance.start()
    
    # WebSocket 서버가 준비되면 FastAPI ready 상태로 설정
    ws_server_instance.set_fastapi_ready()
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] [8/8] WebSocket server started on {ws_host}:{ws_port}")

    # Initialize integrated optimizer after all components are ready
    logger.info(f"[{LogTags.SERVER}] Initializing integrated optimizer...")
    integrated_optimizer = IntegratedOptimizer()
    app.state.integrated_optimizer = integrated_optimizer
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Integrated optimizer initialized")

    # Initialize services that depend on other components
    logger.info(f"[{LogTags.SERVER}] Initializing stream service...")
    stream_service_instance = StreamService(ws_server_instance)
    app.state.stream_service = stream_service_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Stream service initialized")

    logger.info(f"[{LogTags.SERVER}] Initializing device service...")
    device_service_instance = DeviceService(device_manager_instance)
    app.state.device_service = device_service_instance
    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Device service initialized")

    # Start monitoring service
    logger.info(f"[{LogTags.SERVER}] Starting monitoring service...")
    try:
        from app.core.monitoring_service import global_monitoring_service
        global_monitoring_service.set_websocket_server(ws_server_instance)
        await global_monitoring_service.start_monitoring()
        app.state.monitoring_service = global_monitoring_service
        logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Monitoring service started")
    except Exception as e:
        logger.error(f"[{LogTags.SERVER}:{LogTags.ERROR}] Failed to start monitoring service: {e}")
        logger.info(f"[{LogTags.SERVER}] Continuing without monitoring service...")
        import traceback
        logger.error(f"[{LogTags.SERVER}:{LogTags.ERROR}] Monitoring service error details: {traceback.format_exc()}")

    logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Link Band SDK Server startup completed successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"[{LogTags.SERVER}:{LogTags.STOP}] Shutting down Link Band SDK Server...")
    
    try:
        # Stop monitoring service first
        if hasattr(app.state, 'monitoring_service'):
            logger.info(f"[{LogTags.SERVER}] Stopping monitoring service...")
            await app.state.monitoring_service.stop_monitoring()
            logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Monitoring service stopped")
        
        # Stop WebSocket server
        if hasattr(app.state, 'ws_server'):
            logger.info(f"[{LogTags.SERVER}] Stopping WebSocket server...")
            await app.state.ws_server.shutdown()
            logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] WebSocket server stopped")
        
        # Stop device manager
        if hasattr(app.state, 'device_manager'):
            logger.info(f"[{LogTags.SERVER}] Stopping device manager...")
            if app.state.device_manager.is_connected():
                await app.state.device_manager.disconnect()
            logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Device manager stopped")
        
        # Stop data recorder
        if hasattr(app.state, 'data_recorder'):
            logger.info(f"[{LogTags.SERVER}] Stopping data recorder...")
            if app.state.data_recorder.is_recording:
                app.state.data_recorder.stop_recording()
            logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Data recorder stopped")
        
        # Close database connections
        if hasattr(app.state, 'db_manager'):
            logger.info(f"[{LogTags.SERVER}] Closing database connections...")
            app.state.db_manager.close()
            logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Database connections closed")
        
        logger.info(f"[{LogTags.SERVER}:{LogTags.SUCCESS}] Link Band SDK Server shutdown completed successfully")
        
    except Exception as e:
        logger.error(f"[{LogTags.SERVER}:{LogTags.ERROR}] Error during shutdown: {e}", exc_info=True)

@app.get("/")
async def read_root():
    return {"status": "ok", "message": "Link Band Core Engine is running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logger.info(f"[FASTAPI_WS_DEBUG] === NEW WEBSOCKET CONNECTION ===")
    logger.info(f"[FASTAPI_WS_DEBUG] WebSocket client: {websocket.client}")
    logger.info(f"[FASTAPI_WS_DEBUG] WebSocket state: {websocket.client_state}")
    
    if hasattr(app.state, 'ws_server') and app.state.ws_server:
        logger.info(f"[FASTAPI_WS_DEBUG] WebSocketServer found in app.state")
        logger.info(f"[FASTAPI_WS_DEBUG] Current connected_clients count: {len(getattr(app.state.ws_server, 'connected_clients', {}))}")
        logger.info(f"[FASTAPI_WS_DEBUG] Delegating to ws_server.handle_websocket_connection")
        
        try:
            await app.state.ws_server.handle_websocket_connection(websocket)
            logger.info(f"[FASTAPI_WS_DEBUG] handle_websocket_connection completed successfully")
        except Exception as e:
            logger.error(f"[FASTAPI_WS_DEBUG] Error in handle_websocket_connection: {e}", exc_info=True)
    else:
        logger.error("[FASTAPI_WS_DEBUG] WebSocketServer not initialized in app.state for /ws endpoint.")
        logger.error(f"[FASTAPI_WS_DEBUG] app.state attributes: {dir(app.state)}")
        logger.error(f"[FASTAPI_WS_DEBUG] Closing connection with code 1011")
        await websocket.close(code=1011) 

@app.websocket("/ws/processed")
async def processed_websocket_endpoint(websocket: WebSocket):
    if hasattr(app.state, 'ws_server') and app.state.ws_server:
        await app.state.ws_server.handle_processed_websocket_connection(websocket)
    else:
        logger.error("WebSocketServer not initialized in app.state for /ws/processed endpoint.")
        await websocket.close(code=1011)
