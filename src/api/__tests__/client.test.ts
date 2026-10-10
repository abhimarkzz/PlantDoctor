import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHealth, askQuestion, listKnowledgePacks, DeviceOfflineError } from '../client';

describe('API client offline guard', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
      writable: true,
    });
  });

  it('throws DeviceOfflineError without calling fetch when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(checkHealth()).rejects.toThrow(DeviceOfflineError);
    await expect(askQuestion('My crops have yellow leaves')).rejects.toThrow(DeviceOfflineError);
    await expect(listKnowledgePacks()).rejects.toThrow(DeviceOfflineError);

    // Fetch should never have been invoked
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws DeviceOfflineError when image file is passed and offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const fakeFile = new File(['fake-content'], 'test.jpg', { type: 'image/jpeg' });
    await expect(askQuestion('My crops have yellow leaves', fakeFile)).rejects.toThrow(DeviceOfflineError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
