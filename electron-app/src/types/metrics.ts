export interface SystemMetrics {
  cpu: number;    // CPU 사용률 (%)
  ram: number;    // RAM 사용률 (%)
  disk: number;   // 디스크 사용률 (%)
}

export interface MetricsResponse {
  status: string;
  data: SystemMetrics;
  timestamp: string;
} 