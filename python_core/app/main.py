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

# 기본 로깅 설정 (레벨, 포맷 등)
logging.basicConfig(
    level=logging.DEBUG,  # 로그 레벨을 DEBUG로 설정하여 더 많은 정보 확인
    format='%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s - %(lineno)d - %(message)s',
    handlers=[
        logging.StreamHandler(),  # 콘솔로 로그 출력
        # logging.FileHandler("app.log") # 파일로도 로그를 남기고 싶다면 주석 해제
    ]
)

logger = logging.getLogger(__name__)  # Initialize logger for this module

app = FastAPI(
    title="LINK BAND SDK API",
    description="API for managing LINK BAND devices, data, and services.",
    version="1.0.0",
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
    logger.info("FastAPI server starting up...")

    # --- 서비스 인스턴스 생성 및 app.state에 저장 ---
    # 0. DatabaseManager (다른 서비스들보다 먼저 또는 필요에 따라)
    # db_path는 프로젝트 루트 기준이 아닌, db_manager.py 파일 위치 기준 또는 절대 경로가 될 수 있음.
    # DatabaseManager 클래스 내에서 os.path.dirname(self.db_path)를 사용하므로, 
    # main.py의 위치를 기준으로 상대 경로를 지정하면 python_core/database/data_center.db가 됨.
    db_manager_instance = DatabaseManager(db_path="database/data_center.db")
    app.state.db_manager = db_manager_instance
    logger.info(f"DatabaseManager initialized with db_path: {db_manager_instance.db_path}. Instance: {app.state.db_manager}")

    # 1. DeviceRegistry
    app.state.device_registry = DeviceRegistry()
    logger.info(f"DeviceRegistry initialized: {app.state.device_registry}")

    # 2. DeviceManager (DeviceRegistry 필요)
    app.state.device_manager = DeviceManager(registry=app.state.device_registry) 
    logger.info(f"DeviceManager initialized: {app.state.device_manager}")

    # 3. DataRecorder
    data_dir = "data"
    app.state.data_recorder = DataRecorder(data_dir=data_dir)
    logger.info(f"DataRecorder initialized. Data directory: {data_dir}. Instance: {app.state.data_recorder}")
    # logger.info(f"DataRecorder instance in app.state before WS init: {app.state.data_recorder}") # 이 로그는 이전 디버깅용, 제거 또는 유지

    # 4. WebSocketServer (DataRecorder, DeviceManager, DeviceRegistry 필요)
    ws_host = "localhost" 
    ws_port = 18765
    app.state.ws_server = WebSocketServer(
        host=ws_host, 
        port=ws_port, 
        data_recorder=app.state.data_recorder,
        device_manager=app.state.device_manager,
        device_registry=app.state.device_registry
    )
    logger.info(f"WebSocketServer created and configured: {app.state.ws_server}")

    # 5. DeviceService (DeviceManager 필요)
    app.state.device_service = DeviceService(device_manager=app.state.device_manager)
    logger.info(f"DeviceService initialized: {app.state.device_service}")

    # 6. RecordingService (DataRecorder, DatabaseManager, WebSocketServer 필요)
    app.state.recording_service = RecordingService(
        data_recorder=app.state.data_recorder,
        db_manager=app.state.db_manager, # db_manager 주입
        ws_server=app.state.ws_server
    )
    logger.info(f"RecordingService initialized: {app.state.recording_service}")

    # 7. StreamService (WebSocketServer 필요)
    app.state.stream_service = StreamService(ws_server=app.state.ws_server)
    logger.info(f"StreamService initialized and passed WebSocketServer: {app.state.stream_service}")
    # --- 서비스 인스턴스 생성 완료 ---

    try:
        logger.info("Attempting to start WebSocketServer...")
        await app.state.ws_server.start()
        logger.info("WebSocketServer started successfully.")
    except Exception as e:
        logger.error(f"Error starting WebSocketServer: {e}", exc_info=True)
        
    try:
        logger.info("Attempting to initialize StreamService (which no longer starts a new server)...")
        await app.state.stream_service.init_stream() 
        logger.info("StreamService initialized.")
    except Exception as e:
        logger.error(f"Error during StreamService initialization: {e}", exc_info=True)
    
    logger.info("Startup event complete.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI server shutting down...")
    if hasattr(app.state, 'stream_service') and app.state.stream_service:
        try:
            await app.state.stream_service.stop_stream()
            logger.info("StreamService stopped.")
        except Exception as e:
            logger.error(f"Error stopping StreamService: {e}", exc_info=True)
    
    if hasattr(app.state, 'ws_server') and app.state.ws_server:
        try:
            await app.state.ws_server.stop()
            logger.info("WebSocketServer stopped.")
        except Exception as e:
            logger.error(f"Error stopping WebSocketServer: {e}", exc_info=True)
    logger.info("FastAPI server stopped successfully.")

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
