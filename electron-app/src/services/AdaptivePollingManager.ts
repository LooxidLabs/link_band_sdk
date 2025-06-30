/**
 * AdaptivePollingManager
 * 
 * 시스템 초기화 단계를 인식하여 폴링 간격을 적응적으로 조정하는 매니저
 * - 초기화 단계: 더 자주 폴링 (기본 1초)
 * - 정상 단계: 일반적인 간격으로 폴링 (기본 5초)
 */

export interface PollingConfig {
  normalInterval: number;    // 정상 단계 폴링 간격 (ms)
  initInterval: number;      // 초기화 단계 폴링 간격 (ms)
  initDuration: number;      // 초기화 단계 지속 시간 (ms)
}

export interface PollingStatus {
  isActive: boolean;
  isInitializationPhase: boolean;
  currentInterval: number;
  timeRemaining: number;
  totalPolls: number;
  lastPollTime: number;
}

export class AdaptivePollingManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitializationPhase = false;
  private initializationStartTime: number | null = null;
  private configs: Map<string, PollingConfig> = new Map();
  private callbacks: Map<string, () => Promise<void>> = new Map();
  private pollCounts: Map<string, number> = new Map();
  private lastPollTimes: Map<string, number> = new Map();
  
  constructor() {
    console.log('[AdaptivePollingManager] Initialized');
  }

  /**
   * 적응형 폴링 시작
   */
  startAdaptivePolling(
    key: string,
    callback: () => Promise<void>,
    config: Partial<PollingConfig> = {}
  ): void {
    const finalConfig: PollingConfig = {
      normalInterval: config.normalInterval || 5000,   // 5초
      initInterval: config.initInterval || 1000,       // 1초
      initDuration: config.initDuration || 15000       // 15초
    };

    this.configs.set(key, finalConfig);
    this.callbacks.set(key, callback);
    this.pollCounts.set(key, 0);

    console.log(`[AdaptivePollingManager] Starting adaptive polling for "${key}"`, {
      normalInterval: finalConfig.normalInterval,
      initInterval: finalConfig.initInterval,
      initDuration: finalConfig.initDuration,
      isInitializationPhase: this.isInitializationPhase
    });

    // 기존 폴링이 있으면 중지
    this.stopPolling(key);

    // 폴링 시작
    this.scheduleNextPoll(key);
  }

  /**
   * 폴링 중지
   */
  stopPolling(key: string): void {
    const timer = this.intervals.get(key);
    if (timer) {
      clearTimeout(timer);
      this.intervals.delete(key);
      console.log(`[AdaptivePollingManager] Stopped polling for "${key}"`);
    }
  }

  /**
   * 모든 폴링 중지
   */
  stopAllPolling(): void {
    this.intervals.forEach((timer, key) => {
      clearTimeout(timer);
      console.log(`[AdaptivePollingManager] Stopped polling for "${key}"`);
    });
    this.intervals.clear();
  }

  /**
   * 시스템 초기화 시작 마킹
   */
  markInitializationStart(): void {
    this.isInitializationPhase = true;
    this.initializationStartTime = Date.now();
    console.log('[AdaptivePollingManager] Initialization phase started');

    // 모든 활성 폴링의 간격을 초기화 간격으로 조정
    this.adjustAllPollingIntervals();
  }

  /**
   * 초기화 단계 여부 확인
   */
  isInInitializationPhase(): boolean {
    if (!this.isInitializationPhase || !this.initializationStartTime) {
      return false;
    }

    // 모든 설정된 초기화 기간 중 가장 긴 것을 기준으로 판단
    const maxInitDuration = Math.max(...Array.from(this.configs.values()).map(c => c.initDuration));
    const elapsed = Date.now() - this.initializationStartTime;
    
    if (elapsed > maxInitDuration) {
      this.isInitializationPhase = false;
      console.log('[AdaptivePollingManager] Initialization phase ended');
      this.adjustAllPollingIntervals();
      return false;
    }

    return true;
  }

  /**
   * 초기화 단계 남은 시간 (초)
   */
  getInitializationTimeRemaining(): number {
    if (!this.isInInitializationPhase()) {
      return 0;
    }

    const maxInitDuration = Math.max(...Array.from(this.configs.values()).map(c => c.initDuration));
    const elapsed = Date.now() - (this.initializationStartTime || 0);
    return Math.max(0, Math.ceil((maxInitDuration - elapsed) / 1000));
  }

  /**
   * 폴링 상태 정보 반환
   */
  getPollingStatus(key: string): PollingStatus | null {
    const config = this.configs.get(key);
    if (!config) {
      return null;
    }

    const isActive = this.intervals.has(key);
    const isInitPhase = this.isInInitializationPhase();
    const currentInterval = isInitPhase ? config.initInterval : config.normalInterval;
    const timeRemaining = this.getInitializationTimeRemaining();
    const totalPolls = this.pollCounts.get(key) || 0;
    const lastPollTime = this.lastPollTimes.get(key) || 0;

    return {
      isActive,
      isInitializationPhase: isInitPhase,
      currentInterval,
      timeRemaining,
      totalPolls,
      lastPollTime
    };
  }

  /**
   * 모든 폴링 상태 정보 반환
   */
  getAllPollingStatus(): Record<string, PollingStatus> {
    const status: Record<string, PollingStatus> = {};
    
    for (const key of this.configs.keys()) {
      const pollingStatus = this.getPollingStatus(key);
      if (pollingStatus) {
        status[key] = pollingStatus;
      }
    }

    return status;
  }

  /**
   * 다음 폴링 스케줄링
   */
  private scheduleNextPoll(key: string): void {
    const config = this.configs.get(key);
    const callback = this.callbacks.get(key);
    
    if (!config || !callback) {
      console.warn(`[AdaptivePollingManager] No config or callback found for "${key}"`);
      return;
    }

    const poll = async () => {
      try {
        // 폴링 카운트 증가
        const currentCount = this.pollCounts.get(key) || 0;
        this.pollCounts.set(key, currentCount + 1);
        this.lastPollTimes.set(key, Date.now());

        // 콜백 실행
        await callback();

        // 초기화 단계 상태 확인 및 업데이트
        const wasInitPhase = this.isInitializationPhase;
        const isInitPhase = this.isInInitializationPhase();
        
        if (wasInitPhase && !isInitPhase) {
          console.log(`[AdaptivePollingManager] "${key}" switching to normal polling interval`);
        }

        // 다음 폴링 스케줄
        const nextInterval = isInitPhase ? config.initInterval : config.normalInterval;
        const timer = setTimeout(() => this.scheduleNextPoll(key), nextInterval);
        this.intervals.set(key, timer);

      } catch (error) {
        console.error(`[AdaptivePollingManager] Error in polling callback for "${key}":`, error);
        
        // 에러가 발생해도 폴링 계속 (에러 간격으로)
        const errorInterval = 5000; // 5초 후 재시도
        const timer = setTimeout(() => this.scheduleNextPoll(key), errorInterval);
        this.intervals.set(key, timer);
      }
    };

    // 첫 번째 폴링 즉시 실행
    poll();
  }

  /**
   * 모든 폴링 간격 조정
   */
  private adjustAllPollingIntervals(): void {
    // 현재 활성화된 모든 폴링을 새로운 간격으로 재시작
    const activeKeys = Array.from(this.intervals.keys());
    
    for (const key of activeKeys) {
      const config = this.configs.get(key);
      const callback = this.callbacks.get(key);
      
      if (config && callback) {
        // 현재 폴링 중지
        this.stopPolling(key);
        
        // 새로운 간격으로 재시작 (즉시 폴링하지 않음)
        const newInterval = this.isInInitializationPhase() ? config.initInterval : config.normalInterval;
        const timer = setTimeout(() => this.scheduleNextPoll(key), newInterval);
        this.intervals.set(key, timer);
        
        console.log(`[AdaptivePollingManager] Adjusted polling interval for "${key}" to ${newInterval}ms`);
      }
    }
  }

  /**
   * 즉시 폴링 실행 (대기 시간 없이)
   */
  async forceImmediateCheck(key: string): Promise<void> {
    const callback = this.callbacks.get(key);
    if (!callback) {
      console.warn(`[AdaptivePollingManager] No callback found for "${key}" - cannot force immediate check`);
      return;
    }

    try {
      console.log(`[AdaptivePollingManager] Force immediate check for "${key}"`);
      
      // 폴링 카운트 증가
      const currentCount = this.pollCounts.get(key) || 0;
      this.pollCounts.set(key, currentCount + 1);
      this.lastPollTimes.set(key, Date.now());

      // 콜백 즉시 실행
      await callback();
      
      console.log(`[AdaptivePollingManager] Immediate check completed for "${key}"`);
    } catch (error) {
      console.error(`[AdaptivePollingManager] Error in immediate check for "${key}":`, error);
    }
  }

  /**
   * 모든 활성 폴링에 대해 즉시 확인 실행
   */
  async forceImmediateCheckAll(): Promise<void> {
    const activeKeys = Array.from(this.callbacks.keys());
    console.log(`[AdaptivePollingManager] Force immediate check for all active pollings: ${activeKeys.join(', ')}`);
    
    // 모든 폴링을 병렬로 실행
    await Promise.all(activeKeys.map(key => this.forceImmediateCheck(key)));
  }

  /**
   * 디버그 정보 출력
   */
  debug(): void {
    console.log('[AdaptivePollingManager] Debug Info:', {
      isInitializationPhase: this.isInitializationPhase,
      initializationStartTime: this.initializationStartTime,
      timeRemaining: this.getInitializationTimeRemaining(),
      activePollings: Array.from(this.intervals.keys()),
      allStatus: this.getAllPollingStatus()
    });
  }
}

// 전역 싱글톤 인스턴스
export const globalPollingManager = new AdaptivePollingManager(); 