// author: Jonas Couwberghs
// date: 2023-12-04

import type { RawData } from 'ws';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import type { ChannelEntry, UserEntry } from '../database/database-interfaces.mjs';
import type { ChannelCreateRequest, ChannelJoinRequest, ChannelLeaveRequest, User } from '../protocol/proto.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { ChannelHandler } from './channel-handler.mjs';
import { promises } from 'fs';

async function flushPromises() {
  await new Promise<void>((resolve) => setTimeout(resolve));
}

const actualReadFile = promises.readFile;
let fakeUUIDCount = -1;

beforeEach(() => {
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
              "channel_ID": "test_channel_occupied_id",
              "name": "Test occupied id"
            },
            {
              "channel_ID": "test_channel_not_in_yet",
              "name": "Test not in yet"
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
              "channel_ID": "test_channel_not_in_yet",
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
              "channels": ["test_channel", "test_channel_empty", "test_channel_not_in_yet"],
              "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
              "friends": ["test1@test1.com", "test3@test3.com"],
              "destroy_warning": false
            },
            {
              "email_ID": "test3@test3.com",
              "user_name": "Testaccount 3",
              "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
              "hashed_pass": "def",
              "channels": ["test_channel_empty", "test_channel_not_in_yet"],
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
          return 'test_channel_occupied_id';
        } else if (fakeUUIDCount === 0) {
          return 'test_channel_free_id';
        } else {
          return realCrypto.randomUUID();
        }
      },
    };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('onClientJoinChannel', () => {
  it('sends back a ChannelJoinCompleted as response and adds the channel to the UserEntry in the database', async () => {
    const fakeURL = 'ws://mock-client-join-channel-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: ChannelJoinRequest = {
      channel_id: 'test_channel_not_in_yet',
    };

    await ChannelHandler.onClientJoinChannel(sendingWs, user, request);

    await flushPromises();

    // User should have received a ChannelJoinCompleted
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_join_completed');
      if (command.command === 'channel_join_completed') {
        expect(command.data).toEqual({
          channel: {
            id: 'test_channel_not_in_yet',
            name: 'Test not in yet',
          },
        });
      }
    }

    // broadcastChannels should have not been called
    expect(broadcastChannelsSpy).not.toHaveBeenCalled();

    // The user entry should now contain the channel
    expect(writeFileSpy).toHaveBeenCalledOnce();
    expect(paths).toEqual(['assets/databaseJSON/database-users.json']);
    expect(contents).toHaveLength(1);

    if (contents[0]) {
      const users = JSON.parse(contents[0]) as UserEntry[];
      const user = users.find(({ email_ID }) => email_ID === 'test1@test1.com');
      expect(user).toBeDefined();
      if (user) {
        expect(user.channels).toContain('test_channel_not_in_yet');
      }
    }
  });

  it('sends back a ChannelJoinRefused if the channel does not exist', async () => {
    const fakeURL = 'ws://mock-client-join-channel-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: ChannelJoinRequest = {
      channel_id: 'test_channel_non_existant',
    };

    await ChannelHandler.onClientJoinChannel(sendingWs, user, request);

    await flushPromises();

    // User should have received a ChannelJoinRefused
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_join_refused');
      if (command.command === 'channel_join_refused') {
        expect(command.data).toEqual({
          channel_id: 'test_channel_non_existant',
          error_code: 404,
        });
      }
    }

    // broadcastChannels should have not been called
    expect(broadcastChannelsSpy).not.toHaveBeenCalled();

    // The database should not have been updated the channel
    expect(writeFileSpy).not.toHaveBeenCalled();
  });

  it('sends back a ChannelJoinRefused if the user is already in the channel', async () => {
    const fakeURL = 'ws://mock-client-join-channel-3';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const request: ChannelJoinRequest = {
      channel_id: 'test_channel',
    };

    await ChannelHandler.onClientJoinChannel(sendingWs, user, request);

    await flushPromises();

    // User should have received a ChannelJoinRefused
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_join_refused');
      if (command.command === 'channel_join_refused') {
        expect(command.data).toEqual({
          channel_id: 'test_channel',
          error_code: 405,
        });
      }
    }

    // broadcastChannels should have not been called
    expect(broadcastChannelsSpy).not.toHaveBeenCalled();

    // The database should not have been updated the channel
    expect(writeFileSpy).not.toHaveBeenCalled();
  });
});

describe('onClientCreateChannel', () => {
  it('sends back a ChannelCreateCompleted as response, adds the ChannelEntry to the database and adds the channel to the UserEntry in the database', async () => {
    const fakeURL = 'ws://mock-client-create-channel-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const loggedInClients = new Map<IWebSocket, User>().set(sendingWs, user);

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    // Fake UUID to a free id
    fakeUUIDCount = 0;

    const request: ChannelCreateRequest = {
      name: 'Test channel new',
    };

    await ChannelHandler.onClientCreateChannel(sendingWs, user, request, loggedInClients);

    await flushPromises();

    // User should have received a ChannelJoinCompleted
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_create_completed');
      if (command.command === 'channel_create_completed') {
        expect(command.data).toEqual({
          channel: {
            id: 'test_channel_free_id',
            name: 'Test channel new',
          },
        });
      }
    }

    // broadcastChannels should have been called
    expect(broadcastChannelsSpy).toHaveBeenCalled();
    expect(broadcastChannelsSpy).toHaveBeenCalledWith(loggedInClients);

    // There should have been 2 writes to the database
    expect(writeFileSpy).toHaveBeenCalledTimes(2);
    expect(paths).toEqual(['assets/databaseJSON/database-channels.json', 'assets/databaseJSON/database-users.json']);
    expect(contents).toHaveLength(2);

    // The channel should have been added to the database
    expect(contents[0]).toBeDefined();
    if (contents[0]) {
      const channels = JSON.parse(contents[0]) as ChannelEntry[];
      expect(channels).toHaveLength(4);
      expect(channels).toContainEqual({
        channel_ID: 'test_channel_free_id',
        name: 'Test channel new',
      });
    }

    // The userentry should have been updated to contain the channel in the database
    expect(contents[1]).toBeDefined();
    if (contents[1]) {
      const users = JSON.parse(contents[1]) as UserEntry[];
      expect(users).toHaveLength(3);
      const user = users.find(({ email_ID }) => email_ID === 'test1@test1.com');
      expect(user).toBeDefined();
      if (user) {
        expect(user.channels).toContain('test_channel_free_id');
      }
    }
  });

  it('sends back a ChannelCreateRefused as response if the insertion into the database fails', async () => {
    const fakeURL = 'ws://mock-client-create-channel-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const loggedInClients = new Map<IWebSocket, User>().set(sendingWs, user);

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    // Fake UUID 4 times to an already occupied ID
    fakeUUIDCount = 4;

    const request: ChannelCreateRequest = {
      name: 'Test channel new',
    };

    await ChannelHandler.onClientCreateChannel(sendingWs, user, request, loggedInClients);

    await flushPromises();

    // User should have received a ChannelJoinCompleted
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_create_refused');
      if (command.command === 'channel_create_refused') {
        expect(command.data).toEqual({
          channel_name: 'Test channel new',
          error_code: 500,
          reason: 'Failed to insert channel into the database',
        });
      }
    }

    // broadcastChannels should not have been called
    expect(broadcastChannelsSpy).not.toHaveBeenCalled();

    // There should have been no writes to the database
    expect(writeFileSpy).not.toHaveBeenCalled();
    expect(paths).toHaveLength(0);
    expect(contents).toHaveLength(0);
  });
});

describe('onClientLeaveChannel', () => {
  it('sends back a ChannelLeaveCompleted as response and removes the channel from the UserEntry in the database', async () => {
    const fakeURL = 'ws://mock-client-leave-channel-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const loggedInClients = new Map<IWebSocket, User>().set(sendingWs, user);

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    const request: ChannelLeaveRequest = {
      channel_id: 'test_channel',
    };

    await ChannelHandler.onClientLeaveChannel(sendingWs, user, request, loggedInClients);

    await flushPromises();

    // User should have received a ChannelLeaveCompleted
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_leave_completed');
      if (command.command === 'channel_leave_completed') {
        expect(command.data).toEqual({
          channel: {
            id: 'test_channel',
            name: 'Test',
          },
        });
      }
    }

    // broadcastChannels should have been called
    expect(broadcastChannelsSpy).toHaveBeenCalled();
    expect(broadcastChannelsSpy).toHaveBeenCalledWith(loggedInClients);

    // There should have been 2 writes to the database
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(paths).toEqual(['assets/databaseJSON/database-users.json']);
    expect(contents).toHaveLength(1);

    // The userentry should have been updated to not contain the channel in the database
    expect(contents[0]).toBeDefined();
    if (contents[0]) {
      const users = JSON.parse(contents[0]) as UserEntry[];
      expect(users).toHaveLength(3);
      const user = users.find(({ email_ID }) => email_ID === 'test1@test1.com');
      expect(user).toBeDefined();
      if (user) {
        expect(user.channels).not.toContain('test_channel');
      }
    }
  });

  it('sends back a ChannelLeaveRefused as response if the channel does not exist', async () => {
    const fakeURL = 'ws://mock-client-leave-channel-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const loggedInClients = new Map<IWebSocket, User>().set(sendingWs, user);

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    const request: ChannelLeaveRequest = {
      channel_id: 'test_channel_non_existant',
    };

    await ChannelHandler.onClientLeaveChannel(sendingWs, user, request, loggedInClients);

    await flushPromises();

    // User should have received a ChannelLeaveCompleted
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_leave_refused');
      if (command.command === 'channel_leave_refused') {
        expect(command.data).toEqual({
          channel_id: 'test_channel_non_existant',
          error_code: 404,
        });
      }
    }

    // broadcastChannels should have been called
    expect(broadcastChannelsSpy).not.toHaveBeenCalled();
    // There should have been 2 writes to the database
    expect(writeFileSpy).not.toHaveBeenCalled();
    expect(paths).toHaveLength(0);
    expect(contents).toHaveLength(0);
  });

  it('sends back a ChannelLeaveRefused as response if the user is not in the channel', async () => {
    const fakeURL = 'ws://mock-client-leave-channel-3';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const user: User = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const loggedInClients = new Map<IWebSocket, User>().set(sendingWs, user);

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    const broadcastChannelsSpy = vi.spyOn(ChannelHandler, 'broadcastChannels').mockImplementation(() => {
      return Promise.resolve();
    });

    const request: ChannelLeaveRequest = {
      channel_id: 'test_channel_not_in_yet',
    };

    await ChannelHandler.onClientLeaveChannel(sendingWs, user, request, loggedInClients);

    await flushPromises();

    // User should have received a ChannelLeaveCompleted
    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_leave_refused');
      if (command.command === 'channel_leave_refused') {
        expect(command.data).toEqual({
          channel_id: 'test_channel_not_in_yet',
          error_code: 407,
        });
      }
    }

    // broadcastChannels should have been called
    expect(broadcastChannelsSpy).not.toHaveBeenCalled();
    // There should have been 2 writes to the database
    expect(writeFileSpy).not.toHaveBeenCalled();
    expect(paths).toHaveLength(0);
    expect(contents).toHaveLength(0);
  });
});

describe('broadcastChannels', () => {
  it('sends a ChannelList to the passed websocket if only a websocket is passed', async () => {
    const fakeURL = 'ws://mock-broadcast-channels-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    expect(wss.socketsClientToServer.has(ws)).toEqual(true);
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const receivedData: RawData[] = [];

    ws.on('message', (data) => {
      receivedData.push(data);
    });

    await ChannelHandler.broadcastChannels(sendingWs);

    await flushPromises();

    expect(receivedData).toHaveLength(1);
    expect(receivedData[0]).toBeDefined();

    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_list');
      if (command.command === 'channel_list') {
        expect(command.data).toEqual({
          channels: [
            {
              name: 'Test',
              id: 'test_channel',
            },
            {
              name: 'Test occupied id',
              id: 'test_channel_occupied_id',
            },
            {
              name: 'Test not in yet',
              id: 'test_channel_not_in_yet',
            },
          ],
        });
      }
    }
  });

  it('sends a ChannelList to the all the loggedInClients if the map containing the logged in clients is passed', async () => {
    const fakeURL = 'ws://mock-broadcast-channels-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');
    const ws2 = new MockWebSocket(fakeURL, 'client-2');
    const ws3 = new MockWebSocket(fakeURL, 'client-3');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws2)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws3)).toEqual(true);

    const loggedInClients = new Map()
      .set(wss.socketsClientToServer.get(ws1)!, {
        id: 'test1@test1.com',
        name: 'Testaccount 1',
      })
      .set(wss.socketsClientToServer.get(ws2)!, {
        id: 'test2@test2.com',
        name: 'Testaccount 2',
      })
      .set(wss.socketsClientToServer.get(ws3)!, {
        id: 'test3@test3.com',
        name: 'Testaccount 3',
      });

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

    await ChannelHandler.broadcastChannels(loggedInClients);

    await flushPromises();

    expect(receivedData1).toHaveLength(1);
    expect(receivedData2).toHaveLength(1);
    expect(receivedData3).toHaveLength(1);
    expect(receivedData1).toEqual(receivedData2);
    expect(receivedData1).toEqual(receivedData3);
    expect(receivedData2).toEqual(receivedData3);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('channel_list');
      if (command.command === 'channel_list') {
        expect(command.data).toEqual({
          channels: [
            {
              name: 'Test',
              id: 'test_channel',
            },
            {
              name: 'Test occupied id',
              id: 'test_channel_occupied_id',
            },
            {
              name: 'Test not in yet',
              id: 'test_channel_not_in_yet',
            },
          ],
        });
      }
    }
  });
});
