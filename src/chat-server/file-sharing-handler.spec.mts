// author: Jonas Couwberghs
// date: 2023-12-02

import type { FileEncodingError, IncomingEncodedFile, OutgoingEncodedFile, User } from '../protocol/proto.mjs';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import type { RawData } from 'ws';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { FileSharingHandler } from './file-sharing-handler.mjs';
import { promises } from 'fs';

async function flushPromises() {
  await new Promise<void>((resolve) => setTimeout(resolve));
}

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
                "channel_ID": "test_channel_no_access",
                "name": "Test no access"
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
                "channels": ["test_channel"],
                "self_destruct_at_utc_timestamp": "2024-07-01T23:16:03.230Z",
                "friends": ["test2@test2.com", "test3@test3.com"],
                "destroy_warning": false
              },
              {
                "email_ID": "test2@test2.com",
                "user_name": "Testaccount 2",
                "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
                "hashed_pass": "def",
                "channels": ["test_channel", "test_channel_no_access"],
                "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
                "friends": ["test1@test1.com", "test3@test3.com"],
                "destroy_warning": false
              },
              {
                "email_ID": "test3@test3.com",
                "user_name": "Testaccount 3",
                "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
                "hashed_pass": "ghi",
                "channels": ["test_channel_no_access"],
                "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
                "friends": ["test1@test1.com", "test2@test2.com"],
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

describe('onOutgoingEncodedFile', () => {
  it('forwards the file to all the signed in users that have access to the channel', async () => {
    const fakeURL = 'ws://mock-file-sharing-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');
    const ws2 = new MockWebSocket(fakeURL, 'client-2');
    const ws3 = new MockWebSocket(fakeURL, 'client-3');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws2)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws3)).toEqual(true);

    const loggedInClients = new Map<IWebSocket, User>()
      .set(wss.socketsClientToServer.get(ws1) || ws1, {
        id: 'test1@test1.com',
        username: 'Testaccount 1',
      })
      .set(wss.socketsClientToServer.get(ws2) || ws2, {
        id: 'test2@test2.com',
        username: 'Testaccount 2',
      })
      .set(wss.socketsClientToServer.get(ws3) || ws3, {
        id: 'test3@test3.com',
        username: 'Testaccount 3',
      });

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];
    const receivedData2: RawData[] = [];
    const receivedData3: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    ws2.on('message', (data) => {
      receivedData2.push(data);
    });

    ws3.on('message', (data) => {
      receivedData3.push(data);
    });

    const request: OutgoingEncodedFile = {
      channel_id: 'test_channel',
      file: {
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      },
      file_name: 'someTextFile.txt',
    };

    await FileSharingHandler.onOutgoingEncodedFile(sendingWs, sendingUser, loggedInClients, request);

    await flushPromises();

    expect(receivedData1.length).toBe(0);
    expect(receivedData2.length).toBe(1);
    expect(receivedData3.length).toBe(0);

    const res = toClientCommandSchema.safeParse(receivedData2[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('incoming_encoded_file');
      if (res.data.command === 'incoming_encoded_file') {
        const incomingEncodedFile: IncomingEncodedFile = res.data.data;
        expect(incomingEncodedFile.user).toEqual(sendingUser);
        expect(incomingEncodedFile.channel_id).toBe('test_channel');
        expect(incomingEncodedFile.file).toEqual({
          huffman_tree: [
            [115, '00'],
            [3, '01'],
            [80, '100'],
            [101, '101'],
            [110, '110'],
            [105, '111'],
          ],
          encoded_file: Buffer.from([97, 71]).toString('base64'),
        });
      }
    }
  });

  it('sends back an error if the channel does not exist', async () => {
    const fakeURL = 'ws://mock-file-sharing-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');
    const ws2 = new MockWebSocket(fakeURL, 'client-2');
    const ws3 = new MockWebSocket(fakeURL, 'client-3');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws2)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws3)).toEqual(true);

    const loggedInClients = new Map<IWebSocket, User>()
      .set(wss.socketsClientToServer.get(ws1) || ws1, {
        id: 'test1@test1.com',
        username: 'Testaccount 1',
      })
      .set(wss.socketsClientToServer.get(ws2) || ws2, {
        id: 'test2@test2.com',
        username: 'Testaccount 2',
      })
      .set(wss.socketsClientToServer.get(ws3) || ws3, {
        id: 'test3@test3.com',
        username: 'Testaccount 3',
      });

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];
    const receivedData2: RawData[] = [];
    const receivedData3: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    ws2.on('message', (data) => {
      receivedData2.push(data);
    });

    ws3.on('message', (data) => {
      receivedData3.push(data);
    });

    const request: OutgoingEncodedFile = {
      channel_id: 'test_channel_non_existant',
      file: {
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      },
      file_name: 'someTextFile.txt',
    };

    await FileSharingHandler.onOutgoingEncodedFile(sendingWs, sendingUser, loggedInClients, request);

    await flushPromises();

    expect(receivedData1.length).toBe(1);
    expect(receivedData2.length).toBe(0);
    expect(receivedData3.length).toBe(0);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('file_encoding_error');
      if (res.data.command === 'file_encoding_error') {
        const fileEncodingError: FileEncodingError = res.data.data;
        expect(fileEncodingError.error_code).toBe(404);
        expect(fileEncodingError.reason).toBe(`Channel with ID 'test_channel_non_existant' not found`);
      }
    }
  });

  it('sends back an error if the user does not have access to the channel', async () => {
    const fakeURL = 'ws://mock-file-sharing-3';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');
    const ws2 = new MockWebSocket(fakeURL, 'client-2');
    const ws3 = new MockWebSocket(fakeURL, 'client-3');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws2)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws3)).toEqual(true);

    const loggedInClients = new Map<IWebSocket, User>()
      .set(wss.socketsClientToServer.get(ws1) || ws1, {
        id: 'test1@test1.com',
        username: 'Testaccount 1',
      })
      .set(wss.socketsClientToServer.get(ws2) || ws2, {
        id: 'test2@test2.com',
        username: 'Testaccount 2',
      })
      .set(wss.socketsClientToServer.get(ws3) || ws3, {
        id: 'test3@test3.com',
        username: 'Testaccount 3',
      });

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];
    const receivedData2: RawData[] = [];
    const receivedData3: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    ws2.on('message', (data) => {
      receivedData2.push(data);
    });

    ws3.on('message', (data) => {
      receivedData3.push(data);
    });

    const request: OutgoingEncodedFile = {
      channel_id: 'test_channel_no_access',
      file: {
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      },
      file_name: 'someTextFile.txt',
    };

    await FileSharingHandler.onOutgoingEncodedFile(sendingWs, sendingUser, loggedInClients, request);

    await flushPromises();

    expect(receivedData1.length).toBe(1);
    expect(receivedData2.length).toBe(0);
    expect(receivedData3.length).toBe(0);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('file_encoding_error');
      if (res.data.command === 'file_encoding_error') {
        const fileEncodingError: FileEncodingError = res.data.data;
        expect(fileEncodingError.error_code).toBe(405);
        expect(fileEncodingError.reason).toBe("You don't have access to this channel");
      }
    }
  });
});
