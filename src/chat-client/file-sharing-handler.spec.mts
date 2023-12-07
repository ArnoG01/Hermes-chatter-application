// @author: Thomas Truijen
// @date: 2023-12-03

import type { HuffmanEncodedFile, Channel, IncomingEncodedFile, User } from '../protocol/proto.mjs';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { toServerCommandSchema } from '../protocol/proto.zod.mjs';
import { FileSharingHandler } from './file-sharing-handler.mjs';
import { MAX_SIZE_BYTES } from './file-sharing-handler.mjs';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Color } from './color-codes.mjs';
import { promises } from 'fs';

describe('FileSharingHandler', () => {
  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should encode and send a textfile from a given path', () => {
    const fakeURL = 'ws://fake-url-send-file-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL);
    const channel: Channel = {
      name: 'huffman-test',
      id: '1337',
    };
    FileSharingHandler.sendEncodedFile(ws, ['assets/textfiles-huffman/mississippi-river.txt'], channel);

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

    expect(wss.data).toHaveLength(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('outgoing_encoded_file');
      if (command.command === 'outgoing_encoded_file') {
        expect(command.data).toEqual({
          channel_id: channel.id,
          file: encodedFile,
          file_name: 'mississippi-river.txt',
        });
      }
    }
  });
  it('logs an error when trying to encode something that is not allowed', () => {
    const fakeURL = 'ws://fake-url-send-file-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL);

    const channel: Channel = {
      name: 'huffman-test',
      id: '1337',
    };
    const colorLogErrorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    FileSharingHandler.sendEncodedFile(ws, ['/this/path/doesnt/exist.txt'], channel);
    expect(colorLogErrorSpy).toBeCalledTimes(1);
    expect(colorLogErrorSpy).toBeCalledWith(
      'The provided path does not exist. Try placing the textfile in /file-sharing/to-send/ and executing the command sendfile <fileName.txt>.',
    );

    expect(wss.data).toHaveLength(0);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res.success).toBeFalsy();

    FileSharingHandler.sendEncodedFile(ws, ['assets/mississippi-river.jpg'], channel);
    expect(colorLogErrorSpy).toBeCalledTimes(2);
    expect(colorLogErrorSpy).toBeCalledWith('The file is not a .txt file.');

    FileSharingHandler.sendEncodedFile(ws, ['assets/textfiles-huffman/shakespeare.txt'], channel);
    expect(colorLogErrorSpy).toBeCalledTimes(3);
    expect(colorLogErrorSpy).toBeCalledWith(`The file is bigger than ${MAX_SIZE_BYTES} bytes.`);

    FileSharingHandler.sendEncodedFile(ws, ['assets/textfiles-huffman/shakespeare.txt'], undefined);
    expect(colorLogErrorSpy).toBeCalledTimes(4);
    expect(colorLogErrorSpy).toBeCalledWith('To send a file you must be have a channel open.');

    FileSharingHandler.sendEncodedFile(ws, [], channel);
    expect(colorLogErrorSpy).toBeCalledTimes(5);
    expect(colorLogErrorSpy).toBeCalledWith('Not a valid path.');
  });
  it('can send a file from the dedicated directory', () => {
    const fakeURL = 'ws://fake-url-send-file-3';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL);

    const channel: Channel = {
      name: 'huffman-test',
      id: '1337',
    };
    FileSharingHandler.sendEncodedFile(ws, ['default.txt'], channel);
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

    expect(wss.data).toHaveLength(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command = res.data;
      expect(command.command).toBe('outgoing_encoded_file');
      if (command.command === 'outgoing_encoded_file') {
        expect(command.data).toEqual({
          channel_id: channel.id,
          file: encodedFile,
          file_name: 'default.txt',
        });
      }
    }
  });
  it('can decode an incoming files', () => {
    const file: HuffmanEncodedFile = {
      huffman_tree: [
        [115, '00'],
        [114, '010'],
        [109, '0110'],
        [32, '0111'],
        [105, '10'],
        [118, '1100'],
        [101, '1101'],
        [3, '1110'],
        [112, '1111'],
      ],
      encoded_file: Buffer.from('6820bfe7566ae0', 'hex').toString('base64'),
    };
    const sender: User = {
      id: '1234567890',
      username: 'DavidAlbertHuffman',
    };
    const sentFileName = 'thisIsTheDecodingTest.txt';
    const input: IncomingEncodedFile = {
      user: sender,
      channel_id: '1337',
      file: file,
      file_name: sentFileName,
    };
    const channel: Channel = {
      name: 'huffman-test',
      id: '1337',
    };

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });
    FileSharingHandler.onEncodedFile(input, channel);
    expect(paths[0]).toEqual('file-sharing/received/thisIsTheDecodingTest.txt');
    expect(contents[0]?.toString()).toEqual('mississippi river');

    const input2: IncomingEncodedFile = {
      user: sender,
      channel_id: '1337',
      file: file,
      file_name: 'default.txt',
    };

    FileSharingHandler.onEncodedFile(input2, channel);
    expect(paths[1]).toEqual('file-sharing/received/default(1).txt');
    expect(contents[0]?.toString()).toEqual('mississippi river');

    expect(writeFileSpy).toHaveBeenCalledTimes(2);
  });
  it('it logs an error when something went wrong', () => {
    const fileToSend = Buffer.from('6820bfe7566ae0', 'hex');
    const file: HuffmanEncodedFile = {
      huffman_tree: [
        [115, '00'],
        [114, '010'],
        [109, '0110'],
        [32, '0111'],
        [105, '10'],
        [118, '1100'],
        [101, '1101'],
        [3, '1110'],
        [112, '1111'],
      ],
      encoded_file: fileToSend.toString('base64'),
    };
    const sender: User = {
      id: '1234567890',
      username: 'DavidAlbertHuffman',
    };
    const sentFileName = 'thisIsTheDecodingTest.txt';
    const input: IncomingEncodedFile = {
      user: sender,
      channel_id: '1337',
      file: file,
      file_name: sentFileName,
    };
    const wrongChannel: Channel = {
      name: 'huffman-test',
      id: 'WRONG CHANNEL',
    };

    const paths: string[] = [];
    const contents: string[] = [];

    const writeFileSpy = vi.spyOn(promises, 'writeFile').mockImplementation(async (file, data) => {
      paths.push(file as string);
      contents.push(data as string);
      return Promise.resolve();
    });
    FileSharingHandler.onEncodedFile(input, wrongChannel);
    const colorLogErrorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    FileSharingHandler.onEncodedFile(input, undefined);
    expect(colorLogErrorSpy).toBeCalledTimes(1);
    expect(colorLogErrorSpy).toBeCalledWith('Not connected to a valid channel.');

    FileSharingHandler.onEncodedFile(input, wrongChannel);
    expect(colorLogErrorSpy).toBeCalledTimes(2);
    expect(colorLogErrorSpy).toBeCalledWith('channel-id does not match.');

    expect(writeFileSpy).toHaveBeenCalledTimes(0);
  });
});
