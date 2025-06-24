export const systemRequirements = {
  title: '시스템 요구사항',
  content: `
  <div class="prose prose-gray dark:prose-invert max-w-none">
    <p>
      Link Band SDK를 원활하게 사용하기 위한 시스템 요구사항을 확인해보세요. 
      모든 요구사항을 만족하면 최상의 성능을 경험할 수 있습니다.
    </p>

    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-4 my-6">
      <p class="text-blue-800 dark:text-blue-200 font-medium mb-2">호환성 주의사항</p>
      <p class="text-blue-700 dark:text-blue-300 text-sm">
        Link Band SDK는 <strong>Python 3.9+</strong>와 <strong>Node.js 18+</strong>가 필요합니다. 
        일부 기능은 더 높은 버전이 필요할 수 있으니, 패키지 매니저가 경고하면 업그레이드해주세요.
      </p>
    </div>

    <h2>지원 운영체제</h2>

    <h3>Windows</h3>
    <ul>
      <li><strong>Windows 11</strong> (권장)</li>
      <li><strong>Windows 10</strong> (버전 1903 이상)</li>
      <li>Windows Server 2019/2022</li>
    </ul>
    <p><em>Windows 8.1 이하는 제한적 지원</em></p>

    <h3>macOS</h3>
    <ul>
      <li><strong>macOS Sonoma 14.x</strong> (권장)</li>
      <li>macOS Ventura 13.x</li>
      <li>macOS Monterey 12.x</li>
      <li>macOS Big Sur 11.x</li>
    </ul>
    <p>Apple Silicon (M1/M2/M3) 네이티브 지원 및 Intel x64 호환성 모드</p>

    <h3>Linux</h3>
    <p>테스트된 배포판:</p>
    <ul>
      <li>Ubuntu 20.04/22.04 LTS</li>
      <li>Debian 11/12</li>
      <li>CentOS 8/9</li>
      <li>Fedora 36+</li>
    </ul>
    <p>필수 패키지: <code>libudev-dev</code>, <code>libusb-1.0-0-dev</code>, <code>python3.9+</code>, <code>pip3</code></p>

    <h2>하드웨어 요구사항</h2>

    <h3>최소 요구사항</h3>
    <ul>
      <li><strong>CPU</strong>: 듀얼 코어 2.0GHz 이상 (Intel Core i3-6100, AMD Ryzen 3 2200G, Apple M1 동급)</li>
      <li><strong>메모리</strong>: 4GB RAM (8GB 권장)</li>
      <li><strong>저장공간</strong>: 설치용 500MB + 데이터 저장용 2GB</li>
      <li><strong>네트워크</strong>: 인터넷 연결 (초기 설치 및 업데이트용)</li>
    </ul>

    <h3>권장 요구사항</h3>
    <ul>
      <li><strong>CPU</strong>: 쿼드 코어 3.0GHz 이상 (Intel Core i5-8400, AMD Ryzen 5 3600, Apple M1 Pro 동급)</li>
      <li><strong>메모리</strong>: 8GB RAM 이상 (16GB 권장 - 대용량 데이터 처리시)</li>
      <li><strong>저장공간</strong>: SSD 10GB 이상 (빠른 읽기/쓰기 속도 500MB/s+)</li>
      <li><strong>디스플레이</strong>: 1920x1080 이상</li>
    </ul>

    <h2>연결성 요구사항</h2>
    <ul>
      <li><strong>Bluetooth 5.0+</strong>: Link Band 디바이스 연결용</li>
      <li><strong>USB 포트</strong>: 충전 및 펌웨어 업데이트용</li>
      <li><strong>네트워크 포트</strong>: 8121 (HTTP), 18765 (WebSocket)</li>
    </ul>

    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-4 my-6">
      <p class="text-yellow-800 dark:text-yellow-200 font-medium mb-2">⚠️ 성능 최적화 권장사항</p>
      <ul class="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
        <li>• 실시간 데이터 처리를 위해 <strong>8GB 이상 RAM</strong> 권장</li>
        <li>• 장시간 기록시 <strong>SSD 사용</strong> 필수</li>
        <li>• 백그라운드 앱 최소화로 CPU 자원 확보</li>
        <li>• 바이러스 스캐너에서 SDK 폴더 예외 설정</li>
      </ul>
    </div>

    <h2>호환성 체크리스트</h2>
    <p>설치 전 다음 사항들을 확인해주세요:</p>
    <ul>
      <li>□ 지원되는 운영체제 버전</li>
      <li>□ 최소 하드웨어 요구사항 만족</li>
      <li>□ Bluetooth 5.0+ 지원</li>
      <li>□ 관리자 권한 확보</li>
      <li>□ 충분한 저장공간 확보 (최소 3GB)</li>
      <li>□ 안정적인 인터넷 연결</li>
    </ul>

    <blockquote>
      <p><strong>다음 단계</strong></p>
      <p>시스템 요구사항을 모두 확인하셨다면, 이제 설치 가이드로 넘어가서 Link Band SDK를 설치해보세요!</p>
    </blockquote>
  </div>
  `
}; 