import { describe, expect, it } from 'vitest';
import { createApiClient } from './api.js';

describe('createApiClient', () => {
  it('loads dashboard state with action query params', async () => {
    const calls = [];
    const client = createApiClient({
      endpoint: 'https://script.google.com/macros/s/demo/exec',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return Response.json({ ok: true, data: { next5Months: [] } });
      },
    });

    await client.loadAll();

    expect(calls[0].url).toBe('https://script.google.com/macros/s/demo/exec?action=loadAll');
    expect(calls[0].init.method).toBe('GET');
  });

  it('posts mutating actions as text/plain JSON to avoid preflight for GAS', async () => {
    const calls = [];
    const client = createApiClient({
      endpoint: 'https://script.google.com/macros/s/demo/exec',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return Response.json({ ok: true, data: [{ id: '1' }] });
      },
    });

    await client.addExpense({ note: 'ShopeePay', amount: 60, monthKey: 'may', category: 'shopeePay' });

    expect(calls[0].url).toBe('https://script.google.com/macros/s/demo/exec');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(JSON.parse(calls[0].init.body)).toEqual({
      action: 'addExpense',
      payload: { note: 'ShopeePay', amount: 60, monthKey: 'may', category: 'shopeePay' },
    });
  });

  it('throws a readable error when GAS returns ok false', async () => {
    const client = createApiClient({
      endpoint: 'https://script.google.com/macros/s/demo/exec',
      fetchImpl: async () => Response.json({ ok: false, error: 'bad action' }),
    });

    await expect(client.loadAll()).rejects.toThrow('bad action');
  });

  it('posts fixed expense updates to the GAS API', async () => {
    const calls = [];
    const client = createApiClient({
      endpoint: 'https://script.google.com/macros/s/demo/exec',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return Response.json({ ok: true, data: [{ fixedKey: 'room' }] });
      },
    });

    await client.saveFixedExpense({ fixedKey: 'room', label: 'ค่าห้อง/น้ำ/ไฟ', amount: 1600, notes: 'ประมาณการ' });

    expect(JSON.parse(calls[0].init.body)).toEqual({
      action: 'saveFixedExpense',
      payload: { fixedKey: 'room', label: 'ค่าห้อง/น้ำ/ไฟ', amount: 1600, notes: 'ประมาณการ' },
    });
  });
});
