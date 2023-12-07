// @author Dirk Nuyens, Dieter Demuynck
// @date 2023/12/04

import type {
  HuffmanEncodedFile,
  NicknameChangeRequest,
  OutgoingEncodedFile,
  ToServerCommand,
  User,
} from '../protocol/proto.mjs';
import type { RawData } from 'ws';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { ChatServer, database_cleaner, handleUncaughtError } from './chat-server.mjs';
import { dateTimeSchema, toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthenticationHandler } from './authentication-handler.mjs';
import { FileSharingHandler } from './file-sharing-handler.mjs';
import { MessageHandler } from './message-handler.mjs';
import { ChannelHandler } from './channel-handler.mjs';
import { LookupHandler } from './lookup-handler.mjs';
import { UserHandler } from './user-handler.mjs';
import { DateTime } from 'luxon';
import { promises } from 'fs';

interface TestObject {
  ws: IWebSocket | undefined;
  command: string | undefined;
}

function createPermissionsMockImplementation(dataObject: TestObject, callbackUser: User) {
  return async (ws: IWebSocket, command: string, callback: (user: User) => Promise<void>) => {
    dataObject.ws = ws;
    dataObject.command = command;
    await callback(callbackUser);
  };
}

async function flushPromises() {
  await new Promise<void>((resolve) => setTimeout(resolve));
}

function runAll(functionList: Array<CallableFunction>) {
  for (const func of functionList) {
    func();
  }
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
                "hashed_pass": "$2b$10$KUEKCDm3GCdIGC8pU8Kb/.iQFl8u6gQZwDPB9uJ0Cu5OwuNN26BtW",
                "channels": ["test_channel_0", "test_channel_1"],
                "self_destruct_at_utc_timestamp": "2024-07-01T23:16:03.230Z",
                "friends": ["jane@doe.com"],
                "destroy_warning": false
              },
              {
                "email_ID": "jane@doe.com",
                "user_name": "jane doe",
                "last_seen_utc_timestamp": "2023-10-01T22:54:12.562Z",
                "hashed_pass": "$2b$10$KUEKCDm3GCdIGC8pU8Kb/.iQFl8u6gQZwDPB9uJ0Cu5OwuNN26BtW",
                "channels": ["test_channel_0", "test_channel_1"],
                "self_destruct_at_utc_timestamp": "2024-07-02T22:54:12.562Z",
                "friends": ["john@doe.com"],
                "destroy_warning": false
              },
              {
                "email_ID": "jake@fake.com",
                "user_name": "joker",
                "last_seen_utc_timestamp": "2023-10-01T22:55:12.562Z",
                "hashed_pass": "$2b$10$KUEKCDm3GCdIGC8pU8Kb/.iQFl8u6gQZwDPB9uJ0Cu5OwuNN26BtW",
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
});

afterAll(() => {
  vi.clearAllMocks();
});

describe('ChatServer', () => {
  it('Has a valid constructor', async () => {
    // Set up non-chat-server mocks
    const databaseCleanerSpy = vi
      .spyOn(database_cleaner, 'handleUserStatusAndCleanup')
      .mockImplementationOnce(async () => {});

    // Create ChatServer instance
    const fakeURL = 'ws://chatserver.constructor-test';
    const wss = new MockWebSocketServer(fakeURL);

    vi.useFakeTimers();
    const chatServer = new ChatServer(wss);

    // Set up chat-server mocks
    const onServerErrorSpy = vi.spyOn(chatServer, 'onServerError').mockImplementationOnce(() => {});
    const onConnectionSpy = vi.spyOn(chatServer, 'onConnection').mockImplementationOnce(() => {});
    const onServerCloseSpy = vi.spyOn(chatServer, 'onServerClose').mockImplementationOnce(async () => {});
    const checkClientConnectionsSpy = vi.spyOn(chatServer, 'checkClientConnections').mockImplementationOnce(() => {});

    /////////////////////////
    //  CONSTRUCTOR TESTS  //
    /////////////////////////

    // Check if client connection check timer has been set
    expect(checkClientConnectionsSpy).toBeCalledTimes(0);
    vi.advanceTimersByTime(30100); // FIXME: There should be some (global) variable to set check time
    expect(checkClientConnectionsSpy).toBeCalledTimes(1);

    checkClientConnectionsSpy.mockRestore();
    vi.useRealTimers();
    await flushPromises();

    // properties should be instantiated:
    expect(chatServer.channels).toBeInstanceOf(Map); // No type checks at runtime means "Map" is the best we've got.
    expect(chatServer.loggedInClients).toBeInstanceOf(Map);
    expect(chatServer.server).toEqual(wss);
    expect(chatServer.ended).toBeInstanceOf(Promise);

    // wss should have correct callbacks:
    expect(wss.onErrorCbs.length).toBeGreaterThanOrEqual(1);
    expect(wss.onConnectionCbs.length).toBeGreaterThanOrEqual(1);
    expect(wss.onCloseCbs.length).toBeGreaterThanOrEqual(1); // One for `ended` and one for `onServerClose`, though this could change

    runAll(wss.onErrorCbs);
    runAll(wss.onConnectionCbs);
    runAll(wss.onCloseCbs);

    expect(onServerErrorSpy).toBeCalled();
    expect(onConnectionSpy).toBeCalled();
    expect(onServerCloseSpy).toBeCalled();
    expect(databaseCleanerSpy).toBeCalled();

    databaseCleanerSpy.mockReset();
    onServerErrorSpy.mockReset();
    onConnectionSpy.mockReset();
    onServerCloseSpy.mockReset();
    checkClientConnectionsSpy.mockReset();
  });

  it('onConnetion sets up ip, and pong, message, and close listeners on given websocket', () => {
    const fakeURL = 'ws://chatserver.on-connection-test';

    // Set up websockets and server
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const wsServerSide = new MockWebSocket(fakeURL, 'onConnectionTestClient', 'server');
    wsServerSide.isAlive = false;

    // Set up mock implementations
    const onPongMock = vi.spyOn(chatServer, 'onPong').mockImplementation(() => {});
    const onClientRawMessageMock = vi.spyOn(chatServer, 'onClientRawMessage').mockImplementation(() => {});
    const onClientCloseMock = vi.spyOn(chatServer, 'onClientClose').mockImplementation(() => {});

    // Run onConnection and test
    chatServer.onConnection(wsServerSide, 'on-connection-test-ip');
    expect(wsServerSide).toHaveProperty('ip');

    expect(wsServerSide.onPongCbs.length).toBeGreaterThan(0);
    expect(wsServerSide.onMessageCbs.length).toBeGreaterThan(0);
    expect(wsServerSide.onCloseCbs.length).toBeGreaterThan(0);

    runAll(wsServerSide.onPongCbs);
    runAll(wsServerSide.onMessageCbs);
    runAll(wsServerSide.onCloseCbs);

    expect(onPongMock).toBeCalled();
    expect(onClientRawMessageMock).toBeCalled();
    expect(onClientCloseMock).toBeCalled();

    // Restore mocks
    onPongMock.mockReset();
    onClientRawMessageMock.mockReset();
    onClientCloseMock.mockReset();
  });

  it('onPong sets isAlive field to true and updates user database when user is logged in', () => {
    const fakeURL = 'ws://chatserver.on-pong-test.logged-in';

    // Set up sockets and server
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);

    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Set up mocks and run tests:
    const testObject: TestObject = { ws: undefined, command: undefined };
    ws1ServerSide.isAlive = false;
    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );
    const updateUserSpy = vi.spyOn(UserHandler, 'updateUserDatabase').mockImplementationOnce(async () => {});

    chatServer.onPong(ws1ServerSide as IWebSocket);

    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('pong');
    expect(ws1ServerSide.isAlive).toBeTruthy();
    expect(permissionSpy).toBeCalled();
    expect(updateUserSpy).toBeCalled(); // Callback was to update user database

    permissionSpy.mockReset();
    updateUserSpy.mockReset();
  });

  it('onPong sets isAlive field to true and does not update user database when user is not logged in', () => {
    const fakeURL = 'ws://chatserver.on-pong-test.not-logged-in';

    // Set up sockets and server
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);

    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Set up mocks and run tests:
    ws1ServerSide.isAlive = false;
    const permissionSpy = vi.spyOn(chatServer, 'runWithPermissions');
    const updateUserSpy = vi.spyOn(UserHandler, 'updateUserDatabase');

    chatServer.onPong(ws1ServerSide as IWebSocket);

    expect(ws1ServerSide.isAlive).toBeTruthy();
    expect(permissionSpy).toBeCalled();
    expect(updateUserSpy).toBeCalledTimes(0); // User has no permissions, should not be called.

    permissionSpy.mockReset();
    updateUserSpy.mockReset();
  });

  it("pingWebSocket runs websocket's ping method", () => {
    const fakeURL = 'ws://chatserver.ping-web-socket';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const pingSpy = vi.spyOn(ws1ServerSide, 'ping').mockImplementationOnce(() => {});

    chatServer.pingWebSocket(ws1ServerSide);

    expect(pingSpy).toBeCalled();
    pingSpy.mockReset();
  });

  it("checkClientConnections runs through server's clients terminates dead sockets, while setting alive ones to dead", () => {
    const fakeURL = 'ws://chatserver.check-client-connections-3-dead-2-alive';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);

    const terminatorSpy = vi.spyOn(chatServer, 'terminateWebSocket').mockImplementation(() => {});
    const pingSocketSpy = vi.spyOn(chatServer, 'pingWebSocket').mockImplementation(() => {});

    // Clients:
    const ws1 = new MockWebSocket(fakeURL, 'ws1');
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;
    ws1ServerSide.isAlive = false;
    const ws2 = new MockWebSocket(fakeURL);
    const ws2ServerSide = wss.socketsClientToServer.get(ws2) as MockWebSocket;
    ws2ServerSide.isAlive = true;
    const ws3 = new MockWebSocket(fakeURL);
    const ws3ServerSide = wss.socketsClientToServer.get(ws3) as MockWebSocket;
    ws3ServerSide.isAlive = true;
    const ws4 = new MockWebSocket(fakeURL);
    const ws4ServerSide = wss.socketsClientToServer.get(ws4) as MockWebSocket;
    ws4ServerSide.isAlive = false;
    const ws5 = new MockWebSocket(fakeURL);
    const ws5ServerSide = wss.socketsClientToServer.get(ws5) as MockWebSocket;
    ws5ServerSide.isAlive = false;

    expect(chatServer.server.clients).toHaveLength(5);

    chatServer.checkClientConnections();

    expect(terminatorSpy).toBeCalledTimes(3);
    expect(pingSocketSpy).toBeCalledTimes(2);
    expect(terminatorSpy.mock.calls).toContainEqual([ws1ServerSide]);
    expect(terminatorSpy.mock.calls).toContainEqual([ws4ServerSide]);
    expect(terminatorSpy.mock.calls).toContainEqual([ws5ServerSide]);
    expect(pingSocketSpy.mock.calls).toContainEqual([ws2ServerSide]);
    expect(pingSocketSpy.mock.calls).toContainEqual([ws3ServerSide]);

    terminatorSpy.mockReset();
    pingSocketSpy.mockReset();
  });

  it('checkClientConnections runs with no effect when no clients', () => {
    const fakeURL = 'ws://chatserver.check-client-connections-0-dead-0-alive';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);

    const terminatorSpy = vi.spyOn(chatServer, 'terminateWebSocket').mockImplementation(() => {});
    const pingSocketSpy = vi.spyOn(chatServer, 'pingWebSocket').mockImplementation(() => {});

    // Clients:
    // No clients.

    expect(chatServer.server.clients).toHaveLength(0);

    chatServer.checkClientConnections();

    expect(terminatorSpy).toBeCalledTimes(0);
    expect(pingSocketSpy).toBeCalledTimes(0);

    terminatorSpy.mockReset();
    pingSocketSpy.mockReset();
  });

  it('terminateWebSocket, if user is logged in, updates user database and removes client from loggedInClients map', async () => {
    const fakeURL = 'ws://chatserver.terminate-websocket-logged-in';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Create spies:
    const fakeUser: User = { id: 'jane@doe.com', username: 'jane doe' };
    const updateSpy = vi.spyOn(UserHandler, 'updateUserDatabase').mockImplementationOnce(async () => {});
    const deleteSpy = vi.spyOn(chatServer.loggedInClients, 'delete').mockImplementationOnce(() => {
      return true;
    });
    const testObject: TestObject = { ws: undefined, command: undefined };
    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(createPermissionsMockImplementation(testObject, fakeUser));

    chatServer.terminateWebSocket(ws1ServerSide);

    expect(permissionSpy).toBeCalled();
    expect(permissionSpy.mock.lastCall?.[0]).toEqual(testObject.ws);
    expect(permissionSpy.mock.lastCall?.[1]).toEqual(testObject.command);
    expect(updateSpy).toBeCalledWith(fakeUser);
    await flushPromises(); // I hope this works
    expect(deleteSpy).toBeCalledWith(ws1ServerSide);
  });

  it('terminateWebSocket, if user has no permissions, has no effect', () => {
    const fakeURL = 'ws://chatserver.terminate-websocket-no-permissions';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Create spies:
    const updateSpy = vi.spyOn(UserHandler, 'updateUserDatabase').mockImplementationOnce(async () => {});
    const deleteSpy = vi.spyOn(chatServer.loggedInClients, 'delete').mockImplementationOnce(() => {
      return true;
    });
    const testObject: TestObject = { ws: undefined, command: undefined };
    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(async (ws: IWebSocket, command: string, _callback: (user: User) => Promise<void>) => {
        testObject.ws = ws;
        testObject.command = command;
        await Promise.resolve(); // This mock does not run callback, as if user did not have permission
      });

    chatServer.terminateWebSocket(ws1ServerSide);

    expect(permissionSpy).toBeCalled();
    expect(permissionSpy.mock.lastCall?.[0]).toEqual(testObject.ws);
    expect(permissionSpy.mock.lastCall?.[1]).toEqual(testObject.command);
    expect(updateSpy).toBeCalledTimes(0);
    expect(deleteSpy).toBeCalledTimes(0);

    permissionSpy.mockReset();
    updateSpy.mockReset();
    deleteSpy.mockReset();
  });

  it('onClientClose sets websocket to dead, and terminates websocket', () => {
    const fakeURL = 'ws://chatserver.on-client-close-test';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const terminatorSpy = vi.spyOn(chatServer, 'terminateWebSocket').mockImplementationOnce(() => {});

    ws1ServerSide.isAlive = true;

    chatServer.onClientClose(ws1ServerSide, -1, Buffer.from('TEST: onCloseClient'));

    expect(ws1ServerSide.isAlive).toBeFalsy();
    expect(terminatorSpy).toBeCalledWith(ws1ServerSide);

    terminatorSpy.mockReset();
  });

  // Not testing onServerError, as all this does is send a debug statement

  // Not testing onServerClose: all it does if flush promises. Method is not exported, so can't test if flushPromises is run.

  it('handleUncaughtError send server_error to client with error', () => {
    const fakeURL = 'ws://chatserver.handle-uncaught-error-test';
    const wss = new MockWebSocketServer(fakeURL);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const sendMock = vi.spyOn(ws1ServerSide, 'send').mockImplementationOnce(() => {});

    handleUncaughtError(ws1ServerSide, 'test error');

    expect(sendMock).toBeCalledTimes(1);
    const sendMockCall = (sendMock.mock.lastCall as string[])[0];
    const parsedObject = toClientCommandSchema.safeParse(sendMockCall);
    expect(parsedObject.success).toBeTruthy();
    if (parsedObject.success) {
      expect(parsedObject.data.command).toEqual('server_error');
      if (parsedObject.data.command === 'server_error') {
        expect(parsedObject.data.data.error_code).toEqual(0); // Internal error code === 0
        expect(parsedObject.data.data).toHaveProperty('message');
        expect((parsedObject.data.data as { message: string }).message).toEqual('test error');
      }
    }
    sendMock.mockReset();
  });
});

////////////////////////////////////////////////////////////
//  ChatServer.runWithPermissions(ws, command, callback)  //
////////////////////////////////////////////////////////////

describe('ChatServer: runWithPermissions', () => {
  it('runWithPermissions looks for a loggedInUser, and runs callback with found user', async () => {
    const fakeURL = 'ws://chatserver.run-with-permission-succesful';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Fake a correct login
    const fakeUser: User = { id: 'james@fake.com', username: 'TheJoker27' };
    const loggedInSpy = vi.spyOn(chatServer.loggedInClients, 'get').mockImplementationOnce(() => {
      return fakeUser;
    });
    const mockCallback = vi.fn();

    await chatServer.runWithPermissions(ws1ServerSide, 'command_needs_permission', mockCallback);

    expect(loggedInSpy).toBeCalledWith(ws1ServerSide);
    expect(mockCallback).toBeCalledWith(fakeUser);
    loggedInSpy.mockReset();
  });

  it('runWithPermissions looks for a loggedInUser, and sends server_error with code 2 when no user found', async () => {
    const fakeURL = 'ws://chatserver.run-with-permission-send-server-error';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Fake no login (just to be sure)
    const loggedInSpy = vi.spyOn(chatServer.loggedInClients, 'get').mockImplementationOnce(() => {
      return undefined;
    });
    const mockCallback = vi.fn();
    const sendMock = vi.spyOn(ws1ServerSide, 'send').mockImplementationOnce(() => {});

    await chatServer.runWithPermissions(ws1ServerSide, 'command_needs_permission', mockCallback);

    expect(loggedInSpy).toBeCalledWith(ws1ServerSide);
    expect(mockCallback).toBeCalledTimes(0); // Make sure that callback was NOT called!
    expect(sendMock).toBeCalledTimes(1);
    const sendMockCall = (sendMock.mock.lastCall as string[])[0];
    const parsedObject = toClientCommandSchema.safeParse(sendMockCall);
    expect(parsedObject.success).toBeTruthy();
    if (parsedObject.success) {
      expect(parsedObject.data.command).toEqual('server_error');
      if (parsedObject.data.command === 'server_error') {
        expect(parsedObject.data.data.error_code).toEqual(2); // Missing permissions code === 2
      }
    }
    loggedInSpy.mockReset();
    sendMock.mockReset();
  });

  it('runWithPermissions looks for a loggedInUser, and sends nothing on ping when no user found', async () => {
    const fakeURL = 'ws://chatserver.run-with-permission-send-nothing-on-ping';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Fake no login (just to be sure)
    const loggedInSpy = vi.spyOn(chatServer.loggedInClients, 'get').mockImplementationOnce(() => {
      return undefined;
    });
    const mockCallback = vi.fn();
    const sendMock = vi.spyOn(ws1ServerSide, 'send').mockImplementationOnce(() => {});

    await chatServer.runWithPermissions(ws1ServerSide, 'ping', mockCallback);

    expect(loggedInSpy).toBeCalledWith(ws1ServerSide);
    expect(mockCallback).toBeCalledTimes(0); // Make sure that callback was NOT called!
    expect(sendMock).toBeCalledTimes(0); // Send should not be called on ping

    loggedInSpy.mockReset();
    sendMock.mockReset();
  });

  it('runWithPermissions looks for a loggedInUser, and sends nothing on pong when no user found', async () => {
    const fakeURL = 'ws://chatserver.run-with-permission-send-nothing-on-pong';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Fake no login (just to be sure)
    const loggedInSpy = vi.spyOn(chatServer.loggedInClients, 'get').mockImplementationOnce(() => {
      return undefined;
    });
    const mockCallback = vi.fn();
    const sendMock = vi.spyOn(ws1ServerSide, 'send').mockImplementationOnce(() => {});

    await chatServer.runWithPermissions(ws1ServerSide, 'pong', mockCallback);

    expect(loggedInSpy).toBeCalledWith(ws1ServerSide);
    expect(mockCallback).toBeCalledTimes(0); // Make sure that callback was NOT called!
    expect(sendMock).toBeCalledTimes(0); // Send should not be called on pong

    loggedInSpy.mockReset();
    sendMock.mockReset();
  });

  it('runWithPermissions looks for a loggedInUser, and sends nothing on disconnect when no user found', async () => {
    const fakeURL = 'ws://chatserver.run-with-permission-send-nothing-on-disconnect';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    // Fake no login (just to be sure)
    const loggedInSpy = vi.spyOn(chatServer.loggedInClients, 'get').mockImplementationOnce(() => {
      return undefined;
    });
    const mockCallback = vi.fn();
    const sendMock = vi.spyOn(ws1ServerSide, 'send').mockImplementationOnce(() => {});

    await chatServer.runWithPermissions(ws1ServerSide, 'disconnect', mockCallback);

    expect(loggedInSpy).toBeCalledWith(ws1ServerSide);
    expect(mockCallback).toBeCalledTimes(0); // Make sure that callback was NOT called!
    expect(sendMock).toBeCalledTimes(0); // Send should not be called on disconnect

    loggedInSpy.mockReset();
    sendMock.mockReset();
  });
});

/////////////////////////////////////////////////////////////
//  ChatServer.onClientRawMessage(ws, rawdata, _isBinary)  //
/////////////////////////////////////////////////////////////

describe('ChatServer: onClientRawMessage', () => {
  it('On bad parse: Sends server_error with code 1', () => {
    const fakeURL = 'ws://chatserver-rawmessage.parsing-error';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    let responseString = '';

    const serverSideSpy = vi.spyOn(ws1ServerSide, 'send').mockImplementationOnce((data) => {
      responseString = data as string;
    });

    const badMessage: RawData = Buffer.from('{"command":"kill_server","data":{"time":"now"}}');

    chatServer.onClientRawMessage(ws1ServerSide, badMessage, false);

    expect(serverSideSpy).toBeCalled();
    const parseResult = toClientCommandSchema.safeParse(responseString);
    expect(parseResult.success).toBeTruthy();
    if (parseResult.success) {
      expect(parseResult.data.command === 'server_error').toBeTruthy();
      if (parseResult.data.command === 'server_error') {
        expect(parseResult.data.data.error_code).toBe(1);
      }
    }
    serverSideSpy.mockReset();
  });

  it('On nickname_change_request: runs UserHandler.updateNickname with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.nickname-change-request';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const updateNicknameSpy = vi.spyOn(UserHandler, 'updateNickname').mockImplementationOnce(async () => {});

    const nicknameChangeData = { nickname: 'jane done' };
    const nicknameChangeMessage = Buffer.from(
      JSON.stringify({
        command: 'nickname_change_request',
        data: nicknameChangeData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, nicknameChangeMessage, false);

    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('nickname_change_request');
    expect(updateNicknameSpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      nicknameChangeData as NicknameChangeRequest,
      chatServer.loggedInClients,
    );
    permissionSpy.mockReset();
    updateNicknameSpy.mockReset();
  });

  it('On request_message_history: runs MessageHandler.messageHistory with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.request-message-history';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const messageHistorySpy = vi.spyOn(MessageHandler, 'messageHistory').mockImplementationOnce(async () => {});

    const messageHistoryData = {
      channel_id: '0',
      amount: 10,
    };
    const messageHistoryMessage = Buffer.from(
      JSON.stringify({
        command: 'request_message_history',
        data: messageHistoryData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, messageHistoryMessage, false);

    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('request_message_history');
    expect(messageHistorySpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      messageHistoryData,
    );
    permissionSpy.mockReset();
    messageHistorySpy.mockReset();
  });

  it('On channel_join_request: runs ChannelHandler.messageHistory with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.channel-join-request';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const joinSpy = vi.spyOn(ChannelHandler, 'onClientJoinChannel').mockImplementationOnce(async () => {});

    const joinRequestData = {
      channel_id: '0',
    };
    const joinRequestMessage = Buffer.from(
      JSON.stringify({
        command: 'channel_join_request',
        data: joinRequestData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, joinRequestMessage, false);

    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('channel_join_request');
    expect(joinSpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      joinRequestData,
    );
    permissionSpy.mockReset();
    joinSpy.mockReset();
  });

  it('On channel_create_request: runs ChannelHandler.onClientCreateChannel with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.channel-create-request';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const createSpy = vi.spyOn(ChannelHandler, 'onClientCreateChannel').mockImplementationOnce(async () => {});

    const createRequestData = {
      name: 'WunkusFanClub',
    };
    const createRequestMessage = Buffer.from(
      JSON.stringify({
        command: 'channel_create_request',
        data: createRequestData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, createRequestMessage, false);

    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('channel_create_request');
    expect(createSpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      createRequestData,
      chatServer.loggedInClients,
    );
    permissionSpy.mockReset();
    createSpy.mockReset();
  });

  it('On channel_leave_request: runs ChannelHandler.onClientLeaveChannel with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.channel-leave-request';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const leaveSpy = vi.spyOn(ChannelHandler, 'onClientLeaveChannel').mockImplementationOnce(async () => {});

    const leaveRequestData = {
      channel_id: '0',
    };
    const leaveRequestMessage = Buffer.from(
      JSON.stringify({
        command: 'channel_leave_request',
        data: leaveRequestData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, leaveRequestMessage, false);

    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('channel_leave_request');
    expect(leaveSpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      leaveRequestData,
      chatServer.loggedInClients,
    );
    permissionSpy.mockReset();
    leaveSpy.mockReset();
  });

  it('On send_message: runs MessageHandler.onClientMessage with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.send-message';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const messageSpy = vi.spyOn(MessageHandler, 'onClientMessage').mockImplementationOnce(async () => {});

    const messageData = {
      msg: 'Hello World! Programmed to work and not to feel! Not even sure that this is real! Hello World!',
      channel: '0',
    };
    const messageMessage = Buffer.from(
      JSON.stringify({
        command: 'send_message',
        data: messageData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, messageMessage, false);

    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('send_message');
    expect(messageSpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      messageData,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      chatServer.loggedInClients,
    );
    permissionSpy.mockReset();
    messageSpy.mockReset();
  });

  it('On lookup_request: runs LookupHandler.onLookupRequest with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.lookup-request';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const lookupSpy = vi.spyOn(LookupHandler, 'onLookupRequest').mockImplementationOnce(async () => {});

    const lookupTime = dateTimeSchema.parse(DateTime.now().toUTC().toISO()); // DateTime parsing works a little... different
    const lookupRequestData = {
      time: lookupTime,
      channel_id: '0',
    };
    const lookupRequestMessage = Buffer.from(
      JSON.stringify({
        command: 'lookup_request',
        data: lookupRequestData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, lookupRequestMessage, false);

    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('lookup_request');
    expect(lookupSpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      lookupRequestData,
    );
    permissionSpy.mockReset();
    lookupSpy.mockReset();
  });

  it('On outgoing_encoded_file: runs FileSharingHandler.onOutgoingEncodedFile with permissions', () => {
    const fakeURL = 'ws://chatserver-rawmessage.outgoing-encoded-file';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const testObject: TestObject = { ws: undefined, command: undefined };

    const permissionSpy = vi
      .spyOn(chatServer, 'runWithPermissions')
      .mockImplementationOnce(
        createPermissionsMockImplementation(testObject, { id: 'jane@doe.com', username: 'jane doe' }),
      );

    const fileSpy = vi.spyOn(FileSharingHandler, 'onOutgoingEncodedFile').mockImplementationOnce(async () => {});

    const tree: [number, string][] = [
      [115, '00'],
      [114, '010'],
      [109, '0110'],
      [32, '0111'],
      [105, '10'],
      [118, '1100'],
      [101, '1101'],
      [3, '1110'],
      [112, '1111'],
    ];
    const fileAfterEncoding = Buffer.from('6820bfe7566ae0', 'hex');

    const encodedFile: HuffmanEncodedFile = {
      huffman_tree: tree,
      encoded_file: fileAfterEncoding.toString('base64'),
    };
    const outgoingFileData: OutgoingEncodedFile = {
      channel_id: '0',
      file: encodedFile,
      file_name: 'doc.txt',
    };

    const outgoingFileMessage = Buffer.from(
      JSON.stringify({
        command: 'outgoing_encoded_file',
        data: outgoingFileData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, outgoingFileMessage, false);
    expect(permissionSpy).toBeCalled();
    expect(testObject.ws).toBe(ws1ServerSide);
    expect(testObject.command).toEqual('outgoing_encoded_file');
    expect(fileSpy).toBeCalledWith(
      ws1ServerSide as IWebSocket,
      { id: 'jane@doe.com', username: 'jane doe' } as User,
      chatServer.loggedInClients,
      outgoingFileData,
    );
    permissionSpy.mockReset();
    fileSpy.mockReset();
  });

  it('On signup_request: runs AuthenticationHandler.onClientSignUp', () => {
    const fakeURL = 'ws://chatserver-rawmessage.signup-request';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const signUpSpy = vi.spyOn(AuthenticationHandler, 'onClientSignUp').mockImplementationOnce(async () => {});

    const signUpRequestData = {
      user: { id: 'jane@doe.com', username: 'jane doe' },
      password: 'TestPassword123',
    };
    const signUpRequestMessage: RawData = Buffer.from(
      JSON.stringify({
        command: 'signup_request',
        data: signUpRequestData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, signUpRequestMessage, false);

    expect(signUpSpy).toBeCalledWith(ws1ServerSide, signUpRequestData, chatServer.loggedInClients);
    signUpSpy.mockReset();
  });

  it('On login_request: runs AuthenticationHandler.onClientLogin', () => {
    const fakeURL = 'ws://chatserver-rawmessage.login-request';
    const wss = new MockWebSocketServer(fakeURL);
    const chatServer = new ChatServer(wss);
    const ws1 = new MockWebSocket(fakeURL);
    const ws1ServerSide = wss.socketsClientToServer.get(ws1) as MockWebSocket;

    const loginSpy = vi.spyOn(AuthenticationHandler, 'onClientLogin').mockImplementationOnce(async () => {});

    const loginRequestData = {
      user: { id: 'jane@doe.com', username: 'jane doe' },
      password: 'TestPassword123',
    };
    const loginRequestMessage: RawData = Buffer.from(
      JSON.stringify({
        command: 'login_request',
        data: loginRequestData,
      } as ToServerCommand),
    );

    chatServer.onClientRawMessage(ws1ServerSide, loginRequestMessage, false);

    expect(loginSpy).toBeCalledWith(ws1ServerSide, loginRequestData, chatServer.loggedInClients);
    loginSpy.mockReset();
  });
});
