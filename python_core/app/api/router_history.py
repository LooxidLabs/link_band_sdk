"""
통합 히스토리 데이터 관리 API 라우터
메트릭, 로그, 성능 데이터의 통합 조회 및 관리 API
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from ..models.history_models import (
    SystemLog, SystemMetric, HistoryStats, StorageInfo,
    LogQuery, MetricQuery, LogLevel, MetricType,
    TrendAnalysis, DashboardData,
    CleanupRequest, OptimizeRequest
)
from ..services.history_service import get_history_service, HistoryDataService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/history", tags=["history"])

def get_service() -> HistoryDataService:
    """히스토리 서비스 의존성"""
    return get_history_service()

# ============================================================================
# 로그 관리 API (사용자가 요청한 핵심 기능)
# ============================================================================

@router.get("/logs", response_model=List[SystemLog])
async def get_logs(
    start_time: Optional[datetime] = Query(None, description="시작 시간"),
    end_time: Optional[datetime] = Query(None, description="종료 시간"),
    levels: Optional[List[LogLevel]] = Query(None, description="로그 레벨 필터"),
    logger_names: Optional[List[str]] = Query(None, description="로거 이름 필터"),
    search_text: Optional[str] = Query(None, description="검색 텍스트"),
    modules: Optional[List[str]] = Query(None, description="모듈 필터"),
    limit: int = Query(100, ge=1, le=1000, description="조회 제한"),
    offset: int = Query(0, ge=0, description="오프셋"),
    service: HistoryDataService = Depends(get_service)
):
    """
    시스템 로그 조회
    - 시간 범위, 레벨, 검색어 등으로 필터링 가능
    - 사용자가 요청한 핵심 기능: 앱에서 로그 조회 가능
    """
    try:
        query = LogQuery(
            start_time=start_time,
            end_time=end_time,
            levels=levels,
            logger_names=logger_names,
            search_text=search_text,
            modules=modules,
            limit=limit,
            offset=offset
        )
        
        logs = await service.query_logs(query)
        logger.info(f"Retrieved {len(logs)} logs")
        return logs
        
    except Exception as e:
        logger.error(f"Error retrieving logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/recent", response_model=List[SystemLog])
async def get_recent_logs(
    limit: int = Query(100, ge=1, le=1000, description="조회 제한"),
    levels: Optional[List[LogLevel]] = Query(None, description="로그 레벨 필터"),
    service: HistoryDataService = Depends(get_service)
):
    """
    최근 24시간 로그 조회
    - 빠른 접근을 위한 단축 API
    """
    try:
        logs = await service.get_recent_logs(limit=limit, levels=levels)
        logger.info(f"Retrieved {len(logs)} recent logs")
        return logs
        
    except Exception as e:
        logger.error(f"Error retrieving recent logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/search", response_model=List[SystemLog])
async def search_logs(
    search_text: str = Query(..., description="검색 텍스트"),
    limit: int = Query(100, ge=1, le=1000, description="조회 제한"),
    service: HistoryDataService = Depends(get_service)
):
    """
    로그 검색
    - 메시지 내용으로 검색
    - 사용자가 요청한 핵심 기능: 서버 문제 해결을 위한 로그 검색
    """
    try:
        logs = await service.search_logs(search_text=search_text, limit=limit)
        logger.info(f"Found {len(logs)} logs matching '{search_text}'")
        return logs
        
    except Exception as e:
        logger.error(f"Error searching logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logs/custom")
async def add_custom_log(
    level: LogLevel,
    message: str,
    logger_name: str = "api",
    module: Optional[str] = None,
    extra_data: Optional[Dict[str, Any]] = None,
    service: HistoryDataService = Depends(get_service)
):
    """
    사용자 정의 로그 추가
    - API를 통한 직접 로그 생성
    """
    try:
        await service.add_custom_log(
            level=level,
            message=message,
            logger_name=logger_name,
            module=module,
            extra_data=extra_data
        )
        
        logger.info(f"Added custom log: {level.value} - {message}")
        return {"status": "success", "message": "Log added successfully"}
        
    except Exception as e:
        logger.error(f"Error adding custom log: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# 메트릭 히스토리 API
# ============================================================================

@router.get("/metrics", response_model=List[SystemMetric])
async def get_metrics(
    start_time: Optional[datetime] = Query(None, description="시작 시간"),
    end_time: Optional[datetime] = Query(None, description="종료 시간"),
    metric_types: Optional[List[MetricType]] = Query(None, description="메트릭 타입 필터"),
    metric_names: Optional[List[str]] = Query(None, description="메트릭 이름 필터"),
    limit: int = Query(100, ge=1, le=1000, description="조회 제한"),
    offset: int = Query(0, ge=0, description="오프셋"),
    service: HistoryDataService = Depends(get_service)
):
    """
    시스템 메트릭 히스토리 조회
    - 성능 지표의 시간별 변화 추적
    """
    try:
        query = MetricQuery(
            start_time=start_time,
            end_time=end_time,
            metric_types=metric_types,
            metric_names=metric_names,
            limit=limit,
            offset=offset
        )
        
        metrics = await service.query_metrics(query)
        logger.info(f"Retrieved {len(metrics)} metrics")
        return metrics
        
    except Exception as e:
        logger.error(f"Error retrieving metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/recent", response_model=List[SystemMetric])
async def get_recent_metrics(
    limit: int = Query(100, ge=1, le=1000, description="조회 제한"),
    metric_types: Optional[List[MetricType]] = Query(None, description="메트릭 타입 필터"),
    service: HistoryDataService = Depends(get_service)
):
    """
    최근 24시간 메트릭 조회
    """
    try:
        metrics = await service.get_recent_metrics(limit=limit, metric_types=metric_types)
        logger.info(f"Retrieved {len(metrics)} recent metrics")
        return metrics
        
    except Exception as e:
        logger.error(f"Error retrieving recent metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# 통계 및 분석 API
# ============================================================================

@router.get("/stats", response_model=HistoryStats)
async def get_history_statistics(
    service: HistoryDataService = Depends(get_service)
):
    """
    히스토리 데이터 통계 조회
    - 전체 데이터 현황 및 통계
    """
    try:
        stats = await service.get_history_stats()
        logger.info("Retrieved history statistics")
        return stats
        
    except Exception as e:
        logger.error(f"Error retrieving statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/storage", response_model=StorageInfo)
async def get_storage_info(
    service: HistoryDataService = Depends(get_service)
):
    """
    스토리지 정보 조회
    - 데이터베이스 크기, 레코드 수 등
    """
    try:
        storage_info = await service.get_storage_info()
        logger.info("Retrieved storage information")
        return storage_info
        
    except Exception as e:
        logger.error(f"Error retrieving storage info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trends/logs", response_model=TrendAnalysis)
async def analyze_log_trends(
    hours: int = Query(24, ge=1, le=168, description="분석 시간 범위 (시간)"),
    service: HistoryDataService = Depends(get_service)
):
    """
    로그 트렌드 분석
    - 에러율, 이상 징후 탐지 등
    - 사용자가 요청한 핵심 기능: 성능 분석을 위한 히스토리 로그 분석
    """
    try:
        trends = await service.analyze_log_trends(hours=hours)
        logger.info(f"Analyzed log trends for {hours} hours")
        return trends
        
    except Exception as e:
        logger.error(f"Error analyzing log trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    service: HistoryDataService = Depends(get_service)
):
    """
    통합 대시보드 데이터 조회
    - 개요, 최근 데이터, 트렌드 등 종합 정보
    """
    try:
        dashboard_data = await service.get_dashboard_data()
        logger.info("Retrieved dashboard data")
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Error retrieving dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# 데이터 관리 API
# ============================================================================

@router.post("/cleanup")
async def cleanup_old_data(
    cleanup_request: CleanupRequest,
    service: HistoryDataService = Depends(get_service)
):
    """
    오래된 데이터 정리
    - 보존 기간 설정에 따른 데이터 삭제
    """
    try:
        result = await service.cleanup_old_data(
            retention_days=cleanup_request.retention_days,
            dry_run=cleanup_request.dry_run
        )
        
        action = "would delete" if cleanup_request.dry_run else "deleted"
        logger.info(f"Cleanup {action}: {result}")
        
        return {
            "status": "success",
            "action": action,
            "deleted_counts": result,
            "dry_run": cleanup_request.dry_run
        }
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def optimize_database(
    optimize_request: OptimizeRequest,
    service: HistoryDataService = Depends(get_service)
):
    """
    데이터베이스 최적화
    - 인덱스 재구성, 공간 회수 등
    """
    try:
        result = await service.optimize_database()
        logger.info(f"Database optimization completed: {result}")
        
        return {
            "status": "success",
            "optimization_result": result
        }
        
    except Exception as e:
        logger.error(f"Error during optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/flush")
async def force_flush(
    service: HistoryDataService = Depends(get_service)
):
    """
    버퍼 강제 플러시
    - 배치 처리 중인 데이터를 즉시 저장
    """
    try:
        await service.force_flush()
        logger.info("Forced flush completed")
        
        return {
            "status": "success",
            "message": "Buffer flushed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error during flush: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# 시스템 상태 API
# ============================================================================

@router.get("/health")
async def get_health_status(
    service: HistoryDataService = Depends(get_service)
):
    """
    히스토리 시스템 상태 확인
    """
    try:
        storage_info = await service.get_storage_info()
        
        health_status = {
            "status": "healthy",
            "database_size_mb": storage_info.total_size_mb,
            "total_records": sum(storage_info.record_counts.values()),
            "timestamp": datetime.now().isoformat()
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Error checking health: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        } 