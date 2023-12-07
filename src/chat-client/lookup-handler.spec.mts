// author: Toon Neyens
// date: 2023-12-01

import type { LookupResult, LookupError, Channel, IncomingMessage } from '../protocol/proto.mjs';
import { MockWebSocket } from '../protocol/__mock__/ws-mock.mjs';
import { expect, describe, it, vi, afterEach } from 'vitest';
import { LookupHandler } from './lookup-handler.mjs';
import { DateTime } from 'luxon';

afterEach(() => {
  vi.clearAllMocks();
});

describe('lookup-handler', () => {
  const channel: Channel = {
    name: 'general',
    id: 'channel1',
  };

  it('Fails on wrong date format', () => {
    const fakeURL = 'ws://fake-url-lookup-handler';
    const ws = new MockWebSocket(fakeURL, 'client-1');

    let output: unknown;
    vi.spyOn(console, 'error').mockImplementation((data: unknown) => {
      output = data;
    });

    LookupHandler.lookupMessage(ws, '15:00 2023-10-26', channel);
    expect(output).toEqual('Invalid date format. Please use the format "HH:mm dd-MM-yyyy"');

    LookupHandler.lookupMessage(ws, '2023-10-26', channel);
    expect(output).toEqual('Invalid date format. Please use the format "HH:mm dd-MM-yyyy"');

    LookupHandler.lookupMessage(ws, '15:00', channel);
    expect(output).toEqual('Invalid date format. Please use the format "HH:mm dd-MM-yyyy"');

    LookupHandler.lookupMessage(ws, '2023-10-26 15:00', channel);
    expect(output).toEqual('Invalid date format. Please use the format "HH:mm dd-MM-yyyy"');

    LookupHandler.lookupMessage(ws, '15:00 2023-26-10', channel);
    expect(output).toEqual('Invalid date format. Please use the format "HH:mm dd-MM-yyyy"');

    LookupHandler.lookupMessage(ws, '15:00 2023-26-26', channel);
    expect(output).toEqual('Invalid date format. Please use the format "HH:mm dd-MM-yyyy"');
  });

  it('fails on undefined channel', () => {
    const fakeURL = 'ws://fake-url-lookup-handler';
    const ws = new MockWebSocket(fakeURL, 'client-2');

    let output: unknown;
    vi.spyOn(console, 'error').mockImplementation((data: unknown) => {
      output = data;
    });

    LookupHandler.lookupMessage(ws, '15:00 22-11-2023', undefined);
    expect(output).toEqual('Enter a channel to perform a message lookup');
  });

  it('Succeeds on right date format', () => {
    const fakeURL = 'ws://fake-url-lookup-handler';
    const ws = new MockWebSocket(fakeURL, 'client-3');

    expect(() => LookupHandler.lookupMessage(ws, '15:00 22-11-2023', channel)).not.toThrowError();
  });

  it('displays received messages using onLookupResult', () => {
    const messages: IncomingMessage[] = [
      {
        sender: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: undefined,
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
        time: '2023-11-07T14:44:36.134Z',
      },
      {
        sender: {
          id: 'jonas.couwberghs@student.kuleuven.be',
        },
        msg: 'Hello world!3',
        channel: 'general',
        time: '2023-11-07T15:44:36.134Z',
      },
      {
        sender: {
          id: 'jonas.couwberghs@student.kuleuven.be',
        },
        msg: 'Hello world!4',
        channel: 'general',
        time: '2023-11-07T18:44:36.134Z',
      },
    ];
    const lookupResult: LookupResult = {
      messages: messages,
      resultIndex: 2,
    };

    let output: unknown[] = [];
    vi.spyOn(console, 'log').mockImplementation((...data: unknown[]) => {
      output = output.concat(data);
    });

    LookupHandler.onLookupResult(lookupResult);

    expect(output).toEqual([
      'Lookup result',
      '----------------------',
      '2023-11-07 20:44:36 jonas.couwberghs@student.kuleuven.be: Hello world!1',
      '2023-11-07 15:44:36 Jonas: Hello world!2',
      '>>> 2023-11-07 16:44:36 jonas.couwberghs@student.kuleuven.be: Hello world!3',
      '2023-11-07 19:44:36 jonas.couwberghs@student.kuleuven.be: Hello world!4',
      '----------------------',
    ]);
  });

  it('test console.error on LookupError', () => {
    let output: unknown;
    vi.spyOn(console, 'error').mockImplementation((data: unknown) => {
      output = data;
    });

    const lookupError: LookupError = {
      error_code: 404,
      reason: 'Channel not found',
    };

    LookupHandler.onLookupError(lookupError);

    expect(output).toEqual('Channel not found');
  });
});
