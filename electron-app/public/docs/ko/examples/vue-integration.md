# Vue.js 통합 가이드

이 가이드는 Composition API와 최신 Vue 3 패턴을 사용하여 Link Band SDK를 Vue.js 애플리케이션과 통합하는 방법을 보여줍니다.

## 목차

1. [설치 및 설정](#설치-및-설정)
2. [컴포저블](#컴포저블)
3. [Vue 컴포넌트](#vue-컴포넌트)
4. [완전한 예제](#완전한-예제)
5. [TypeScript 지원](#typescript-지원)
6. [모범 사례](#모범-사례)

## 설치 및 설정

### 필수 조건

```bash
npm install axios
npm install @vueuse/core  # Vue Composition API용 유용한 유틸리티
```

### 환경 설정

프로젝트 루트에 `.env` 파일을 생성하세요:

```env
VITE_LINK_BAND_API_URL=http://localhost:8121
VITE_WEBSOCKET_URL=ws://localhost:18765
```

## 컴포저블

### useDeviceManager 컴포저블

```typescript
// composables/useDeviceManager.ts
import { ref, computed } from 'vue'
import axios from 'axios'

interface Device {
  name: string
  address: string
  rssi?: number
  is_connected: boolean
}

interface DeviceStatus {
  is_connected: boolean
  device_address?: string
  device_name?: string
  connection_time?: string
  battery_level?: number
}

export function useDeviceManager() {
  const devices = ref<Device[]>([])
  const deviceStatus = ref<DeviceStatus | null>(null)
  const isScanning = ref(false)
  const isConnecting = ref(false)
  const error = ref<string | null>(null)

  const API_BASE = import.meta.env.VITE_LINK_BAND_API_URL || 'http://localhost:8121'

  const isConnected = computed(() => deviceStatus.value?.is_connected || false)
  const connectedDevice = computed(() => 
    deviceStatus.value?.is_connected ? deviceStatus.value : null
  )

  const scanDevices = async () => {
    isScanning.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${API_BASE}/device/scan`)
      devices.value = response.data.devices || []
    } catch (err: any) {
      error.value = err.response?.data?.detail || '디바이스 스캔에 실패했습니다'
    } finally {
      isScanning.value = false
    }
  }

  const connectDevice = async (address: string) => {
    isConnecting.value = true
    error.value = null
    
    try {
      await axios.post(`${API_BASE}/device/connect`, { address })
      await getDeviceStatus()
    } catch (err: any) {
      error.value = err.response?.data?.detail || '디바이스 연결에 실패했습니다'
    } finally {
      isConnecting.value = false
    }
  }

  const disconnectDevice = async () => {
    error.value = null
    
    try {
      await axios.post(`${API_BASE}/device/disconnect`)
      deviceStatus.value = null
    } catch (err: any) {
      error.value = err.response?.data?.detail || '디바이스 연결 해제에 실패했습니다'
    }
  }

  const getDeviceStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/device/status`)
      deviceStatus.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.detail || '디바이스 상태 조회에 실패했습니다'
    }
  }

  return {
    // 상태
    devices,
    deviceStatus,
    isScanning,
    isConnecting,
    error,
    
    // 계산된 속성
    isConnected,
    connectedDevice,
    
    // 메서드
    scanDevices,
    connectDevice,
    disconnectDevice,
    getDeviceStatus
  }
}
```

### useDataStreaming 컴포저블

```typescript
// composables/useDataStreaming.ts
import { ref, computed, onUnmounted } from 'vue'
import axios from 'axios'

interface StreamData {
  timestamp: number
  eeg?: number[]
  ppg?: number[]
  acc?: { x: number; y: number; z: number }
  battery?: number
}

interface StreamStatus {
  is_running: boolean
  is_streaming: boolean
  clients_connected: number
  data_rate?: number
}

export function useDataStreaming() {
  const streamData = ref<StreamData[]>([])
  const streamStatus = ref<StreamStatus | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  
  let ws: WebSocket | null = null
  const API_BASE = import.meta.env.VITE_LINK_BAND_API_URL || 'http://localhost:8121'
  const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:18765'

  const latestData = computed(() => 
    streamData.value.length > 0 ? streamData.value[streamData.value.length - 1] : null
  )

  const dataRate = computed(() => streamStatus.value?.data_rate || 0)

  const initializeStream = async () => {
    try {
      await axios.post(`${API_BASE}/stream/init`)
    } catch (err: any) {
      error.value = err.response?.data?.detail || '스트림 초기화에 실패했습니다'
    }
  }

  const startStreaming = async () => {
    try {
      await axios.post(`${API_BASE}/stream/start`)
    } catch (err: any) {
      error.value = err.response?.data?.detail || '스트리밍 시작에 실패했습니다'
    }
  }

  const stopStreaming = async () => {
    try {
      await axios.post(`${API_BASE}/stream/stop`)
      if (ws) {
        ws.close()
      }
    } catch (err: any) {
      error.value = err.response?.data?.detail || '스트리밍 중지에 실패했습니다'
    }
  }

  const connectWebSocket = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      return
    }

    ws = new WebSocket(WS_URL)
    
    ws.onopen = () => {
      isConnected.value = true
      error.value = null
      console.log('WebSocket 연결됨')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        streamData.value.push(data)
        
        // 성능을 위해 최근 1000개 포인트만 유지
        if (streamData.value.length > 1000) {
          streamData.value = streamData.value.slice(-1000)
        }
      } catch (err) {
        console.error('WebSocket 메시지 파싱 실패:', err)
      }
    }

    ws.onerror = () => {
      error.value = 'WebSocket 연결 오류'
    }

    ws.onclose = () => {
      isConnected.value = false
      console.log('WebSocket 연결 해제됨')
    }
  }

  const getStreamStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/stream/status`)
      streamStatus.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.detail || '스트림 상태 조회에 실패했습니다'
    }
  }

  const clearStreamData = () => {
    streamData.value = []
  }

  // 언마운트 시 정리
  onUnmounted(() => {
    if (ws) {
      ws.close()
    }
  })

  return {
    // 상태
    streamData,
    streamStatus,
    isConnected,
    error,
    
    // 계산된 속성
    latestData,
    dataRate,
    
    // 메서드
    initializeStream,
    startStreaming,
    stopStreaming,
    connectWebSocket,
    getStreamStatus,
    clearStreamData
  }
}
```

## Vue 컴포넌트

### DeviceManager 컴포넌트

```vue
<!-- components/DeviceManager.vue -->
<template>
  <div class="device-manager">
    <h3>디바이스 관리</h3>
    
    <!-- 오류 표시 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 디바이스 상태 -->
    <div class="device-status">
      <h4>현재 상태</h4>
      <div v-if="deviceStatus">
        <p>연결됨: {{ isConnected ? '예' : '아니오' }}</p>
        <div v-if="isConnected">
          <p>디바이스: {{ connectedDevice?.device_name || connectedDevice?.device_address }}</p>
          <p v-if="connectedDevice?.battery_level">
            배터리: {{ connectedDevice.battery_level }}%
          </p>
          <button @click="disconnectDevice" class="btn btn-danger">
            연결 해제
          </button>
        </div>
      </div>
      <p v-else>상태 로딩 중...</p>
    </div>

    <!-- 디바이스 스캐너 -->
    <div v-if="!isConnected" class="device-scanner">
      <h4>사용 가능한 디바이스</h4>
      <button 
        @click="scanDevices" 
        :disabled="isScanning"
        class="btn btn-primary"
      >
        {{ isScanning ? '스캔 중...' : '디바이스 스캔' }}
      </button>
      
      <div class="devices-list">
        <div 
          v-for="device in devices" 
          :key="device.address"
          class="device-item"
        >
          <div class="device-info">
            <strong>{{ device.name }}</strong>
            <br>
            <small>{{ device.address }}</small>
            <span v-if="device.rssi"> (RSSI: {{ device.rssi }})</span>
          </div>
          <button 
            @click="connectDevice(device.address)"
            :disabled="isConnecting"
            class="btn btn-success"
          >
            {{ isConnecting ? '연결 중...' : '연결' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useDeviceManager } from '../composables/useDeviceManager'

const emit = defineEmits<{
  deviceConnected: [deviceAddress: string]
}>()

const {
  devices,
  deviceStatus,
  isScanning,
  isConnecting,
  error,
  isConnected,
  connectedDevice,
  scanDevices,
  connectDevice,
  disconnectDevice,
  getDeviceStatus
} = useDeviceManager()

onMounted(() => {
  getDeviceStatus()
})

watch(isConnected, (newValue) => {
  if (newValue && connectedDevice.value?.device_address) {
    emit('deviceConnected', connectedDevice.value.device_address)
  }
})
</script>

<style scoped>
.device-manager {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.device-status {
  margin-bottom: 20px;
}

.devices-list {
  margin-top: 15px;
  max-height: 300px;
  overflow-y: auto;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 5px 0;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: white;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}
</style>
```

### DataVisualization 컴포넌트

```vue
<!-- components/DataVisualization.vue -->
<template>
  <div class="data-visualization">
    <h3>데이터 스트리밍</h3>
    
    <!-- 오류 표시 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 스트림 컨트롤 -->
    <div class="stream-controls">
      <button 
        @click="handleStartStreaming"
        :disabled="!isDeviceConnected || streamStatus?.is_streaming"
        class="btn btn-primary"
      >
        스트리밍 시작
      </button>
      <button 
        @click="stopStreaming"
        :disabled="!streamStatus?.is_streaming"
        class="btn btn-warning"
      >
        스트리밍 중지
      </button>
      <button @click="clearStreamData" class="btn btn-secondary">
        데이터 지우기
      </button>
    </div>

    <!-- 스트림 상태 -->
    <div class="stream-status">
      <h4>스트림 상태</h4>
      <div v-if="streamStatus">
        <p>서버 실행 중: {{ streamStatus.is_running ? '예' : '아니오' }}</p>
        <p>스트리밍 중: {{ streamStatus.is_streaming ? '예' : '아니오' }}</p>
        <p>WebSocket 연결됨: {{ isConnected ? '예' : '아니오' }}</p>
        <p>연결된 클라이언트: {{ streamStatus.clients_connected }}</p>
        <p v-if="dataRate">데이터 전송률: {{ dataRate.toFixed(1) }} Hz</p>
      </div>
      <p v-else>상태 로딩 중...</p>
    </div>

    <!-- 데이터 시각화 */>
    <div class="visualization-area">
      <h4>실시간 데이터</h4>
      <canvas 
        ref="canvasRef"
        width="800"
        height="200"
        class="data-canvas"
      />
      <div class="data-info">
        <p>데이터 포인트: {{ streamData.length }}</p>
        <div v-if="latestData" class="latest-data">
          <h5>최신 값:</h5>
          <p v-if="latestData.eeg">EEG: {{ latestData.eeg.slice(0, 3).map(v => v.toFixed(2)).join(', ') }}...</p>
          <p v-if="latestData.ppg">PPG: {{ latestData.ppg.slice(0, 3).map(v => v.toFixed(2)).join(', ') }}...</p>
          <p v-if="latestData.acc">
            ACC: X={{ latestData.acc.x.toFixed(2) }}, Y={{ latestData.acc.y.toFixed(2) }}, Z={{ latestData.acc.z.toFixed(2) }}
          </p>
          <p v-if="latestData.battery">배터리: {{ latestData.battery }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useDataStreaming } from '../composables/useDataStreaming'

interface Props {
  isDeviceConnected: boolean
}

const props = defineProps<Props>()

const canvasRef = ref<HTMLCanvasElement>()

const {
  streamData,
  streamStatus,
  isConnected,
  error,
  latestData,
  dataRate,
  initializeStream,
  startStreaming,
  stopStreaming,
  connectWebSocket,
  getStreamStatus,
  clearStreamData
} = useDataStreaming()

const handleStartStreaming = async () => {
  await startStreaming()
  connectWebSocket()
}

// 디바이스가 연결되면 스트림 초기화
watch(() => props.isDeviceConnected, (newValue) => {
  if (newValue) {
    initializeStream()
  }
})

// 데이터가 변경되면 캔버스 업데이트
watch(streamData, () => {
  nextTick(() => {
    drawData()
  })
}, { deep: true })

const drawData = () => {
  if (!canvasRef.value || streamData.value.length === 0) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 캔버스 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // EEG 데이터가 있으면 그리기
  const latestData = streamData.value.slice(-100) // 최근 100개 포인트
  if (latestData.length > 0 && latestData[0].eeg) {
    ctx.strokeStyle = '#007bff'
    ctx.lineWidth = 2
    ctx.beginPath()

    latestData.forEach((data, index) => {
      if (data.eeg && data.eeg.length > 0) {
        const x = (index / latestData.length) * canvas.width
        const y = canvas.height / 2 - (data.eeg[0] * 100) // 스케일링 및 중앙 정렬
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
    })

    ctx.stroke()
  }

  // 격자 그리기
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  
  // 수평선
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * canvas.height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }
  
  // 수직선
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * canvas.width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }
}

onMounted(() => {
  getStreamStatus()
  // 5초마다 상태 폴링
  setInterval(getStreamStatus, 5000)
})
</script>

<style scoped>
.data-visualization {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.stream-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.stream-status {
  margin-bottom: 20px;
}

.data-canvas {
  border: 1px solid #ccc;
  width: 100%;
  height: 200px;
  background-color: white;
}

.data-info {
  margin-top: 10px;
}

.latest-data {
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: black;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}
</style>
```

## 완전한 예제

### 메인 앱 컴포넌트

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <header class="app-header">
      <h1>Link Band SDK - Vue.js 통합</h1>
    </header>
    
    <main class="app-main">
      <div class="container">
        <!-- 디바이스 관리 섹션 -->
        <section class="section">
          <DeviceManager @device-connected="handleDeviceConnected" />
        </section>

        <!-- 데이터 스트리밍 섹션 -->
        <section class="section">
          <DataVisualization 
            :is-device-connected="isDeviceConnected"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DeviceManager from './components/DeviceManager.vue'
import DataVisualization from './components/DataVisualization.vue'

const isDeviceConnected = ref(false)

const handleDeviceConnected = (deviceAddress: string) => {
  isDeviceConnected.value = true
  console.log('디바이스 연결됨:', deviceAddress)
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.app-header {
  background-color: #2c3e50;
  padding: 20px;
  color: white;
  margin-bottom: 30px;
  border-radius: 8px;
  text-align: center;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

@media (min-width: 768px) {
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
  
  .section:first-child {
    grid-column: 1 / -1;
  }
}

h1, h2, h3, h4, h5 {
  color: #2c3e50;
}

h3 {
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 20px;
}
</style>
```

이 포괄적인 Vue.js 통합 가이드는 최신 Vue 3 Composition API, TypeScript 지원, 실시간 데이터 처리를 위한 모범 사례를 포함하여 완전한 기능을 갖춘 Link Band SDK 애플리케이션을 구축하는 데 필요한 모든 것을 제공합니다. 