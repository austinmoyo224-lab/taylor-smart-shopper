// Offline mutation queue. The AppBuild wrapper runs the app in a webview, so
// localStorage is the portable store for both the wrapper and the browser.

const OFFLINE_QUEUE_KEY = 'taylor.offline.queue';

export interface QueuedMutation {
  id: string;
  endpoint: string;
  method: string;
  body: unknown;
  headers?: Record<string, string>;
  createdAt: string;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getQueue(): Promise<QueuedMutation[]> {
  if (typeof window === 'undefined') return [];
  const value = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as QueuedMutation[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedMutation[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* storage full or unavailable */
  }
}

export async function queueMutation(
  endpoint: string,
  method: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    id: generateId(),
    endpoint,
    method,
    body,
    headers,
    createdAt: new Date().toISOString(),
  });
  await saveQueue(queue);
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...(item.headers || {}),
        },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (res.ok) {
        processed++;
        continue;
      }
      // Retryable failures stay in queue
      if (res.status >= 500 || res.status === 429) {
        remaining.push(item);
      } else {
        failed++;
      }
    } catch {
      // Network failure: keep for next retry
      remaining.push(item);
    }
  }

  await saveQueue(remaining);
  return { processed, failed };
}

export async function clearQueue(): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/** Alias used by native connectivity listeners. */
export const flushOfflineQueue = processQueue;
