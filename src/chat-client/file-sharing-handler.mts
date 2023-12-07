// @author Thomas Truijen
// @date 2023-12-01

import type {
  HuffmanEncodedFile,
  OutgoingEncodedFileCommand,
  OutgoingEncodedFile,
  Channel,
  IncomingEncodedFile,
} from '../protocol/proto.mjs';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import { HuffmanEncoding } from '../lib/huffman/huffman.mjs';
import { clearLine, moveCursor } from 'readline';
import { Color } from './color-codes.mjs';
import { rl } from './chat-client.mjs';
import { promises } from 'fs';
import * as path from 'path';
import Debug from 'debug';
import chalk from 'chalk';
import * as fs from 'fs';

const debug = Debug('chatter:file-sharing-handler');
export const MAX_SIZE_BYTES = 1024 * 1024 * 5;

export const FileSharingHandler = {
  sendEncodedFile,
  onEncodedFile,
};

/**
 * Checks if the provided file:
 *  - exists.
 *  - a textfile is.
 *  - within the size limit.
 *
 * @param filePath - location of file
 * @returns  On succes it returns the buffer of the to send file.
 *           On fail it logs the error reason and returns an empty buffer.
 */
function loadTextFileBuffer(filePath: string): Buffer {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    if (ext !== '.txt') {
      clearLine(process.stdout, 0);
      moveCursor(process.stdout, -1000, 0);
      Color.logError('The file is not a .txt file.');
      return Buffer.alloc(0);
    }
    const fileSize = stats.size;
    if (fileSize > MAX_SIZE_BYTES) {
      clearLine(process.stdout, 0);
      moveCursor(process.stdout, -1000, 0);
      Color.logError(`The file is bigger than ${MAX_SIZE_BYTES} bytes.`);
      return Buffer.alloc(0);
    }
    return fs.readFileSync(filePath);
  } catch (err) {
    debug(err);
    clearLine(process.stdout, 0);
    moveCursor(process.stdout, -1000, 0);
    Color.logError(
      'The provided path does not exist. Try placing the textfile in /file-sharing/to-send/ and executing the command sendfile <fileName.txt>.',
    );
    return Buffer.alloc(0);
  }
}
/**
 * The handler for the `sendfile <PATH>` command.
 *
 * @param ws - the websocket for sending the file
 * @param args - this should only have one argument: the absolute or relative path to the text file.
 *               When only a file name is given, the dedicated directory /file-sharing/to-send/ is searched.
 * @param channel - the channel in which the `sendfile` command was sent.
 * @returns On succes, sends the server an OutgoingEncodedFileCommand
 */
function sendEncodedFile(ws: IWebSocket, args: string[], channel: Channel | undefined) {
  // safety checks
  if (!channel || !channel.id) {
    clearLine(process.stdout, 0);
    moveCursor(process.stdout, -1000, 0);
    Color.logError('To send a file you must be have a channel open.');
    return;
  }
  if (!args[0]) {
    clearLine(process.stdout, 0);
    moveCursor(process.stdout, -1000, 0);
    Color.logError('Not a valid path.');
    return;
  }
  const filePath = getFilePath(args[0]);

  const fileBuffer = loadTextFileBuffer(filePath);
  if (fileBuffer.length <= 0) {
    return;
  }

  const outgoingCommand: OutgoingEncodedFileCommand = encodeAndPackage(fileBuffer, filePath, channel);
  console.log(chalk.green('Encoding succesfull! Sending file...'));
  ws.send(JSON.stringify(outgoingCommand));
}

/**
 * Encodes an file and creates an instance of OutgoingEncodedFileCommand
 *
 * @param fileBuffer - buffer of a textfile
 * @param filePath - the path to `fileBuffer`
 * @param channel - the channel where the file is being send.
 * @returns an filled in OutgoingEncodedFileCommand interface which is ready to be send.
 */
function encodeAndPackage(fileBuffer: Buffer, filePath: string, channel: Channel) {
  const huffman = HuffmanEncoding.buildEncodingFromFile(fileBuffer);
  const tree = huffman.encoding;
  const file = huffman.encode(fileBuffer).toString('base64');

  const huff: HuffmanEncodedFile = {
    huffman_tree: tree,
    encoded_file: file,
  };
  const fileName = path.basename(filePath);
  const outgoingFile: OutgoingEncodedFile = {
    channel_id: channel.id,
    file: huff,
    file_name: fileName,
  };
  const outgoingCommand: OutgoingEncodedFileCommand = {
    command: 'outgoing_encoded_file',
    data: outgoingFile,
  };
  return outgoingCommand;
}

/**
 * Gets called when some receives an incoming IncomingEncodedFile from the server in a certain Channel.
 *
 * @param file - the IncomingEncodedFile.
 * @param channel - the channel in which the user received the file.
 * @returns On succes it decodes and saves the file.
 */
export function onEncodedFile(file: IncomingEncodedFile, channel: Channel | undefined) {
  if (!channel) {
    clearLine(process.stdout, 0);
    moveCursor(process.stdout, -1000, 0);
    Color.logError('Not connected to a valid channel.');
    return;
  }
  if (channel.id !== file.channel_id) {
    clearLine(process.stdout, 0);
    moveCursor(process.stdout, -1000, 0);
    Color.logError('channel-id does not match.');
    return;
  }

  const huffman = new HuffmanEncoding(file.file.huffman_tree);
  const encoded = Buffer.from(file.file.encoded_file, 'base64');
  const decodedBuffer = huffman.decode(encoded);
  //TODO: add UFID to file name so there cant be a race condition!
  const fileName = generateUniqueFileName(file);
  promises
    .writeFile(`file-sharing/received/${fileName}`, decodedBuffer)
    .then(() => {
      clearLine(process.stdout, 0);
      moveCursor(process.stdout, -1000, 0);
      console.log(
        chalk.cyan.bold(
          `Received ${file.file_name} from ${file.user.username}, you can find it at /file-sharing/received/${fileName}`,
        ),
      );
      rl.prompt(true);
      return;
    })
    .catch((err) => {
      console.error(err);
      return;
    });
}

/**
 * It checks if `file-sharing/received/<incomingFile>` already exists.
 * Makes the name unique by adding a `(number)` to it.
 *
 * @param file - the IncomingEncodedFile
 * @returns `<filename>(number).txt` which is unique under `file-sharing/received`
 */
function generateUniqueFileName(file: IncomingEncodedFile): string {
  let fileName = file.file_name;
  if (fs.existsSync(`file-sharing/received/${fileName}`)) {
    let fileNumber = 1;
    const fileParts = file.file_name.split('.');
    const fileExtension = fileParts.pop();
    const fileBaseName = fileParts.join('.');
    while (fs.existsSync(`file-sharing/received/${fileName}`)) {
      fileName = `${fileBaseName}(${fileNumber}).${fileExtension}`;
      fileNumber++;
    }
  } else {
    fileName = file.file_name;
  }
  return fileName;
}

/**
 * When called with just a name of a textfile, the name gets prepended with the path of the dedicated to-send directory
 *
 * @param filePath the provided path argument of `sendfile <PATH>`
 * @returns the entire path to the file.
 */
function getFilePath(filePath: string): string {
  if (path.isAbsolute(filePath) || isRelative(filePath)) {
    return filePath;
  }
  return `file-sharing/to-send/${filePath}`;
}

/**
 * @param filePath - location of file
 * @returns a boolean to determine if a path is relative or not.
 */
function isRelative(filePath: string): boolean {
  return filePath.includes('/') || filePath.includes('\\');
}
