import { useEffect, useCallback, useRef, useState } from 'react';
import { useSystemStore } from '../stores/core/SystemStore';

export interface SystemManagerOptions {
  autoInitialize?: boolean;
  autoReconnect?: boolean;
  enableLogging?: boolean;
}

export interface SystemManagerState {
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  isShuttingDown: boolean;
}

export interface SystemManagerActions {
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
  restart: () => Promise<void>;
  clearError: () => void;
}

// 전역 초기화 방지 플래그
let globalInitializationInProgress = false;

export function useSystemManager(options: SystemManagerOptions = {}): SystemManagerState & SystemManagerActions {
  const {
    autoReconnect = true,
    enableLogging = true
  } = options;

  const isInitializingRef = useRef(false);
  const isShuttingDownRef = useRef(false);
  const initializationAttempts = useRef(0);
  const maxInitializationAttempts = 3;
  const componentIdRef = useRef(Math.random().toString(36).substr(2, 9));

  const {
    initialized,
    initializationError,
    initialize: storeInitialize,
    shutdown: storeShutdown
  } = useSystemStore();

  const [isAutoInitializing, setIsAutoInitializing] = useState(false);

  const initialize = useCallback(async () => {
    // 전역 초기화 진행 중인지 확인
    if (globalInitializationInProgress) {
      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] Global initialization in progress, skipping...`);
      }
      return;
    }

    if (isInitializingRef.current || initialized) {
      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] Already initialized or initializing`);
      }
      return;
    }

    // 전역 플래그 설정
    globalInitializationInProgress = true;
    isInitializingRef.current = true;
    initializationAttempts.current++;

    try {
      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] Starting system initialization (attempt ${initializationAttempts.current})`);
      }

      await storeInitialize();

      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] System initialization successful`);
      }

      // 초기화 성공 시 재시도 카운터 리셋
      initializationAttempts.current = 0;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[useSystemManager:${componentIdRef.current}] System initialization failed:`, errorMessage);

      // 최대 재시도 횟수에 도달하지 않은 경우 재시도
      if (autoReconnect && initializationAttempts.current < maxInitializationAttempts) {
        const delay = Math.min(1000 * Math.pow(2, initializationAttempts.current - 1), 10000);
        
        if (enableLogging) {
          console.log(`[useSystemManager:${componentIdRef.current}] Retrying initialization in ${delay}ms...`);
        }

        setTimeout(() => {
          globalInitializationInProgress = false; // 재시도 전에 플래그 해제
          if (!initialized && !isShuttingDownRef.current) {
            initialize();
          }
        }, delay);
      } else {
        console.error(`[useSystemManager:${componentIdRef.current}] Max initialization attempts reached or auto-reconnect disabled`);
      }

      throw error;
    } finally {
      isInitializingRef.current = false;
      globalInitializationInProgress = false;
    }
  }, [initialized, storeInitialize, autoReconnect, enableLogging]);

  const shutdown = useCallback(async () => {
    if (isShuttingDownRef.current) {
      if (enableLogging) {
        console.log('[useSystemManager] Shutdown already in progress');
      }
      return;
    }

    isShuttingDownRef.current = true;

    try {
      if (enableLogging) {
        console.log('[useSystemManager] Starting system shutdown');
      }

      await storeShutdown();

      if (enableLogging) {
        console.log('[useSystemManager] System shutdown completed');
      }

      // 초기화 관련 상태 리셋
      initializationAttempts.current = 0;

    } catch (error) {
      console.error('[useSystemManager] System shutdown failed:', error);
      throw error;
    } finally {
      isShuttingDownRef.current = false;
    }
  }, [storeShutdown, enableLogging]);

  const restart = useCallback(async () => {
    if (enableLogging) {
      console.log('[useSystemManager] Restarting system...');
    }

    try {
      await shutdown();
      // 잠시 대기 후 재시작
      await new Promise(resolve => setTimeout(resolve, 1000));
      await initialize();
    } catch (error) {
      console.error('[useSystemManager] System restart failed:', error);
      throw error;
    }
  }, [shutdown, initialize, enableLogging]);

  const clearError = useCallback(() => {
    // 스토어의 에러 상태를 직접 클리어하는 액션이 필요할 수 있음
    // 현재는 재초기화를 통해 에러를 클리어
    if (initializationError && !isInitializingRef.current) {
      initialize().catch(error => {
        console.error('[useSystemManager] Error clearing failed:', error);
      });
    }
  }, [initializationError, initialize]);

  // 앱 시작 시 자동으로 서버 상태 확인 및 연결
  useEffect(() => {
    // React StrictMode에서 중복 실행 방지
    let isCancelled = false;
    
    const autoInitialize = async () => {
      // 더 강력한 중복 방지 조건
      if (initialized || 
          isAutoInitializing || 
          isCancelled || 
          globalInitializationInProgress ||
          isInitializingRef.current) {
        if (enableLogging) {
          console.log(`[useSystemManager:${componentIdRef.current}] Auto-initialization skipped - already initialized or in progress`);
        }
        return;
      }
      
      setIsAutoInitializing(true);
      try {
        if (enableLogging) {
          console.log(`[useSystemManager:${componentIdRef.current}] Auto-initializing system...`);
        }
        
        if (!isCancelled && !globalInitializationInProgress && !isInitializingRef.current) {
          await initialize();
          
          if (enableLogging && !isCancelled) {
            console.log(`[useSystemManager:${componentIdRef.current}] Auto-initialization successful`);
          }
        }
      } catch (error) {
        if (enableLogging && !isCancelled) {
          console.log(`[useSystemManager:${componentIdRef.current}] Auto-initialization failed, server may not be running:`, error);
        }
        // 자동 초기화 실패는 조용히 처리 (서버가 꺼져있을 수 있음)
      } finally {
        if (!isCancelled) {
          setIsAutoInitializing(false);
        }
      }
    };

    // 짧은 지연을 두어 중복 실행 방지
    const timeoutId = setTimeout(autoInitialize, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      setIsAutoInitializing(false);
    };
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 앱 종료 시에만 정리 작업 (탭 변경 시에는 유지)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Electron 환경에서는 탭 변경이 아닌 실제 앱 종료이므로 정리 작업 수행
      if (initialized && !isShuttingDownRef.current) {
        if (enableLogging) {
          console.log(`[useSystemManager:${componentIdRef.current}] App closing, performing cleanup`);
        }
        // 동기적으로 실행해야 하므로 간단한 정리만 수행
      }
    };

    const handleVisibilityChange = () => {
      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] Page visibility changed: ${document.visibilityState}`);
      }
      
      // 페이지가 숨겨졌다가 다시 보일 때 연결 상태 확인
      if (document.visibilityState === 'visible' && initialized) {
        // WebSocket 연결 상태 확인 및 필요시 재연결
        setTimeout(() => {
          if (initialized && !isShuttingDownRef.current) {
            if (enableLogging) {
              console.log(`[useSystemManager:${componentIdRef.current}] Page became visible, checking connection...`);
            }
            // 연결 상태 확인은 CommunicationManager가 자동으로 처리
          }
        }, 1000);
      }
    };

    // Electron 환경에서만 beforeunload 이벤트 리스너 등록
    if (typeof window !== 'undefined' && window.electron) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    // 페이지 가시성 변경 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (typeof window !== 'undefined' && window.electron) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialized, enableLogging]);

  // 컴포넌트 언마운트 시 정리 (탭 변경 시에는 시스템 유지)
  useEffect(() => {
    return () => {
      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] Component unmounting, but keeping system running for tab navigation`);
      }
      
      // 컴포넌트 언마운트 시에는 시스템을 종료하지 않음
      // 탭 변경이나 컴포넌트 재렌더링 시에도 연결을 유지하기 위함
      // 실제 앱 종료는 Electron의 beforeunload 이벤트에서 처리
    };
  }, [enableLogging]);

  // 연결 상태 모니터링 및 자동 재연결
  const connectionStatus = useSystemStore(state => state.connection);
  const lastInitializationTimeRef = useRef<number>(0);
  
  // 초기화 완료 시 타임스탬프 업데이트
  useEffect(() => {
    if (initialized) {
      lastInitializationTimeRef.current = Date.now();
      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] Initialization completed, connection monitoring active`);
      }
    }
  }, [initialized, enableLogging]);
  
  useEffect(() => {
    if (!autoReconnect || !initialized) return;

    // 초기화 직후 30초 동안은 재연결 시도하지 않음 (안정화 시간)
    const timeSinceInit = Date.now() - lastInitializationTimeRef.current;
    const stabilizationPeriod = 30000; // 30초
    
    if (timeSinceInit < stabilizationPeriod) {
      if (enableLogging && connectionStatus.overall === 'offline') {
        console.log(`[useSystemManager:${componentIdRef.current}] Connection appears offline but within stabilization period (${Math.round((stabilizationPeriod - timeSinceInit) / 1000)}s remaining)`);
      }
      return;
    }

    // 연결 상태가 실제로 오프라인이고, WebSocket과 API 모두 실패한 경우에만 재연결
    if (connectionStatus.overall === 'offline' && 
        !connectionStatus.websocket && 
        !connectionStatus.api) {
      
      const reconnectDelay = 10000; // 10초 후 재연결 시도 (더 긴 간격)
      
      if (enableLogging) {
        console.log(`[useSystemManager:${componentIdRef.current}] Confirmed connection lost (WS: ${connectionStatus.websocket}, API: ${connectionStatus.api}), attempting reconnect in ${reconnectDelay}ms`);
      }

      const timer = setTimeout(() => {
        if (!isShuttingDownRef.current && 
            connectionStatus.overall === 'offline' && 
            !connectionStatus.websocket && 
            !connectionStatus.api) {
          
          if (enableLogging) {
            console.log(`[useSystemManager:${componentIdRef.current}] Executing reconnect attempt`);
          }
          
          restart().catch(error => {
            console.error(`[useSystemManager:${componentIdRef.current}] Auto-reconnect failed:`, error);
          });
        } else {
          if (enableLogging) {
            console.log(`[useSystemManager:${componentIdRef.current}] Reconnect cancelled - connection restored`);
          }
        }
      }, reconnectDelay);

      return () => clearTimeout(timer);
    }
  }, [connectionStatus.overall, connectionStatus.websocket, connectionStatus.api, autoReconnect, initialized, restart, enableLogging]);

  return {
    isInitialized: initialized,
    isInitializing: isInitializingRef.current || isAutoInitializing,
    initializationError,
    isShuttingDown: isShuttingDownRef.current,
    initialize,
    shutdown,
    restart,
    clearError
  };
}

// 편의 Hook들 (중복 초기화 방지를 위해 스토어에서 직접 가져옴)
export function useSystemStatus() {
  const initialized = useSystemStore(state => state.initialized);
  const initializationError = useSystemStore(state => state.initializationError);
  const connectionStatus = useSystemStore(state => state.connection);
  
  return {
    isInitialized: initialized,
    isInitializing: false, // 스토어에서 직접 가져올 때는 초기화 상태를 추적하지 않음
    initializationError,
    connectionStatus,
    isOnline: connectionStatus.overall !== 'offline',
    isHealthy: connectionStatus.overall === 'healthy'
  };
}

export function useSystemActions() {
  const { initialize, shutdown, restart, clearError } = useSystemManager({ 
    autoInitialize: false,
    autoReconnect: false, // 액션 전용 훅에서는 자동 재연결 비활성화
    enableLogging: false  // 액션 전용 훅에서는 로깅 비활성화
  });
  
  return {
    initialize,
    shutdown,
    restart,
    clearError
  };
} 