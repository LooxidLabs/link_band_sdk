export const overview = {
  title: '개요',
  content: `
  <div class="prose prose-gray dark:prose-invert max-w-none">
    <h2>Link Band SDK란?</h2>
    
    <p>
      Link Band SDK는 <strong>Looxid Labs</strong>의 차세대 초경량 뇌파 밴드 <strong>Link Band 2.0</strong>을 위한 
      통합 개발 환경입니다. 연구자, 개발자, 그리고 뇌파 데이터에 관심 있는 모든 분들이 
      쉽고 빠르게 뇌파 데이터를 수집, 분석, 활용할 수 있도록 설계되었습니다.
    </p>

    <p>SDK는 두 가지 주요 구성 요소로 이루어져 있습니다:</p>

    <ul>
      <li><strong>Frontend (Electron + React)</strong>: 실시간 데이터 시각화와 직관적인 사용자 인터페이스를 제공합니다.</li>
      <li><strong>Backend (Python FastAPI)</strong>: RESTful API와 WebSocket을 통한 실시간 데이터 처리를 담당합니다.</li>
    </ul>

    <h2>주요 기능</h2>

    <h3>🧠 실시간 데이터 수집</h3>
    <ul>
      <li><strong>EEG (뇌파)</strong>: 2채널 고품질 신호 (250Hz 샘플링)</li>
      <li><strong>PPG (맥파)</strong>: 심박수 및 혈류량 측정</li>
      <li><strong>ACC (가속도)</strong>: 3축 움직임 감지</li>
      <li><strong>배터리</strong>: 실시간 전력 상태 모니터링</li>
    </ul>

    <h3>⚡ 고급 신호 처리</h3>
    <ul>
      <li>실시간 노이즈 필터링</li>
      <li>주파수 대역 분석 (Alpha, Beta, Theta, Delta)</li>
      <li>신호 품질 지수 (SQI) 자동 계산</li>
      <li>뇌파 지수 (집중도, 이완도, 스트레스)</li>
    </ul>

    <h3>🚀 개발자 친화적</h3>
    <ul>
      <li>REST API 완전 지원</li>
      <li>WebSocket 실시간 스트리밍</li>
      <li>Python/JavaScript SDK 제공</li>
      <li>크로스 플랫폼 (Windows, macOS, Linux)</li>
    </ul>

    <h2>주요 활용 분야</h2>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">🔬</div>
        <div class="text-sm font-medium">뇌파 연구</div>
      </div>
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">🧘</div>
        <div class="text-sm font-medium">집중력 훈련</div>
      </div>
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">📈</div>
        <div class="text-sm font-medium">스트레스 모니터링</div>
      </div>
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">🎮</div>
        <div class="text-sm font-medium">게임 개발</div>
      </div>
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">🏥</div>
        <div class="text-sm font-medium">헬스케어</div>
      </div>
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">📚</div>
        <div class="text-sm font-medium">교육 도구</div>
      </div>
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">🤖</div>
        <div class="text-sm font-medium">BCI 연구</div>
      </div>
      <div class="text-center p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div class="text-2xl mb-2">💼</div>
        <div class="text-sm font-medium">기업 솔루션</div>
      </div>
    </div>

    <h2>왜 Link Band SDK를 선택해야 할까요?</h2>

    <p>Link Band SDK는 다음과 같은 이유로 뇌파 데이터 분석을 위한 최적의 선택입니다:</p>

    <ul>
      <li><strong>즉시 사용 가능</strong>: 복잡한 설정 없이 5분 안에 데이터 수집을 시작할 수 있습니다.</li>
      <li><strong>개발자 친화적</strong>: REST API, WebSocket, Python/JavaScript SDK를 제공하여 기존 시스템에 쉽게 통합할 수 있습니다.</li>
      <li><strong>실시간 시각화</strong>: 직관적인 그래프와 차트로 데이터를 실시간으로 모니터링하고 분석할 수 있습니다.</li>
      <li><strong>완벽한 데이터 관리</strong>: 자동 저장, 세션 관리, 다양한 형식으로 내보내기 등 데이터 관리의 모든 것을 제공합니다.</li>
      <li><strong>크로스 플랫폼</strong>: Windows, macOS, Linux 모든 플랫폼에서 동일한 경험을 제공합니다.</li>
      <li><strong>지속적인 업데이트</strong>: Looxid Labs의 지속적인 지원과 정기적인 기능 업데이트를 받을 수 있습니다.</li>
    </ul>

    <blockquote>
      <p><strong>시작할 준비가 되셨나요?</strong></p>
      <p>다음 단계에서 시스템 요구사항을 확인하고 설치를 진행해보세요. Link Band SDK와 함께 뇌파 데이터의 무한한 가능성을 탐험해보세요!</p>
    </blockquote>
  </div>
  `
}; 