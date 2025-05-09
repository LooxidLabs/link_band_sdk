let ws: WebSocket | null = null;
let wsUserId: string | null = null;

type SensorType = 'eeg' | 'ppg' | 'acc';

// 버퍼 설정 (디바이스 전송 크기 기반)
const BUFFER_SIZES: Record<SensorType, number> = {
  eeg: 50,  // 디바이스에서 50개씩 전송
  ppg: 60,  // 디바이스에서 60개씩 전송
  acc: 30   // 디바이스에서 30개씩 전송
};

// 데이터 버퍼
const dataBuffers: Record<SensorType, any[]> = {
  eeg: [],
  ppg: [],
  acc: []
};

// 버퍼 전송 타이머
let bufferTimers: Record<SensorType, NodeJS.Timeout | null> = {
  eeg: null,
  ppg: null,
  acc: null
};

// 전송 주기 (ms)
const TRANSMISSION_INTERVALS: Record<SensorType, number> = {
  eeg: 200,  // 0.2초마다 전송
  ppg: 250,  // 0.25초마다 전송
  acc: 330   // 0.33초마다 전송
};

// 버퍼 전송 함수
function sendBufferedData(type: SensorType) {
  if (dataBuffers[type].length > 0) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        data: dataBuffers[type]
      }));
      dataBuffers[type] = [];  // 버퍼 비우기
    }
  }
}

export function connectLinkCloudWS(userId: string) {
  if (ws && ws.readyState === WebSocket.OPEN && wsUserId === userId) return ws;
  if (ws) ws.close();
  const wsUrl = `${import.meta.env.VITE_LINK_CLOUD_SERVER_URL.replace(/^http/, 'ws')}/api/v1/ws/sensor/${userId}`;
  ws = new WebSocket(wsUrl);
  wsUserId = userId;
  ws.onopen = () => console.log('Link Cloud WebSocket connected');
  ws.onclose = () => {
    console.log('Link Cloud WebSocket disconnected');
    // 자동 재연결 로직 (선택)
    // setTimeout(() => connectLinkCloudWS(userId), 2000);
  };
  ws.onerror = (e) => console.error('Link Cloud WebSocket error:', e);
  return ws;
}

export function sendSensorDataToCloud(data: { type: SensorType } & Record<string, any>) {
  const type = data.type;
  if (!type || !['eeg', 'ppg', 'acc'].includes(type)) return;

  // 데이터를 버퍼에 추가
  dataBuffers[type].push(data);

  // 버퍼가 가득 차면 즉시 전송
  if (dataBuffers[type].length >= BUFFER_SIZES[type]) {
    sendBufferedData(type);
  } else {
    // 버퍼가 가득 차지 않았으면 타이머 설정
    if (!bufferTimers[type]) {
      bufferTimers[type] = setTimeout(() => {
        sendBufferedData(type);
        bufferTimers[type] = null;
      }, TRANSMISSION_INTERVALS[type]);
    }
  }
}
