from fastapi import FastAPI
from app.api import router_device, router_engine, router_recording, router_metrics
from app.services.stream_service import StreamService
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Link Band Core Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 또는 ["http://localhost:5173"]로 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
stream_service = StreamService()

app.include_router(router_device.router, prefix="/device", tags=["Device"])
app.include_router(router_engine.router, prefix="/stream", tags=["Engine"])
app.include_router(router_recording.router, prefix="/recordings", tags=["Recordings"])
app.include_router(router_metrics.router, prefix="/metrics", tags=["Metrics"])

@app.on_event("startup")
async def startup_event():
    await stream_service.init_stream()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Link Band Core Engine is running"}
