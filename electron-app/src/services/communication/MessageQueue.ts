export interface QueuedMessage {
  id: string;
  message: any;
  timestamp: number;
  attempts: number;
  priority: 'low' | 'normal' | 'high';
}

export interface MessageQueueDebugInfo {
  queueSize: number;
  maxSize: number;
  totalEnqueued: number;
  totalDequeued: number;
  totalDropped: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private maxSize: number;
  private totalEnqueued = 0;
  private totalDequeued = 0;
  private totalDropped = 0;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * 메시지를 큐에 추가
   */
  public enqueue(message: any, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    // 큐가 가득 찬 경우 가장 오래된 낮은 우선순위 메시지 제거
    if (this.queue.length >= this.maxSize) {
      this.removeOldestLowPriorityMessage();
    }

    const queuedMessage: QueuedMessage = {
      id: this.generateMessageId(),
      message,
      timestamp: Date.now(),
      attempts: 0,
      priority
    };

    // 우선순위에 따라 삽입 위치 결정
    const insertIndex = this.findInsertIndex(priority);
    this.queue.splice(insertIndex, 0, queuedMessage);
    
    this.totalEnqueued++;
    console.log(`[MessageQueue] Enqueued message (priority: ${priority}, queue size: ${this.queue.length})`);
  }

  /**
   * 큐의 모든 메시지를 처리하고 비움
   */
  public flush(handler: (message: any) => void): void {
    console.log(`[MessageQueue] Flushing ${this.queue.length} messages`);
    
    const messages = [...this.queue];
    this.queue = [];
    
    messages.forEach(queuedMessage => {
      try {
        handler(queuedMessage.message);
        this.totalDequeued++;
      } catch (error) {
        console.error('[MessageQueue] Error processing queued message:', error);
        // 실패한 메시지는 다시 큐에 추가 (재시도 제한 있음)
        if (queuedMessage.attempts < 3) {
          queuedMessage.attempts++;
          this.queue.push(queuedMessage);
        } else {
          console.warn('[MessageQueue] Message dropped after max attempts');
          this.totalDropped++;
        }
      }
    });
  }

  /**
   * 특정 조건의 메시지 제거
   */
  public remove(predicate: (message: QueuedMessage) => boolean): number {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(msg => !predicate(msg));
    const removedCount = initialLength - this.queue.length;
    
    if (removedCount > 0) {
      console.log(`[MessageQueue] Removed ${removedCount} messages`);
    }
    
    return removedCount;
  }

  /**
   * 큐 비우기
   */
  public clear(): void {
    const droppedCount = this.queue.length;
    this.queue = [];
    this.totalDropped += droppedCount;
    console.log(`[MessageQueue] Cleared queue (dropped ${droppedCount} messages)`);
  }

  /**
   * 큐 크기 조회
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * 큐가 비어있는지 확인
   */
  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 특정 시간보다 오래된 메시지 제거
   */
  public removeExpiredMessages(maxAge: number = 300000): number { // 기본 5분
    const now = Date.now();
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(msg => now - msg.timestamp < maxAge);
    
    const removedCount = initialLength - this.queue.length;
    if (removedCount > 0) {
      this.totalDropped += removedCount;
      console.log(`[MessageQueue] Removed ${removedCount} expired messages`);
    }
    
    return removedCount;
  }

  /**
   * 디버그 정보 조회
   */
  public getDebugInfo(): MessageQueueDebugInfo {
    return {
      queueSize: this.queue.length,
      maxSize: this.maxSize,
      totalEnqueued: this.totalEnqueued,
      totalDequeued: this.totalDequeued,
      totalDropped: this.totalDropped
    };
  }

  /**
   * 큐 상태 요약
   */
  public getQueueSummary(): { [key: string]: number } {
    const summary = {
      total: this.queue.length,
      high: 0,
      normal: 0,
      low: 0
    };

    this.queue.forEach(msg => {
      summary[msg.priority]++;
    });

    return summary;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findInsertIndex(priority: 'low' | 'normal' | 'high'): number {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    const targetPriority = priorityOrder[priority];
    
    for (let i = 0; i < this.queue.length; i++) {
      const currentPriority = priorityOrder[this.queue[i].priority];
      if (targetPriority > currentPriority) {
        return i;
      }
    }
    
    return this.queue.length;
  }

  private removeOldestLowPriorityMessage(): void {
    // 낮은 우선순위 메시지부터 제거 시도
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].priority === 'low') {
        this.queue.splice(i, 1);
        this.totalDropped++;
        console.log('[MessageQueue] Removed oldest low priority message due to queue full');
        return;
      }
    }
    
    // 낮은 우선순위 메시지가 없으면 일반 우선순위 제거
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].priority === 'normal') {
        this.queue.splice(i, 1);
        this.totalDropped++;
        console.log('[MessageQueue] Removed oldest normal priority message due to queue full');
        return;
      }
    }
    
    // 마지막 수단으로 가장 오래된 메시지 제거
    if (this.queue.length > 0) {
      this.queue.shift();
      this.totalDropped++;
      console.log('[MessageQueue] Removed oldest message due to queue full');
    }
  }
} 