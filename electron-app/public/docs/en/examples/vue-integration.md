# Vue.js Integration Guide

This guide demonstrates how to integrate the Link Band SDK with Vue.js applications using the Composition API and modern Vue 3 patterns.

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Composables](#composables)
3. [Vue Components](#vue-components)
4. [Complete Example](#complete-example)
5. [TypeScript Support](#typescript-support)
6. [Best Practices](#best-practices)

## Installation & Setup

### Prerequisites

```bash
npm install axios
npm install @vueuse/core  # Useful utilities for Vue Composition API
```

### Environment Configuration

Create a `.env` file in your project root:

```env
VITE_LINK_BAND_API_URL=http://localhost:8121
VITE_WEBSOCKET_URL=ws://localhost:18765
```

## Composables

### useDeviceManager Composable

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
      error.value = err.response?.data?.detail || 'Failed to scan devices'
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
      error.value = err.response?.data?.detail || 'Failed to connect device'
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
      error.value = err.response?.data?.detail || 'Failed to disconnect device'
    }
  }

  const getDeviceStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/device/status`)
      deviceStatus.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to get device status'
    }
  }

  const registerDevice = async (name: string, address: string) => {
    try {
      await axios.post(`${API_BASE}/device/register_device`, { name, address })
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to register device'
      return false
    }
  }

  return {
    // State
    devices,
    deviceStatus,
    isScanning,
    isConnecting,
    error,
    
    // Computed
    isConnected,
    connectedDevice,
    
    // Methods
    scanDevices,
    connectDevice,
    disconnectDevice,
    getDeviceStatus,
    registerDevice
  }
}
```

### useDataStreaming Composable

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
      error.value = err.response?.data?.detail || 'Failed to initialize stream'
    }
  }

  const startStreaming = async () => {
    try {
      await axios.post(`${API_BASE}/stream/start`)
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to start streaming'
    }
  }

  const stopStreaming = async () => {
    try {
      await axios.post(`${API_BASE}/stream/stop`)
      if (ws) {
        ws.close()
      }
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to stop streaming'
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
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        streamData.value.push(data)
        
        // Keep only last 1000 points for performance
        if (streamData.value.length > 1000) {
          streamData.value = streamData.value.slice(-1000)
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onerror = () => {
      error.value = 'WebSocket connection error'
    }

    ws.onclose = () => {
      isConnected.value = false
      console.log('WebSocket disconnected')
    }
  }

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close()
      ws = null
    }
  }

  const getStreamStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/stream/status`)
      streamStatus.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to get stream status'
    }
  }

  const clearStreamData = () => {
    streamData.value = []
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnectWebSocket()
  })

  return {
    // State
    streamData,
    streamStatus,
    isConnected,
    error,
    
    // Computed
    latestData,
    dataRate,
    
    // Methods
    initializeStream,
    startStreaming,
    stopStreaming,
    connectWebSocket,
    disconnectWebSocket,
    getStreamStatus,
    clearStreamData
  }
}
```

### useRecording Composable

```typescript
// composables/useRecording.ts
import { ref, computed } from 'vue'
import axios from 'axios'

interface RecordingStatus {
  is_recording: boolean
  current_session?: string
  start_time?: string
}

interface Session {
  session_name: string
  start_time: string
  end_time?: string
  duration?: number
  data_path: string
  file_count: number
  total_size: number
}

export function useRecording() {
  const recordingStatus = ref<RecordingStatus | null>(null)
  const sessions = ref<Session[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const API_BASE = import.meta.env.VITE_LINK_BAND_API_URL || 'http://localhost:8121'

  const isRecording = computed(() => recordingStatus.value?.is_recording || false)
  const currentSession = computed(() => recordingStatus.value?.current_session)
  const sessionCount = computed(() => sessions.value.length)

  const startRecording = async (sessionName?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const payload = sessionName ? { session_name: sessionName } : {}
      await axios.post(`${API_BASE}/data/start-recording`, payload)
      await getRecordingStatus()
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to start recording'
    } finally {
      isLoading.value = false
    }
  }

  const stopRecording = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      await axios.post(`${API_BASE}/data/stop-recording`)
      await getRecordingStatus()
      await getSessions()
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to stop recording'
    } finally {
      isLoading.value = false
    }
  }

  const getRecordingStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/recording-status`)
      recordingStatus.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to get recording status'
    }
  }

  const getSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/sessions`)
      sessions.value = response.data.sessions || response.data || []
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to get sessions'
    }
  }

  const getSessionDetails = async (sessionName: string) => {
    try {
      const response = await axios.get(`${API_BASE}/data/sessions/${sessionName}`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to get session details'
      return null
    }
  }

  const exportSession = async (sessionName: string) => {
    try {
      const response = await axios.post(`${API_BASE}/data/sessions/${sessionName}/prepare-export`)
      return response.data.download_url
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to export session'
      return null
    }
  }

  const deleteSession = async (sessionName: string) => {
    try {
      await axios.delete(`${API_BASE}/data/sessions/${sessionName}`)
      await getSessions() // Refresh list
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to delete session'
      return false
    }
  }

  return {
    // State
    recordingStatus,
    sessions,
    isLoading,
    error,
    
    // Computed
    isRecording,
    currentSession,
    sessionCount,
    
    // Methods
    startRecording,
    stopRecording,
    getRecordingStatus,
    getSessions,
    getSessionDetails,
    exportSession,
    deleteSession
  }
}
```

## Vue Components

### DeviceManager Component

```vue
<!-- components/DeviceManager.vue -->
<template>
  <div class="device-manager">
    <h3>Device Management</h3>
    
    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Device Status -->
    <div class="device-status">
      <h4>Current Status</h4>
      <div v-if="deviceStatus">
        <p>Connected: {{ isConnected ? 'Yes' : 'No' }}</p>
        <div v-if="isConnected">
          <p>Device: {{ connectedDevice?.device_name || connectedDevice?.device_address }}</p>
          <p v-if="connectedDevice?.battery_level">
            Battery: {{ connectedDevice.battery_level }}%
          </p>
          <button @click="disconnectDevice" class="btn btn-danger">
            Disconnect
          </button>
        </div>
      </div>
      <p v-else>Loading status...</p>
    </div>

    <!-- Device Scanner -->
    <div v-if="!isConnected" class="device-scanner">
      <h4>Available Devices</h4>
      <button 
        @click="scanDevices" 
        :disabled="isScanning"
        class="btn btn-primary"
      >
        {{ isScanning ? 'Scanning...' : 'Scan for Devices' }}
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
            {{ isConnecting ? 'Connecting...' : 'Connect' }}
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

### DataVisualization Component

```vue
<!-- components/DataVisualization.vue -->
<template>
  <div class="data-visualization">
    <h3>Data Streaming</h3>
    
    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Stream Controls -->
    <div class="stream-controls">
      <button 
        @click="handleStartStreaming"
        :disabled="!isDeviceConnected || streamStatus?.is_streaming"
        class="btn btn-primary"
      >
        Start Streaming
      </button>
      <button 
        @click="stopStreaming"
        :disabled="!streamStatus?.is_streaming"
        class="btn btn-warning"
      >
        Stop Streaming
      </button>
      <button @click="clearStreamData" class="btn btn-secondary">
        Clear Data
      </button>
    </div>

    <!-- Stream Status -->
    <div class="stream-status">
      <h4>Stream Status</h4>
      <div v-if="streamStatus">
        <p>Server Running: {{ streamStatus.is_running ? 'Yes' : 'No' }}</p>
        <p>Streaming: {{ streamStatus.is_streaming ? 'Yes' : 'No' }}</p>
        <p>WebSocket Connected: {{ isConnected ? 'Yes' : 'No' }}</p>
        <p>Clients Connected: {{ streamStatus.clients_connected }}</p>
        <p v-if="dataRate">Data Rate: {{ dataRate.toFixed(1) }} Hz</p>
      </div>
      <p v-else>Loading status...</p>
    </div>

    <!-- Data Visualization -->
    <div class="visualization-area">
      <h4>Real-time Data</h4>
      <canvas 
        ref="canvasRef"
        width="800"
        height="200"
        class="data-canvas"
      />
      <div class="data-info">
        <p>Data Points: {{ streamData.length }}</p>
        <div v-if="latestData" class="latest-data">
          <h5>Latest Values:</h5>
          <p v-if="latestData.eeg">EEG: {{ latestData.eeg.slice(0, 3).map(v => v.toFixed(2)).join(', ') }}...</p>
          <p v-if="latestData.ppg">PPG: {{ latestData.ppg.slice(0, 3).map(v => v.toFixed(2)).join(', ') }}...</p>
          <p v-if="latestData.acc">
            ACC: X={{ latestData.acc.x.toFixed(2) }}, Y={{ latestData.acc.y.toFixed(2) }}, Z={{ latestData.acc.z.toFixed(2) }}
          </p>
          <p v-if="latestData.battery">Battery: {{ latestData.battery }}%</p>
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

// Initialize stream when device is connected
watch(() => props.isDeviceConnected, (newValue) => {
  if (newValue) {
    initializeStream()
  }
})

// Update canvas when data changes
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

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw EEG data if available
  const latestData = streamData.value.slice(-100) // Last 100 points
  if (latestData.length > 0 && latestData[0].eeg) {
    ctx.strokeStyle = '#007bff'
    ctx.lineWidth = 2
    ctx.beginPath()

    latestData.forEach((data, index) => {
      if (data.eeg && data.eeg.length > 0) {
        const x = (index / latestData.length) * canvas.width
        const y = canvas.height / 2 - (data.eeg[0] * 100) // Scale and center
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
    })

    ctx.stroke()
  }

  // Draw grid
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  
  // Horizontal lines
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * canvas.height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }
  
  // Vertical lines
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
  // Poll status every 5 seconds
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

### RecordingManager Component

```vue
<!-- components/RecordingManager.vue -->
<template>
  <div class="recording-manager">
    <h3>Recording Management</h3>
    
    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Recording Controls -->
    <div class="recording-controls">
      <h4>Recording Controls</h4>
      
      <div v-if="isRecording" class="recording-active">
        <p>Recording: <strong>{{ currentSession }}</strong></p>
        <p v-if="recordingStatus?.start_time">
          Started: {{ new Date(recordingStatus.start_time).toLocaleString() }}
        </p>
        <button 
          @click="stopRecording" 
          :disabled="isLoading"
          class="btn btn-danger"
        >
          {{ isLoading ? 'Stopping...' : 'Stop Recording' }}
        </button>
      </div>
      
      <div v-else class="recording-inactive">
        <div class="input-group">
          <input
            v-model="sessionName"
            type="text"
            placeholder="Session name (optional)"
            class="form-input"
          />
          <button 
            @click="handleStartRecording"
            :disabled="!isStreaming || isLoading"
            class="btn btn-success"
          >
            {{ isLoading ? 'Starting...' : 'Start Recording' }}
          </button>
        </div>
        <p v-if="!isStreaming" class="warning-text">
          Start streaming first
        </p>
      </div>
    </div>

    <!-- Sessions List -->
    <div class="sessions-list">
      <div class="sessions-header">
        <h4>Recorded Sessions ({{ sessionCount }})</h4>
        <button @click="getSessions" class="btn btn-secondary">
          Refresh Sessions
        </button>
      </div>
      
      <div v-if="sessions.length === 0" class="no-sessions">
        <p>No sessions found</p>
      </div>
      
      <div v-else class="sessions-grid">
        <div 
          v-for="session in sessions" 
          :key="session.session_name"
          class="session-item"
        >
          <h5>{{ session.session_name }}</h5>
          <div class="session-info">
            <p>Start: {{ new Date(session.start_time).toLocaleString() }}</p>
            <p v-if="session.end_time">
              End: {{ new Date(session.end_time).toLocaleString() }}
            </p>
            <p v-if="session.duration">
              Duration: {{ Math.round(session.duration) }} seconds
            </p>
            <p>Files: {{ session.file_count }}</p>
            <p>Size: {{ (session.total_size / 1024 / 1024).toFixed(2) }} MB</p>
          </div>
          
          <div class="session-actions">
            <button 
              @click="handleExportSession(session.session_name)"
              class="btn btn-primary btn-sm"
            >
              Export
            </button>
            <button 
              @click="handleDeleteSession(session.session_name)"
              class="btn btn-danger btn-sm"
              @click.stop
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRecording } from '../composables/useRecording'

interface Props {
  isStreaming: boolean
}

const props = defineProps<Props>()

const sessionName = ref('')

const {
  recordingStatus,
  sessions,
  isLoading,
  error,
  isRecording,
  currentSession,
  sessionCount,
  startRecording,
  stopRecording,
  getRecordingStatus,
  getSessions,
  exportSession,
  deleteSession
} = useRecording()

const handleStartRecording = async () => {
  await startRecording(sessionName.value || undefined)
  sessionName.value = ''
}

const handleExportSession = async (sessionName: string) => {
  const downloadUrl = await exportSession(sessionName)
  if (downloadUrl) {
    // Create download link
    const link = document.createElement('a')
    link.href = `${import.meta.env.VITE_LINK_BAND_API_URL}${downloadUrl}`
    link.download = `${sessionName}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const handleDeleteSession = async (sessionName: string) => {
  if (confirm(`Are you sure you want to delete session "${sessionName}"?`)) {
    await deleteSession(sessionName)
  }
}

onMounted(() => {
  getRecordingStatus()
  getSessions()
})

// Poll recording status
watch(() => props.isStreaming, () => {
  const interval = setInterval(getRecordingStatus, 2000)
  return () => clearInterval(interval)
}, { immediate: true })
</script>

<style scoped>
.recording-manager {
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

.recording-controls {
  margin-bottom: 30px;
}

.recording-active {
  background-color: #d1ecf1;
  padding: 15px;
  border-radius: 4px;
  border-left: 4px solid #bee5eb;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.form-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.warning-text {
  color: #856404;
  background-color: #fff3cd;
  padding: 8px;
  border-radius: 4px;
  margin: 0;
}

.sessions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.no-sessions {
  text-align: center;
  color: #6c757d;
  padding: 20px;
}

.sessions-grid {
  max-height: 400px;
  overflow-y: auto;
}

.session-item {
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 10px;
}

.session-info {
  margin: 10px 0;
}

.session-info p {
  margin: 2px 0;
  font-size: 14px;
}

.session-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}
</style>
```

## Complete Example

### Main App Component

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <header class="app-header">
      <h1>Link Band SDK - Vue.js Integration</h1>
    </header>
    
    <main class="app-main">
      <div class="container">
        <!-- Device Management Section -->
        <section class="section">
          <DeviceManager @device-connected="handleDeviceConnected" />
        </section>

        <!-- Data Streaming Section -->
        <section class="section">
          <DataVisualization 
            :is-device-connected="isDeviceConnected"
            @streaming-status-changed="handleStreamingStatusChanged"
          />
        </section>

        <!-- Recording Management Section -->
        <section class="section">
          <RecordingManager 
            :is-streaming="isStreaming"
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
import RecordingManager from './components/RecordingManager.vue'

const isDeviceConnected = ref(false)
const isStreaming = ref(false)

const handleDeviceConnected = (deviceAddress: string) => {
  isDeviceConnected.value = true
  console.log('Device connected:', deviceAddress)
}

const handleStreamingStatusChanged = (streaming: boolean) => {
  isStreaming.value = streaming
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

## TypeScript Support

### Type Definitions

```typescript
// types/linkband.ts
export interface Device {
  name: string
  address: string
  rssi?: number
  is_connected: boolean
}

export interface DeviceStatus {
  is_connected: boolean
  device_address?: string
  device_name?: string
  connection_time?: string
  battery_level?: number
}

export interface StreamData {
  timestamp: number
  eeg?: number[]
  ppg?: number[]
  acc?: {
    x: number
    y: number
    z: number
  }
  battery?: number
  device_id?: string
}

export interface StreamStatus {
  is_running: boolean
  is_streaming: boolean
  clients_connected: number
  data_rate?: number
  total_messages?: number
}

export interface RecordingStatus {
  is_recording: boolean
  current_session?: string
  start_time?: string
}

export interface Session {
  session_name: string
  start_time: string
  end_time?: string
  duration?: number
  data_path: string
  file_count: number
  total_size: number
}

export interface ApiResponse<T = any> {
  status: 'success' | 'fail'
  message?: string
  data?: T
}
```

## Best Practices

### 1. Error Handling Composable

```typescript
// composables/useErrorHandler.ts
import { ref } from 'vue'

export function useErrorHandler() {
  const error = ref<string | null>(null)

  const handleError = (err: any): void => {
    if (err.response?.data?.detail) {
      error.value = err.response.data.detail
    } else if (err.message) {
      error.value = err.message
    } else {
      error.value = 'An unexpected error occurred'
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    error,
    handleError,
    clearError
  }
}
```

### 2. WebSocket Management Composable

```typescript
// composables/useWebSocket.ts
import { ref, onUnmounted } from 'vue'

export function useWebSocket(url: string) {
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  const reconnectAttempts = ref(0)
  
  let ws: WebSocket | null = null
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000

  const connect = (
    onMessage: (data: any) => void,
    onError?: (error: string) => void
  ) => {
    try {
      ws = new WebSocket(url)
      
      ws.onopen = () => {
        isConnected.value = true
        reconnectAttempts.value = 0
        error.value = null
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = () => {
        const errorMsg = 'WebSocket connection error'
        error.value = errorMsg
        onError?.(errorMsg)
      }

      ws.onclose = () => {
        isConnected.value = false
        console.log('WebSocket disconnected')
        
        // Auto-reconnect
        if (reconnectAttempts.value < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.value++
            connect(onMessage, onError)
          }, reconnectDelay * reconnectAttempts.value)
        }
      }
    } catch (err) {
      const errorMsg = 'Failed to create WebSocket connection'
      error.value = errorMsg
      onError?.(errorMsg)
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
    }
  }

  const send = (data: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    error,
    connect,
    disconnect,
    send
  }
}
```

### 3. Performance Optimization

```typescript
// composables/useThrottle.ts
import { ref, watch } from 'vue'

export function useThrottle<T>(value: Ref<T>, delay: number) {
  const throttledValue = ref(value.value)
  let timeout: NodeJS.Timeout | null = null

  watch(value, (newValue) => {
    if (timeout) return
    
    timeout = setTimeout(() => {
      throttledValue.value = newValue
      timeout = null
    }, delay)
  })

  return throttledValue
}
```

This comprehensive Vue.js integration guide provides everything needed to build a full-featured Link Band SDK application with modern Vue 3 Composition API, TypeScript support, and best practices for real-time data handling. 