// @author Mataro Langeaert, Pieter Vanderschueren
// @date 2023-12-02

import type { IncomingMessage, MessageSendingError, OutgoingMessage, SendMessageCommand } from '../protocol/proto.mjs';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import { ChatClient, rl } from './chat-client.mjs';
import { clearLine, moveCursor } from 'readline';
import { Color } from './color-codes.mjs';
import { DateTime } from 'luxon';
import Debug from 'debug';
import chalk from 'chalk';

const debug = Debug('chatter:message-handler');

export const MessageHandler = {
  onMessageReceived,
  onSend,
  onMessageSendingError,
};

/**
 * Handles a message received from the server and prints it to the console
 *
 * @param message - message which is received from the server
 */
function onMessageReceived(message: IncomingMessage) {
  debug('onMessageReceived received');
  const currentChannel = ChatClient.getCurrentChannel();
  if (currentChannel !== undefined && message.channel === currentChannel.id) {
    const senderId = message.sender.username || message.sender.id;
    const messageContent = message.msg;
    let timeString;
    if (message.time instanceof DateTime) {
      timeString = message.time.toLocal().toFormat('HH:mm:ss');
    } else {
      timeString = message.time;
    }
    // clear the line and print the message
    clearLine(process.stdout, 0);
    moveCursor(process.stdout, -1000, 0);
    const logMessage = `${senderId} at ${timeString}: ${messageContent}`;
    console.log(chalk.cyan(logMessage));
    rl.prompt(true);
  }
}

/**
 * Processes the user input and sends a message to the server
 *
 * @param ws - websocket which is used to send and receive messages
 * @param args - arguments which are provided by the user
 */
function onSend(ws: IWebSocket, args: string[]) {
  debug('onSend received');
  const currentChannel = ChatClient.getCurrentChannel();
  const message = args.join(' ');
  if (!currentChannel) {
    Color.logError('You are not in a channel');
    return;
  }
  if (!message) {
    Color.logError('No message provided');
    return;
  }
  const messageToSend: OutgoingMessage = {
    msg: message,
    channel: currentChannel.id,
  };
  // clear current line above
  moveCursor(process.stdout, 0, -1);
  clearLine(process.stdout, 0);
  ws.send(
    JSON.stringify({
      command: 'send_message',
      data: messageToSend,
    } as SendMessageCommand),
  );
}

/**
 * Handles the error when a message sending request fails
 *
 * @param data - contains the error code and error reason for the message sending request fail
 */
function onMessageSendingError(data: MessageSendingError) {
  debug(`Lookup error: ${data.error_code} - ${data.reason}`);
  console.error(data.reason);
}
