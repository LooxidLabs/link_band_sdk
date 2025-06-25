export const installation = {
  title: '설치',
  content: `
  <div class="prose prose-gray dark:prose-invert max-w-none">
    <p>
      Link Band SDK를 설치하는 방법을 단계별로 안내합니다. 
      시스템 요구사항을 먼저 확인하셨다면 바로 설치를 시작할 수 있습니다.
    </p>

    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-4 my-6">
      <p class="text-blue-800 dark:text-blue-200 font-medium mb-2">설치 전 확인사항</p>
      <p class="text-blue-700 dark:text-blue-300 text-sm">
        설치하기 전에 <strong>관리자 권한</strong>이 있는지 확인해주세요. 
        Windows에서는 PowerShell을, macOS/Linux에서는 Terminal을 관리자 권한으로 실행해야 합니다.
      </p>
    </div>

    <h2>다운로드</h2>
    
    <p>Link Band SDK는 GitHub 릴리즈 페이지에서 다운로드할 수 있습니다:</p>
    
    <ul>
      <li><strong>Windows</strong>: <code>LinkBandSDK-win-x64.exe</code></li>
      <li><strong>macOS</strong>: <code>LinkBandSDK-mac-arm64.dmg</code> (Apple Silicon) 또는 <code>LinkBandSDK-mac-x64.dmg</code> (Intel)</li>
      <li><strong>Linux</strong>: <code>LinkBandSDK-linux-x64.AppImage</code></li>
    </ul>

    <h2>설치 과정</h2>

    <h3>Windows</h3>
    <ol>
      <li>다운로드한 <code>.exe</code> 파일을 실행합니다</li>
      <li>설치 마법사의 안내를 따라 진행합니다</li>
      <li>설치 경로를 선택합니다 (기본값 권장: <code>C:\\Program Files\\LinkBandSDK</code>)</li>
      <li>설치 완료 후 바탕화면 바로가기가 생성됩니다</li>
    </ol>

    <h3>macOS</h3>
    <ol>
      <li>다운로드한 <code>.dmg</code> 파일을 더블클릭하여 마운트합니다</li>
      <li>Link Band SDK 앱을 Applications 폴더로 드래그합니다</li>
      <li>Applications 폴더에서 Link Band SDK를 실행합니다</li>
      <li>처음 실행시 "확인되지 않은 개발자" 경고가 나타나면 <strong>시스템 환경설정 > 보안 및 개인정보보호</strong>에서 허용해주세요</li>
    </ol>

    <h3>Linux</h3>
    <ol>
      <li>다운로드한 <code>.AppImage</code> 파일에 실행 권한을 부여합니다:</li>
    </ol>

    <pre><code>chmod +x LinkBandSDK-linux-x64.AppImage</code></pre>

    <ol start="2">
      <li>파일을 실행합니다:</li>
    </ol>

    <pre><code>./LinkBandSDK-linux-x64.AppImage</code></pre>

    <p>또는 파일 매니저에서 더블클릭하여 실행할 수 있습니다.</p>

    <h2>개발자 설치 (소스코드)</h2>

    <p>개발자이거나 소스코드에서 직접 빌드하고 싶다면 다음 단계를 따라주세요:</p>

    <h3>1. 저장소 클론</h3>
    <pre><code>git clone https://github.com/looxidlabs/link-band-sdk.git
cd link-band-sdk</code></pre>

    <h3>2. Python 환경 설정</h3>
    <pre><code>cd python_core
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt</code></pre>

    <h3>3. Electron 앱 설정</h3>
    <pre><code>cd ../electron-app
npm install
npm run dev</code></pre>

    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-4 my-6">
      <p class="text-yellow-800 dark:text-yellow-200 font-medium mb-2">⚠️ 개발자 모드 주의사항</p>
      <ul class="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
        <li>• Python 서버와 Electron 앱을 별도로 실행해야 합니다</li>
        <li>• 포트 충돌을 피하기 위해 다른 앱들을 종료해주세요</li>
        <li>• 개발 모드에서는 성능이 실제 빌드보다 느릴 수 있습니다</li>
      </ul>
    </div>

    <h2>설치 확인</h2>

    <p>설치가 완료되었다면 다음 단계로 설치를 확인해보세요:</p>

    <ol>
      <li>Link Band SDK를 실행합니다</li>
      <li>상단 메뉴에서 <strong>Engine > Start Server</strong>를 클릭합니다</li>
      <li>"Engine Started" 메시지가 표시되면 설치가 성공적으로 완료된 것입니다</li>
      <li>Link Band 디바이스가 있다면 <strong>Link Band > Scan Devices</strong>로 연결을 테스트해보세요</li>
    </ol>

    <h2>문제 해결</h2>

    <h3>Windows</h3>
    <ul>
      <li><strong>Microsoft Defender 경고</strong>: 보안 프로그램에서 차단하는 경우 예외 처리해주세요</li>
      <li><strong>권한 오류</strong>: 관리자 권한으로 실행해주세요</li>
      <li><strong>포트 충돌</strong>: 8121, 18765 포트를 사용하는 다른 프로그램을 종료해주세요</li>
    </ul>

    <h3>macOS</h3>
    <ul>
      <li><strong>Gatekeeper 차단</strong>: 시스템 환경설정에서 앱 실행을 허용해주세요</li>
      <li><strong>권한 요청</strong>: Bluetooth, 네트워크 접근 권한을 허용해주세요</li>
    </ul>

    <h3>Linux</h3>
    <ul>
      <li><strong>의존성 오류</strong>: <code>sudo apt install libudev-dev libusb-1.0-0-dev</code>로 필수 패키지를 설치해주세요</li>
      <li><strong>권한 문제</strong>: 사용자를 <code>dialout</code> 그룹에 추가해주세요: <code>sudo usermod -a -G dialout $USER</code></li>
    </ul>

    <blockquote>
      <p><strong>다음 단계</strong></p>
      <p>설치가 완료되었다면 이제 첫 번째 단계 가이드로 넘어가서 Link Band SDK의 기본 사용법을 익혀보세요!</p>
    </blockquote>
  </div>
  `
}; 