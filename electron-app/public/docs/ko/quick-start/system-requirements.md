# 시스템 요구사항

Link Band SDK를 원활하게 사용하기 위한 시스템 요구사항을 확인해보세요. 모든 요구사항을 만족하면 최상의 성능을 경험할 수 있습니다.

## 지원 운영체제

### Windows
- **Windows 11** (권장)
- **Windows 10** (버전 1903 이상)
- Windows Server 2019/2022

*Windows 8.1 이하는 제한적 지원*

### macOS
- **macOS Sonoma 14.x** (권장)
- macOS Ventura 13.x
- macOS Monterey 12.x
- macOS Big Sur 11.x

Apple Silicon (M1/M2/M3) 네이티브 지원 및 Intel x64 호환성 모드

### Linux
테스트된 배포판:
- Ubuntu 20.04/22.04 LTS
- Debian 11/12
- CentOS 8/9
- Fedora 36+

## 하드웨어 요구사항

### 최소 요구사항
- **CPU**: 듀얼 코어 2.0GHz 이상 (Intel Core i3-6100, AMD Ryzen 3 2200G, Apple M1 동급)
- **메모리**: 4GB RAM (8GB 권장)
- **저장공간**: 설치용 500MB + 데이터 저장용 2GB
- **네트워크**: 인터넷 연결 (초기 설치 및 업데이트용)

### 권장 요구사항
- **CPU**: 쿼드 코어 3.0GHz 이상 (Intel Core i5-8400, AMD Ryzen 5 3600, Apple M1 Pro 동급)
- **메모리**: 8GB RAM 이상 (16GB 권장 - 대용량 데이터 처리시)
- **저장공간**: SSD 10GB 이상 (빠른 읽기/쓰기 속도 500MB/s+)
- **디스플레이**: 1920x1080 이상

## 연결성 요구사항
- **Bluetooth 5.0+**: Link Band 디바이스 연결용
- **USB 포트**: 충전 및 펌웨어 업데이트용
- **네트워크 포트**: 8121 (HTTP API), 18765 (WebSocket)

> **⚠️ 성능 최적화 권장사항**
> 
> - 실시간 데이터 처리를 위해 **8GB 이상 RAM** 권장
> - 장시간 기록시 **SSD 사용** 필수
> - 백그라운드 앱 최소화로 CPU 자원 확보
> - 바이러스 스캐너에서 SDK 폴더 예외 설정

> 
> 시스템 요구사항을 모두 확인하셨다면, 이제 [설치 가이드](installation.md)로 넘어가서 Link Band SDK를 설치해보세요! 