// author: Jonas Couwberghs
// date: 2023-12-02

import type {
  IncomingMessage,
  MessageHistoryError,
  MessageHistoryResponse,
  MessageSendingError,
  OutgoingMessage,
  RequestMessageHistory,
  User,
} from '../protocol/proto.mjs';
import type { RawData } from 'ws';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import type { MessageEntry } from '../database/database-interfaces.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { MessageHandler } from './message-handler.mjs';
import { DateTime } from 'luxon';
import { promises } from 'fs';

async function flushPromises() {
  await new Promise<void>((resolve) => setTimeout(resolve));
}

const actualReadFile = promises.readFile;
let fakeUUIDCount = -1;

beforeAll(() => {
  // Mock database files to ensure consistent values in the tests
  vi.spyOn(promises, 'readFile').mockImplementation((path, options) => {
    switch (path) {
      case 'assets/databaseJSON/database-channels.json':
        return Promise.resolve(`
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
      case 'assets/databaseJSON/database-messages.json':
        return Promise.resolve(`
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
              "message_ID": "aaa",
              "sender_ID": "test1@test1.com",
              "channel_ID": "test_channel_no_access",
              "sent_at_utc_timestamp": "2023-11-02T23:16:03.230Z",
              "message": "AAA"
            },
            {
              "message_ID": "c",
              "sender_ID": "test1@test1.com",
              "channel_ID": "test_channel",
              "sent_at_utc_timestamp": "2023-11-02T23:16:03.230Z",
              "message": "C"
            }
          ]
        `);
      case 'assets/databaseJSON/database-users.json':
        return Promise.resolve(`
          [
            {
              "email_ID": "test1@test1.com",
              "user_name": "Testaccount 1",
              "last_seen_utc_timestamp": "2023-10-31T23:16:03.230Z",
              "hashed_pass": "abc",
              "channels": ["test_channel", "test_channel_empty"],
              "self_destruct_at_utc_timestamp": "2024-07-01T23:16:03.230Z",
              "friends": ["test2@test2.com", "test3@test3.com"],
              "destroy_warning": false
            },
            {
              "email_ID": "test2@test2.com",
              "user_name": "Testaccount 2",
              "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
              "hashed_pass": "def",
              "channels": ["test_channel", "test_channel_empty", "test_channel_no_access"],
              "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
              "friends": ["test1@test1.com", "test3@test3.com"],
              "destroy_warning": false
            },
            {
              "email_ID": "test2@test3.com",
              "user_name": "Testaccount 3",
              "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
              "hashed_pass": "def",
              "channels": ["test_channel_empty", "test_channel_no_access"],
              "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
              "friends": ["test1@test1.com", "test2@test2.com"],
              "destroy_warning": false
            }
          ]
        `);
      default:
        return actualReadFile(path, options);
    }
  });

  vi.mock('node:crypto', async () => {
    const realCrypto = await vi.importActual<{ randomUUID: () => string }>('node:crypto');
    return {
      ...realCrypto,
      randomUUID: () => {
        if (fakeUUIDCount > 0) {
          fakeUUIDCount--;
          return 'a';
        } else if (fakeUUIDCount === 0) {
          return 'free-id-a-b-c';
        } else {
          return realCrypto.randomUUID();
        }
      },
    };
  });
});

afterAll(() => {
  vi.resetAllMocks();
  vi.clearAllMocks();
});

describe('onClientMessage', () => {
  it('forwards a message to all the signed in users that have access to the channel', async () => {
    const fakeURL = 'ws://mock-message-sending-1';
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

    let path: string = '';
    let content: string = '';

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      path = file as string;
      content = data as string;
      return Promise.resolve();
    });

    // Don't fake the UUID
    fakeUUIDCount = -1;

    const message: OutgoingMessage = {
      msg: 'Hello world',
      channel: 'test_channel',
    };

    await MessageHandler.onClientMessage(sendingWs, message, sendingUser, loggedInClients);

    await flushPromises();

    expect(receivedData1.length).toBe(1);
    expect(receivedData2.length).toBe(1);
    expect(receivedData3.length).toBe(0);

    expect(receivedData1).toEqual(receivedData2);

    let time: DateTime = DateTime.utc();

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_received');
      if (res.data.command === 'message_received') {
        const incomingMessage: IncomingMessage = res.data.data;
        expect(incomingMessage.sender).toEqual(sendingUser);
        expect(incomingMessage.channel).toBe('test_channel');
        expect(incomingMessage.msg).toBe('Hello world');
        time = incomingMessage.time as DateTime;
      }
    }

    expect(writeFileSpy).toBeCalled();
    expect(path).toBe('assets/databaseJSON/database-messages.json');
    expect(() => JSON.parse(content) as MessageEntry[]).not.toThrowError();
    const messages = JSON.parse(content) as MessageEntry[];
    expect(messages).toHaveLength(5);
    expect(messages[4]?.sender_ID).toBe(sendingUser.id);
    expect(messages[4]?.channel_ID).toBe('test_channel');
    expect(messages[4]?.message).toBe('Hello world');
    expect(messages[4]?.message_ID).toMatch(/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/);
    expect(messages[4]?.sent_at_utc_timestamp).toBe(time.toISO());
  });

  it('sends back an error if the channel does not exist', async () => {
    const fakeURL = 'ws://mock-message-sending-2';
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

    let path: string = '';
    let content: string = '';

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      path = file as string;
      content = data as string;
      return Promise.resolve();
    });

    // Don't fake the UUID
    fakeUUIDCount = -1;

    const message: OutgoingMessage = {
      msg: 'Hello world',
      channel: 'test_channel_non_existant',
    };

    await MessageHandler.onClientMessage(sendingWs, message, sendingUser, loggedInClients);

    await flushPromises();

    expect(receivedData1.length).toBe(1);
    expect(receivedData2.length).toBe(0);
    expect(receivedData3.length).toBe(0);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_sending_error');
      if (res.data.command === 'message_sending_error') {
        const error: MessageSendingError = res.data.data;
        expect(error.error_code).toBe(404);
        expect(error.reason).toBe(`Channel with ID 'test_channel_non_existant' not found`);
      }
    }

    expect(writeFileSpy).not.toBeCalled();
    expect(path).toBe('');
    expect(content).toBe('');
  });

  it('sends back an error if the user does not have access to the channel', async () => {
    const fakeURL = 'ws://mock-message-sending-3';
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

    let path: string = '';
    let content: string = '';

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      path = file as string;
      content = data as string;
      return Promise.resolve();
    });

    // Don't fake the UUID
    fakeUUIDCount = -1;

    const message: OutgoingMessage = {
      msg: 'Hello world',
      channel: 'test_channel_no_access',
    };

    await MessageHandler.onClientMessage(sendingWs, message, sendingUser, loggedInClients);

    await flushPromises();

    expect(receivedData1.length).toBe(1);
    expect(receivedData2.length).toBe(0);
    expect(receivedData3.length).toBe(0);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_sending_error');
      if (res.data.command === 'message_sending_error') {
        const error: MessageSendingError = res.data.data;
        expect(error.error_code).toBe(405);
        expect(error.reason).toBe("You don't have access to this channel");
      }
    }

    expect(writeFileSpy).not.toBeCalled();
    expect(path).toBe('');
    expect(content).toBe('');
  });

  it('sends back an error if the message fails to be inserted into the database', async () => {
    const fakeURL = 'ws://mock-message-sending-4';
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

    let path: string = '';
    let content: string = '';

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      path = file as string;
      content = data as string;
      return Promise.resolve();
    });

    // Fake the random UUID 4 times so that the insertion fails every time
    fakeUUIDCount = 4;

    const message: OutgoingMessage = {
      msg: 'Hello world',
      channel: 'test_channel',
    };

    await MessageHandler.onClientMessage(sendingWs, message, sendingUser, loggedInClients);

    await flushPromises();

    expect(receivedData1.length).toBe(1);
    expect(receivedData2.length).toBe(0);
    expect(receivedData3.length).toBe(0);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_sending_error');
      if (res.data.command === 'message_sending_error') {
        const error: MessageSendingError = res.data.data;
        expect(error.error_code).toBe(500);
        expect(error.reason).toBe('Failed to insert message into database');
      }
    }

    expect(writeFileSpy).not.toBeCalled();
    expect(path).toBe('');
    expect(content).toBe('');

    writeFileSpy.mockReset();
  });

  it('still forwards a message to all the signed in users that have access to the channel if the database insertion failed less than 3 times', async () => {
    const fakeURL = 'ws://mock-message-sending-5';
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

    let path: string = '';
    let content: string = '';

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      path = file as string;
      content = data as string;
      return Promise.resolve();
    });

    // Fake the random UUID 2 times so that the last insertion passes
    fakeUUIDCount = 2;

    const message: OutgoingMessage = {
      msg: 'Hello world',
      channel: 'test_channel',
    };

    await MessageHandler.onClientMessage(sendingWs, message, sendingUser, loggedInClients);

    await flushPromises();

    expect(receivedData1.length).toBe(1);
    expect(receivedData2.length).toBe(1);
    expect(receivedData3.length).toBe(0);

    expect(receivedData1).toEqual(receivedData2);

    let time: DateTime = DateTime.utc();

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_received');
      if (res.data.command === 'message_received') {
        const incomingMessage: IncomingMessage = res.data.data;
        expect(incomingMessage.sender).toEqual(sendingUser);
        expect(incomingMessage.channel).toBe('test_channel');
        expect(incomingMessage.msg).toBe('Hello world');
        time = incomingMessage.time as DateTime;
      }
    }

    expect(writeFileSpy).toBeCalled();
    expect(path).toBe('assets/databaseJSON/database-messages.json');
    expect(() => JSON.parse(content) as MessageEntry[]).not.toThrowError();
    const messages = JSON.parse(content) as MessageEntry[];
    expect(messages).toHaveLength(5);
    expect(messages[4]?.sender_ID).toBe(sendingUser.id);
    expect(messages[4]?.channel_ID).toBe('test_channel');
    expect(messages[4]?.message).toBe('Hello world');
    expect(messages[4]?.message_ID).toBe('free-id-a-b-c');
    expect(messages[4]?.sent_at_utc_timestamp).toBe(time.toISO());
  });
});

describe('messageHistory', () => {
  it('sends back the messageHistory with the requested amount of messages', async () => {
    const fakeURL = 'ws://mock-message-history-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    const request: RequestMessageHistory = {
      channel_id: 'test_channel',
      amount: 2,
    };

    await MessageHandler.messageHistory(sendingWs, sendingUser, request);

    await flushPromises();

    expect(receivedData1.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_history_response');
      if (res.data.command === 'message_history_response') {
        const response: MessageHistoryResponse = res.data.data;
        expect(response.channel_id).toBe('test_channel');
        expect(response.messages).toEqual([
          {
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            msg: 'B',
            channel: 'test_channel',
            time: DateTime.fromISO('2023-10-31T23:15:52.140Z', { setZone: true }),
          },
          {
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            msg: 'C',
            channel: 'test_channel',
            time: DateTime.fromISO('2023-11-02T23:16:03.230Z', { setZone: true }),
          },
        ]);
      }
    }
  });

  it('sends back the messageHistory with no messages if the channel does not have any messages', async () => {
    const fakeURL = 'ws://mock-message-history-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    const request: RequestMessageHistory = {
      channel_id: 'test_channel_empty',
      amount: 2,
    };

    await MessageHandler.messageHistory(sendingWs, sendingUser, request);

    await flushPromises();

    expect(receivedData1.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_history_response');
      if (res.data.command === 'message_history_response') {
        const response: MessageHistoryResponse = res.data.data;
        expect(response.channel_id).toBe('test_channel_empty');
        expect(response.messages).toEqual([]);
      }
    }
  });

  it('sends back the messageHistory with all the messages in the channel if there are less messages than requested', async () => {
    const fakeURL = 'ws://mock-message-history-3';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    const request: RequestMessageHistory = {
      channel_id: 'test_channel',
      amount: 5,
    };

    await MessageHandler.messageHistory(sendingWs, sendingUser, request);

    await flushPromises();

    expect(receivedData1.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_history_response');
      if (res.data.command === 'message_history_response') {
        const response: MessageHistoryResponse = res.data.data;
        expect(response.channel_id).toBe('test_channel');
        expect(response.messages).toEqual([
          {
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            msg: 'A',
            channel: 'test_channel',
            time: DateTime.fromISO('2023-10-31T23:15:51.050Z', { setZone: true }),
          },
          {
            sender: {
              id: 'test2@test2.com',
              username: 'Testaccount 2',
            },
            msg: 'B',
            channel: 'test_channel',
            time: DateTime.fromISO('2023-10-31T23:15:52.140Z', { setZone: true }),
          },
          {
            sender: {
              id: 'test1@test1.com',
              username: 'Testaccount 1',
            },
            msg: 'C',
            channel: 'test_channel',
            time: DateTime.fromISO('2023-11-02T23:16:03.230Z', { setZone: true }),
          },
        ]);
      }
    }
  });

  it('sends back an error if the channel does not exist', async () => {
    const fakeURL = 'ws://mock-message-history-4';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    const request: RequestMessageHistory = {
      channel_id: 'test_channel_non_existant',
      amount: 5,
    };

    await MessageHandler.messageHistory(sendingWs, sendingUser, request);

    await flushPromises();

    expect(receivedData1.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_history_error');
      if (res.data.command === 'message_history_error') {
        const error: MessageHistoryError = res.data.data;
        expect(error.error_code).toBe(404);
        expect(error.reason).toBe('Channel user attempts to retrieve history from does not exist.');
      }
    }
  });

  it('sends back an error if the user does not have access to the channel', async () => {
    const fakeURL = 'ws://mock-message-history-5';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);

    const sendingWs = wss.socketsClientToServer.get(ws1) || ws1;
    const sendingUser = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    const request: RequestMessageHistory = {
      channel_id: 'test_channel_no_access',
      amount: 5,
    };

    await MessageHandler.messageHistory(sendingWs, sendingUser, request);

    await flushPromises();

    expect(receivedData1.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('message_history_error');
      if (res.data.command === 'message_history_error') {
        const error: MessageHistoryError = res.data.data;
        expect(error.error_code).toBe(405);
        expect(error.reason).toBe('User has no access to this channel and thus neither its message history.');
      }
    }
  });
});
