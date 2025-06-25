# Node.js 통합 가이드

이 가이드는 Link Band SDK를 Node.js 애플리케이션과 통합하는 방법을 설명합니다. Express 서버, WebSocket 클라이언트, 데이터 처리 파이프라인을 포함합니다.

## 목차

1. [설치 및 설정](#설치-및-설정)
2. [Express 서버 통합](#express-서버-통합)
3. [WebSocket 클라이언트](#websocket-클라이언트)
4. [데이터 처리](#데이터-처리)
5. [완전한 예제](#완전한-예제)
6. [TypeScript 지원](#typescript-지원)
7. [모범 사례](#모범-사례)

## 설치 및 설정

### 필수 조건

```bash
npm init -y
npm install express axios ws cors helmet morgan
npm install --save-dev nodemon @types/node typescript ts-node
```

### 프로젝트 구조

```
project/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── utils/
│   ├── types/
│   └── app.ts
├── config/
├── package.json
└── tsconfig.json
```

### 환경 설정

`.env` 파일 생성:

```env
PORT=3000
LINK_BAND_API_URL=http://localhost:8121
WEBSOCKET_URL=ws://localhost:18765
NODE_ENV=development
```

## Express 서버 통합

### 메인 서버 설정

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { deviceRouter } from './routes/device';
import { streamRouter } from './routes/stream';
import { dataRouter } from './routes/data';
import { LinkBandService } from './services/LinkBandService';

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Link Band 서비스 초기화
const linkBandService = new LinkBandService();

// 라우트
app.use('/api/device', deviceRouter);
app.use('/api/stream', streamRouter);
app.use('/api/data', dataRouter);

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 에러 처리 미들웨어
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: '문제가 발생했습니다!' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
});

export default app;
```

### Link Band 서비스

```typescript
// src/services/LinkBandService.ts
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface Device {
  name: string;
  address: string;
  rssi?: number;
  is_connected: boolean;
}

export interface StreamData {
  timestamp: number;
  eeg?: number[];
  ppg?: number[];
  acc?: { x: number; y: number; z: number };
  battery?: number;
}

export class LinkBandService extends EventEmitter {
  private api: AxiosInstance;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    super();
    this.api = axios.create({
      baseURL: process.env.LINK_BAND_API_URL || 'http://localhost:8121',
      timeout: 10000,
    });
  }

  // 디바이스 관리
  async scanDevices(): Promise<Device[]> {
    try {
      const response = await this.api.get('/device/scan');
      return response.data.devices || [];
    } catch (error) {
      this.emit('error', '디바이스 스캔에 실패했습니다');
      throw error;
    }
  }

  async connectDevice(address: string): Promise<void> {
    try {
      await this.api.post('/device/connect', { address });
      this.emit('deviceConnected', address);
    } catch (error) {
      this.emit('error', '디바이스 연결에 실패했습니다');
      throw error;
    }
  }

  async disconnectDevice(): Promise<void> {
    try {
      await this.api.post('/device/disconnect');
      this.emit('deviceDisconnected');
    } catch (error) {
      this.emit('error', '디바이스 연결 해제에 실패했습니다');
      throw error;
    }
  }

  async getDeviceStatus() {
    try {
      const response = await this.api.get('/device/status');
      return response.data;
    } catch (error) {
      this.emit('error', '디바이스 상태 확인에 실패했습니다');
      throw error;
    }
  }

  // 스트림 관리
  async initializeStream(): Promise<void> {
    try {
      await this.api.post('/stream/init');
    } catch (error) {
      this.emit('error', '스트림 초기화에 실패했습니다');
      throw error;
    }
  }

  async startStreaming(): Promise<void> {
    try {
      await this.api.post('/stream/start');
      this.emit('streamingStarted');
    } catch (error) {
      this.emit('error', '스트리밍 시작에 실패했습니다');
      throw error;
    }
  }

  async stopStreaming(): Promise<void> {
    try {
      await this.api.post('/stream/stop');
      this.emit('streamingStopped');
    } catch (error) {
      this.emit('error', '스트리밍 중지에 실패했습니다');
      throw error;
    }
  }

  // WebSocket 연결
  connectWebSocket(): void {
    const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:18765';
    
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('WebSocket 연결됨');
      this.reconnectAttempts = 0;
      this.emit('wsConnected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const streamData: StreamData = JSON.parse(data.toString());
        this.emit('streamData', streamData);
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket 연결 종료');
      this.emit('wsDisconnected');
      this.handleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket 오류:', error);
      this.emit('wsError', error);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('WebSocket 재연결 최대 시도 횟수 초과');
      this.emit('wsReconnectFailed');
    }
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // 데이터 기록
  async startRecording(sessionName: string, metadata: any = {}): Promise<void> {
    try {
      await this.api.post('/data/start-recording', {
        session_name: sessionName,
        metadata
      });
      this.emit('recordingStarted', sessionName);
    } catch (error) {
      this.emit('error', '기록 시작에 실패했습니다');
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    try {
      await this.api.post('/data/stop-recording');
      this.emit('recordingStopped');
    } catch (error) {
      this.emit('error', '기록 중지에 실패했습니다');
      throw error;
    }
  }

  async getRecordingStatus() {
    try {
      const response = await this.api.get('/data/recording-status');
      return response.data;
    } catch (error) {
      this.emit('error', '기록 상태 확인에 실패했습니다');
      throw error;
    }
  }
}
```

## WebSocket 클라이언트

### 실시간 데이터 처리

```typescript
// src/services/DataProcessor.ts
import { EventEmitter } from 'events';
import { StreamData } from './LinkBandService';

export interface ProcessedData {
  timestamp: number;
  eeg: {
    raw: number[];
    filtered: number[];
    alpha: number;
    beta: number;
    theta: number;
    delta: number;
  };
  ppg: {
    raw: number[];
    heartRate: number;
    hrv: number;
  };
  motion: {
    acceleration: { x: number; y: number; z: number };
    magnitude: number;
    isMoving: boolean;
  };
  quality: {
    eegQuality: number;
    ppgQuality: number;
    overallQuality: number;
  };
}

export class DataProcessor extends EventEmitter {
  private eegBuffer: number[][] = [];
  private ppgBuffer: number[][] = [];
  private bufferSize = 256; // 1초 데이터 (256Hz)
  
  constructor() {
    super();
  }

  processStreamData(data: StreamData): ProcessedData {
    // EEG 데이터 처리
    if (data.eeg) {
      this.eegBuffer.push(data.eeg);
      if (this.eegBuffer.length > this.bufferSize) {
        this.eegBuffer.shift();
      }
    }

    // PPG 데이터 처리
    if (data.ppg) {
      this.ppgBuffer.push(data.ppg);
      if (this.ppgBuffer.length > this.bufferSize) {
        this.ppgBuffer.shift();
      }
    }

    const processed: ProcessedData = {
      timestamp: data.timestamp,
      eeg: this.processEEG(data.eeg || []),
      ppg: this.processPPG(data.ppg || []),
      motion: this.processMotion(data.acc || { x: 0, y: 0, z: 0 }),
      quality: this.assessQuality(data)
    };

    this.emit('processedData', processed);
    return processed;
  }

  private processEEG(eegData: number[]) {
    // 기본 EEG 처리
    const filtered = this.applyBandpassFilter(eegData, 1, 50); // 1-50Hz 대역통과 필터
    
    return {
      raw: eegData,
      filtered,
      alpha: this.calculateBandPower(filtered, 8, 12),
      beta: this.calculateBandPower(filtered, 13, 30),
      theta: this.calculateBandPower(filtered, 4, 7),
      delta: this.calculateBandPower(filtered, 1, 3)
    };
  }

  private processPPG(ppgData: number[]) {
    // 기본 PPG 처리
    const heartRate = this.calculateHeartRate(ppgData);
    const hrv = this.calculateHRV(ppgData);
    
    return {
      raw: ppgData,
      heartRate,
      hrv
    };
  }

  private processMotion(acc: { x: number; y: number; z: number }) {
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const isMoving = magnitude > 1.2; // 임계값 기반 움직임 감지
    
    return {
      acceleration: acc,
      magnitude,
      isMoving
    };
  }

  private assessQuality(data: StreamData) {
    // 신호 품질 평가
    const eegQuality = this.assessEEGQuality(data.eeg || []);
    const ppgQuality = this.assessPPGQuality(data.ppg || []);
    const overallQuality = (eegQuality + ppgQuality) / 2;
    
    return {
      eegQuality,
      ppgQuality,
      overallQuality
    };
  }

  private applyBandpassFilter(data: number[], lowFreq: number, highFreq: number): number[] {
    // 간단한 대역통과 필터 구현
    // 실제 구현에서는 더 정교한 DSP 라이브러리 사용 권장
    return data.map(value => value); // 플레이스홀더
  }

  private calculateBandPower(data: number[], lowFreq: number, highFreq: number): number {
    // 주파수 대역 파워 계산
    return data.reduce((sum, val) => sum + val * val, 0) / data.length;
  }

  private calculateHeartRate(ppgData: number[]): number {
    // 심박수 계산 로직
    return 75; // 플레이스홀더
  }

  private calculateHRV(ppgData: number[]): number {
    // 심박변이도 계산 로직
    return 50; // 플레이스홀더
  }

  private assessEEGQuality(eegData: number[]): number {
    // EEG 신호 품질 평가
    if (eegData.length === 0) return 0;
    
    const variance = this.calculateVariance(eegData);
    const quality = Math.min(100, Math.max(0, 100 - variance / 1000));
    return quality;
  }

  private assessPPGQuality(ppgData: number[]): number {
    // PPG 신호 품질 평가
    if (ppgData.length === 0) return 0;
    
    const snr = this.calculateSNR(ppgData);
    const quality = Math.min(100, Math.max(0, snr * 10));
    return quality;
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  }

  private calculateSNR(data: number[]): number {
    // 신호 대 잡음비 계산
    return 10; // 플레이스홀더
  }
}
```

## 라우터 구현

### 디바이스 라우터

```typescript
// src/routes/device.ts
import { Router } from 'express';
import { LinkBandService } from '../services/LinkBandService';

const router = Router();
const linkBandService = new LinkBandService();

// 디바이스 스캔
router.get('/scan', async (req, res) => {
  try {
    const devices = await linkBandService.scanDevices();
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 디바이스 연결
router.post('/connect', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: '디바이스 주소가 필요합니다' });
    }
    
    await linkBandService.connectDevice(address);
    res.json({ success: true, message: '디바이스가 연결되었습니다' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 디바이스 연결 해제
router.post('/disconnect', async (req, res) => {
  try {
    await linkBandService.disconnectDevice();
    res.json({ success: true, message: '디바이스 연결이 해제되었습니다' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 디바이스 상태
router.get('/status', async (req, res) => {
  try {
    const status = await linkBandService.getDeviceStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as deviceRouter };
```

## 완전한 예제 애플리케이션

```typescript
// src/examples/complete-app.ts
import { LinkBandService } from '../services/LinkBandService';
import { DataProcessor } from '../services/DataProcessor';
import { EventEmitter } from 'events';

export class LinkBandApp extends EventEmitter {
  private linkBandService: LinkBandService;
  private dataProcessor: DataProcessor;
  private isRunning = false;
  private sessionName = '';

  constructor() {
    super();
    this.linkBandService = new LinkBandService();
    this.dataProcessor = new DataProcessor();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Link Band 서비스 이벤트
    this.linkBandService.on('deviceConnected', (address) => {
      console.log(`디바이스 연결됨: ${address}`);
      this.emit('deviceConnected', address);
    });

    this.linkBandService.on('streamData', (data) => {
      const processed = this.dataProcessor.processStreamData(data);
      this.emit('dataProcessed', processed);
    });

    this.linkBandService.on('error', (error) => {
      console.error('Link Band 오류:', error);
      this.emit('error', error);
    });

    // 데이터 프로세서 이벤트
    this.dataProcessor.on('processedData', (data) => {
      this.handleProcessedData(data);
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('Link Band 애플리케이션 초기화 중...');
      
      // 스트림 초기화
      await this.linkBandService.initializeStream();
      console.log('스트림 초기화 완료');
      
      // WebSocket 연결
      this.linkBandService.connectWebSocket();
      console.log('WebSocket 연결 시도 중...');
      
      this.emit('initialized');
    } catch (error) {
      console.error('초기화 실패:', error);
      this.emit('error', error);
    }
  }

  async startSession(sessionName: string): Promise<void> {
    try {
      if (this.isRunning) {
        throw new Error('세션이 이미 실행 중입니다');
      }

      this.sessionName = sessionName;
      
      // 스트리밍 시작
      await this.linkBandService.startStreaming();
      
      // 기록 시작
      await this.linkBandService.startRecording(sessionName, {
        startTime: new Date().toISOString(),
        application: 'Node.js Link Band App'
      });
      
      this.isRunning = true;
      console.log(`세션 시작: ${sessionName}`);
      this.emit('sessionStarted', sessionName);
    } catch (error) {
      console.error('세션 시작 실패:', error);
      this.emit('error', error);
    }
  }

  async stopSession(): Promise<void> {
    try {
      if (!this.isRunning) {
        throw new Error('실행 중인 세션이 없습니다');
      }

      // 기록 중지
      await this.linkBandService.stopRecording();
      
      // 스트리밍 중지
      await this.linkBandService.stopStreaming();
      
      this.isRunning = false;
      console.log(`세션 종료: ${this.sessionName}`);
      this.emit('sessionStopped', this.sessionName);
      this.sessionName = '';
    } catch (error) {
      console.error('세션 종료 실패:', error);
      this.emit('error', error);
    }
  }

  private handleProcessedData(data: any): void {
    // 실시간 데이터 처리 로직
    if (data.quality.overallQuality < 50) {
      console.warn('신호 품질이 낮습니다:', data.quality);
      this.emit('lowQuality', data.quality);
    }

    if (data.motion.isMoving) {
      console.log('움직임 감지됨');
      this.emit('motionDetected', data.motion);
    }

    // 데이터 로깅 또는 추가 처리
    this.emit('realtimeData', data);
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isRunning) {
        await this.stopSession();
      }
      
      this.linkBandService.disconnectWebSocket();
      await this.linkBandService.disconnectDevice();
      
      console.log('정리 완료');
    } catch (error) {
      console.error('정리 중 오류:', error);
    }
  }
}

// 사용 예제
async function main() {
  const app = new LinkBandApp();

  // 이벤트 리스너 설정
  app.on('initialized', () => {
    console.log('애플리케이션 초기화 완료');
  });

  app.on('deviceConnected', (address) => {
    console.log(`디바이스 연결: ${address}`);
  });

  app.on('sessionStarted', (sessionName) => {
    console.log(`세션 시작: ${sessionName}`);
  });

  app.on('realtimeData', (data) => {
    // 실시간 데이터 처리
    console.log('실시간 데이터:', {
      timestamp: data.timestamp,
      eegAlpha: data.eeg.alpha,
      heartRate: data.ppg.heartRate,
      quality: data.quality.overallQuality
    });
  });

  app.on('error', (error) => {
    console.error('애플리케이션 오류:', error);
  });

  try {
    // 애플리케이션 초기화
    await app.initialize();
    
    // 디바이스 스캔 및 연결
    const devices = await app.linkBandService.scanDevices();
    if (devices.length > 0) {
      await app.linkBandService.connectDevice(devices[0].address);
      
      // 세션 시작
      await app.startSession('test-session-' + Date.now());
      
      // 10초 후 세션 종료
      setTimeout(async () => {
        await app.stopSession();
        await app.cleanup();
        process.exit(0);
      }, 10000);
    }
  } catch (error) {
    console.error('메인 실행 오류:', error);
    await app.cleanup();
    process.exit(1);
  }
}

// 프로세스 종료 시 정리
process.on('SIGINT', async () => {
  console.log('프로그램 종료 중...');
  // 정리 로직 실행
  process.exit(0);
});

if (require.main === module) {
  main();
}
```

## TypeScript 지원

### 타입 정의

```typescript
// src/types/linkband.ts
export interface LinkBandConfig {
  apiUrl: string;
  websocketUrl: string;
  timeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface DeviceInfo {
  name: string;
  address: string;
  rssi?: number;
  is_connected: boolean;
  battery_level?: number;
  firmware_version?: string;
}

export interface StreamConfig {
  sampleRate: number;
  channels: string[];
  bufferSize: number;
  filters: {
    lowpass?: number;
    highpass?: number;
    notch?: number;
  };
}

export interface SessionMetadata {
  sessionName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  participant?: string;
  notes?: string;
  tags?: string[];
}

export interface DataQuality {
  eegQuality: number;
  ppgQuality: number;
  overallQuality: number;
  timestamp: number;
}

export interface ProcessingOptions {
  enableFiltering: boolean;
  enableArtifactRemoval: boolean;
  enableRealTimeProcessing: boolean;
  bufferSize: number;
  processingInterval: number;
}
```

### TSConfig 설정

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
```

## 모범 사례

### 1. 에러 처리

```typescript
// 중앙화된 에러 처리
class LinkBandError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'LinkBandError';
  }
}

// 에러 처리 미들웨어
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  if (err instanceof LinkBandError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code
      }
    });
  }
  
  console.error('예상치 못한 오류:', err);
  res.status(500).json({
    error: {
      message: '내부 서버 오류',
      code: 'INTERNAL_ERROR'
    }
  });
};
```

### 2. 로깅

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'linkband-app' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 3. 설정 관리

```typescript
// config/index.ts
export const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  linkband: {
    apiUrl: process.env.LINK_BAND_API_URL || 'http://localhost:8121',
    websocketUrl: process.env.WEBSOCKET_URL || 'ws://localhost:18765',
    timeout: parseInt(process.env.TIMEOUT || '10000'),
    reconnectAttempts: parseInt(process.env.RECONNECT_ATTEMPTS || '5'),
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '1000')
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log'
  }
};
```

### 4. 테스트

```typescript
// tests/linkband.test.ts
import { LinkBandService } from '../src/services/LinkBandService';
import { DataProcessor } from '../src/services/DataProcessor';

describe('LinkBandService', () => {
  let service: LinkBandService;

  beforeEach(() => {
    service = new LinkBandService();
  });

  test('디바이스 스캔이 정상적으로 작동해야 함', async () => {
    const devices = await service.scanDevices();
    expect(Array.isArray(devices)).toBe(true);
  });

  test('WebSocket 연결이 정상적으로 작동해야 함', (done) => {
    service.on('wsConnected', () => {
      expect(true).toBe(true);
      done();
    });
    
    service.connectWebSocket();
  });
});
```

이 가이드를 통해 Node.js 환경에서 Link Band SDK를 효과적으로 활용할 수 있습니다. 실시간 데이터 처리, 에러 처리, 로깅 등의 모범 사례를 따라 안정적이고 확장 가능한 애플리케이션을 구축하세요. 