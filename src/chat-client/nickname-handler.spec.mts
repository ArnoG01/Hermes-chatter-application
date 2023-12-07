// @author: Mataro Langeraert
// @date: 2023-12-02

import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toServerCommandSchema } from '../protocol/proto.zod.mjs';
import { NicknameHandler } from './nickname-handler.mjs';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('nicknameHandler', () => {
  it('should send a nickname request to the server', () => {
    const fakeURL = 'ws://fake-url-login-handler-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');
    const nicknameSpy = vi.spyOn(NicknameHandler, 'onNick');
    NicknameHandler.onNick(ws, ['test']);
    expect(nicknameSpy).toHaveBeenCalledWith(ws, ['test']);

    expect(wss.data.length).toBe(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('nickname_change_request');
      if (res.data.command === 'nickname_change_request') {
        expect(res.data.data).toEqual({
          nickname: 'test',
        });
      }
    }
  });

  it('does not send a nickname request to the server if the nickname is empty', () => {
    const fakeURL = 'ws://fake-url-login-handler-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-2');
    const nicknameSpy = vi.spyOn(NicknameHandler, 'onNick');
    NicknameHandler.onNick(ws, ['']);
    expect(nicknameSpy).toHaveBeenCalledWith(ws, ['']);
    expect(wss.data.length).toBe(0);
  });
});
