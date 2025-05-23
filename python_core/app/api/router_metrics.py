from fastapi import APIRouter
from app.services import metric_service

router = APIRouter()

@router.get("/")
def get_metrics():
    return metric_service.get_metrics()

@router.get("/metrics")
def get_metrics_detail():
    return metric_service.get_metrics()
