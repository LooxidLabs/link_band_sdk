import type { Language } from '../stores/languageStore';

// 한국어 번역
export const ko = {
  // Navigation
  nav: {
    engine: 'Engine',
    linkband: 'Link Band',
    visualizer: 'Visualizer',
    datacenter: 'Data Center',
    documents: 'Documents',
    settings: 'Settings',
  },
  
  // Documents
  documents: {
    title: 'Documents',
    subtitle: 'Link Band SDK 문서',
    searchPlaceholder: '문서 검색...',
    
    // Sidebar
    sidebar: {
      quickStart: '빠른 시작',
      userGuide: '사용자 가이드',
      dataManagement: '데이터 관리',
      apiReference: 'API 참조',
      examples: '예제 및 FAQ',
    },
    
    // Quick Start
    quickStart: {
      title: '빠른 시작 가이드',
      description: 'Link Band SDK를 처음 사용하는 분들을 위한 가이드입니다.',
      
      overview: {
        title: '개요',
        content: `
        <div class="space-y-6">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">🧠 Link Band SDK란?</h4>
            <p class="text-blue-800 dark:text-blue-200">
              Link Band SDK는 Looxid Labs의 차세대 초경량 뇌파 밴드(Link Band 2.0)를 위한 <strong>통합 개발 도구</strong>입니다. 
              연구자, 개발자, 그리고 뇌파 데이터에 관심 있는 모든 분들을 위해 설계되었습니다.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h5 class="font-semibold text-green-900 dark:text-green-100 mb-2">📊 실시간 데이터 수집</h5>
              <ul class="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>• EEG (뇌파): 2채널 고품질 신호</li>
                <li>• PPG (맥파): 심박수 및 혈류량</li>
                <li>• ACC (가속도): 3축 움직임 감지</li>
                <li>• 배터리: 실시간 전력 상태</li>
              </ul>
            </div>

            <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h5 class="font-semibold text-purple-900 dark:text-purple-100 mb-2">⚡ 고급 신호 처리</h5>
              <ul class="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                <li>• 실시간 노이즈 필터링</li>
                <li>• 주파수 대역 분석 (Alpha, Beta, Theta 등)</li>
                <li>• 신호 품질 지수 (SQI) 계산</li>
                <li>• 집중도, 이완도 등 뇌파 지수</li>
              </ul>
            </div>
          </div>

          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h5 class="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">🎯 주요 활용 분야</h5>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <div>• 뇌파 연구</div>
              <div>• 집중력 훈련</div>
              <div>• 스트레스 모니터링</div>
              <div>• 수면 분석</div>
              <div>• 게임 개발</div>
              <div>• 교육 도구</div>
              <div>• 헬스케어</div>
              <div>• BCI 연구</div>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h5 class="font-semibold mb-2">💡 왜 Link Band SDK를 선택해야 할까요?</h5>
            <ul class="space-y-2 text-sm">
              <li><strong>🚀 즉시 사용 가능:</strong> 복잡한 설정 없이 5분 안에 데이터 수집 시작</li>
              <li><strong>🔧 개발자 친화적:</strong> REST API, WebSocket, Python/JavaScript 지원</li>
              <li><strong>📈 실시간 시각화:</strong> 직관적인 그래프와 차트로 데이터 모니터링</li>
              <li><strong>💾 완벽한 데이터 관리:</strong> 자동 저장, 내보내기, 세션 관리</li>
              <li><strong>🌐 크로스 플랫폼:</strong> Windows, macOS, Linux 모두 지원</li>
            </ul>
          </div>
        </div>
        `,
      },
      
      systemRequirements: {
        title: '시스템 요구사항',
        content: `
        <div class="space-y-6">
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-red-900 dark:text-red-100 mb-3">⚠️ 설치 전 필수 확인사항</h4>
            <p class="text-red-800 dark:text-red-200 text-sm">
              Link Band SDK를 원활하게 사용하기 위해서는 아래 요구사항을 모두 만족해야 합니다. 
              설치 전 반드시 확인해주세요.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 class="font-semibold text-blue-900 dark:text-blue-100 mb-3">💻 운영체제</h5>
                <div class="space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="text-green-600">✅</span>
                    <span class="text-sm"><strong>Windows 10/11</strong> (64-bit)</span>
                  </div>
                  <div class="pl-6 text-xs text-gray-600 dark:text-gray-400">
                    • 최소: Windows 10 버전 1903 이상<br>
                    • 권장: Windows 11 최신 버전
                  </div>
                  
                  <div class="flex items-center space-x-2">
                    <span class="text-green-600">✅</span>
                    <span class="text-sm"><strong>macOS 10.15</strong> (Catalina) 이상</span>
                  </div>
                  <div class="pl-6 text-xs text-gray-600 dark:text-gray-400">
                    • 최소: macOS 10.15<br>
                    • 권장: macOS 12 (Monterey) 이상<br>
                    • Intel/Apple Silicon 모두 지원
                  </div>
                  
                  <div class="flex items-center space-x-2">
                    <span class="text-green-600">✅</span>
                    <span class="text-sm"><strong>Ubuntu 18.04</strong> 이상</span>
                  </div>
                  <div class="pl-6 text-xs text-gray-600 dark:text-gray-400">
                    • 최소: Ubuntu 18.04 LTS<br>
                    • 권장: Ubuntu 20.04 LTS 이상<br>
                    • 기타 Debian 계열 배포판도 지원
                  </div>
                </div>
              </div>

              <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 class="font-semibold text-green-900 dark:text-green-100 mb-3">🔧 하드웨어</h5>
                <div class="space-y-3 text-sm">
                  <div class="flex justify-between items-center">
                    <span><strong>메모리 (RAM)</strong></span>
                    <span class="text-green-700 dark:text-green-300">8GB / 16GB</span>
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 pl-2">
                    최소 8GB, 권장 16GB (대용량 데이터 처리 시)
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <span><strong>저장공간</strong></span>
                    <span class="text-green-700 dark:text-green-300">2GB / 10GB</span>
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 pl-2">
                    설치용 2GB + 데이터 저장용 여유공간
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <span><strong>프로세서</strong></span>
                    <span class="text-green-700 dark:text-green-300">x64</span>
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 pl-2">
                    64-bit 프로세서 필수 (Intel/AMD/Apple Silicon)
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h5 class="font-semibold text-purple-900 dark:text-purple-100 mb-3">📡 연결 요구사항</h5>
                <div class="space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="text-green-600">✅</span>
                    <span class="text-sm"><strong>Bluetooth 5.0</strong> 이상</span>
                  </div>
                  <div class="pl-6 text-xs text-gray-600 dark:text-gray-400">
                    Link Band 디바이스와의 안정적인 연결을 위해 필수
                  </div>
                  
                  <div class="flex items-center space-x-2">
                    <span class="text-blue-600">ℹ️</span>
                    <span class="text-sm"><strong>인터넷 연결</strong> (선택사항)</span>
                  </div>
                  <div class="pl-6 text-xs text-gray-600 dark:text-gray-400">
                    업데이트 확인 및 클라우드 기능 사용 시
                  </div>
                </div>
              </div>

              <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h5 class="font-semibold text-orange-900 dark:text-orange-100 mb-3">⚡ 성능 권장사항</h5>
                <div class="space-y-2 text-sm">
                  <div><strong>실시간 처리용:</strong></div>
                  <ul class="text-xs space-y-1 pl-4">
                    <li>• CPU: Intel i5 또는 동급 이상</li>
                    <li>• RAM: 16GB 이상</li>
                    <li>• SSD: 빠른 데이터 저장을 위해</li>
                  </ul>
                  
                  <div class="mt-3"><strong>연구/개발용:</strong></div>
                  <ul class="text-xs space-y-1 pl-4">
                    <li>• CPU: Intel i7 또는 동급 이상</li>
                    <li>• RAM: 32GB 이상</li>
                    <li>• GPU: CUDA 지원 (선택사항)</li>
                  </ul>
                </div>
              </div>

              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h5 class="font-semibold mb-2">🔍 호환성 확인 방법</h5>
                <div class="text-sm space-y-2">
                  <div><strong>Windows:</strong> 설정 > 시스템 > 정보</div>
                  <div><strong>macOS:</strong> 🍎 메뉴 > 이 Mac에 관하여</div>
                  <div><strong>Linux:</strong> <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">uname -a</code></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        `,
      },
      
      installation: {
        title: '설치 방법',
        content: `
        1. <strong>SDK 다운로드</strong>
           • 공식 웹사이트에서 최신 버전 다운로드
           • 운영체제에 맞는 설치 파일 선택
        
        2. <strong>설치 실행</strong>
           • 다운로드한 설치 파일 실행
           • 설치 마법사 지시사항 따라 진행
        
        3. <strong>첫 실행</strong>
           • 설치 완료 후 SDK 실행
           • 초기 설정 완료
        `,
      },
      
      firstSteps: {
        title: '첫 번째 단계',
        content: `
        1. <strong>Engine 시작</strong>
           • 좌측 메뉴에서 'Engine' 선택
           • 'Start Engine' 버튼 클릭
        
        2. <strong>디바이스 연결</strong>
           • 'Link Band' 메뉴 선택
           • Link Band 디바이스 전원 켜기
           • 'Scan & Connect' 버튼 클릭
        
        3. <strong>데이터 시각화</strong>
           • 'Visualizer' 메뉴에서 실시간 데이터 확인
           • 각종 그래프와 지표 모니터링
        `,
      },
    },
    
    // User Guide
    userGuide: {
      title: '사용자 가이드',
      description: 'SDK의 각 화면과 기능에 대한 상세한 설명입니다.',
      
      engine: {
        title: 'Engine 모듈',
        content: `
        <strong>Engine 모듈 개요</strong>
        Engine 모듈은 Link Band SDK의 핵심 서버를 관리하는 모듈입니다.
        
        <strong>주요 기능:</strong>
        • Python 서버 시작/중지
        • 서버 상태 모니터링
        • 시스템 리소스 확인
        • 서버 로그 확인
        
        <strong>사용 방법:</strong>
        1. 'Start Engine' 버튼을 클릭하여 서버 시작
        2. 서버 상태를 실시간으로 모니터링
        3. 로그 창에서 서버 동작 상태 확인
        4. 필요시 'Stop Engine'으로 서버 중지
        `,
      },
      
      linkband: {
        title: 'Link Band 모듈',
        content: `
        <strong>Link Band 모듈 개요</strong>
        Link Band 디바이스와의 연결 및 관리를 담당하는 모듈입니다.
        
        <strong>주요 기능:</strong>
        • 디바이스 스캔 및 연결
        • 배터리 상태 모니터링
        • 센서 접촉 상태 확인
        • 디바이스 정보 조회
        
        <strong>연결 방법:</strong>
        1. Link Band 디바이스 전원 켜기
        2. 'Scan Devices' 버튼 클릭
        3. 검색된 디바이스 목록에서 선택
        4. 'Connect' 버튼으로 연결 완료
        `,
      },
      
      visualizer: {
        title: 'Visualizer 모듈',
        content: `
        <strong>Visualizer 모듈 개요</strong>
        실시간 센서 데이터를 시각화하고 분석하는 모듈입니다.
        
        <strong>EEG 데이터:</strong>
        • Raw Data: 원시 뇌파 신호
        • SQI: 신호 품질 지수
        • PSD: 전력 스펙트럼 밀도
        • Band Power: 주파수 대역별 파워
        • Index: 뇌파 지수 (집중도, 이완도 등)
        
        <strong>PPG 데이터:</strong>
        • Raw Data: 원시 심박 신호
        • SQI: 신호 품질 지수
        • Index: 심박 관련 지수
        
        <strong>ACC 데이터:</strong>
        • Raw Data: 3축 가속도 데이터
        • Index: 활동 상태 및 움직임 지수
        `,
      },
      
      datacenter: {
        title: 'Data Center 모듈',
        content: `
        <strong>Data Center 모듈 개요</strong>
        데이터 레코딩, 세션 관리, 파일 검색 기능을 제공하는 모듈입니다.
        
        <strong>레코딩 기능:</strong>
        • 실시간 데이터 레코딩 시작/중지
        • 레코딩 상태 및 지속 시간 표시
        • 자동 세션 생성 및 관리
        
        <strong>세션 관리:</strong>
        • 레코딩된 세션 목록 조회
        • 세션별 상태 확인 (진행중, 완료, 처리중)
        • 세션 데이터 내보내기 (ZIP)
        • 세션 폴더 직접 열기
        
        <strong>파일 검색:</strong>
        • 날짜 범위별 파일 검색
        • 파일 형식별 필터링
        • 파일 크기 및 생성일 정보
        • 파일 직접 열기 및 경로 복사
        `,
      },
    },
    
    // Data Management
    dataManagement: {
      title: '데이터 관리',
      description: '데이터 형식, 저장 구조, 내보내기 방법에 대한 상세 정보입니다.',
      
      dataFormats: {
        title: '데이터 형식',
        content: `
        <strong>지원 데이터 형식:</strong>
        • JSON: 구조화된 데이터 저장
        • CSV: 표 형태 데이터 (Excel 호환)
        • ZIP: 세션 데이터 압축 파일
        
        <strong>센서별 데이터 형식:</strong>
        • EEG: Raw/Processed 뇌파 데이터
        • PPG: Raw/Processed 심박 데이터  
        • ACC: Raw/Processed 가속도 데이터
        • BAT: 배터리 상태 데이터
        `,
      },
      
      sessionStructure: {
        title: '세션 구조',
        content: `
        <strong>세션 폴더 구조:</strong>
        session_YYYYMMDD_HHMMSS/
        ├── [DEVICE_ID]_eeg_raw.json
        ├── [DEVICE_ID]_eeg_processed.json
        ├── [DEVICE_ID]_ppg_raw.json
        ├── [DEVICE_ID]_ppg_processed.json
        ├── [DEVICE_ID]_acc_raw.json
        ├── [DEVICE_ID]_acc_processed.json
        ├── [DEVICE_ID]_bat.json
        └── meta.json
        
        <strong>메타데이터 (meta.json):</strong>
        • 세션 시작/종료 시간
        • 디바이스 정보
        • 레코딩 설정
        • 데이터 품질 정보
        `,
      },
      
      exportOptions: {
        title: '내보내기 옵션',
        content: `
        <strong>내보내기 형식:</strong>
        • 전체 세션 ZIP: 모든 데이터 파일 포함
        • 개별 파일: 특정 센서 데이터만 선택
        • CSV 변환: 분석 도구 호환성
        
        <strong>내보내기 방법:</strong>
        1. Data Center > Sessions 탭 이동
        2. 원하는 세션 선택
        3. 'Export' 버튼 클릭
        4. 저장 위치 선택 후 다운로드
        `,
      },
      
      dataStorage: {
        title: '데이터 저장소',
        content: `
        <strong>저장 위치:</strong>
        • Windows: %APPDATA%/Link Band SDK/data/
        • macOS: ~/Library/Application Support/Link Band SDK/data/
        • Linux: ~/.config/Link Band SDK/data/
        
        <strong>데이터베이스:</strong>
        • SQLite 데이터베이스 사용
        • 세션 메타데이터 관리
        • 파일 인덱싱 및 검색 최적화
        
        <strong>백업 권장사항:</strong>
        • 정기적인 데이터 백업
        • 외부 저장소 활용
        • 클라우드 동기화 고려
        `,
      },
    },
    
    // API Reference
    apiReference: {
      title: 'API 참조',
      description: '3rd party 개발을 위한 API 문서입니다.',
      
      overview: {
        title: 'API 개요',
        content: `
        <strong>Base URL:</strong> http://localhost:8121
        
        <strong>WebSocket:</strong> ws://localhost:18765
        
        <strong>인증:</strong> 현재 버전에서는 인증 불필요 (로컬 개발 환경)
        
        <strong>응답 형식:</strong> JSON
        `,
      },
      
      deviceApi: {
        title: 'Device API',
        content: `
        <strong>GET /device/status</strong>
        디바이스 상태 조회
        
        Response:
        {
          "status": "connected|disconnected",
          "device_id": "string",
          "bat_level": 85,
          "leadoff_status": {...}
        }
        
        <strong>POST /device/scan</strong>
        디바이스 스캔 시작
        
        <strong>POST /device/connect</strong>
        디바이스 연결
        
        Body:
        {
          "device_id": "string"
        }
        
        <strong>POST /device/disconnect</strong>
        디바이스 연결 해제
        `,
      },
      
      streamApi: {
        title: 'Stream API',
        content: `
        <strong>GET /stream/status</strong>
        스트리밍 상태 조회
        
        <strong>POST /stream/start</strong>
        데이터 스트리밍 시작
        
        <strong>POST /stream/stop</strong>
        데이터 스트리밍 중지
        
        <strong>WebSocket: ws://localhost:18765</strong>
        실시간 데이터 수신
        
        Message Format:
        {
          "type": "eeg|ppg|acc|bat",
          "data": {...},
          "timestamp": "ISO string"
        }
        `,
      },
      
      dataApi: {
        title: 'Data API',
        content: `
        <strong>GET /data/sessions</strong>
        세션 목록 조회
        
        <strong>POST /data/start-recording</strong>
        레코딩 시작
        
        <strong>POST /data/stop-recording</strong>
        레코딩 중지
        
        <strong>GET /data/recording-status</strong>
        레코딩 상태 조회
        
        <strong>GET /data/files</strong>
        파일 검색
        
        Query Parameters:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - file_types: eeg,ppg,acc,bat
        - search_text: string
        `,
      },
      
      metricsApi: {
        title: 'Metrics API',
        content: `
        <strong>GET /metrics</strong>
        시스템 메트릭 조회
        
        Response:
        {
          "cpu": 45.2,
          "ram": 1024.5,
          "disk": 2048.0,
          "timestamp": "ISO string"
        }
        
        <strong>단위:</strong>
        • CPU: 사용률 (%)
        • RAM: 사용량 (MB)
        • Disk: 사용량 (MB)
        `,
      },
    },
    
    // Examples & FAQ
    examples: {
      title: '예제 및 FAQ',
      description: '실제 사용 예제와 자주 묻는 질문들입니다.',
      
      pythonExample: {
        title: 'Python 연동 예제',
        content: `
        <strong>WebSocket 연결 예제:</strong>
        
        \`\`\`python
        import asyncio
        import websockets
        import json
        
        async def connect_to_sdk():
            uri = "ws://localhost:18765"
            async with websockets.connect(uri) as websocket:
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    print(f"Received {data['type']}: {data['data']}")
        
        asyncio.run(connect_to_sdk())
        \`\`\`
        
        <strong>REST API 호출 예제:</strong>
        
        \`\`\`python
        import requests
        
        # 디바이스 상태 확인
        response = requests.get("http://localhost:8121/device/status")
        print(response.json())
        
        # 레코딩 시작
        requests.post("http://localhost:8121/data/start-recording")
        \`\`\`
        `,
      },
      
      javascriptExample: {
        title: 'JavaScript 연동 예제',
        content: `
        <strong>WebSocket 연결 예제:</strong>
        
        \`\`\`javascript
        const ws = new WebSocket('ws://localhost:18765');
        
        ws.onopen = function() {
          console.log('Connected to Link Band SDK');
        };
        
        ws.onmessage = function(event) {
          const data = JSON.parse(event.data);
          console.log('Received:', data.type, data.data);
        };
        
        ws.onclose = function() {
          console.log('Disconnected from SDK');
        };
        \`\`\`
        
        <strong>Fetch API 사용 예제:</strong>
        
        \`\`\`javascript
        // 세션 목록 조회
        fetch('http://localhost:8121/data/sessions')
          .then(response => response.json())
          .then(data => console.log(data));
        
        // 레코딩 시작
        fetch('http://localhost:8121/data/start-recording', {
          method: 'POST'
        });
        \`\`\`
        `,
      },
      
      faq: {
        title: '자주 묻는 질문',
        content: `
        <strong>Q: 디바이스가 연결되지 않아요.</strong>
        A: 다음 사항을 확인해주세요:
        • Link Band 디바이스 전원이 켜져 있는지 확인
        • Bluetooth가 활성화되어 있는지 확인
        • 다른 애플리케이션에서 디바이스를 사용하고 있지 않은지 확인
        • SDK를 재시작해보세요
        
        <strong>Q: 데이터가 수신되지 않아요.</strong>
        A: 다음을 확인해주세요:
        • Engine이 시작되어 있는지 확인
        • 디바이스가 정상적으로 연결되어 있는지 확인
        • 센서 접촉 상태가 양호한지 확인
        • 방화벽 설정 확인
        
        <strong>Q: 레코딩 파일을 찾을 수 없어요.</strong>
        A: 데이터 저장 위치를 확인해주세요:
        • Windows: %APPDATA%/Link Band SDK/data/
        • macOS: ~/Library/Application Support/Link Band SDK/data/
        • Data Center에서 'Open' 버튼으로 폴더 직접 열기 가능
        
        <strong>Q: API 호출 시 오류가 발생해요.</strong>
        A: 다음을 확인해주세요:
        • Engine이 시작되어 있는지 확인 (필수)
        • 포트 8121이 사용 가능한지 확인
        • 방화벽에서 포트가 차단되지 않았는지 확인
        • 올바른 JSON 형식으로 요청하는지 확인
        `,
      },
    },
  },
};

// 영어 번역
export const en = {
  // Navigation
  nav: {
    engine: 'Engine',
    linkband: 'Link Band',
    visualizer: 'Visualizer',
    datacenter: 'Data Center',
    documents: 'Documents',
    settings: 'Settings',
  },
  
  // Documents
  documents: {
    title: 'Documents',
    subtitle: 'Link Band SDK Documentation',
    searchPlaceholder: 'Search documentation...',
    
    // Sidebar
    sidebar: {
      quickStart: 'Quick Start',
      userGuide: 'User Guide',
      dataManagement: 'Data Management',
      apiReference: 'API Reference',
      examples: 'Examples & FAQ',
    },
    
    // Quick Start
    quickStart: {
      title: 'Quick Start Guide',
      description: 'A guide for first-time users of the Link Band SDK.',
      
      overview: {
        title: 'Overview',
        content: `Link Band SDK is an integrated development tool for Looxid Labs' next-generation ultra-lightweight EEG band (Link Band 2.0). 
        It provides real-time EEG, PPG, ACC data collection, processing, visualization, and analysis capabilities.`,
      },
      
      systemRequirements: {
        title: 'System Requirements',
        content: `
        <strong>Operating System:</strong>
        • Windows 10/11 (64-bit)
        • macOS 10.15 or later
        • Ubuntu 18.04 or later
        
        <strong>Hardware:</strong>
        • RAM: Minimum 8GB (Recommended 16GB)
        • Storage: Minimum 2GB free space
        • Bluetooth 5.0 or later support
        `,
      },
      
      installation: {
        title: 'Installation',
        content: `
        1. <strong>Download SDK</strong>
           • Download the latest version from the official website
           • Select the installer for your operating system
        
        2. <strong>Run Installation</strong>
           • Run the downloaded installer
           • Follow the installation wizard instructions
        
        3. <strong>First Launch</strong>
           • Launch the SDK after installation
           • Complete initial setup
        `,
      },
      
      firstSteps: {
        title: 'First Steps',
        content: `
        1. <strong>Start Engine</strong>
           • Select 'Engine' from the left menu
           • Click 'Start Engine' button
        
        2. <strong>Connect Device</strong>
           • Select 'Link Band' menu
           • Turn on Link Band device
           • Click 'Scan & Connect' button
        
        3. <strong>Data Visualization</strong>
           • Check real-time data in 'Visualizer' menu
           • Monitor various graphs and metrics
        `,
      },
    },
    
    // User Guide
    userGuide: {
      title: 'User Guide',
      description: 'Detailed explanation of each screen and function in the SDK.',
      
      engine: {
        title: 'Engine Module',
        content: `
        <strong>Engine Module Overview</strong>
        The Engine module manages the core server of the Link Band SDK.
        
        <strong>Key Features:</strong>
        • Start/Stop Python server
        • Monitor server status
        • Check system resources
        • View server logs
        
        <strong>Usage:</strong>
        1. Click 'Start Engine' button to start the server
        2. Monitor server status in real-time
        3. Check server operation status in the log window
        4. Stop server with 'Stop Engine' if needed
        `,
      },
      
      linkband: {
        title: 'Link Band Module',
        content: `
        <strong>Link Band Module Overview</strong>
        This module handles connection and management with Link Band devices.
        
        <strong>Key Features:</strong>
        • Device scan and connection
        • Battery status monitoring
        • Sensor contact status check
        • Device information inquiry
        
        <strong>Connection Method:</strong>
        1. Turn on Link Band device
        2. Click 'Scan Devices' button
        3. Select from the list of found devices
        4. Complete connection with 'Connect' button
        `,
      },
      
      visualizer: {
        title: 'Visualizer Module',
        content: `
        <strong>Visualizer Module Overview</strong>
        This module visualizes and analyzes real-time sensor data.
        
        <strong>EEG Data:</strong>
        • Raw Data: Raw EEG signals
        • SQI: Signal Quality Index
        • PSD: Power Spectral Density
        • Band Power: Power by frequency bands
        • Index: EEG indices (attention, relaxation, etc.)
        
        <strong>PPG Data:</strong>
        • Raw Data: Raw heart rate signals
        • SQI: Signal Quality Index
        • Index: Heart rate related indices
        
        <strong>ACC Data:</strong>
        • Raw Data: 3-axis acceleration data
        • Index: Activity state and movement indices
        `,
      },
      
      datacenter: {
        title: 'Data Center Module',
        content: `
        <strong>Data Center Module Overview</strong>
        This module provides data recording, session management, and file search functions.
        
        <strong>Recording Features:</strong>
        • Start/stop real-time data recording
        • Display recording status and duration
        • Automatic session creation and management
        
        <strong>Session Management:</strong>
        • View list of recorded sessions
        • Check session status (in progress, completed, processing)
        • Export session data (ZIP)
        • Open session folder directly
        
        <strong>File Search:</strong>
        • Search files by date range
        • Filter by file type
        • File size and creation date information
        • Open files directly and copy paths
        `,
      },
    },
    
    // Data Management
    dataManagement: {
      title: 'Data Management',
      description: 'Detailed information about data formats, storage structure, and export methods.',
      
      dataFormats: {
        title: 'Data Formats',
        content: `
        <strong>Supported Data Formats:</strong>
        • JSON: Structured data storage
        • CSV: Tabular data (Excel compatible)
        • ZIP: Compressed session data files
        
        <strong>Data Formats by Sensor:</strong>
        • EEG: Raw/Processed EEG data
        • PPG: Raw/Processed heart rate data  
        • ACC: Raw/Processed acceleration data
        • BAT: Battery status data
        `,
      },
      
      sessionStructure: {
        title: 'Session Structure',
        content: `
        <strong>Session Folder Structure:</strong>
        session_YYYYMMDD_HHMMSS/
        ├── [DEVICE_ID]_eeg_raw.json
        ├── [DEVICE_ID]_eeg_processed.json
        ├── [DEVICE_ID]_ppg_raw.json
        ├── [DEVICE_ID]_ppg_processed.json
        ├── [DEVICE_ID]_acc_raw.json
        ├── [DEVICE_ID]_acc_processed.json
        ├── [DEVICE_ID]_bat.json
        └── meta.json
        
        <strong>Metadata (meta.json):</strong>
        • Session start/end time
        • Device information
        • Recording settings
        • Data quality information
        `,
      },
      
      exportOptions: {
        title: 'Export Options',
        content: `
        <strong>Export Formats:</strong>
        • Full session ZIP: Includes all data files
        • Individual files: Select specific sensor data only
        • CSV conversion: Analysis tool compatibility
        
        <strong>Export Method:</strong>
        1. Go to Data Center > Sessions tab
        2. Select desired session
        3. Click 'Export' button
        4. Select save location and download
        `,
      },
      
      dataStorage: {
        title: 'Data Storage',
        content: `
        <strong>Storage Location:</strong>
        • Windows: %APPDATA%/Link Band SDK/data/
        • macOS: ~/Library/Application Support/Link Band SDK/data/
        • Linux: ~/.config/Link Band SDK/data/
        
        <strong>Database:</strong>
        • Uses SQLite database
        • Manages session metadata
        • File indexing and search optimization
        
        <strong>Backup Recommendations:</strong>
        • Regular data backup
        • Use external storage
        • Consider cloud synchronization
        `,
      },
    },
    
    // API Reference
    apiReference: {
      title: 'API Reference',
      description: 'API documentation for 3rd party development.',
      
      overview: {
        title: 'API Overview',
        content: `
        <strong>Base URL:</strong> http://localhost:8121
        
        <strong>WebSocket:</strong> ws://localhost:18765
        
        <strong>Authentication:</strong> No authentication required in current version (local development environment)
        
        <strong>Response Format:</strong> JSON
        `,
      },
      
      deviceApi: {
        title: 'Device API',
        content: `
        <strong>GET /device/status</strong>
        Query device status
        
        Response:
        {
          "status": "connected|disconnected",
          "device_id": "string",
          "bat_level": 85,
          "leadoff_status": {...}
        }
        
        <strong>POST /device/scan</strong>
        Start device scan
        
        <strong>POST /device/connect</strong>
        Connect device
        
        Body:
        {
          "device_id": "string"
        }
        
        <strong>POST /device/disconnect</strong>
        Disconnect device
        `,
      },
      
      streamApi: {
        title: 'Stream API',
        content: `
        <strong>GET /stream/status</strong>
        Query streaming status
        
        <strong>POST /stream/start</strong>
        Start data streaming
        
        <strong>POST /stream/stop</strong>
        Stop data streaming
        
        <strong>WebSocket: ws://localhost:18765</strong>
        Receive real-time data
        
        Message Format:
        {
          "type": "eeg|ppg|acc|bat",
          "data": {...},
          "timestamp": "ISO string"
        }
        `,
      },
      
      dataApi: {
        title: 'Data API',
        content: `
        <strong>GET /data/sessions</strong>
        Query session list
        
        <strong>POST /data/start-recording</strong>
        Start recording
        
        <strong>POST /data/stop-recording</strong>
        Stop recording
        
        <strong>GET /data/recording-status</strong>
        Query recording status
        
        <strong>GET /data/files</strong>
        Search files
        
        Query Parameters:
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - file_types: eeg,ppg,acc,bat
        - search_text: string
        `,
      },
      
      metricsApi: {
        title: 'Metrics API',
        content: `
        <strong>GET /metrics</strong>
        Query system metrics
        
        Response:
        {
          "cpu": 45.2,
          "ram": 1024.5,
          "disk": 2048.0,
          "timestamp": "ISO string"
        }
        
        <strong>Units:</strong>
        • CPU: Usage (%)
        • RAM: Usage (MB)
        • Disk: Usage (MB)
        `,
      },
    },
    
    // Examples & FAQ
    examples: {
      title: 'Examples & FAQ',
      description: 'Practical usage examples and frequently asked questions.',
      
      pythonExample: {
        title: 'Python Integration Example',
        content: `
        <strong>WebSocket Connection Example:</strong>
        
        \`\`\`python
        import asyncio
        import websockets
        import json
        
        async def connect_to_sdk():
            uri = "ws://localhost:18765"
            async with websockets.connect(uri) as websocket:
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    print(f"Received {data['type']}: {data['data']}")
        
        asyncio.run(connect_to_sdk())
        \`\`\`
        
        <strong>REST API Call Example:</strong>
        
        \`\`\`python
        import requests
        
        # Check device status
        response = requests.get("http://localhost:8121/device/status")
        print(response.json())
        
        # Start recording
        requests.post("http://localhost:8121/data/start-recording")
        \`\`\`
        `,
      },
      
      javascriptExample: {
        title: 'JavaScript Integration Example',
        content: `
        <strong>WebSocket Connection Example:</strong>
        
        \`\`\`javascript
        const ws = new WebSocket('ws://localhost:18765');
        
        ws.onopen = function() {
          console.log('Connected to Link Band SDK');
        };
        
        ws.onmessage = function(event) {
          const data = JSON.parse(event.data);
          console.log('Received:', data.type, data.data);
        };
        
        ws.onclose = function() {
          console.log('Disconnected from SDK');
        };
        \`\`\`
        
        <strong>Fetch API Usage Example:</strong>
        
        \`\`\`javascript
        // Query session list
        fetch('http://localhost:8121/data/sessions')
          .then(response => response.json())
          .then(data => console.log(data));
        
        // Start recording
        fetch('http://localhost:8121/data/start-recording', {
          method: 'POST'
        });
        \`\`\`
        `,
      },
      
      faq: {
        title: 'Frequently Asked Questions',
        content: `
        <strong>Q: The device won't connect.</strong>
        A: Please check the following:
        • Ensure Link Band device is powered on
        • Check if Bluetooth is enabled
        • Make sure no other applications are using the device
        • Try restarting the SDK
        
        <strong>Q: No data is being received.</strong>
        A: Please check:
        • Ensure Engine is started
        • Verify device is properly connected
        • Check sensor contact status is good
        • Check firewall settings
        
        <strong>Q: Can't find recording files.</strong>
        A: Check the data storage location:
        • Windows: %APPDATA%/Link Band SDK/data/
        • macOS: ~/Library/Application Support/Link Band SDK/data/
        • Use 'Open' button in Data Center to open folder directly
        
        <strong>Q: API calls are failing.</strong>
        A: Please check:
        • Ensure Engine is started (required)
        • Check if port 8121 is available
        • Verify firewall isn't blocking the port
        • Ensure requests are in correct JSON format
        `,
      },
    },
  },
};

export const translations = { ko, en };

export const useTranslation = (language: Language) => {
  return translations[language];
}; 