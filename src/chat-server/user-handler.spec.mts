// author: Arno Genicot
// date: 2023-12-02

import type { RawData } from 'ws';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import type { UserEntry } from '../database/database-interfaces.mjs';
import type { NicknameChangeRequest, NicknameChangeSuccess, User } from '../protocol/proto.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { UserHandler } from './user-handler.mjs';
import { DateTime } from 'luxon';
import { promises } from 'fs';

async function flushPromises() {
  await new Promise<void>((resolve) => setTimeout(resolve));
}

const actualReadFile = promises.readFile;

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
              "channels": [],
              "self_destruct_at_utc_timestamp": "2024-07-01T23:16:03.230Z",
              "friends": [],
              "destroy_warning": false
            },
            {
              "email_ID": "test2@test2.com",
              "user_name": "Testaccount 2",
              "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
              "hashed_pass": "def",
              "channels": [],
              "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
              "friends": [],
              "destroy_warning": true
            }
          ]
        `);
      default:
        return actualReadFile(path, options);
    }
  });
});

afterAll(() => {
  vi.clearAllMocks();
});

describe('updateUserDatabase', () => {
  it("checks if user's fields last-seen-at/self-destruct-at/destroy-warning get updated correctly:", async () => {
    const fakeURL = 'ws://mock-message-sending-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-1');
    const ws2 = new MockWebSocket(fakeURL, 'client-2');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);
    expect(wss.socketsClientToServer.has(ws2)).toEqual(true);

    const user1ToUpdate = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };
    const user2ToUpdate = {
      id: 'test2@test2.com',
      username: 'Testaccount 2',
    };

    let path: string = '';
    let content: string = '';

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      path = file as string;
      content = data as string;
      return Promise.resolve();
    });

    await UserHandler.updateUserDatabase(user1ToUpdate);
    await UserHandler.updateUserDatabase(user2ToUpdate);
    await flushPromises();

    const time: DateTime = DateTime.utc();
    const time2: DateTime = DateTime.utc().plus({ months: 8 });

    expect(path).toBe('assets/databaseJSON/database-users.json');
    expect(() => JSON.parse(content) as UserEntry[]).not.toThrowError();
    const users = JSON.parse(content) as UserEntry[];
    expect(users).toHaveLength(2);
    expect(
      DateTime.fromISO(users[0]?.last_seen_utc_timestamp || '', { zone: 'utc' }).diff(time, 'minutes').minutes < 5,
    ).toBeTruthy();
    expect(
      DateTime.fromISO(users[1]?.last_seen_utc_timestamp || '', { zone: 'utc' }).diff(time, 'minutes').minutes < 5,
    ).toBeTruthy();
    expect(
      DateTime.fromISO(users[0]?.self_destruct_at_utc_timestamp || '', { zone: 'utc' }).diff(time2, 'minutes').minutes <
        5,
    ).toBeTruthy();
    expect(
      DateTime.fromISO(users[1]?.self_destruct_at_utc_timestamp || '', { zone: 'utc' }).diff(time2, 'minutes').minutes <
        5,
    ).toBeTruthy();
    expect(users[0]?.destroy_warning).toBeFalsy();
    expect(users[1]?.destroy_warning).toBeFalsy();

    writeFileSpy.mockReset();
  });
});

describe('updateNickname', () => {
  it('Updates nickname of a logged in user:', async () => {
    const fakeURL = 'ws://mock-message-sending-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL, 'client-3');

    expect(wss.socketsClientToServer.has(ws1)).toEqual(true);

    const loggedInClients = new Map<IWebSocket, User>().set(wss.socketsClientToServer.get(ws1) || ws1, {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    });

    const wsToUpdate = wss.socketsClientToServer.get(ws1) || ws1;
    const userToUpdate = {
      id: 'test1@test1.com',
      username: 'Testaccount 1',
    };

    const receivedData1: RawData[] = [];

    ws1.on('message', (data) => {
      receivedData1.push(data);
    });

    let path: string = '';
    let content: string = '';

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      path = file as string;
      content = data as string;
      return Promise.resolve();
    });

    const data: NicknameChangeRequest = {
      nickname: 'ILoveThisProject',
    };

    await UserHandler.updateNickname(wsToUpdate, userToUpdate, data, loggedInClients);
    await flushPromises();

    expect(receivedData1.length).toBe(1);

    const res = toClientCommandSchema.safeParse(receivedData1[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('nickname_change_success');
      if (res.data.command === 'nickname_change_success') {
        const incomingMessage: NicknameChangeSuccess = res.data.data;
        expect(incomingMessage.user.id).toEqual('test1@test1.com');
        expect(incomingMessage.user.username).toEqual('ILoveThisProject');
      }
    }

    expect(path).toBe('assets/databaseJSON/database-users.json');
    expect(() => JSON.parse(content) as UserEntry[]).not.toThrowError();
    const users = JSON.parse(content) as UserEntry[];
    expect(users).toHaveLength(2);
    expect(users[0]?.user_name).toEqual('ILoveThisProject');

    writeFileSpy.mockReset();
  });
});
