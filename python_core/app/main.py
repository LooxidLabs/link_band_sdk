import logging
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import JSONResponse
from app.api import router_device, router_engine, router_metrics, router_data_center
from app.services.stream_service import StreamService
from fastapi.middleware.cors import CORSMiddleware
from app.core.server import WebSocketServer
from app.data.data_recorder import DataRecorder
from app.services.recording_service import RecordingService
from app.core.device import DeviceManager
from app.core.device_registry import DeviceRegistry
from app.services.device_service import DeviceService
from app.database.db_manager import DatabaseManager
from fastapi.staticfiles import StaticFiles
import os

# 간략한 로깅 설정
logging.basicConfig(
    level=logging.INFO,  # INFO 레벨로 변경
    format='%(message)s',  # 간단한 메시지만 출력
    handlers=[
        logging.StreamHandler(),  # 콘솔로 로그 출력
    ]
)

# 특정 모듈의 로그 레벨 조정
logging.getLogger('uvicorn').setLevel(logging.WARNING)
logging.getLogger('fastapi').setLevel(logging.WARNING)
logging.getLogger('bleak').setLevel(logging.WARNING)

logger = logging.getLogger(__name__)  # Initialize logger for this module

app = FastAPI(
    title="Link Band SDK API",
    description="""
    **Link Band SDK API** provides comprehensive control and data management for Looxid Labs' next-generation ultra-lightweight EEG headband (Link Band 2.0).

    ## Features

    ### 🔗 Device Management
    - **Bluetooth Discovery**: Scan and discover nearby Link Band devices
    - **Connection Control**: Connect/disconnect devices with automatic pairing
    - **Device Registry**: Register frequently used devices for quick access
    - **Status Monitoring**: Real-time device status and battery monitoring

    ### 📊 Real-time Data Streaming
    - **WebSocket Server**: High-performance real-time data streaming
    - **Multi-sensor Data**: EEG, PPG, ACC, and battery data
    - **Signal Processing**: Real-time filtering and processing
    - **Multiple Clients**: Support for multiple concurrent WebSocket connections

    ### 💾 Data Recording & Management
    - **Session Recording**: Start/stop recording sessions with metadata
    - **Multi-format Storage**: JSON and CSV export options
    - **Session Management**: Browse, analyze, and export recorded sessions
    - **Data Quality**: Signal quality monitoring and validation

    ### 📈 System Monitoring
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
TEMP_EXPORT_DIR = "temp_exports"
if not os.path.exists(TEMP_EXPORT_DIR):
    os.makedirs(TEMP_EXPORT_DIR)

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
app.include_router(router_engine.router, prefix="/stream", tags=["engine"])
app.include_router(router_metrics.router, prefix="/metrics", tags=["metrics"])
app.include_router(router_data_center.router, prefix="/data", tags=["data_center"])

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting Link Band SDK Server...")

    # Initialize core services
    db_manager_instance = DatabaseManager(db_path="database/data_center.db")
    app.state.db_manager = db_manager_instance
    print("✓ Database initialized")

    app.state.device_registry = DeviceRegistry()
    app.state.device_manager = DeviceManager(registry=app.state.device_registry) 
    print("✓ Device manager initialized")

    data_dir = "data"
    app.state.data_recorder = DataRecorder(data_dir=data_dir)
    print("✓ Data recorder initialized")

    ws_host = "localhost" 
    ws_port = 18765
    app.state.ws_server = WebSocketServer(
        host=ws_host, 
        port=ws_port, 
        data_recorder=app.state.data_recorder,
        device_manager=app.state.device_manager,
        device_registry=app.state.device_registry
    )
    print("✓ WebSocket server configured")

    app.state.device_service = DeviceService(device_manager=app.state.device_manager)
    app.state.recording_service = RecordingService(
        data_recorder=app.state.data_recorder,
        db_manager=app.state.db_manager,
        ws_server=app.state.ws_server
    )
    app.state.stream_service = StreamService(ws_server=app.state.ws_server)
    print("✓ Services initialized")

    try:
        await app.state.ws_server.start()
        print(f"✓ WebSocket server started on {ws_host}:{ws_port}")
    except Exception as e:
        print(f"❌ Error starting WebSocket server: {e}")
        
    try:
        await app.state.stream_service.init_stream() 
        print("✓ Stream service ready")
    except Exception as e:
        print(f"❌ Error initializing stream service: {e}")
    
    print("🎉 Link Band SDK Server ready!")
    print("WebSocket server initialized")  # Signal for Electron main process

@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Shutting down Link Band SDK Server...")
    if hasattr(app.state, 'stream_service') and app.state.stream_service:
        try:
            await app.state.stream_service.stop_stream()
            print("✓ Stream service stopped")
        except Exception as e:
            print(f"❌ Error stopping stream service: {e}")
    
    if hasattr(app.state, 'ws_server') and app.state.ws_server:
        try:
            await app.state.ws_server.stop()
            print("✓ WebSocket server stopped")
        except Exception as e:
            print(f"❌ Error stopping WebSocket server: {e}")
    print("👋 Link Band SDK Server stopped")

@app.get("/")
async def read_root():
    return {"status": "ok", "message": "Link Band Core Engine is running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    if hasattr(app.state, 'ws_server') and app.state.ws_server:
        await app.state.ws_server.handle_websocket_connection(websocket)
    else:
        logger.error("WebSocketServer not initialized in app.state for /ws endpoint.")
        await websocket.close(code=1011) 

@app.websocket("/ws/processed")
async def processed_websocket_endpoint(websocket: WebSocket):
    if hasattr(app.state, 'ws_server') and app.state.ws_server:
        await app.state.ws_server.handle_processed_websocket_connection(websocket)
    else:
        logger.error("WebSocketServer not initialized in app.state for /ws/processed endpoint.")
        await websocket.close(code=1011)
