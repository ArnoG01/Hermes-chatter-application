// @author Mataro Langeaert, Pieter Vanderschueren
// @date 2023-12-02

import type {
  ChannelCreateCompletedCommand,
  IncomingMessage,
  MessageSendingError,
  OutgoingMessage,
} from '../protocol/proto.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import { toServerCommandSchema } from '../protocol/proto.zod.mjs';
import { MessageHandler } from './message-handler.mjs';
import { ChatClient } from './chat-client.mjs';
import { Color } from './color-codes.mjs';
import { DateTime } from 'luxon';
import chalk from 'chalk';

const flushGlobals = () => {
  ChatClient.setCurrentChannel(undefined);
  ChatClient.setAllChannels({ channels: [] });
  ChatClient.setConnectedChannels({ channels: [] });
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  flushGlobals();
});

describe('MessageHandler', () => {
  it('handles a message received from the server and prints it to the console', () => {
    const fakeURL = 'ws://fake-url-chat-client-1';
    const ws = new MockWebSocket(fakeURL, 'client-2');
    const userData = {
      user: {
        id: 'pieter.vanderschueren2@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };
    ChatClient.launchApp(ws, userData);
    const rightChannelMessage: IncomingMessage = {
      sender: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      time: DateTime.utc().toISO() || '',
      msg: 'test',
      channel: 'channel-1',
    };

    const wrongChannelMessage: IncomingMessage = {
      sender: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      time: DateTime.utc().toISO() || '',
      msg: 'test',
      channel: 'channel-2',
    };

    MessageHandler.onMessageReceived(rightChannelMessage);
    MessageHandler.onMessageReceived(wrongChannelMessage);
    const channelUndefinedLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(channelUndefinedLogSpy).toHaveBeenCalledTimes(0);

    // create a channel
    const channelCreateCompletedCommand: ChannelCreateCompletedCommand = {
      command: 'channel_create_completed',
      data: {
        channel: {
          name: 'channel-1',
          id: 'channel-1',
        },
      },
    };

    ChatClient.onServerRawMessage(ws, Buffer.from(JSON.stringify(channelCreateCompletedCommand)));
    // user is part of channel-1
    expect(ChatClient.getCurrentChannel()).toEqual(channelCreateCompletedCommand.data.channel);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    let time;
    if (rightChannelMessage.time instanceof DateTime) {
      time = rightChannelMessage.time.toFormat('HH:mm:ss');
    } else {
      time = rightChannelMessage.time;
    }

    const logMessage = `${rightChannelMessage.sender.id} at ${time}: ${rightChannelMessage.msg}`;

    MessageHandler.onMessageReceived(rightChannelMessage);

    expect(logSpy).toHaveBeenCalledWith(chalk.cyan(logMessage));

    MessageHandler.onMessageReceived(wrongChannelMessage);

    const wrongChannelLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(wrongChannelLogSpy).toHaveBeenCalledTimes(0);
  });

  it('handles a message received from the server and prints it to the console', () => {
    const fakeURL = 'ws://fake-url-chat-client-1';
    const ws = new MockWebSocket(fakeURL, 'client-2');
    const userData = {
      user: {
        id: 'pieter.vanderschueren2@student.kuleuven.be',
      },
      currentChannels: {
        channels: [
          {
            name: 'channel-1',
            id: 'channel-1',
          },
        ],
      },
    };

    ChatClient.launchApp(ws, userData);

    const channelMessage: IncomingMessage = {
      sender: {
        id: 'pieter.vanderschueren1@student.kuleuven.be',
      },
      time: DateTime.fromISO('2023-11-07T19:44:36.134Z', { setZone: true }),
      msg: 'test',
      channel: 'channel-1',
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const channelCreateCompletedCommand: ChannelCreateCompletedCommand = {
      command: 'channel_create_completed',
      data: {
        channel: {
          name: 'channel-1',
          id: 'channel-1',
        },
      },
    };

    ChatClient.onServerRawMessage(ws, Buffer.from(JSON.stringify(channelCreateCompletedCommand)));

    MessageHandler.onMessageReceived(channelMessage);
    expect(logSpy).toHaveBeenCalledWith(chalk.cyan(`${channelMessage.sender.id} at 20:44:36: ${channelMessage.msg}`));
  });

  it('processes the user input and sends a message to the server', () => {
    const fakeURL = 'ws://fake-url-chat-client-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-2');
    const userData = {
      user: {
        id: 'pieter.vanderschueren2@student.kuleuven.be',
      },
      currentChannels: {
        channels: [],
      },
    };

    ChatClient.launchApp(ws, userData);

    const colorErrorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});
    const message: string[] = ['test', 'message'];

    MessageHandler.onSend(ws, message);

    expect(colorErrorSpy).toHaveBeenCalledWith('You are not in a channel');

    // create a channel
    const channelCreateCompletedCommand: ChannelCreateCompletedCommand = {
      command: 'channel_create_completed',
      data: {
        channel: {
          name: 'channel-1',
          id: 'channel-1',
        },
      },
    };

    ChatClient.onServerRawMessage(ws, Buffer.from(JSON.stringify(channelCreateCompletedCommand)));

    // user is part of channel-1
    expect(ChatClient.getCurrentChannel()).toEqual(channelCreateCompletedCommand.data.channel);

    const emptyMessage: string[] = [];
    const colorErrorSpy2 = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    MessageHandler.onSend(ws, emptyMessage);
    expect(colorErrorSpy2).toHaveBeenCalledWith('No message provided');

    const sentMessage: OutgoingMessage = {
      msg: message.join(' '),
      channel: 'channel-1',
    };

    MessageHandler.onSend(ws, message);

    expect(wss.data.length).toBe(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('send_message');
      if (res.data.command === 'send_message') {
        expect(res.data.data).toEqual(sentMessage);
      }
    }
  });
  it('test console.error on MessageError', () => {
    let output: unknown;
    vi.spyOn(console, 'error').mockImplementation((data: unknown) => {
      output = data;
    });

    const messageSendingError: MessageSendingError = {
      error_code: 405,
      reason: "You don't have access to this channel",
    };

    MessageHandler.onMessageSendingError(messageSendingError);

    expect(output).toEqual("You don't have access to this channel");
  });
});
