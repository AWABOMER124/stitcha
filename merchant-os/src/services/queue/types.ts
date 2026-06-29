export interface QueueJob<T = unknown> {
  name: string;
  data: T;
  delay?: number;
}

export interface QueueService {
  enqueue<T>(job: QueueJob<T>): Promise<void>;
  process<T>(name: string, handler: (data: T) => Promise<void>): void;
}
