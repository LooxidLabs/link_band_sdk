from fastapi import FastAPI
from app.api import router_device, router_stream, router_recording, router_metrics

app = FastAPI(title="Link Band Core Engine")

app.include_router(router_device.router, prefix="/device", tags=["Device"])
app.include_router(router_stream.router, prefix="/stream", tags=["Stream"])
app.include_router(router_recording.router, prefix="/recordings", tags=["Recordings"])
app.include_router(router_metrics.router, prefix="/metrics", tags=["Metrics"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Link Band Core Engine is running"}
