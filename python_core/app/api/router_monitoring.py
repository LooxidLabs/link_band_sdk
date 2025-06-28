from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta

from ..core.monitoring_service import global_monitoring_service
from ..core.alert_manager import global_alert_manager, AlertLevel, AlertCategory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@router.get("/status")
async def get_monitoring_status() -> Dict[str, Any]:
    """모니터링 시스템 전체 상태 조회"""
    try:
        # 모니터링 서비스 상태
        monitoring_status = global_monitoring_service.get_current_status()
        
        # 시스템 요약 정보
        system_summary = {
            'monitoring_active': monitoring_status['is_monitoring'],
            'active_monitoring_tasks': monitoring_status['active_tasks'],
            'last_update': monitoring_status.get('last_metrics_time'),
            'alert_summary': monitoring_status.get('alert_summary', {}),
            'uptime': _calculate_uptime()
        }
        
        return {
            'status': 'success',
            'data': {
                'system_summary': system_summary,
                'monitoring_intervals': monitoring_status.get('intervals', {}),
                'component_status': {
                    'alert_manager': 'active',
                    'performance_monitor': 'active',
                    'buffer_manager': 'active',
                    'streaming_optimizer': 'active'
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting monitoring status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def get_current_metrics() -> Dict[str, Any]:
    """현재 시스템 메트릭 조회"""
    try:
        # 최신 메트릭 수집
        metrics = await global_monitoring_service._collect_metrics()
        
        if not metrics:
            raise HTTPException(status_code=404, detail="No metrics available")
        
        # 추가 계산된 메트릭
        calculated_metrics = {
            'performance_grade': _calculate_performance_grade(metrics),
            'resource_efficiency': _calculate_resource_efficiency(metrics),
            'overall_health': metrics.get('health_score', 0.0)
        }
        
        return {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat() + "Z",
            'data': {
                'raw_metrics': metrics,
                'calculated_metrics': calculated_metrics
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting current metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/history")
async def get_metrics_history(
    hours: int = Query(1, ge=1, le=24, description="조회할 시간 범위 (시간)"),
    interval: int = Query(60, ge=10, le=300, description="데이터 간격 (초)")
) -> Dict[str, Any]:
    """메트릭 히스토리 조회 (현재는 간단한 버전)"""
    try:
        # 실제로는 데이터베이스에서 히스토리를 조회해야 하지만,
        # 현재는 최신 메트릭을 기반으로 시뮬레이션
        current_metrics = await global_monitoring_service._collect_metrics()
        
        # 시뮬레이션된 히스토리 데이터 생성
        history_data = []
        current_time = datetime.utcnow()
        
        for i in range(hours * 3600 // interval):
            timestamp = current_time - timedelta(seconds=i * interval)
            
            # 약간의 변화를 주어 시뮬레이션
            simulated_metrics = _simulate_historical_metrics(current_metrics, i)
            
            history_data.append({
                'timestamp': timestamp.isoformat() + "Z",
                'metrics': simulated_metrics
            })
        
        # 시간순 정렬 (오래된 것부터)
        history_data.reverse()
        
        return {
            'status': 'success',
            'data': {
                'period': f"{hours} hours",
                'interval': f"{interval} seconds",
                'total_points': len(history_data),
                'history': history_data
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
async def get_alerts(
    level: Optional[str] = Query(None, description="알림 레벨 필터 (INFO, WARNING, ERROR, CRITICAL)"),
    category: Optional[str] = Query(None, description="알림 카테고리 필터 (PERFORMANCE, SENSOR, SYSTEM, DATA)"),
    active_only: bool = Query(True, description="활성 알림만 조회")
) -> Dict[str, Any]:
    """알림 목록 조회"""
    try:
        alert_level = None
        if level:
            try:
                alert_level = AlertLevel(level.upper())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid alert level: {level}")
        
        alert_category = None
        if category:
            try:
                alert_category = AlertCategory(category.upper())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid alert category: {category}")
        
        if active_only:
            alerts = global_alert_manager.get_active_alerts(level=alert_level, category=alert_category)
        else:
            # 히스토리에서 조회 (24시간)
            alerts = global_alert_manager.get_alert_history(hours=24)
            
            # 필터 적용
            if alert_level:
                alerts = [alert for alert in alerts if alert.level == alert_level]
            if alert_category:
                alerts = [alert for alert in alerts if alert.category == alert_category]
        
        # 알림을 딕셔너리로 변환
        alerts_data = [alert.to_dict() for alert in alerts]
        
        return {
            'status': 'success',
            'data': {
                'total_count': len(alerts_data),
                'filters': {
                    'level': level,
                    'category': category,
                    'active_only': active_only
                },
                'alerts': alerts_data
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str) -> Dict[str, Any]:
    """알림 확인 처리"""
    try:
        success = global_alert_manager.acknowledge_alert(alert_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert not found: {alert_id}")
        
        return {
            'status': 'success',
            'message': f"Alert {alert_id} acknowledged successfully"
        }
        
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str) -> Dict[str, Any]:
    """알림 해결 처리"""
    try:
        success = global_alert_manager.resolve_alert(alert_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert not found: {alert_id}")
        
        return {
            'status': 'success',
            'message': f"Alert {alert_id} resolved successfully"
        }
        
    except Exception as e:
        logger.error(f"Error resolving alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def get_system_health() -> Dict[str, Any]:
    """시스템 건강 상태 조회"""
    try:
        health_data = await global_monitoring_service._collect_health_data()
        
        if not health_data:
            raise HTTPException(status_code=404, detail="Health data not available")
        
        # 건강 상태 요약
        overall_score = health_data.get('overall_score', 0)
        # Handle case where overall_score might be a dict
        if isinstance(overall_score, dict):
            overall_score = overall_score.get('overall_score', 0)
        
        health_summary = {
            'overall_grade': _get_health_grade(overall_score),
            'critical_issues': _count_critical_issues(),
            'recommendations': _get_health_recommendations(health_data)
        }
        
        return {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat() + "Z",
            'data': {
                'health_details': health_data,
                'health_summary': health_summary
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/buffers")
async def get_buffer_status() -> Dict[str, Any]:
    """버퍼 상태 조회"""
    try:
        buffer_data = await global_monitoring_service._collect_buffer_data()
        
        if not buffer_data:
            raise HTTPException(status_code=404, detail="Buffer data not available")
        
        # 버퍼 요약 정보
        buffer_summary = {
            'total_buffers': len(buffer_data),
            'average_usage': _calculate_average_buffer_usage(buffer_data),
            'critical_buffers': _count_critical_buffers(buffer_data),
            'efficiency_score': _calculate_buffer_efficiency_score(buffer_data)
        }
        
        return {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat() + "Z",
            'data': {
                'buffer_details': buffer_data,
                'buffer_summary': buffer_summary
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting buffer status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start")
async def start_monitoring() -> Dict[str, Any]:
    """모니터링 서비스 시작"""
    try:
        await global_monitoring_service.start_monitoring()
        
        return {
            'status': 'success',
            'message': 'Monitoring service started successfully'
        }
        
    except Exception as e:
        logger.error(f"Error starting monitoring service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_monitoring() -> Dict[str, Any]:
    """모니터링 서비스 중지"""
    try:
        await global_monitoring_service.stop_monitoring()
        
        return {
            'status': 'success',
            'message': 'Monitoring service stopped successfully'
        }
        
    except Exception as e:
        logger.error(f"Error stopping monitoring service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 헬퍼 함수들

def _calculate_uptime() -> str:
    """시스템 가동 시간 계산 (간단한 버전)"""
    # 실제로는 서버 시작 시간을 추적해야 함
    return "Unknown"

def _calculate_performance_grade(metrics: Dict[str, Any]) -> str:
    """성능 등급 계산"""
    try:
        system_metrics = metrics.get('system', {})
        cpu_usage = system_metrics.get('cpu_percent', 0)
        memory_usage = system_metrics.get('memory_percent', 0)
        
        avg_usage = (cpu_usage + memory_usage) / 2
        
        if avg_usage < 30:
            return "A"
        elif avg_usage < 50:
            return "B"
        elif avg_usage < 70:
            return "C"
        elif avg_usage < 85:
            return "D"
        else:
            return "F"
    except Exception:
        return "Unknown"

def _calculate_resource_efficiency(metrics: Dict[str, Any]) -> float:
    """리소스 효율성 계산"""
    try:
        system_metrics = metrics.get('system', {})
        cpu_usage = system_metrics.get('cpu_percent', 0)
        memory_usage = system_metrics.get('memory_percent', 0)
        
        # 효율성 = 100 - 평균 사용률
        efficiency = 100 - ((cpu_usage + memory_usage) / 2)
        return max(0, efficiency)
    except Exception:
        return 0.0

def _simulate_historical_metrics(current_metrics: Dict[str, Any], time_offset: int) -> Dict[str, Any]:
    """히스토리 메트릭 시뮬레이션"""
    import random
    
    try:
        simulated = current_metrics.copy()
        
        if 'system' in simulated:
            # 약간의 랜덤 변화 추가
            simulated['system']['cpu_percent'] += random.uniform(-5, 5)
            simulated['system']['memory_percent'] += random.uniform(-2, 2)
            
            # 범위 제한
            simulated['system']['cpu_percent'] = max(0, min(100, simulated['system']['cpu_percent']))
            simulated['system']['memory_percent'] = max(0, min(100, simulated['system']['memory_percent']))
        
        return simulated
    except Exception:
        return current_metrics

def _get_health_grade(score) -> str:
    """건강 점수를 등급으로 변환"""
    # Handle case where score might be a dict
    if isinstance(score, dict):
        score = score.get('overall_score', 0)
    
    # Ensure score is numeric
    try:
        score = float(score)
    except (ValueError, TypeError):
        score = 0
    
    if score >= 90:
        return "EXCELLENT"
    elif score >= 75:
        return "GOOD"
    elif score >= 60:
        return "FAIR"
    elif score >= 40:
        return "POOR"
    else:
        return "CRITICAL"

def _count_critical_issues() -> int:
    """심각한 문제 개수 계산"""
    try:
        critical_alerts = global_alert_manager.get_active_alerts(level=AlertLevel.CRITICAL)
        return len(critical_alerts)
    except Exception:
        return 0

def _get_health_recommendations(health_data: Dict[str, Any]) -> List[str]:
    """건강 상태 기반 권장사항 생성"""
    recommendations = []
    
    try:
        overall_score_data = health_data.get('overall_score', {})
        # Handle nested overall_score structure
        if isinstance(overall_score_data, dict):
            overall_score = overall_score_data.get('overall_score', 0)
        else:
            overall_score = overall_score_data
        
        if overall_score < 60:
            recommendations.append("시스템 전반적인 점검이 필요합니다")
        
        components = health_data.get('components', {})
        
        for component, data in components.items():
            score = data.get('score', 0)
            if score < 60:
                recommendations.append(f"{component} 최적화가 필요합니다")
        
        if not recommendations:
            recommendations.append("시스템이 정상적으로 작동 중입니다")
            
    except Exception:
        recommendations.append("권장사항을 생성할 수 없습니다")
    
    return recommendations

def _calculate_average_buffer_usage(buffer_data: Dict[str, Any]) -> float:
    """평균 버퍼 사용률 계산"""
    try:
        total_usage = 0.0
        count = 0
        
        for sensor_data in buffer_data.values():
            usage = sensor_data.get('usage_percent', 0)
            total_usage += usage
            count += 1
        
        return total_usage / count if count > 0 else 0.0
    except Exception:
        return 0.0

def _count_critical_buffers(buffer_data: Dict[str, Any]) -> int:
    """임계 상태 버퍼 개수"""
    try:
        critical_count = 0
        
        for sensor_data in buffer_data.values():
            usage = sensor_data.get('usage_percent', 0)
            if usage > 90:  # 90% 이상 사용 시 임계 상태
                critical_count += 1
        
        return critical_count
    except Exception:
        return 0

def _calculate_buffer_efficiency_score(buffer_data: Dict[str, Any]) -> float:
    """버퍼 효율성 점수 계산"""
    try:
        total_efficiency = 0.0
        count = 0
        
        for sensor_data in buffer_data.values():
            efficiency = sensor_data.get('efficiency', 0)
            total_efficiency += efficiency
            count += 1
        
        return total_efficiency / count if count > 0 else 0.0
    except Exception:
        return 0.0 