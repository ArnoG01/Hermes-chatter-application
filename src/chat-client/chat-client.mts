// @author Mataro Langeaert, Pieter Vanderschueren
// @date 2023-12-02

import type {
  ChannelList,
  LogInCompleted,
  ToClientCommand,
  Channel,
  User,
  SignUpCompleted,
} from '../protocol/proto.mjs';
import type { RawData } from 'ws';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import { AuthenticationHandler } from './authentication-handler.mjs';
import { toClientCommandSchema } from '../protocol/proto.zod.mjs';
import { FileSharingHandler } from './file-sharing-handler.mjs';
import { NicknameHandler } from './nickname-handler.mjs';
import { ChannelHandler } from './channel-handler.mjs';
import { MessageHandler } from './message-handler.mjs';
import { LookupHandler } from './lookup-handler.mjs';
import { clearLine, moveCursor } from 'readline';
import { Color } from './color-codes.mjs';
import readline from 'readline/promises';
import figlet from 'figlet';
import Debug from 'debug';
import chalk from 'chalk';

// List of all the commands the user can enter in the chat
export enum Commands {
  SEND = 'send',
  EXIT = 'exit',
  OPEN = 'open',
  CREATE = 'create',
  CLOSE = 'close',
  LIST = 'list',
  HELP = 'help',
  LOOKUP = 'lookup',
  NICK = 'nick',
  SENDFILE = 'sendfile',
}

export let rl: readline.Interface;
let client: User;
let currentChannel: Channel | undefined;
let allChannels: ChannelList = { channels: [] };
let connectedChannels: ChannelList = { channels: [] };
const appName = 'Hermes';
const slogan = 'the messenger of the gods';
const debug = Debug('chatter:chat-client');

export const ChatClient = {
  onServerRawMessage,
  parseCommand,
  launchApp,
  heartbeat,
  startListening,
  onExit,
  getClient,
  printWelcomeMessage,
  getCurrentChannel,
  setCurrentChannel,
  getAllChannels,
  setAllChannels,
  getConnectedChannels,
  setConnectedChannels,
};

/**
 * Function which handles the raw input from the server
 *
 * @param ws - websocket which is used to send and receive messages
 * @param data - data which is received from the server
 */
function onServerRawMessage(ws: IWebSocket, data: RawData) {
  const commandResponse = toClientCommandSchema.safeParse(data);
  if (commandResponse.success) {
    const command: ToClientCommand = commandResponse.data;
    switch (command.command) {
      case 'login_completed':
        connectedChannels = command.data.currentChannels;
        AuthenticationHandler.onLoginCompleted(ws, command.data);
        break;
      case 'login_refused':
        void AuthenticationHandler.onLoginRefused(ws, command.data);
        break;
      case 'signup_completed':
        //Agreed with server that a login completed will follow upon signup completed. Thus no actions required here.
        //void AuthenticationHandler.onSignUpCompleted(ws, command.data);
        break;
      case 'signup_refused':
        void AuthenticationHandler.onSignUpRefused(ws, command.data);
        break;
      case 'channel_list':
        allChannels = command.data;
        break;
      case 'channel_join_completed':
        currentChannel = ChannelHandler.onChannelJoinCompleted(command.data, ws);
        if (!allChannels.channels.includes(currentChannel)) {
          allChannels.channels.push(currentChannel);
        }
        connectedChannels.channels.push(currentChannel);
        break;
      case 'channel_join_refused':
        ChannelHandler.onChannelJoinRefused(command.data);
        break;
      case 'channel_create_completed': {
        const [channel, list] = ChannelHandler.onChannelCreateCompleted(command.data, allChannels);

        setCurrentChannel(channel);
        setAllChannels(list);

        if (currentChannel === undefined) {
          break;
        }
        connectedChannels.channels.push(currentChannel);
        break;
      }
      case 'channel_create_refused':
        ChannelHandler.onChannelCreateRefused(command.data);
        break;
      case 'channel_leave_completed':
        setAllChannels(ChannelHandler.onChannelLeaveCompleted(command.data, allChannels));
        break;
      case 'channel_leave_refused':
        ChannelHandler.onChannelLeaveRefused(command.data);
        break;
      case 'message_received':
        MessageHandler.onMessageReceived(command.data);
        break;
      case 'message_sending_error':
        MessageHandler.onMessageSendingError(command.data);
        break;
      case 'lookup_result':
        LookupHandler.onLookupResult(command.data);
        rl.prompt();
        break;
      case 'lookup_error':
        LookupHandler.onLookupError(command.data);
        rl.prompt();
        break;
      case 'incoming_encoded_file':
        FileSharingHandler.onEncodedFile(command.data, currentChannel);
        rl.prompt(true);
        break;
      case 'message_history_response':
        ChannelHandler.onMessageHistoryResponse(command.data);
        break;
      case 'message_history_error':
        ChannelHandler.onMessageHistoryError(command.data);
        break;
      case 'server_error':
        Color.logError(`Server error: ${command.data.error_code} - contact the administrator`);
        break;
      case 'nickname_change_success':
        client.username = command.data.user.username;
        clearLine(process.stdout, 0);
        moveCursor(process.stdout, -100, 0);
        console.log(chalk.green(`Your new nickname is ${client.username}`));
        rl.prompt();
        break;
      default:
        debug('Listener not implemented yet for command %s', command.command);
        break;
    }
  } else {
    debug('Received raw message is not a valid ToClientCommand');
    Color.logError(commandResponse.error);
  }
}

/**
 * Function which parses the user input and executes the corresponding command
 *
 * @param input - user input
 * @param ws - websocket which is used to send and receive messages
 */
export function parseCommand(input: string, ws: IWebSocket) {
  const inputArray = input.split(' ');
  const command = inputArray[0]?.toLowerCase();
  const args = inputArray.slice(1);
  switch (command) {
    case Commands.EXIT:
      ChatClient.onExit();
      break;
    case Commands.SEND:
      MessageHandler.onSend(ws, args);
      break;
    case Commands.OPEN:
      setCurrentChannel(ChannelHandler.onOpen(ws, args, allChannels, connectedChannels, currentChannel));
      break;
    case Commands.CREATE:
      ChannelHandler.onCreate(ws, args, allChannels);
      break;
    case Commands.CLOSE:
      setCurrentChannel(ChannelHandler.onClose(currentChannel));
      break;
    case Commands.LIST:
      for (const channel of allChannels.channels) {
        console.log(channel.name);
      }
      break;
    case Commands.LOOKUP:
      LookupHandler.lookupMessage(ws, args.join(' '), currentChannel);
      break;
    case Commands.SENDFILE:
      FileSharingHandler.sendEncodedFile(ws, args, currentChannel);
      break;
    case Commands.HELP:
      console.log(
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
      break;
    case Commands.NICK:
      NicknameHandler.onNick(ws, args);
      break;
    default:
      Color.logError(`Unknown command '${command}' try "help" for a list of all the commands`);
  }
}

/**
 * Launches the chat application after the user is logged in
 *
 * @param ws - websocket which is used to send and receive messages
 * @param userData - data of the user which is logged in
 */
function launchApp(ws: IWebSocket, userData: LogInCompleted | SignUpCompleted) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  console.clear();
  client = userData.user;
  ChatClient.printWelcomeMessage();
  ChatClient.startListening(ws);
}

/**
 * Prints a welcome message to the console
 */
function printWelcomeMessage() {
  console.log(
    chalk.yellowBright(
      figlet.textSync(appName, { font: 'Slant', horizontalLayout: 'default', verticalLayout: 'default' }),
    ),
  );
  if (client.username === undefined) {
    console.log(
      chalk.yellowBright(`Welcome to ${slogan}, ${client.id}! Type "help" get a list of all the commands you can use.`),
    );
  } else {
    console.log(
      chalk.yellowBright(
        `Welcome to ${slogan}, ${client.username}! Type "help" get a list of all the commands you can use.`,
      ),
    );
  }
}

/**
 * Function which starts listening for user input and prompts after each line
 *
 * @param ws - websocket which is used to send and receive messages
 */
function startListening(ws: IWebSocket) {
  rl.prompt();
  rl.on('line', (input) => {
    ChatClient.parseCommand(input, ws);
    rl.prompt();
  });
}
/**
 *  Starts a heartbeat timer which closes the client if the server does not respond in time
 *
 * @param ws - websocket which is used to send and receive messages
 */
function heartbeat(ws: IWebSocket) {
  const { pingInterval, buffer } = { pingInterval: 30000, buffer: 3000 };
  if (ws.pingTimeout) {
    clearTimeout(ws.pingTimeout);
  }
  ws.pingTimeout = setTimeout(() => {
    Color.logError('Closing client because of socket time out');
    process.exit(0);
  }, pingInterval + buffer);
}

/**
 * Exits the process with exit code 0
 */
function onExit() {
  process.exit(0);
}

/**
 * Returns the client which is currently logged in
 *
 * @returns the current user
 */
function getClient(): User {
  return client;
}

/**
 * Returns the current channel that the client is on
 *
 * @returns the current channel
 */
function getCurrentChannel(): Channel | undefined {
  return currentChannel;
}

/**
 * Sets the current channel
 *
 * @param channel - the new current channel
 */
function setCurrentChannel(channel: Channel | undefined) {
  currentChannel = channel;
}

/**
 * Returns all the channels which are available to join
 *
 * @returns all the channels
 */
function getAllChannels(): ChannelList {
  return allChannels;
}

/**
 * Sets all the channels which are available to join
 *
 * @param channels - all the channels which are available
 */
function setAllChannels(channels: ChannelList) {
  allChannels = channels;
}

/**
 * Returns all the channels which the client is connected to
 *
 * @returns all the connected channels
 */
function getConnectedChannels(): ChannelList {
  return connectedChannels;
}

/**
 * Sets all the channels which the client is connected to
 *
 * @param channels - all the connected channels
 */
function setConnectedChannels(channels: ChannelList) {
  connectedChannels = channels;
}
