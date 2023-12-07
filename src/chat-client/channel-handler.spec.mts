// @author Toon Neyens
// @date 2023-12-04

import type {
  ChannelJoinCompleted,
  ChannelJoinRefused,
  Channel,
  LogInCompleted,
  ChannelLeaveRefused,
  ChannelLeaveCompleted,
  ChannelList,
  ChannelCreateRefused,
  ChannelCreateCompleted,
  MessageHistoryResponse,
} from '../protocol/proto.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import { toServerCommandSchema } from '../protocol/proto.zod.mjs';
import { ChannelHandler } from './channel-handler.mjs';
import { ChatClient, rl } from './chat-client.mjs';
import { Color } from './color-codes.mjs';
import { DateTime } from 'luxon';
import chalk from 'chalk';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Channels', () => {
  it('tests onChannelJoinRefused', () => {
    const data404: ChannelJoinRefused = {
      channel_id: 'general',
      error_code: 404,
      reason: undefined,
    };
    const data405: ChannelJoinRefused = {
      channel_id: 'general',
      error_code: 405,
      reason: undefined,
    };
    const dataDefaultNoReason: ChannelJoinRefused = {
      channel_id: 'general',
      error_code: 406,
      reason: undefined,
    };
    const dataDefault: ChannelJoinRefused = {
      channel_id: 'general',
      error_code: 406,
      reason: 'Other reason',
    };

    let outputLog: unknown;
    vi.spyOn(console, 'log').mockImplementation((data: unknown) => {
      outputLog = data;
    });

    let outputError: unknown;
    vi.spyOn(console, 'error').mockImplementation((data: unknown) => {
      outputError = data;
    });

    ChannelHandler.onChannelJoinRefused(data404);
    expect(outputLog).toEqual(`The channel does not exist`);

    ChannelHandler.onChannelJoinRefused(data405);
    expect(outputLog).toEqual(`You are already in the channel`);

    ChannelHandler.onChannelJoinRefused(dataDefaultNoReason);
    expect(outputError).toEqual(`Unknown error code 406 received with message 'undefined'`);

    ChannelHandler.onChannelJoinRefused(dataDefault);
    expect(outputError).toEqual(`Unknown error code 406 received with message 'Other reason'`);
  });

  it('tests onChannelJoinCompleted', () => {
    const fakeURL = 'ws://fake-url-channels-joincompleted';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client');

    const data: ChannelJoinCompleted = {
      channel: {
        name: 'General',
        id: 'general',
      },
    };

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

    ChatClient.launchApp(ws, userData);

    let output: unknown;
    vi.spyOn(rl, 'setPrompt').mockImplementation((data: unknown) => {
      output = data;
    });

    const result = ChannelHandler.onChannelJoinCompleted(data, ws);

    expect(output).toEqual('[General] > ');
    expect(result).toEqual({
      name: 'General',
      id: 'general',
    });

    expect(wss.data.length).toBe(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('request_message_history');
      if (res.data.command === 'request_message_history') {
        expect(res.data.data).toEqual({
          channel_id: 'general',
          amount: 10,
        });
      }
    }
  });

  it('tests onChannelLeaveRefused', () => {
    const data: ChannelLeaveRefused = {
      channel_id: 'general',
      error_code: 444,
      reason: 'Placeholder reason',
    };

    let output: unknown;
    vi.spyOn(console, 'error').mockImplementation((data: unknown) => {
      output = data;
    });

    ChannelHandler.onChannelLeaveRefused(data);

    expect(output).toEqual("unknown error code 444 received with message 'Placeholder reason'");
  });

  it('tests onChannelLeaveCompleted', () => {
    const data: ChannelLeaveCompleted = {
      channel: {
        name: 'General3',
        id: 'general3',
      },
    };

    const channelList: ChannelList = {
      channels: [
        {
          name: 'General',
          id: 'general',
        },
        {
          name: 'General2',
          id: 'general2',
        },
        {
          name: 'General3',
          id: 'general3',
        },
        {
          name: 'General4',
          id: 'general4',
        },
      ],
    };

    const newChannels = ChannelHandler.onChannelLeaveCompleted(data, channelList);

    expect(newChannels).toEqual({
      channels: [
        {
          name: 'General',
          id: 'general',
        },
        {
          name: 'General2',
          id: 'general2',
        },
        {
          name: 'General4',
          id: 'general4',
        },
      ],
    });
  });

  it('tests onChannelCreateRefused', () => {
    const data: ChannelCreateRefused = {
      channel_name: 'General',
      error_code: 444,
      reason: 'Placeholder reason',
    };

    let output: unknown;
    vi.spyOn(console, 'error').mockImplementation((data: unknown) => {
      output = data;
    });

    ChannelHandler.onChannelCreateRefused(data);

    expect(output).toEqual("unknown error code 444 received with message 'Placeholder reason'");
  });

  it('tests onChannelCreateCompleted', () => {
    const data: ChannelCreateCompleted = {
      channel: {
        name: 'General3',
        id: 'general3',
      },
    };

    const channelList: ChannelList = {
      channels: [
        {
          name: 'General',
          id: 'general',
        },
        {
          name: 'General2',
          id: 'general2',
        },
        {
          name: 'General4',
          id: 'general4',
        },
      ],
    };

    const newChannels = ChannelHandler.onChannelCreateCompleted(data, channelList);

    expect(newChannels).toEqual([
      {
        name: 'General3',
        id: 'general3',
      },
      {
        channels: [
          {
            name: 'General',
            id: 'general',
          },
          {
            name: 'General2',
            id: 'general2',
          },
          {
            name: 'General4',
            id: 'general4',
          },
          {
            name: 'General3',
            id: 'general3',
          },
        ],
      },
    ]);
  });

  it('tests onCreate', () => {
    const fakeURL = 'ws://fake-url-channels-oncreate';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client');

    const channelList: ChannelList = {
      channels: [
        {
          name: 'General',
          id: 'general',
        },
        {
          name: 'General2',
          id: 'general2',
        },
        {
          name: 'General4',
          id: 'general4',
        },
      ],
    };

    let output: unknown;
    vi.spyOn(console, 'log').mockImplementation((data: unknown) => {
      output = data;
    });

    ChannelHandler.onCreate(ws, [], channelList);
    expect(output).toEqual('No channel name provided');

    ChannelHandler.onCreate(ws, ['General'], channelList);
    expect(output).toEqual('Channel already exists');

    vi.spyOn(rl, 'setPrompt').mockImplementation((data: unknown) => {
      output = data;
    });

    ChannelHandler.onCreate(ws, ['General3'], channelList);
    expect(wss.data.length).toBe(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('channel_create_request');
      if (res.data.command === 'channel_create_request') {
        expect(res.data.data).toEqual({
          name: 'General3',
        });
      }
    }
    expect(output).toEqual('[General3] > ');
  });

  it('tests onOpen', () => {
    const fakeURL = 'ws://fake-url-channels-onopen';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client');

    const allChannels: ChannelList = {
      channels: [
        {
          name: 'General',
          id: 'general',
        },
        {
          name: 'General2',
          id: 'general2',
        },
        {
          name: 'General3',
          id: 'general3',
        },
        {
          name: 'General4',
          id: 'general4',
        },
      ],
    };

    const connectedChannels: ChannelList = {
      channels: [
        {
          name: 'General',
          id: 'general',
        },
        {
          name: 'General2',
          id: 'general2',
        },
      ],
    };

    const currentChannel: Channel = {
      name: 'General',
      id: 'general',
    };

    let output: unknown;
    vi.spyOn(Color, 'logError').mockImplementation((data: unknown) => {
      output = data;
    });
    let rlOutput: unknown;

    vi.spyOn(rl, 'setPrompt').mockImplementation((data: unknown) => {
      rlOutput = data;
    });

    let result: Channel | undefined;

    result = ChannelHandler.onOpen(ws, [], allChannels, connectedChannels, currentChannel);
    expect(result).toEqual(currentChannel);
    expect(output).toEqual('No channel name provided');

    result = ChannelHandler.onOpen(ws, ['General'], allChannels, connectedChannels, currentChannel);
    expect(result).toEqual(currentChannel);
    expect(output).toEqual('You are already in this channel');

    result = ChannelHandler.onOpen(
      ws,
      ['nonExistentChannel', 'unused string'],
      allChannels,
      connectedChannels,
      currentChannel,
    );
    expect(result).toEqual(currentChannel);
    expect(output).toEqual('Channel does not exist');

    result = ChannelHandler.onOpen(ws, ['General'], allChannels, connectedChannels, undefined);
    expect(result).toEqual({
      name: 'General',
      id: 'general',
    });
    expect(rlOutput).toEqual('[General] > ');

    expect(wss.data.length).toBe(1);
    let res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('request_message_history');
      if (res.data.command === 'request_message_history') {
        expect(res.data.data).toEqual({
          channel_id: 'general',
          amount: 10,
        });
      }
    }

    const fakeURL2 = 'ws://fake-url-channels-onopen2';
    const wss2 = new MockWebSocketServer(fakeURL2);
    const ws2 = new MockWebSocket(fakeURL2, 'client');

    result = ChannelHandler.onOpen(ws2, ['General3', 'unused string'], allChannels, connectedChannels, currentChannel);
    expect(rlOutput).toEqual('[General3] > ');
    expect(result).toEqual({
      name: 'General3',
      id: 'general3',
    });

    expect(wss2.data.length).toBe(1);
    res = toServerCommandSchema.safeParse(wss2.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('channel_join_request');
      if (res.data.command === 'channel_join_request') {
        expect(res.data.data).toEqual({
          channel_id: 'general3',
        });
      }
    }
  });

  it('tests onClose', () => {
    const currentChannelUndefined = undefined;
    const currentChannel: Channel = {
      name: 'General',
      id: 'general',
    };

    let output: unknown;
    vi.spyOn(console, 'log').mockImplementation((data: unknown) => {
      output = data;
    });

    let result = ChannelHandler.onClose(currentChannelUndefined);
    expect(result).toEqual(undefined);
    expect(output).toEqual('You are not in a channel');

    result = ChannelHandler.onClose(currentChannel);
    expect(result).toEqual(undefined);
  });

  it('tests onMessageHistoryResponse with no messages', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const dataNoMessages: MessageHistoryResponse = {
      channel_id: 'general',
      messages: [],
    };
    ChannelHandler.onMessageHistoryResponse(dataNoMessages);
    expect(logSpy).toHaveBeenCalledWith(chalk.cyanBright('The last 0 message(s) in this channel is/are:'));
  });

  it('tests onMessageHistoryResponse with messages', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const data: MessageHistoryResponse = {
      channel_id: 'general',
      messages: [
        {
          sender: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          msg: 'Hello world!3',
          channel: 'general',
          time: '2023-11-07T15:44:36.134Z',
        },
      ],
    };
    ChannelHandler.onMessageHistoryResponse(data);
    expect(logSpy).toHaveBeenCalledWith(chalk.cyanBright('The last 1 message(s) in this channel is/are:'));
    expect(logSpy).toHaveBeenCalledWith(
      chalk.cyan('jonas.couwberghs@student.kuleuven.be at 2023-11-07 16:44: Hello world!3'),
    );
  });
  it('tests onMessageHistoryResponse with messages with DateTime', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const dataDateTime: MessageHistoryResponse = {
      channel_id: 'general',
      messages: [
        {
          sender: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          msg: 'Hello world!3',
          channel: 'general',
          time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
        },
      ],
    };
    ChannelHandler.onMessageHistoryResponse(dataDateTime);
    expect(logSpy).toHaveBeenCalledWith(chalk.cyanBright('The last 1 message(s) in this channel is/are:'));
    expect(logSpy).toHaveBeenCalledWith(
      chalk.cyan('jonas.couwberghs@student.kuleuven.be at 2023-11-07 20:44: Hello world!3'),
    );
  });
});
