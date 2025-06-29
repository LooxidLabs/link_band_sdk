import asyncio
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class AlertCategory(Enum):
    PERFORMANCE = "PERFORMANCE"
    SENSOR = "SENSOR"
    SYSTEM = "SYSTEM"
    DATA = "DATA"

@dataclass
class Alert:
    alert_id: str
    level: AlertLevel
    category: AlertCategory
    title: str
    message: str
    timestamp: datetime
    details: Dict[str, Any]
    suggested_actions: List[str]
    acknowledged: bool = False
    resolved: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['level'] = self.level.value
        data['category'] = self.category.value
        data['timestamp'] = self.timestamp.isoformat() + "Z"
        return data

class AlertManager:
    def __init__(self):
        # 임계값 설정
        self.thresholds = {
            'cpu_usage': {
                'warning': 70.0,
                'error': 85.0, 
                'critical': 95.0
            },
            'memory_usage': {
                'warning': 80.0,
                'error': 90.0,
                'critical': 98.0
            },
            'health_score': {
                'warning': 60.0,
                'error': 40.0,
                'critical': 20.0
            },
            'buffer_usage': {
                'warning': 80.0,
                'error': 90.0,
                'critical': 95.0
            },
            'data_loss_rate': {
                'warning': 1.0,
                'error': 5.0,
                'critical': 10.0
            },
            'latency': {
                'warning': 100.0,  # ms
                'error': 200.0,
                'critical': 500.0
            },
            'error_rate': {
                'warning': 5.0,   # %
                'error': 10.0,
                'critical': 20.0
            }
        }
        
        # 활성 알림 관리
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.max_history_size = 1000
        
        # 알림 억제 (같은 유형의 알림 반복 방지)
        self.alert_cooldown: Dict[str, float] = {}
        self.cooldown_duration = 60.0  # 60초
        
        logger.info("AlertManager initialized with thresholds: %s", self.thresholds)
    
    def check_thresholds(self, metrics: Dict[str, Any]) -> List[Alert]:
        """메트릭을 확인하고 임계값을 초과한 경우 알림 생성"""
        alerts = []
        current_time = time.time()
        
        try:
            # 시스템 성능 메트릭 체크
            if 'system' in metrics:
                system_metrics = metrics['system']
                
                # CPU 사용률 체크
                if 'cpu_percent' in system_metrics:
                    alert = self._check_metric_threshold(
                        'cpu_usage',
                        system_metrics['cpu_percent'],
                        AlertCategory.PERFORMANCE,
                        "CPU 사용률",
                        "%",
                        current_time
                    )
                    if alert:
                        alerts.append(alert)
                
                # 메모리 사용률 체크
                if 'memory_percent' in system_metrics:
                    alert = self._check_metric_threshold(
                        'memory_usage',
                        system_metrics['memory_percent'],
                        AlertCategory.PERFORMANCE,
                        "메모리 사용률",
                        "%",
                        current_time
                    )
                    if alert:
                        alerts.append(alert)
            
            # 시스템 건강 점수 체크
            if 'health_score' in metrics:
                health_score_data = metrics['health_score']
                # health_score가 dict인 경우 overall_score 값 사용
                if isinstance(health_score_data, dict) and 'overall_score' in health_score_data:
                    health_score_value = health_score_data['overall_score']
                elif isinstance(health_score_data, (int, float)):
                    health_score_value = health_score_data
                else:
                    # 예상치 못한 형태의 데이터인 경우 건너뛰기
                    logger.warning(f"Unexpected health_score format: {type(health_score_data)}")
                    health_score_value = None
                
                if health_score_value is not None:
                    alert = self._check_metric_threshold(
                        'health_score',
                        health_score_value,
                        AlertCategory.SYSTEM,
                        "시스템 건강 점수",
                        "점",
                        current_time,
                        reverse_threshold=True  # 낮을수록 나쁨
                    )
                    if alert:
                        alerts.append(alert)
            
            # 스트리밍 메트릭 체크
            if 'streaming' in metrics:
                streaming_metrics = metrics['streaming']
                
                # 지연시간 체크
                if 'total_latency' in streaming_metrics:
                    alert = self._check_metric_threshold(
                        'latency',
                        streaming_metrics['total_latency'],
                        AlertCategory.PERFORMANCE,
                        "데이터 처리 지연시간",
                        "ms",
                        current_time
                    )
                    if alert:
                        alerts.append(alert)
            
            # 새로 생성된 알림들을 활성 알림에 추가
            for alert in alerts:
                self.active_alerts[alert.alert_id] = alert
                self.alert_history.append(alert)
                
                # 히스토리 크기 제한
                if len(self.alert_history) > self.max_history_size:
                    self.alert_history = self.alert_history[-self.max_history_size:]
                
                logger.warning(f"Alert generated: {alert.level.value} - {alert.title}")
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking thresholds: {e}")
            return []
    
    def _check_metric_threshold(
        self, 
        metric_name: str, 
        value: float, 
        category: AlertCategory,
        display_name: str,
        unit: str,
        current_time: float,
        reverse_threshold: bool = False
    ) -> Optional[Alert]:
        """개별 메트릭의 임계값 체크"""
        
        if metric_name not in self.thresholds:
            return None
        
        thresholds = self.thresholds[metric_name]
        
        # 알림 억제 체크
        cooldown_key = f"{metric_name}_{category.value}"
        if cooldown_key in self.alert_cooldown:
            if current_time - self.alert_cooldown[cooldown_key] < self.cooldown_duration:
                return None
        
        # 임계값 결정 (reverse_threshold: 낮을수록 나쁜 경우)
        alert_level = None
        threshold_value = None
        
        if reverse_threshold:
            # 건강 점수 등 - 낮을수록 나쁨
            if value <= thresholds['critical']:
                alert_level = AlertLevel.CRITICAL
                threshold_value = thresholds['critical']
            elif value <= thresholds['error']:
                alert_level = AlertLevel.ERROR
                threshold_value = thresholds['error']
            elif value <= thresholds['warning']:
                alert_level = AlertLevel.WARNING
                threshold_value = thresholds['warning']
        else:
            # 일반적인 경우 - 높을수록 나쁨
            if value >= thresholds['critical']:
                alert_level = AlertLevel.CRITICAL
                threshold_value = thresholds['critical']
            elif value >= thresholds['error']:
                alert_level = AlertLevel.ERROR
                threshold_value = thresholds['error']
            elif value >= thresholds['warning']:
                alert_level = AlertLevel.WARNING
                threshold_value = thresholds['warning']
        
        if alert_level is None:
            return None
        
        # 알림 생성
        alert_id = str(uuid.uuid4())
        
        # 제안 액션 생성
        suggested_actions = self._get_suggested_actions(metric_name, alert_level, value)
        
        alert = Alert(
            alert_id=alert_id,
            level=alert_level,
            category=category,
            title=f"높은 {display_name} 감지" if not reverse_threshold else f"낮은 {display_name} 감지",
            message=f"{display_name}이 {value:.1f}{unit}로 임계값 {threshold_value}{unit}을 {'초과' if not reverse_threshold else '미달'}했습니다.",
            timestamp=datetime.utcnow(),
            details={
                'metric_name': metric_name,
                'current_value': value,
                'threshold': threshold_value,
                'unit': unit,
                'duration': self._calculate_duration(metric_name, current_time)
            },
            suggested_actions=suggested_actions
        )
        
        # 쿨다운 설정
        self.alert_cooldown[cooldown_key] = current_time
        
        return alert
    
    def _get_suggested_actions(self, metric_name: str, level: AlertLevel, value: float) -> List[str]:
        """메트릭과 레벨에 따른 제안 액션 생성"""
        
        actions = []
        
        if metric_name == 'cpu_usage':
            if level == AlertLevel.WARNING:
                actions = [
                    "시스템 리소스 사용량 확인",
                    "불필요한 백그라운드 프로세스 확인"
                ]
            elif level == AlertLevel.ERROR:
                actions = [
                    "높은 CPU 사용률의 프로세스 식별 및 종료",
                    "스트리밍 간격 조정 고려"
                ]
            elif level == AlertLevel.CRITICAL:
                actions = [
                    "즉시 시스템 리소스 확인 필요",
                    "데이터 스트리밍 일시 중단 고려",
                    "시스템 재시작 고려"
                ]
        
        elif metric_name == 'memory_usage':
            if level == AlertLevel.WARNING:
                actions = [
                    "메모리 사용량이 많은 프로세스 확인",
                    "버퍼 크기 최적화 고려"
                ]
            elif level == AlertLevel.ERROR:
                actions = [
                    "메모리 누수 확인",
                    "버퍼 크기 줄이기",
                    "가비지 컬렉션 강제 실행"
                ]
            elif level == AlertLevel.CRITICAL:
                actions = [
                    "즉시 메모리 확보 필요",
                    "시스템 재시작 고려",
                    "메모리 증설 검토"
                ]
        
        elif metric_name == 'health_score':
            if level == AlertLevel.WARNING:
                actions = [
                    "시스템 상태 상세 확인",
                    "센서 연결 상태 점검"
                ]
            elif level == AlertLevel.ERROR:
                actions = [
                    "시스템 진단 실행",
                    "에러 로그 확인",
                    "센서 재연결 시도"
                ]
            elif level == AlertLevel.CRITICAL:
                actions = [
                    "즉시 시스템 점검 필요",
                    "전체 시스템 재시작 고려",
                    "기술 지원 문의"
                ]
        
        elif metric_name == 'latency':
            if level == AlertLevel.WARNING:
                actions = [
                    "네트워크 연결 상태 확인",
                    "처리 큐 상태 점검"
                ]
            elif level == AlertLevel.ERROR:
                actions = [
                    "데이터 처리 병목 지점 확인",
                    "배치 크기 조정",
                    "스트리밍 간격 조정"
                ]
            elif level == AlertLevel.CRITICAL:
                actions = [
                    "데이터 처리 파이프라인 점검",
                    "시스템 리소스 긴급 확보",
                    "일시적 데이터 스트리밍 중단"
                ]
        
        else:
            actions = [
                "시스템 상태 확인",
                "로그 파일 검토",
                "관리자에게 문의"
            ]
        
        return actions
    
    def _calculate_duration(self, metric_name: str, current_time: float) -> str:
        """알림 지속 시간 계산 (단순화된 버전)"""
        # 실제로는 메트릭별로 지속 시간을 추적해야 하지만, 
        # 여기서는 쿨다운 기반으로 간단히 계산
        cooldown_key = f"{metric_name}_start_time"
        if cooldown_key not in self.alert_cooldown:
            self.alert_cooldown[cooldown_key] = current_time
            return "방금 시작"
        
        duration_seconds = current_time - self.alert_cooldown[cooldown_key]
        
        if duration_seconds < 60:
            return f"{int(duration_seconds)}초"
        elif duration_seconds < 3600:
            return f"{int(duration_seconds / 60)}분 {int(duration_seconds % 60)}초"
        else:
            hours = int(duration_seconds / 3600)
            minutes = int((duration_seconds % 3600) / 60)
            return f"{hours}시간 {minutes}분"
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """알림 확인 처리"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].acknowledged = True
            logger.info(f"Alert acknowledged: {alert_id}")
            return True
        return False
    
    def resolve_alert(self, alert_id: str) -> bool:
        """알림 해결 처리"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.acknowledged = True
            del self.active_alerts[alert_id]
            logger.info(f"Alert resolved: {alert_id}")
            return True
        return False
    
    def get_active_alerts(self, level: Optional[AlertLevel] = None, category: Optional[AlertCategory] = None) -> List[Alert]:
        """활성 알림 목록 조회"""
        alerts = list(self.active_alerts.values())
        
        if level:
            alerts = [alert for alert in alerts if alert.level == level]
        
        if category:
            alerts = [alert for alert in alerts if alert.category == category]
        
        # 최신순 정렬
        alerts.sort(key=lambda x: x.timestamp, reverse=True)
        
        return alerts
    
    def get_alert_history(self, hours: int = 24) -> List[Alert]:
        """알림 히스토리 조회"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        recent_alerts = [
            alert for alert in self.alert_history 
            if alert.timestamp >= cutoff_time
        ]
        
        # 최신순 정렬
        recent_alerts.sort(key=lambda x: x.timestamp, reverse=True)
        
        return recent_alerts
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """알림 요약 정보"""
        active_alerts = list(self.active_alerts.values())
        
        summary = {
            'total_active': len(active_alerts),
            'by_level': {
                'critical': len([a for a in active_alerts if a.level == AlertLevel.CRITICAL]),
                'error': len([a for a in active_alerts if a.level == AlertLevel.ERROR]),
                'warning': len([a for a in active_alerts if a.level == AlertLevel.WARNING]),
                'info': len([a for a in active_alerts if a.level == AlertLevel.INFO])
            },
            'by_category': {
                'performance': len([a for a in active_alerts if a.category == AlertCategory.PERFORMANCE]),
                'sensor': len([a for a in active_alerts if a.category == AlertCategory.SENSOR]),
                'system': len([a for a in active_alerts if a.category == AlertCategory.SYSTEM]),
                'data': len([a for a in active_alerts if a.category == AlertCategory.DATA])
            },
            'acknowledged': len([a for a in active_alerts if a.acknowledged]),
            'unacknowledged': len([a for a in active_alerts if not a.acknowledged])
        }
        
        return summary
    
    def update_thresholds(self, new_thresholds: Dict[str, Dict[str, float]]) -> bool:
        """임계값 업데이트"""
        try:
            for metric_name, thresholds in new_thresholds.items():
                if metric_name in self.thresholds:
                    self.thresholds[metric_name].update(thresholds)
                    logger.info(f"Updated thresholds for {metric_name}: {thresholds}")
            return True
        except Exception as e:
            logger.error(f"Error updating thresholds: {e}")
            return False

# 전역 AlertManager 인스턴스
global_alert_manager = AlertManager() 