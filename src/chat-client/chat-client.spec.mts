// @author Pieter Vanderschueren, Toon Neyens, Mathias Brosens
// @date 2023-12-03

import type {
  LogInCompleted,
  LogInCompletedCommand,
  LogInRefusedCommand,
  LookupResultCommand,
  MessageReceivedCommand,
  IncomingMessage,
  LookupErrorCommand,
  ChannelJoinCompletedCommand,
  ChannelJoinRefusedCommand,
  ChannelCreateCompletedCommand,
  ChannelCreateRefusedCommand,
  ChannelLeaveCompletedCommand,
  ChannelLeaveRefusedCommand,
  ChannelListCommand,
  MessageSendingErrorCommand,
  SignUpRefusedCommand,
  MessageHistoryResponseCommand,
  MessageHistoryErrorCommand,
  ServerErrorCommand,
  NicknameChangeSuccessCommand,
  SignUpCompleted,
  User,
} from '../protocol/proto.mjs';
import type { RawData } from 'ws';
import { expect, describe, it, vi, afterEach, beforeEach, beforeAll, afterAll } from 'vitest';
import { AuthenticationHandler } from './authentication-handler.mjs';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { MockWebSocket } from '../protocol/__mock__/ws-mock.mjs';
import { ChannelHandler } from './channel-handler.mjs';
import { MessageHandler } from './message-handler.mjs';
import { LookupHandler } from './lookup-handler.mjs';
import { ChatClient } from './chat-client.mjs';
import { Color } from './color-codes.mjs';
import { DateTime } from 'luxon';
import figlet from 'figlet';
import chalk from 'chalk';

const flushGlobals = () => {
  ChatClient.setCurrentChannel(undefined);
  ChatClient.setAllChannels({ channels: [] });
  ChatClient.setConnectedChannels({ channels: [] });
};

beforeAll(() => {
  vi.useFakeTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  flushGlobals();
});

describe('onServerRawMessage', () => {
  it('handles raw server input correctly: LogInCompleted', () => {
    const fakeURL = 'ws://fake-url-chat-client-1';
    const ws1 = new MockWebSocket(fakeURL, 'client-1');

    const logInCompletedCommand: LogInCompletedCommand = {
      command: 'login_completed',
      data: {
        user: {
          id: 'pieter.vanderschueren1@student.kuleuven.be',
        },
        currentChannels: {
          channels: [],
        },
      },
    };

    const rawLogInCompletedCommand: RawData = Buffer.from(JSON.stringify(logInCompletedCommand));

    const logInHandlerSpy = vi.spyOn(AuthenticationHandler, 'onLoginCompleted').mockImplementation(() => {});

    expect(toClientCommandSchema.safeParse(rawLogInCompletedCommand).success).toBeTruthy();

    ChatClient.onServerRawMessage(ws1, rawLogInCompletedCommand);

    expect(logInHandlerSpy).toHaveBeenCalled();
    expect(logInHandlerSpy).toHaveBeenCalledTimes(1);
    expect(logInHandlerSpy).toHaveBeenCalledWith(ws1, logInCompletedCommand.data);
  });

  it('handles raw server input correctly: LogInRefused', () => {
    const fakeURL = 'ws://fake-url-chat-client-2';
    const ws2 = new MockWebSocket(fakeURL, 'client-2');

    const logInRefusedCommand: LogInRefusedCommand = {
      command: 'login_refused',
      data: {
        user: {
          id: 'pieter.vanderschueren1@student.kuleuven.be',
        },
        error_code: 101,
      },
    };
    const rawLogInRefusedCommand: RawData = Buffer.from(JSON.stringify(logInRefusedCommand));

    expect(toClientCommandSchema.safeParse(rawLogInRefusedCommand).success).toBeTruthy();

    const logInHandlerSpy = vi.spyOn(AuthenticationHandler, 'onLoginRefused').mockImplementation(async () => {});

    ChatClient.onServerRawMessage(ws2, rawLogInRefusedCommand);

    expect(logInHandlerSpy).toHaveBeenCalled();
    expect(logInHandlerSpy).toHaveBeenCalledTimes(1);
    expect(logInHandlerSpy).toHaveBeenCalledWith(ws2, logInRefusedCommand.data);
  });

  it('handles raw server input correctly: SignUpRefused', () => {
    const fakeURL = 'ws://fake-url-chat-client-3';
    const ws3 = new MockWebSocket(fakeURL, 'client-3');

    const signupRefusedCommand: SignUpRefusedCommand = {
      command: 'signup_refused',
      data: {
        user: {
          id: 'pieter.vanderschueren1@student.kuleuven.be',
        },
        error_code: 103,
      },
    };
    const rawSignupRefusedCommand: RawData = Buffer.from(JSON.stringify(signupRefusedCommand));

    expect(toClientCommandSchema.safeParse(rawSignupRefusedCommand).success).toBeTruthy();

    const singupHandlerSpy = vi.spyOn(AuthenticationHandler, 'onSignUpRefused').mockImplementation(async () => {});

    ChatClient.onServerRawMessage(ws3, rawSignupRefusedCommand);

    expect(singupHandlerSpy).toHaveBeenCalled();
    expect(singupHandlerSpy).toHaveBeenCalledTimes(1);
    expect(singupHandlerSpy).toHaveBeenCalledWith(ws3, signupRefusedCommand.data);
  });

  it('handles raw server input correctly: ChannelList', () => {
    const fakeURL = 'ws://fake-url-chat-client-4';
    const ws4 = new MockWebSocket(fakeURL, 'client-4');
    const userData = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    const channelListCommand: ChannelListCommand = {
      command: 'channel_list',
      data: {
        channels: [
          {
            name: 'channel-1',
            id: 'channel-1',
          },
          {
            name: 'channel-2',
            id: 'channel-2',
          },
        ],
      },
    };

    const rawChannelListCommand: RawData = Buffer.from(JSON.stringify(channelListCommand));

    expect(toClientCommandSchema.safeParse(rawChannelListCommand).success).toBeTruthy();

    ChatClient.launchApp(ws4, userData);
    ChatClient.onServerRawMessage(ws4, rawChannelListCommand);

    expect(ChatClient.getAllChannels()).toEqual(channelListCommand.data);
  });

  it('handles raw server input correctly: ChannelJoinCompleted', () => {
    const fakeURL = 'ws://fake-url-chat-client-5';
    const ws5 = new MockWebSocket(fakeURL, 'client-5');
    const userData = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    const channelJoinCompletedCommand: ChannelJoinCompletedCommand = {
      command: 'channel_join_completed',
      data: {
        channel: {
          name: 'channel-1',
          id: 'channel-1',
        },
      },
    };

    const rawChannelJoinCompletedCommand: RawData = Buffer.from(JSON.stringify(channelJoinCompletedCommand));

    expect(toClientCommandSchema.safeParse(rawChannelJoinCompletedCommand).success).toBeTruthy();

    const channelJoinCompletedSpy = vi.spyOn(ChannelHandler, 'onChannelJoinCompleted');

    ChatClient.launchApp(ws5, userData);
    ChatClient.onServerRawMessage(ws5, rawChannelJoinCompletedCommand);

    expect(channelJoinCompletedSpy).toHaveBeenCalled();
    expect(channelJoinCompletedSpy).toHaveBeenCalledTimes(1);
    expect(channelJoinCompletedSpy).toHaveBeenCalledWith(channelJoinCompletedCommand.data, ws5);

    expect(ChatClient.getCurrentChannel()).toEqual(channelJoinCompletedCommand.data.channel);

    expect(ChatClient.getAllChannels()).toEqual({ channels: [{ name: 'channel-1', id: 'channel-1' }] });

    expect(ChatClient.getConnectedChannels()).toEqual({ channels: [{ name: 'channel-1', id: 'channel-1' }] });
  });

  it('handles raw server input correctly: ChannelJoinRefused', () => {
    const fakeURL = 'ws://fake-url-chat-client-6';
    const ws6 = new MockWebSocket(fakeURL, 'client-6');
    const userData = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };
    const channelJoinRefusedCommand: ChannelJoinRefusedCommand = {
      command: 'channel_join_refused',
      data: {
        channel_id: 'channel-1',
        error_code: 404,
        reason: undefined,
      },
    };

    const rawChannelJoinRefusedCommand: RawData = Buffer.from(JSON.stringify(channelJoinRefusedCommand));

    expect(toClientCommandSchema.safeParse(rawChannelJoinRefusedCommand).success).toBeTruthy();

    const channelJoinRefusedSpy = vi.spyOn(ChannelHandler, 'onChannelJoinRefused');

    ChatClient.launchApp(ws6, userData);
    ChatClient.onServerRawMessage(ws6, rawChannelJoinRefusedCommand);

    expect(channelJoinRefusedSpy).toHaveBeenCalled();
    expect(channelJoinRefusedSpy).toHaveBeenCalledTimes(1);
    expect(channelJoinRefusedSpy).toHaveBeenCalledWith(channelJoinRefusedCommand.data);
  });

  it('handles raw server input correctly: ChannelCreateCompleted', () => {
    const fakeURL = 'ws://fake-url-chat-client-7';
    const ws7 = new MockWebSocket(fakeURL, 'client-7');
    const userData = {
      user: {
        id: 'pieter.vanderschueren2@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    const channelCreateCompletedCommand: ChannelCreateCompletedCommand = {
      command: 'channel_create_completed',
      data: {
        channel: {
          name: 'channel-1',
          id: 'channel-1',
        },
      },
    };

    const rawChannelCreateCompletedCommand: RawData = Buffer.from(JSON.stringify(channelCreateCompletedCommand));

    expect(toClientCommandSchema.safeParse(rawChannelCreateCompletedCommand).success).toBeTruthy();

    const channelCreateCompletedSpy = vi.spyOn(ChannelHandler, 'onChannelCreateCompleted');

    ChatClient.launchApp(ws7, userData);

    const beforeAllChannels = ChatClient.getAllChannels();

    expect(beforeAllChannels).toEqual({
      channels: [],
    });

    ChatClient.onServerRawMessage(ws7, rawChannelCreateCompletedCommand);

    const afterAllChannels = ChatClient.getAllChannels();

    expect(afterAllChannels).toEqual({
      channels: [
        {
          name: 'channel-1',
          id: 'channel-1',
        },
      ],
    });

    expect(ChatClient.getAllChannels()).toEqual(afterAllChannels);

    expect(channelCreateCompletedSpy).toHaveBeenCalled();
    expect(channelCreateCompletedSpy).toHaveBeenCalledTimes(1);

    expect(channelCreateCompletedSpy).toHaveBeenCalledWith(channelCreateCompletedCommand.data, beforeAllChannels);
  });

  it('handles raw server input correctly: ChannelCreateRefused', () => {
    const fakeURL = 'ws://fake-url-chat-client-8';
    const ws8 = new MockWebSocket(fakeURL, 'client-8');
    const userData = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    const channelCreateRefusedCommand: ChannelCreateRefusedCommand = {
      command: 'channel_create_refused',
      data: {
        channel_name: 'channel-2',
        error_code: 404,
        reason: undefined,
      },
    };

    const rawChannelCreateRefusedCommand: RawData = Buffer.from(JSON.stringify(channelCreateRefusedCommand));

    expect(toClientCommandSchema.safeParse(rawChannelCreateRefusedCommand).success).toBeTruthy();

    const channelCreateRefusedSpy = vi.spyOn(ChannelHandler, 'onChannelCreateRefused');

    ChatClient.launchApp(ws8, userData);

    const beforeAllChannels = ChatClient.getAllChannels();

    ChatClient.onServerRawMessage(ws8, rawChannelCreateRefusedCommand);

    expect(channelCreateRefusedSpy).toHaveBeenCalled();
    expect(channelCreateRefusedSpy).toHaveBeenCalledTimes(1);
    expect(channelCreateRefusedSpy).toHaveBeenCalledWith(channelCreateRefusedCommand.data);

    expect(ChatClient.getAllChannels()).toEqual(beforeAllChannels);
  });

  it('handles raw server input correctly: ChannelLeaveCompleted', () => {
    const fakeURL = 'ws://fake-url-chat-client-9';
    const ws9 = new MockWebSocket(fakeURL, 'client-9');
    const userData = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    const channelLeaveCompletedCommand: ChannelLeaveCompletedCommand = {
      command: 'channel_leave_completed',
      data: {
        channel: {
          name: 'channel-2',
          id: 'channel-2',
        },
      },
    };

    const rawChannelLeaveCompletedCommand: RawData = Buffer.from(JSON.stringify(channelLeaveCompletedCommand));

    expect(toClientCommandSchema.safeParse(rawChannelLeaveCompletedCommand).success).toBeTruthy();

    const channelLeaveCompletedSpy = vi.spyOn(ChannelHandler, 'onChannelLeaveCompleted');

    ChatClient.launchApp(ws9, userData);

    // setting all channels to a different ChannelList to test if the channel is removed from the list
    ChatClient.setAllChannels({
      channels: [
        { name: 'channel-1', id: 'channel-1' },
        { name: 'channel-2', id: 'channel-2' },
      ],
    });

    const beforeAllChannels = ChatClient.getAllChannels();

    expect(beforeAllChannels).toEqual({
      channels: [
        { name: 'channel-1', id: 'channel-1' },
        { name: 'channel-2', id: 'channel-2' },
      ],
    });

    ChatClient.onServerRawMessage(ws9, rawChannelLeaveCompletedCommand);

    const afterAllChannels = ChatClient.getAllChannels();

    expect(afterAllChannels).toEqual({
      channels: [
        {
          name: 'channel-1',
          id: 'channel-1',
        },
      ],
    });

    expect(ChatClient.getAllChannels()).toEqual(afterAllChannels);

    expect(channelLeaveCompletedSpy).toHaveBeenCalled();
    expect(channelLeaveCompletedSpy).toHaveBeenCalledTimes(1);
    expect(channelLeaveCompletedSpy).toHaveBeenCalledWith(channelLeaveCompletedCommand.data, beforeAllChannels);
  });

  it('handles raw server input correctly: ChannelLeaveRefused', () => {
    const fakeURL = 'ws://fake-url-chat-client-10';
    const ws10 = new MockWebSocket(fakeURL, 'client-10');
    const userData = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    const channelLeaveRefusedCommand: ChannelLeaveRefusedCommand = {
      command: 'channel_leave_refused',
      data: {
        channel_id: 'channel-1',
        error_code: 404,
        reason: undefined,
      },
    };

    const rawChannelLeaveRefusedCommand: RawData = Buffer.from(JSON.stringify(channelLeaveRefusedCommand));

    expect(toClientCommandSchema.safeParse(rawChannelLeaveRefusedCommand).success).toBeTruthy();

    const channelLeaveRefusedSpy = vi.spyOn(ChannelHandler, 'onChannelLeaveRefused');

    ChatClient.launchApp(ws10, userData);

    const beforeAllChannels = ChatClient.getAllChannels();

    ChatClient.onServerRawMessage(ws10, rawChannelLeaveRefusedCommand);

    expect(ChatClient.getAllChannels()).toEqual(beforeAllChannels);

    expect(channelLeaveRefusedSpy).toHaveBeenCalled();
    expect(channelLeaveRefusedSpy).toHaveBeenCalledTimes(1);
    expect(channelLeaveRefusedSpy).toHaveBeenCalledWith(channelLeaveRefusedCommand.data);
  });

  it('handles raw server input correctly: MessageReceived', () => {
    const fakeURL = 'ws://fake-url-chat-client-11';
    const ws11 = new MockWebSocket(fakeURL, 'client-11');
    const messageReceivedCommand: MessageReceivedCommand = {
      command: 'message_received',
      data: {
        sender: { id: 'test@test.com' },
        msg: 'test',
        channel: 'test',
        time: DateTime.utc().toISO() || '',
      },
    };

    const rawMessageReceivedCommand: RawData = Buffer.from(JSON.stringify(messageReceivedCommand));

    expect(toClientCommandSchema.safeParse(rawMessageReceivedCommand).success).toBeTruthy();
    const messageReceivedSpy = vi.spyOn(MessageHandler, 'onMessageReceived').mockImplementation(() => {});

    ChatClient.onServerRawMessage(ws11, rawMessageReceivedCommand);

    expect(messageReceivedSpy).toHaveBeenCalled();
    expect(messageReceivedSpy).toHaveBeenCalledTimes(1);

    const messageReceived = {
      sender: messageReceivedCommand.data.sender,
      msg: messageReceivedCommand.data.msg,
      channel: messageReceivedCommand.data.channel,
      time:
        typeof messageReceivedCommand.data.time === 'string'
          ? DateTime.fromISO(messageReceivedCommand.data.time).toUTC()
          : '',
    };

    expect(messageReceivedSpy).toHaveBeenCalledWith(messageReceived);
  });

  it('handles raw server input correctly: messageSendingError', () => {
    const fakeURL = 'ws://fake-url-chat-client-12';
    const ws12 = new MockWebSocket(fakeURL, 'client-12');
    const messageSendingErrorCommand: MessageSendingErrorCommand = {
      command: 'message_sending_error',
      data: {
        error_code: 405,
        reason: "You don't have access to this channel",
      },
    };

    const rawMessageSendingErrorCommand: RawData = Buffer.from(JSON.stringify(messageSendingErrorCommand));

    expect(toClientCommandSchema.safeParse(rawMessageSendingErrorCommand).success).toBeTruthy();
    const messageSendingErrorSpy = vi.spyOn(MessageHandler, 'onMessageSendingError').mockImplementation(() => {});

    ChatClient.onServerRawMessage(ws12, rawMessageSendingErrorCommand);

    expect(messageSendingErrorSpy).toHaveBeenCalled();
    expect(messageSendingErrorSpy).toHaveBeenCalledTimes(1);

    expect(messageSendingErrorSpy).toHaveBeenCalledWith(messageSendingErrorCommand.data);
  });

  it('handles raw server input correctly: LookupResult', () => {
    const fakeURL = 'ws://fake-url-chat-client-13';
    const ws13 = new MockWebSocket(fakeURL, 'client-13');

    const userData: LogInCompleted = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [
          {
            id: 'channel-1',
            name: 'channel-1',
          },
          {
            id: 'channel-2',
            name: 'channel-2',
          },
        ],
      },
    };
    const messages: IncomingMessage[] = [
      {
        sender: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
        msg: 'Hello world!1',
        channel: 'general',
        time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
      },
      {
        sender: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
        msg: 'Hello world!2',
        channel: 'general',
        time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
      },
      {
        sender: {
          id: 'jonas.couwberghs@student.kuleuven.be',
        },
        msg: 'Hello world!3',
        channel: 'general',
        time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
      },
      {
        sender: {
          id: 'jonas.couwberghs@student.kuleuven.be',
        },
        msg: 'Hello world!4',
        channel: 'general',
        time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
      },
    ];
    const lookupResultCommand: LookupResultCommand = {
      command: 'lookup_result',
      data: {
        messages: messages,
        resultIndex: 2,
      },
    };
    const rawLookupResultCommand: RawData = Buffer.from(JSON.stringify(lookupResultCommand));

    expect(toClientCommandSchema.safeParse(rawLookupResultCommand).success).toBeTruthy();

    const lookupHandlerSpy = vi.spyOn(LookupHandler, 'onLookupResult').mockImplementation(() => {});

    ChatClient.launchApp(ws13, userData);
    ChatClient.onServerRawMessage(ws13, rawLookupResultCommand);

    expect(lookupHandlerSpy).toHaveBeenCalled();
    expect(lookupHandlerSpy).toHaveBeenCalledTimes(1);
    expect(lookupHandlerSpy).toHaveBeenCalledWith(lookupResultCommand.data);
  });

  it('handles raw server input correctly: LookupError', () => {
    const fakeURL = 'ws://fake-url-chat-client-14';
    const ws14 = new MockWebSocket(fakeURL, 'client-14');
    const userData: LogInCompleted = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [
          {
            id: 'channel-1',
            name: 'channel-1',
          },
          {
            id: 'channel-2',
            name: 'channel-2',
          },
        ],
      },
    };
    const lookupErrorCommand: LookupErrorCommand = {
      command: 'lookup_error',
      data: {
        error_code: 404,
        reason: 'Channel not found',
      },
    };
    const rawLookupErrorCommand: RawData = Buffer.from(JSON.stringify(lookupErrorCommand));

    expect(toClientCommandSchema.safeParse(rawLookupErrorCommand).success).toBeTruthy();

    const lookupHandlerSpy = vi.spyOn(LookupHandler, 'onLookupError').mockImplementation(() => {});

    ChatClient.launchApp(ws14, userData);
    ChatClient.onServerRawMessage(ws14, rawLookupErrorCommand);

    expect(lookupHandlerSpy).toHaveBeenCalled();
    expect(lookupHandlerSpy).toHaveBeenCalledTimes(1);
    expect(lookupHandlerSpy).toHaveBeenCalledWith(lookupErrorCommand.data);
  });

  it('handles raw server input correctly: MessageHistoryReponse', () => {
    const fakeURL = 'ws://fake-url-chat-client-15';
    const ws15 = new MockWebSocket(fakeURL, 'client-15');
    const messageHistoryResponseCommand: MessageHistoryResponseCommand = {
      command: 'message_history_response',
      data: {
        channel_id: 'general',
        messages: [
          {
            sender: {
              id: 'jonas.couwberghs@student.kuleuven.be',
              username: 'Jonas',
            },
            msg: 'Hello world!1',
            channel: 'general',
            time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
          },
          {
            sender: {
              id: 'jonas.couwberghs@student.kuleuven.be',
              username: 'Jonas',
            },
            msg: 'Hello world!2',
            channel: 'general',
            time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
          },
          {
            sender: {
              id: 'jonas.couwberghs@student.kuleuven.be',
            },
            msg: 'Hello world!3',
            channel: 'general',
            time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
          },
          {
            sender: {
              id: 'jonas.couwberghs@student.kuleuven.be',
            },
            msg: 'Hello world!4',
            channel: 'general',
            time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
          },
        ],
      },
    };

    const rawMessageHistoryResponseCommand: RawData = Buffer.from(JSON.stringify(messageHistoryResponseCommand));

    expect(toClientCommandSchema.safeParse(rawMessageHistoryResponseCommand).success).toBeTruthy();
    const messageHistoryReponseSpy = vi.spyOn(ChannelHandler, 'onMessageHistoryResponse').mockImplementation(() => {});

    ChatClient.onServerRawMessage(ws15, rawMessageHistoryResponseCommand);

    expect(messageHistoryReponseSpy).toHaveBeenCalled();
    expect(messageHistoryReponseSpy).toHaveBeenCalledTimes(1);

    expect(messageHistoryReponseSpy).toHaveBeenCalledWith(messageHistoryResponseCommand.data);
  });

  it('handles raw server input correctly: MessageHistoryError', () => {
    const fakeURL = 'ws://fake-url-chat-client-16';
    const ws16 = new MockWebSocket(fakeURL, 'client-16');
    const messageHistoryErrorCommand: MessageHistoryErrorCommand = {
      command: 'message_history_error',
      data: {
        error_code: 405,
        reason: 'User has no access to this channel and thus neither its message history.',
      },
    };

    const rawMessageHistoryErrorCommand: RawData = Buffer.from(JSON.stringify(messageHistoryErrorCommand));

    expect(toClientCommandSchema.safeParse(rawMessageHistoryErrorCommand).success).toBeTruthy();
    const messageHistoryErrorSpy = vi.spyOn(ChannelHandler, 'onMessageHistoryError').mockImplementation(() => {});

    ChatClient.onServerRawMessage(ws16, rawMessageHistoryErrorCommand);

    expect(messageHistoryErrorSpy).toHaveBeenCalled();
    expect(messageHistoryErrorSpy).toHaveBeenCalledTimes(1);

    expect(messageHistoryErrorSpy).toHaveBeenCalledWith(messageHistoryErrorCommand.data);
  });
  it('handles raw server input correctly: ServerError', () => {
    const fakeURL = 'ws://fake-url-chat-client-17';
    const ws17 = new MockWebSocket(fakeURL, 'client-17');
    const serverErrorCommand: ServerErrorCommand = {
      command: 'server_error',
      data: {
        error_code: 2,
        command: 'server_error',
      },
    };

    const rawServerErrorCommand: RawData = Buffer.from(JSON.stringify(serverErrorCommand));

    expect(toClientCommandSchema.safeParse(rawServerErrorCommand).success).toBeTruthy();
    const serverErrorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    ChatClient.onServerRawMessage(ws17, rawServerErrorCommand);

    expect(serverErrorSpy).toHaveBeenCalled();
    expect(serverErrorSpy).toHaveBeenCalledTimes(1);

    expect(serverErrorSpy).toHaveBeenCalledWith(
      `Server error: ${serverErrorCommand.data.error_code} - contact the administrator`,
    );
  });
  it('handles raw server input correctly: NicknameChangeSucces', () => {
    const fakeURL = 'ws://fake-url-chat-client-18';
    const ws18 = new MockWebSocket(fakeURL, 'client-18');

    const userData = {
      user: {
        id: 'pieter.vanderschueren2@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    const nicknameChangeSuccessCommand: NicknameChangeSuccessCommand = {
      command: 'nickname_change_success',
      data: {
        user: {
          id: 'pieter.vanderschueren1@student.kuleuven.be',
          username: 'Pieter',
        },
      },
    };

    const rawNicknameChangeSuccesCommand: RawData = Buffer.from(JSON.stringify(nicknameChangeSuccessCommand));

    expect(toClientCommandSchema.safeParse(rawNicknameChangeSuccesCommand).success).toBeTruthy();

    ChatClient.launchApp(ws18, userData);

    const oldClientUser = ChatClient.getClient();
    expect(oldClientUser.username).toEqual(undefined);

    ChatClient.onServerRawMessage(ws18, rawNicknameChangeSuccesCommand);
    const currentClientUser = ChatClient.getClient();

    expect(currentClientUser.id).toEqual(oldClientUser.id);
    expect(currentClientUser.username).toEqual('Pieter');
  });
  it('handles raw server input correctly: Default', () => {
    const fakeURL = 'ws://fake-url-chat-client-19';
    const ws19 = new MockWebSocket(fakeURL, 'client-19');

    interface NonExistingCOmmand {
      command: 'I_do_not_exist';
      user: User;
    }

    const nonExistingCommand: NonExistingCOmmand = {
      command: 'I_do_not_exist',
      user: {
        id: 'pieter.vanderschueren2@student.kuleuven.be',
      },
    };

    const rawNonExistingCommand: RawData = Buffer.from(JSON.stringify(nonExistingCommand));

    // expect(toClientCommandSchema.safeParse(rawNonExistingCommand).success).toBeTruthy();
    const commandResponse = toClientCommandSchema.safeParse(rawNonExistingCommand);
    const colorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    ChatClient.onServerRawMessage(ws19, rawNonExistingCommand);

    expect(colorSpy).toHaveBeenCalled();
    expect(colorSpy).toHaveBeenCalledTimes(1);
    if (!commandResponse.success) {
      expect(colorSpy).toHaveBeenCalledWith(commandResponse.error);
    }
  });
});

describe('parseCommand', () => {
  it('parses commands correctly: exit', () => {
    const fakeURL = 'ws://fake-url-chat-client-20';
    const ws20 = new MockWebSocket(fakeURL, 'client-20');

    const exitSpy = vi.spyOn(ChatClient, 'onExit').mockImplementation(() => {});
    const exitCommand = 'exit';

    ChatClient.parseCommand(exitCommand, ws20);

    expect(exitSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('parses commands correctly: send', () => {
    const fakeURL = 'ws://fake-url-chat-client-21';
    const ws21 = new MockWebSocket(fakeURL, 'client-21');

    const sendSpy = vi.spyOn(MessageHandler, 'onSend').mockImplementation(() => {});
    const sendInput = 'send test';
    const sendArgs: string[] = sendInput.split(' ').slice(1);

    ChatClient.parseCommand(sendInput, ws21);

    expect(sendSpy).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(ws21, sendArgs);
  });

  it('parses commands correctly: open', () => {
    const fakeURL = 'ws://fake-url-chat-client-22';
    const ws22 = new MockWebSocket(fakeURL, 'client-22');

    const openSpy = vi.spyOn(ChannelHandler, 'onOpen');
    const openInput = 'open channel-1';
    const openArgs: string[] = openInput.split(' ').slice(1);

    ChatClient.parseCommand(openInput, ws22);

    expect(openSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      ws22,
      openArgs,
      ChatClient.getAllChannels(),
      ChatClient.getConnectedChannels(),
      ChatClient.getCurrentChannel(),
    );
  });

  it('parses commands correctly: create', () => {
    const fakeURL = 'ws://fake-url-chat-client-23';
    const ws23 = new MockWebSocket(fakeURL, 'client-23');

    const openSpy = vi.spyOn(ChannelHandler, 'onCreate');
    const openInput = 'create channel-1';
    const openArgs: string[] = openInput.split(' ').slice(1);

    ChatClient.parseCommand(openInput, ws23);

    expect(openSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(ws23, openArgs, ChatClient.getAllChannels());
  });

  it('parses commands correctly: close', () => {
    const fakeURL = 'ws://fake-url-chat-client-24';
    const ws24 = new MockWebSocket(fakeURL, 'client-24');

    const closeSpy = vi.spyOn(ChannelHandler, 'onClose');
    const closeInput = 'close';

    ChatClient.parseCommand(closeInput, ws24);

    expect(closeSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith(ChatClient.getCurrentChannel());
  });

  it('parses commands correctly: list', () => {
    const fakeURL = 'ws://fake-url-chat-client-25';
    const ws25 = new MockWebSocket(fakeURL, 'client-25');

    const listInput = 'list';
    const logSpy = vi.spyOn(console, 'log');

    ChatClient.parseCommand(listInput, ws25);

    // no channels -> log should not be called
    expect(logSpy).toHaveBeenCalledTimes(0);

    ChatClient.setAllChannels({
      channels: [
        {
          name: 'channel-1',
          id: 'channel-1',
        },
        {
          name: 'channel-2',
          id: 'channel-2',
        },
      ],
    });

    ChatClient.parseCommand(listInput, ws25);

    // multiple channel
    expect(logSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(ChatClient.getAllChannels().channels.length);
  });

  it('parses commands correctly: lookup', () => {
    const fakeURL = 'ws://fake-url-chat-client-26';
    const ws26 = new MockWebSocket(fakeURL, 'client-26');

    const lookupMessageSpy = vi.spyOn(LookupHandler, 'lookupMessage');
    const lookupMessageInput = 'lookup 15:00 22-11-2023';
    const lookupMessageArgs: string[] = lookupMessageInput.split(' ').slice(1);

    ChatClient.parseCommand(lookupMessageInput, ws26);

    expect(lookupMessageSpy).toHaveBeenCalled();
    expect(lookupMessageSpy).toHaveBeenCalledTimes(1);
    expect(lookupMessageSpy).toHaveBeenCalledWith(ws26, lookupMessageArgs.join(' '), undefined);
  });

  it('parses commands correctly: help', () => {
    const fakeURL = 'ws://fake-url-chat-client-27';
    const ws27 = new MockWebSocket(fakeURL, 'client-27');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const helpCommand = 'help';

    ChatClient.parseCommand(helpCommand, ws27);

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      'Commands:\n' +
        'send <message>                   - Send a message to the current channel\n' +
        'nick <username>                  - Change your username\n' +
        'open <channel>                   - Open a channel\n' +
        'create <channel>                 - Create a channel\n' +
        'sendfile <PATH>                  - Send the textfile at PATH to all the users in the current channel. The path can be relative or absolute.\n' +
        `                                   If the file is located in /file-sharing/to-send/ you can just use it's name instead of the entire path.\n` +
        'lookup <HH:mm> <yyyy-MM-dd>      - Gives the closed message to the given time and date, also show a few preceding and following messages.\n' +
        'close                            - Close the current channel\n' +
        'list                             - List all the channels\n' +
        'help                             - Show this help message\n' +
        'exit                             - Exit the application',
    );
  });

  it('returns on empty input', () => {
    const fakeURL = 'ws://fake-url-chat-client-28';
    const ws28 = new MockWebSocket(fakeURL, 'client-28');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const emptyCommand = '';

    ChatClient.parseCommand(emptyCommand, ws28);

    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe('launchApp', () => {
  it('launches the app correctly', () => {
    const fakeURL = 'ws://fake-url-chat-client-29';
    const ws29 = new MockWebSocket(fakeURL, 'client-29');
    const userData: LogInCompleted = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };
    const clearSpy = vi.spyOn(console, 'clear').mockImplementation(() => {});
    const welcomeMessageSpy = vi.spyOn(ChatClient, 'printWelcomeMessage').mockImplementation(() => {});
    const startListeningSpy = vi.spyOn(ChatClient, 'startListening').mockImplementation(() => {});

    ChatClient.launchApp(ws29, userData);

    expect(clearSpy).toHaveBeenCalledTimes(1);

    expect(ChatClient.getClient()).toEqual(userData.user);
    expect(ChatClient.getClient().id).toEqual(userData.user.id);

    expect(welcomeMessageSpy).toHaveBeenCalled();
    expect(welcomeMessageSpy).toHaveBeenCalledTimes(1);
    expect(welcomeMessageSpy).toHaveBeenCalledWith();

    expect(startListeningSpy).toHaveBeenCalled();
    expect(startListeningSpy).toHaveBeenCalledTimes(1);
    expect(startListeningSpy).toHaveBeenCalledWith(ws29);
  });
  it('launches the app with a nickname', () => {
    const appName = 'Hermes';
    const slogan = 'the messenger of the gods';
    const fakeURL = 'ws://fake-url-chat-client-30';
    const ws30 = new MockWebSocket(fakeURL, 'client-30');
    const userData: SignUpCompleted = {
      user: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
        username: 'Pieter',
      },
    };

    const welcomeMessageSpy = vi.spyOn(ChatClient, 'printWelcomeMessage');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    ChatClient.launchApp(ws30, userData);

    expect(welcomeMessageSpy).toHaveBeenCalled();
    expect(welcomeMessageSpy).toHaveBeenCalledTimes(1);
    expect(welcomeMessageSpy).toHaveBeenCalledWith();

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellowBright(
        figlet.textSync(appName, { font: 'Slant', horizontalLayout: 'default', verticalLayout: 'default' }),
      ),
    );
    expect(logSpy).toHaveBeenCalledWith(
      chalk.yellowBright(
        `Welcome to ${slogan}, ${userData.user.username}! Type "help" get a list of all the commands you can use.`,
      ),
    );
  });
});

describe('heartbeat', () => {
  it('Tests if the heartbeat gets returned', () => {
    const consoleError = vi.spyOn(console, 'error');
    const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      return Promise.resolve() as Promise<never>;
    });
    const fakeURL = 'ws://fake-url-chat-client-31';
    const ws31 = new MockWebSocket(fakeURL, 'client-31');
    ChatClient.heartbeat(ws31);

    const pingInterval = 30000;
    const buffer = 3000;

    vi.advanceTimersByTime(pingInterval + buffer);

    expect(consoleError).toBeCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(chalk.red('Closing client because of socket time out'));

    expect(processExit).toBeCalledTimes(1);
    expect(processExit).toHaveBeenCalledWith(0);
  });
});
