// @author Dieter Demuynck, Toon Neyens
// @date 2023-12-04

import type {
  LogInCompleted,
  LogInRequest,
  User,
  Channel,
  UserId,
  ToClientCommand,
  ChannelList,
  LogInRefused,
  SignUpCompleted,
  SignUpRequest,
  SignUpRefused,
} from '../protocol/proto.mjs';
import type { RawData } from 'ws';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import type { UserEntry } from '../database/database-interfaces.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { expect, describe, it, vi, beforeAll, afterAll } from 'vitest';
import { AuthenticationHandler } from './authentication-handler.mjs';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { UserHandler } from './user-handler.mjs';
import { DateTime } from 'luxon';
import { promises } from 'fs';

function checkMapForUserID(map: Map<IWebSocket, User>, user_id: UserId): boolean {
  const iterator = Array.from(map.values());
  let serverHasUser = false;
  iterator.forEach((user) => {
    if (user.id === user_id) {
      serverHasUser = true;
    }
  });
  return serverHasUser;
}

async function flushPromises() {
  await new Promise<void>((resolve) => setTimeout(resolve));
}

const actualReadFile = promises.readFile;

beforeAll(() => {
  // Mock Datetime.now() to always give the same time:
  vi.spyOn(DateTime, 'now').mockImplementation(() => {
    return DateTime.fromISO('2023-12-25T22:00:00.360Z');
  });
  // Mock database files to ensure consistent values in the tests
  vi.spyOn(promises, 'writeFile').mockImplementation(async () => {}); // We do not want to write to any database
  vi.spyOn(promises, 'readFile').mockImplementation((path, options) => {
    switch (path) {
      case 'assets/databaseJSON/database-channels.json':
        return Promise.resolve(`
            [
              {
                "channel_ID": "test_channel_0",
                "name": "Test channel 0"
              },
              {
                "channel_ID": "test_channel_1",
                "name": "Test channel 1"
              }
            ]
          `);
      case 'assets/databaseJSON/database-users.json':
        return Promise.resolve(`
            [
              {
                "email_ID": "john@doe.com",
                "user_name": "john doe",
                "last_seen_utc_timestamp": "2023-10-31T23:16:03.230Z",
                "hashed_pass": "beebeebooboo",
                "channels": ["test_channel_0", "test_channel_1"],
                "self_destruct_at_utc_timestamp": "2024-07-01T23:16:03.230Z",
                "friends": ["jane@doe.com"],
                "destroy_warning": false
              },
              {
                "email_ID": "jane@doe.com",
                "user_name": "jane doe",
                "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
                "hashed_pass": "beebeebooboo",
                "channels": ["test_channel_0", "test_channel_1"],
                "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
                "friends": ["john@doe.com"],
                "destroy_warning": false
              },
              {
                "email_ID": "jake@fake.com",
                "user_name": "joker",
                "last_seen_utc_timestamp": "2023-10-01T22:55:12.562Z",
                "hashed_pass": "beebeebooboo",
                "channels": [ "test_channel_0" ],
                "self_destruct_at_utc_timestamp": "2024-07-02T22:55:12.562Z",
                "friends": [],
                "destroy_warning": true
              }
            ]
          `);
      default:
        return actualReadFile(path, options);
    }
  });

  vi.mock('bcrypt', () => {
    return {
      hash: async (data: string) => {
        return Promise.resolve(data);
      },
      compare: async (data: string, encrypted: string) => {
        return Promise.resolve(data === encrypted);
      },
    };
  });
});

afterAll(() => {
  vi.clearAllMocks();
});

// ////////////////////////////////////////////////////////////////////////////////////// //
//                                     onClientSignUp                                     //
// ////////////////////////////////////////////////////////////////////////////////////// //

describe('onClientSignup', () => {
  it('succesful user signup', async () => {
    // Set up client
    const fakeURL = 'ws://client-signup';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL);

    expect(wss.socketsClientToServer.has(ws)).toBeTruthy();
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const onClientLoginSpy = vi
      .spyOn(AuthenticationHandler, 'onClientLogin')
      .mockImplementationOnce(() => Promise.resolve());

    const receivedData: RawData[] = [];
    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementationOnce(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    // Create signup request and run
    const user_id = 'jane.doe@doe.com';
    const user_nickname = 'jane';
    const password = 'RanDom123-Pass-Word';
    const user: User = { id: user_id, username: user_nickname }; // Login requests needs no nickname
    const credentials: SignUpRequest = { user: user, password: password };

    const fakeClientMap = new Map<IWebSocket, User>();

    const signupSucceeded: SignUpCompleted = {
      user: user,
    };

    await AuthenticationHandler.onClientSignUp(sendingWs, credentials, fakeClientMap);

    await flushPromises();

    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('signup_completed');
      if (res.data.command === 'signup_completed') {
        const data: SignUpCompleted = res.data.data;
        expect(data).toEqual(signupSucceeded);
      }
    }

    expect(onClientLoginSpy).toHaveBeenCalledOnce();
    expect(writeFileSpy).toHaveBeenCalled();
    expect(paths).toContain('assets/databaseJSON/database-users.json');

    // There should have been 2 writes to the database
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(paths).toEqual(['assets/databaseJSON/database-users.json']);
    expect(contents).toHaveLength(1);

    // The channel should have been added to the database
    expect(contents[0]).toBeDefined();
    if (contents[0]) {
      const users = JSON.parse(contents[0]) as UserEntry[];
      expect(users).toHaveLength(4);
      expect(users).toContainEqual({
        email_ID: 'jane.doe@doe.com',
        user_name: 'jane',
        last_seen_utc_timestamp: '2023-12-25T22:00:00.360Z',
        hashed_pass: 'RanDom123-Pass-Word',
        channels: [],
        self_destruct_at_utc_timestamp: '2024-08-25T21:00:00.360Z',
        friends: [],
        destroy_warning: false,
      });
    }
    onClientLoginSpy.mockRestore();
    writeFileSpy.mockReset();
  });

  it('failed user signup', async () => {
    // Set up client
    const fakeURL = 'ws://client-signup-failed';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL);

    expect(wss.socketsClientToServer.has(ws)).toBeTruthy();
    const sendingWs = wss.socketsClientToServer.get(ws)!;

    const onClientLoginSpy = vi.spyOn(AuthenticationHandler, 'onClientLogin');

    const receivedData: RawData[] = [];
    ws.on('message', (data) => {
      receivedData.push(data);
    });

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementationOnce(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });

    // Create signup request and run
    const user_id = 'jane@doe.com';
    const user_nickname = 'jane';
    const password = 'RanDom123-Pass-Word';
    const user: User = { id: user_id, username: user_nickname }; // Login requests needs no nickname
    const credentials: SignUpRequest = { user: user, password: password };

    const fakeClientMap = new Map<IWebSocket, User>();

    const signupFailed: SignUpRefused = {
      user: user,
      error_code: 103,
    };

    await AuthenticationHandler.onClientSignUp(sendingWs, credentials, fakeClientMap);

    await flushPromises();

    expect(receivedData).toHaveLength(1);
    const res = toClientCommandSchema.safeParse(receivedData[0]);
    expect(res.success);
    if (res.success) {
      expect(res.data.command).toBe('signup_refused');
      if (res.data.command === 'signup_refused') {
        const data: SignUpRefused = res.data.data;
        expect(data).toEqual(signupFailed);
      }
    }

    expect(onClientLoginSpy).not.toHaveBeenCalled();
    expect(paths).toHaveLength(0);

    // There should have been 2 writes to the database
    expect(writeFileSpy).not.toHaveBeenCalled();
    expect(paths).toEqual([]);
    expect(contents).toHaveLength(0);

    onClientLoginSpy.mockRestore();
    writeFileSpy.mockReset();
  });
});

// ///////////////////////////////////////////////////////////////////////////////////// //
//                                     onClientLogin                                     //
// ///////////////////////////////////////////////////////////////////////////////////// //

describe('onClientLogin', () => {
  it('On a valid login (no nickname in User): updates database and loggedInClients, responds with LogInSuccessful with correct nickname', async () => {
    // Set up client
    const logInURL = 'ws://log-in-succesful-test-no-nickname';
    const ws1 = new MockWebSocket(logInURL, 'good-client-login');
    const receivedData = new Array<string | Buffer>();
    const ws1SendSpy = vi.spyOn(ws1, 'send').mockImplementation((data) => receivedData.push(data));

    const databaseUpdateSpy = vi.spyOn(UserHandler, 'updateUserDatabase').mockImplementationOnce(async () => {
      return Promise.resolve();
    });

    // Create login request and run
    const user_id = 'jane@doe.com'; // Nickname: "jane doe"
    const password = 'beebeebooboo';
    const user: User = { id: user_id }; // Login requests needs no nickname
    const credentials: LogInRequest = { user: user, password: password };

    const fakeClientMap = new Map<IWebSocket, User>();

    await AuthenticationHandler.onClientLogin(ws1, credentials, fakeClientMap);

    // Set up expected result
    // LogInCompleted and ChannelList
    const nickname: string = 'jane doe';
    const nickedUser: User = { id: user_id, username: nickname };
    const channel0: Channel = { name: 'Test channel 0', id: 'test_channel_0' };
    const channel1: Channel = { name: 'Test channel 1', id: 'test_channel_1' };
    const channelList: ChannelList = { channels: [channel0, channel1] };
    const logInCompletedResponse: LogInCompleted = {
      user: nickedUser,
      currentChannels: channelList,
    };
    const logInCommand: ToClientCommand = {
      command: 'login_completed',
      data: logInCompletedResponse,
    };
    const channelListCommand: ToClientCommand = {
      command: 'channel_list',
      data: channelList,
    };

    // Check the sent and received data
    expect(checkMapForUserID(fakeClientMap, user_id)).toBeTruthy();
    expect(ws1SendSpy).toHaveBeenCalled();
    expect(databaseUpdateSpy).toHaveBeenCalledWith({ id: user_id, username: 'jane doe' } as User);

    expect(receivedData.length).toEqual(2);
    let logInResponse = toClientCommandSchema.safeParse(receivedData[0]);
    let channelListResponse;
    if (logInResponse.success && logInResponse.data.command === 'login_completed') {
      channelListResponse = toClientCommandSchema.safeParse(receivedData[1]);
    } else {
      // The first parsing wasn't a success, perhaps the responses were sent in a different order:
      logInResponse = toClientCommandSchema.safeParse(receivedData[1]);
      channelListResponse = toClientCommandSchema.safeParse(receivedData[0]);
    }

    expect(logInResponse.success).toBeTruthy();
    expect(channelListResponse).toBeTruthy();
    if (logInResponse.success && channelListResponse.success) {
      expect(logInResponse.data).toEqual(logInCommand);
      expect(channelListResponse.data).toEqual(channelListCommand);
    }

    databaseUpdateSpy.mockReset();
    ws1SendSpy.mockReset();
  });

  it('On a valid login (nickname ignored in User): updates database and loggedInClients, responds with LogInSuccessful  with correct nickname', async () => {
    // Set up client
    const logInURL = 'ws://log-in-succesful-test-with-nickname';
    const ws1 = new MockWebSocket(logInURL, 'good-client-login');
    const receivedData = new Array<string | Buffer>();
    const ws1SendSpy = vi.spyOn(ws1, 'send').mockImplementation((data) => receivedData.push(data));

    const databaseUpdateSpy = vi.spyOn(UserHandler, 'updateUserDatabase').mockImplementationOnce(async () => {
      return Promise.resolve();
    });

    // Create login request and run
    const user_id = 'jane@doe.com'; // Nickname: "jane doe"
    const password = 'beebeebooboo';
    const user: User = { id: user_id, username: 'jean dough' }; // Login requests needs no nickname, should be ignored
    const credentials: LogInRequest = { user: user, password: password };

    const fakeClientMap = new Map<IWebSocket, User>();

    await AuthenticationHandler.onClientLogin(ws1, credentials, fakeClientMap);

    // Set up expected result
    // LogInCompleted and ChannelList
    const nickname: string = 'jane doe';
    const nickedUser: User = { id: user_id, username: nickname };
    const channel0: Channel = { name: 'Test channel 0', id: 'test_channel_0' };
    const channel1: Channel = { name: 'Test channel 1', id: 'test_channel_1' };
    const channelList: ChannelList = { channels: [channel0, channel1] };
    const logInCompletedResponse: LogInCompleted = {
      user: nickedUser,
      currentChannels: channelList,
    };
    const logInCommand: ToClientCommand = {
      command: 'login_completed',
      data: logInCompletedResponse,
    };
    const channelListCommand: ToClientCommand = {
      command: 'channel_list',
      data: channelList,
    };

    // Check the sent and received data
    expect(checkMapForUserID(fakeClientMap, user_id)).toBeTruthy();
    expect(ws1SendSpy).toHaveBeenCalled();
    expect(databaseUpdateSpy).toHaveBeenCalledWith({ id: user_id, username: 'jane doe' } as User);

    expect(receivedData.length).toEqual(2);
    let logInResponse = toClientCommandSchema.safeParse(receivedData[0]);
    let channelListResponse;
    if (logInResponse.success && logInResponse.data.command === 'login_completed') {
      channelListResponse = toClientCommandSchema.safeParse(receivedData[1]);
    } else {
      // The first parsing wasn't a success, perhaps the responses were sent in a different order:
      logInResponse = toClientCommandSchema.safeParse(receivedData[1]);
      channelListResponse = toClientCommandSchema.safeParse(receivedData[0]);
    }

    expect(logInResponse.success).toBeTruthy();
    expect(channelListResponse).toBeTruthy();
    if (logInResponse.success && channelListResponse.success) {
      expect(logInResponse.data).toEqual(logInCommand);
      expect(channelListResponse.data).toEqual(channelListCommand);
    }

    databaseUpdateSpy.mockReset();
    ws1SendSpy.mockReset();
  });

  it('On an invalid login (password incorrect), responds with LogInRefused with error 101', async () => {
    // Set up client
    const logInURL = 'ws://log-in-refused-test-bad-password';
    const ws1 = new MockWebSocket(logInURL, 'good-client-login');
    const receivedData = new Array<string | Buffer>();
    const ws1SendSpy = vi.spyOn(ws1, 'send').mockImplementation((data) => receivedData.push(data));

    const databaseUpdateSpy = vi.spyOn(UserHandler, 'updateUserDatabase');

    // Create login request and run
    const user_id = 'john@doe.com'; // Nickname: "john doe"
    const password = 'booboobeebee'; // Incorrect password
    const user: User = { id: user_id };
    const credentials: LogInRequest = { user: user, password: password };

    const fakeClientMap = new Map<IWebSocket, User>();

    await AuthenticationHandler.onClientLogin(ws1, credentials, fakeClientMap);

    // Set up expected result
    // LogInRefused
    const logInRefusedResponse: LogInRefused = {
      user: user,
      error_code: 101, // Error: incorrect password
    };
    const toClientCommand: ToClientCommand = {
      command: 'login_refused',
      data: logInRefusedResponse,
    };

    // Check the sent and received data
    expect(checkMapForUserID(fakeClientMap, user_id)).toBeFalsy();
    expect(ws1SendSpy).toHaveBeenCalled();
    expect(databaseUpdateSpy).toHaveBeenCalledTimes(0); // Database should not be updated

    expect(receivedData.length).toEqual(1);
    const response = toClientCommandSchema.safeParse(receivedData[0]);
    expect(response.success).toBeTruthy();
    if (response.success) {
      expect(response.data).toEqual(toClientCommand);
    }

    databaseUpdateSpy.mockReset();
    ws1SendSpy.mockReset();
  });

  it('On an invalid login (user not in DB), responds with LogInRefused with error 102', async () => {
    // Set up client
    const logInURL = 'ws://log-in-refused-test-bad-user';
    const ws1 = new MockWebSocket(logInURL, 'good-client-login');
    const receivedData = new Array<string | Buffer>();
    const ws1SendSpy = vi.spyOn(ws1, 'send').mockImplementation((data) => receivedData.push(data));

    const databaseUpdateSpy = vi.spyOn(UserHandler, 'updateUserDatabase');

    // Create login request and run
    const user_id = 'john@do.com'; // correct ID should be 'john@doe.com'
    const password = 'booboobeebee'; // Incorrect password (lower precedence than incorrect ID (should be trivial))
    const user: User = { id: user_id };
    const credentials: LogInRequest = { user: user, password: password };

    const fakeClientMap = new Map<IWebSocket, User>();

    await AuthenticationHandler.onClientLogin(ws1, credentials, fakeClientMap);

    // Set up expected result
    // LogInRefused
    const logInRefusedResponse: LogInRefused = {
      user: user,
      error_code: 102, // Error: no such user
    };
    const toClientCommand: ToClientCommand = {
      command: 'login_refused',
      data: logInRefusedResponse,
    };

    // Check the sent and received data
    expect(checkMapForUserID(fakeClientMap, user_id)).toBeFalsy();
    expect(ws1SendSpy).toHaveBeenCalled();
    expect(databaseUpdateSpy).toHaveBeenCalledTimes(0); // Database should not be updated

    expect(receivedData.length).toEqual(1);
    const response = toClientCommandSchema.safeParse(receivedData);
    expect(response.success).toBeTruthy();
    if (response.success) {
      expect(response.data).toEqual(toClientCommand);
    }

    databaseUpdateSpy.mockReset();
    ws1SendSpy.mockReset();
  });
});
