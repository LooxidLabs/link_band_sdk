# 자주 묻는 질문 (FAQ)

Link Band SDK 사용 중 자주 발생하는 질문과 해결 방법을 정리했습니다.

## 설치 및 설정

### Q1. SDK 설치 후 실행이 안 됩니다.

**A1.** 다음 사항들을 확인해보세요:

1. **시스템 요구사항 확인**
   - Windows 10/11, macOS 10.15+, Ubuntu 18.04+
   - 최소 4GB RAM, 2GB 여유 공간

2. **방화벽 설정**
   - 포트 8121 (HTTP API)
   - 포트 18765 (WebSocket)

3. **권한 설정 (macOS)**
   ```bash
   # 애플리케이션 실행 권한 부여
   sudo xattr -rd com.apple.quarantine /Applications/Link\ Band\ SDK.app
   ```

### Q2. Link Band 디바이스가 검색되지 않습니다.

**A2.** 다음을 확인해보세요:

1. **Bluetooth 연결 확인**
   - Bluetooth가 활성화되어 있는지 확인
   - 디바이스가 페어링 모드인지 확인

2. **디바이스 상태 확인**
   - Link Band 전원이 켜져 있는지 확인
   - 배터리 잔량 확인
   - LED 상태 확인

3. **권한 설정 (Linux)**
   ```bash
   # Bluetooth 권한 설정
   sudo usermod -a -G dialout $USER
   ```

## 데이터 수집

### Q3. 데이터 수집 중 연결이 끊어집니다.

**A3.** 연결 안정성을 위한 해결책:

1. **거리 확인**
   - 디바이스와 컴퓨터 간 거리를 5m 이내로 유지
   - 장애물 제거

2. **간섭 제거**
   - 다른 Bluetooth 디바이스 끄기
   - WiFi 2.4GHz 대역과의 간섭 최소화

3. **재연결 설정**
   ```python
   # 자동 재연결 코드
   def auto_reconnect():
       max_retries = 3
       for i in range(max_retries):
           try:
               result = controller.connect_device(device_id)
               if result["success"]:
                   return True
           except:
               time.sleep(2)
       return False
   ```

### Q4. 센서 데이터 품질이 좋지 않습니다.

**A4.** 신호 품질 개선 방법:

1. **전극 접촉 확인**
   - 피부와 전극의 접촉 상태 확인
   - 필요시 전도성 젤 사용
   - 머리카락이나 기름기 제거

2. **움직임 최소화**
   - 측정 중 움직임 최소화
   - 편안한 자세 유지

3. **환경 개선**
   - 전자기기 간섭 최소화
   - 조용한 환경에서 측정

## 데이터 분석

### Q5. EEG 신호에서 노이즈가 많이 보입니다.

**A5.** 노이즈 제거 방법:

1. **하드웨어 노이즈**
   - SDK에서 제공하는 필터링 옵션 사용
   - 신호 품질 모니터링 활용

2. **움직임 아티팩트**
   - 측정 중 움직임 최소화
   - 신호 품질 지수(SQI) 확인

### Q6. PPG에서 심박수가 부정확하게 측정됩니다.

**A6.** 심박수 측정 개선:

1. **센서 위치 조정**
   - 손목 뒤쪽, 요골동맥 위에 위치
   - 너무 조이거나 느슨하지 않게 착용

2. **신호 품질 확인**
   - Visualizer에서 PPG 신호 파형 확인
   - 신호 품질 지수 모니터링

## API 사용

### Q7. API 호출 시 타임아웃이 발생합니다.

**A7.** 타임아웃 해결 방법:

1. **타임아웃 설정 증가**
   ```python
   import requests
   
   response = requests.get(
       "http://localhost:8121/data/sessions",
       timeout=30  # 30초로 증가
   )
   ```

2. **서버 상태 확인**
   - Engine 모듈에서 서버 상태 확인
   - 로그 파일에서 오류 메시지 확인

### Q8. WebSocket 연결이 자주 끊어집니다.

**A8.** WebSocket 안정성 개선:

1. **재연결 로직 구현**
   ```python
   import websocket
   import time
   
   class StableWebSocket:
       def __init__(self, url):
           self.url = url
           self.ws = None
           self.should_reconnect = True
           
       def connect(self):
           try:
               self.ws = websocket.WebSocketApp(
                   self.url,
                   on_open=self.on_open,
                   on_message=self.on_message,
                   on_error=self.on_error,
                   on_close=self.on_close
               )
               self.ws.run_forever()
           except Exception as e:
               print(f"연결 오류: {e}")
               if self.should_reconnect:
                   time.sleep(5)
                   self.connect()
   ```

2. **네트워크 상태 확인**
   - 방화벽 설정 확인
   - 포트 18765 접근 가능 여부 확인

## 데이터 관리

### Q9. 저장된 데이터를 찾을 수 없습니다.

**A9.** 데이터 저장 위치 확인:

**Windows**
```
%USERPROFILE%\Documents\Link Band SDK\sessions\
```

**macOS**
```
~/Documents/Link Band SDK/sessions/
```

**Linux**
```
~/Documents/Link Band SDK/sessions/
```

### Q10. 데이터 내보내기가 실패합니다.

**A10.** 내보내기 문제 해결:

1. **저장 공간 확인**
   - 충분한 디스크 공간이 있는지 확인

2. **권한 확인**
   - 내보내기 대상 폴더의 쓰기 권한 확인

3. **API 사용**
   ```python
   # 프로그래밍 방식으로 내보내기
   response = requests.post("http://localhost:8121/data/export", json={
       "session_id": session_id,
       "format": "csv",
       "sensors": ["EEG", "PPG", "ACC"]
   })
   ```

## 성능 최적화

### Q11. 실시간 스트리밍 시 지연이 발생합니다.

**A11.** 성능 개선 방법:

1. **시스템 리소스 확인**
   - CPU, RAM 사용량 모니터링
   - 다른 프로그램 종료

2. **네트워크 최적화**
   - 로컬 환경에서만 사용 (localhost)
   - 불필요한 네트워크 트래픽 제거

### Q12. 장시간 사용 시 메모리 사용량이 증가합니다.

**A12.** 메모리 관리:

1. **정기적인 재시작**
   - 장시간 사용 후 SDK 재시작
   - Engine 모듈 재시작

2. **데이터 버퍼 관리**
   ```python
   # 실시간 스트리밍 시 버퍼 크기 제한
   from collections import deque
   
   data_buffer = deque(maxlen=1000)  # 최대 1000개 샘플만 유지
   ```

## 문제 해결

### Q13. 로그 파일은 어디에서 확인할 수 있나요?

**A13.** 로그 파일 위치:

**Windows**
```
%APPDATA%\Link Band SDK\logs\
```

**macOS**
```
~/Library/Application Support/Link Band SDK/logs/
```

**Linux**
```
~/.config/Link Band SDK/logs/
```

### Q14. 기술 지원은 어떻게 받을 수 있나요?

**A14.** 지원 채널:

1. **GitHub Issues**: [링크](https://github.com/looxid-labs/link-band-sdk/issues)
2. **이메일 지원**: support@looxidlabs.com
3. **문서**: 이 문서의 다른 섹션들 참조

### Q15. SDK 업데이트는 어떻게 하나요?

**A15.** 업데이트 방법:

1. **자동 업데이트 확인**
   - SDK 실행 시 자동으로 업데이트 알림
   - 메뉴에서 "업데이트 확인" 선택

2. **수동 업데이트**
   - [Release 페이지](https://github.com/looxid-labs/link-band-sdk/releases)에서 최신 버전 다운로드
   - 기존 버전 제거 후 새 버전 설치

> **추가 도움이 필요하시나요?**
> 
> 이 FAQ에서 해결되지 않은 문제가 있으면 [GitHub Issues](https://github.com/looxid-labs/link-band-sdk/issues)에 문의하거나 support@looxidlabs.com으로 연락해주세요. 