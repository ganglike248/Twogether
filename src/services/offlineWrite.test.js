import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('firebase/firestore', () => ({ setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn() }));
const { settleWrite, QUEUED_WRITE_EVENT } = await import('./offlineWrite');

const setOnline = (online) => vi.stubGlobal('navigator', { onLine: online });
const events = [];
vi.stubGlobal('window', { dispatchEvent: (e) => events.push(e.detail?.reason) });
vi.stubGlobal('CustomEvent', class { constructor(type, init) { this.type = type; this.detail = init?.detail; } });

afterEach(() => { events.length = 0; vi.useRealTimers(); });

describe('settleWrite — 오프라인에서 저장이 멈추지 않게', () => {
  it('온라인이면 결과를 그대로 기다림(실패도 전달)', async () => {
    setOnline(true);
    await expect(settleWrite(Promise.resolve('ok'))).resolves.toBe('ok');
    await expect(settleWrite(Promise.reject(new Error('denied')))).rejects.toThrow('denied');
    expect(events).toEqual([]);
  });

  it('오프라인이면 바로 끝나고 "대기열" 알림', async () => {
    setOnline(false);
    await expect(settleWrite(new Promise(() => {}))).resolves.toBeUndefined();
    expect(events).toEqual(['offline']);
  });

  it('온라인이어도 8초 넘게 응답이 없으면 끝내고 "느림" 알림', async () => {
    setOnline(true);
    vi.useFakeTimers();
    const p = settleWrite(new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(8000);
    await expect(p).resolves.toBeUndefined();
    expect(events).toEqual(['slow']);
  });

  it('이벤트 이름', () => expect(QUEUED_WRITE_EVENT).toBe('twogether:queued-write'));
});
