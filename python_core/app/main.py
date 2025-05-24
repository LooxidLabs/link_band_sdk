from fastapi import FastAPI, WebSocket
from app.api import router_device, router_engine, router_metrics, router_data_center
from app.services.stream_service import StreamService
from fastapi.middleware.cors import CORSMiddleware
from app.core.server import WebSocketServer
import logging

app = FastAPI(title="Link Band Core Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["http://localhost:5173"]로 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
stream_service = StreamService()
ws_server = WebSocketServer()
logger = logging.getLogger(__name__)

app.include_router(router_device.router, prefix="/device", tags=["device"])
app.include_router(router_engine.router, prefix="/stream", tags=["engine"])
app.include_router(router_metrics.router, prefix="/metrics", tags=["metrics"])
app.include_router(router_data_center.router, prefix="/data", tags=["data_center"])

@app.on_event("startup")
async def startup_event():
    await stream_service.init_stream()
    logger.info("FastAPI server started")

@app.on_event("shutdown")
async def shutdown_event():
    await stream_service.stop_stream()
    await ws_server.stop()
    logger.info("FastAPI server stopped")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Link Band Core Engine is running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_server.handle_websocket_connection(websocket)

@app.websocket("/ws/processed")
async def processed_websocket_endpoint(websocket: WebSocket):
    await ws_server.handle_processed_websocket_connection(websocket)
