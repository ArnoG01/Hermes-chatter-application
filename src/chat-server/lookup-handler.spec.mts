// author: Jonas Couwberghs
// date: 2023-12-02

import type { LookupError, LookupRequest, LookupResult, User } from '../protocol/proto.mjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { MockWebSocket } from '../protocol/__mock__/ws-mock.mjs';
import { LookupHandler } from './lookup-handler.mjs';
import { DateTime } from 'luxon';
import { promises } from 'fs';

beforeAll(() => {
  // Mock database files to ensure consistent values in the tests
  vi.spyOn(promises, 'readFile').mockImplementation((path) => {
    return new Promise((resolve) => {
      switch (path) {
        case 'assets/databaseJSON/database-channels.json':
          resolve(`
            [
              {
                "channel_ID": "test_channel",
                "name": "Test"
              },
              {
                "channel_ID": "test_channel_empty",
                "name": "Test empty"
              },
              {
                "channel_ID": "test_channel_no_access",
                "name": "Test no access"
              }
            ]
          `);
          break;
        case 'assets/databaseJSON/database-messages.json':
          resolve(`
            [
              {
                "message_ID": "a",
                "sender_ID": "test1@test1.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-10-31T23:15:51.050Z",
                "message": "A"
              },
              {
                "message_ID": "b",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-10-31T23:15:52.140Z",
                "message": "B"
              },
              {
                "message_ID": "no_access_a",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel_no_access",
                "sent_at_utc_timestamp": "2023-10-31T23:16:03.230Z",
                "message": "A - No access"
              },
              {
                "message_ID": "c",
                "sender_ID": "test1@test1.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-11-02T23:16:03.230Z",
                "message": "C"
              },
              {
                "message_ID": "no_access_b",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel_no_access",
                "sent_at_utc_timestamp": "2023-11-02T23:54:13.835Z",
                "message": "B - No access"
              },
              {
                "message_ID": "d",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-11-02T23:55:03.230Z",
                "message": "D"
              },
              {
                "message_ID": "e",
                "sender_ID": "test1@test1.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-11-21T07:26:41.683Z",
                "message": "E"
              },
              {
                "message_ID": "no_access_c",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel_no_access",
                "sent_at_utc_timestamp": "2023-11-21T09:16:21.745Z",
                "message": "C - No access"
              },
              {
                "message_ID": "f",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-11-21T12:00:14.365Z",
                "message": "F"
              },
              {
                "message_ID": "g",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-11-21T12:01:02.675Z",
                "message": "G"
              },
              {
                "message_ID": "h",
                "sender_ID": "test1@test1.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-11-21T12:03:16.175Z",
                "message": "H"
              },
              {
                "message_ID": "i",
                "sender_ID": "test1@test1.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-12-06T08:25:25.345Z",
                "message": "I"
              },
              {
                "message_ID": "j",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-12-06T09:02:11.756Z",
                "message": "J"
              },
              {
                "message_ID": "k",
                "sender_ID": "test2@test2.com",
                "channel_ID": "test_channel",
                "sent_at_utc_timestamp": "2023-12-06T12:00:47.120Z",
                "message": "K"
              }
            ]
          `);
          break;
        case 'assets/databaseJSON/database-users.json':
          resolve(`
            [
              {
                "email_ID": "test1@test1.com",
                "user_name": "Testaccount 1",
                "last_seen_utc_timestamp": "2023-10-31T23:16:03.230Z",
                "hashed_pass": "abc",
                "channels": ["test_channel", "test_channel_empty"],
                "self_destruct_at_utc_timestamp": "2024-07-01T23:16:03.230Z",
                "friends": ["test2@test2.com"],
                "destroy_warning": false
              },
              {
                "email_ID": "test2@test2.com",
                "user_name": "Testaccount 2",
                "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
                "hashed_pass": "def",
                "channels": ["test_channel", "test_channel_empty", "test_channel_no_access"],
                "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
                "friends": ["test1@test1.com"],
                "destroy_warning": false
              }
            ]
          `);
          break;
        default:
          resolve('');
          break;
      }
    });
  });
});

afterAll(() => {
  vi.clearAllMocks();
});

describe('handleLookupRequest', () => {
  it('sends a LookupResult with 5 messages infront of and 5 behind the actual match to the websocket if there are enough messages present', async () => {
    const fakeURL = 'ws://mock-lookup-request-1';
    const ws = new MockWebSocket(fakeURL);

    const receivedData: (string | Buffer)[] = [];

    const wsSendSpy = vi.spyOn(ws, 'send').mockImplementation((data) => receivedData.push(data));

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: LookupRequest = {
      time: DateTime.fromISO('2023-11-21T11:00:00.000Z', { setZone: true }),
      channel_id: 'test_channel',
    };

    await LookupHandler.onLookupRequest(ws, user, request);

    expect(wsSendSpy).toHaveBeenCalledOnce();
    expect(receivedData.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('lookup_result');
      if (res.data.command === 'lookup_result') {
        const lookupResult: LookupResult = res.data.data;
        expect(lookupResult.messages).toEqual([
          {
            channel: 'test_channel',
            msg: 'A',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-10-31T23:15:51.050Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'B',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-10-31T23:15:52.140Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'C',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-11-02T23:16:03.230Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'D',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-02T23:55:03.230Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'E',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-11-21T07:26:41.683Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'F',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-21T12:00:14.365Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'G',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-21T12:01:02.675Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'H',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-11-21T12:03:16.175Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'I',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-12-06T08:25:25.345Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'J',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-12-06T09:02:11.756Z', { setZone: true }),
          },
        ]);
        expect(lookupResult.resultIndex).toBe(5);
      }
    }
  });

  it(`sends a LookupResult with less than 5 messages infront of the actual match to the websocket if there aren't enough messages present`, async () => {
    const fakeURL = 'ws://mock-lookup-request-2';
    const ws = new MockWebSocket(fakeURL);

    const receivedData: (string | Buffer)[] = [];

    const wsSendSpy = vi.spyOn(ws, 'send').mockImplementation((data) => receivedData.push(data));

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: LookupRequest = {
      time: DateTime.fromISO('2023-11-02T23:50:00.000Z', { setZone: true }),
      channel_id: 'test_channel',
    };

    await LookupHandler.onLookupRequest(ws, user, request);

    expect(wsSendSpy).toHaveBeenCalledOnce();
    expect(receivedData.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('lookup_result');
      if (res.data.command === 'lookup_result') {
        const lookupResult: LookupResult = res.data.data;
        expect(lookupResult.messages).toEqual([
          {
            channel: 'test_channel',
            msg: 'A',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-10-31T23:15:51.050Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'B',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-10-31T23:15:52.140Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'C',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-11-02T23:16:03.230Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'D',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-02T23:55:03.230Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'E',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-11-21T07:26:41.683Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'F',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-21T12:00:14.365Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'G',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-21T12:01:02.675Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'H',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-11-21T12:03:16.175Z', { setZone: true }),
          },
        ]);
        expect(lookupResult.resultIndex).toBe(3);
      }
    }
  });

  it(`sends a LookupResult with less than 5 behind the actual match to the websocket if there aren't enough messages present`, async () => {
    const fakeURL = 'ws://mock-lookup-request-3';
    const ws = new MockWebSocket(fakeURL);

    const receivedData: (string | Buffer)[] = [];

    const wsSendSpy = vi.spyOn(ws, 'send').mockImplementation((data) => receivedData.push(data));

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: LookupRequest = {
      time: DateTime.fromISO('2023-12-06T12:00:47.120Z', { setZone: true }),
      channel_id: 'test_channel',
    };

    await LookupHandler.onLookupRequest(ws, user, request);

    expect(wsSendSpy).toHaveBeenCalledOnce();
    expect(receivedData.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('lookup_result');
      if (res.data.command === 'lookup_result') {
        const lookupResult: LookupResult = res.data.data;
        expect(lookupResult.messages).toEqual([
          {
            channel: 'test_channel',
            msg: 'F',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-21T12:00:14.365Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'G',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-11-21T12:01:02.675Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'H',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-11-21T12:03:16.175Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'I',
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            time: DateTime.fromISO('2023-12-06T08:25:25.345Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'J',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-12-06T09:02:11.756Z', { setZone: true }),
          },
          {
            channel: 'test_channel',
            msg: 'K',
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            time: DateTime.fromISO('2023-12-06T12:00:47.120Z', { setZone: true }),
          },
        ]);
        expect(lookupResult.resultIndex).toBe(5);
      }
    }
  });

  it(`sends a LookupError with error code 404 if the channel doesn't exist`, async () => {
    const fakeURL = 'ws://mock-lookup-request-4';
    const ws = new MockWebSocket(fakeURL);

    const receivedData: (string | Buffer)[] = [];

    const wsSendSpy = vi.spyOn(ws, 'send').mockImplementation((data) => receivedData.push(data));

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: LookupRequest = {
      time: DateTime.fromISO('2023-11-21T12:05:00.000Z', { setZone: true }),
      channel_id: 'test_channel_missing',
    };

    await LookupHandler.onLookupRequest(ws, user, request);

    expect(wsSendSpy).toHaveBeenCalledOnce();
    expect(receivedData.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('lookup_error');
      if (res.data.command === 'lookup_error') {
        const lookupError: LookupError = res.data.data;
        expect(lookupError.error_code).toBe(404);
        expect(lookupError.reason).toBe('Channel with ID test_channel_missing not found');
      }
    }
  });

  it(`sends a LookupError with error code 405 if the user doesn't have access to the channel`, async () => {
    const fakeURL = 'ws://mock-lookup-request-5';
    const ws = new MockWebSocket(fakeURL);

    const receivedData: (string | Buffer)[] = [];

    const wsSendSpy = vi.spyOn(ws, 'send').mockImplementation((data) => receivedData.push(data));

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: LookupRequest = {
      time: DateTime.fromISO('2023-11-21T12:05:00.000Z', { setZone: true }),
      channel_id: 'test_channel_no_access',
    };

    await LookupHandler.onLookupRequest(ws, user, request);

    expect(wsSendSpy).toHaveBeenCalledOnce();
    expect(receivedData.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('lookup_error');
      if (res.data.command === 'lookup_error') {
        const lookupError: LookupError = res.data.data;
        expect(lookupError.error_code).toBe(405);
        expect(lookupError.reason).toBe("You don't have access to this channel");
      }
    }
  });

  it(`sends a LookupError with error code 204 if the channel doesn't have any messages yet`, async () => {
    const fakeURL = 'ws://mock-lookup-request-5';
    const ws = new MockWebSocket(fakeURL);

    const receivedData: (string | Buffer)[] = [];

    const wsSendSpy = vi.spyOn(ws, 'send').mockImplementation((data) => receivedData.push(data));

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: LookupRequest = {
      time: DateTime.fromISO('2023-11-21T12:05:00.000Z', { setZone: true }),
      channel_id: 'test_channel_empty',
    };

    await LookupHandler.onLookupRequest(ws, user, request);

    expect(wsSendSpy).toHaveBeenCalledOnce();
    expect(receivedData.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('lookup_error');
      if (res.data.command === 'lookup_error') {
        const lookupError: LookupError = res.data.data;
        expect(lookupError.error_code).toBe(204);
        expect(lookupError.reason).toBe('No messages found in the requested channel');
      }
    }
  });
});
