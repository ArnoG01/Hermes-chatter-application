// author: Arno Genicot, Jonas Couwberghs
// date: 2023-12-04

import type {
  Channel,
  ChannelCreateCompleted,
  ChannelCreateCompletedCommand,
  ChannelCreateRefusedCommand,
  ChannelCreateRequest,
  ChannelId,
  ChannelJoinCompleted,
  ChannelJoinCompletedCommand,
  ChannelJoinRefusedCommand,
  ChannelJoinRequest,
  ChannelLeaveCompleted,
  ChannelLeaveCompletedCommand,
  ChannelLeaveRefusedCommand,
  ChannelLeaveRequest,
  ChannelList,
  ChannelListCommand,
  User,
} from '../protocol/proto.mjs';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import type { ChannelEntry } from '../database/database-interfaces.mjs';
import { Query } from '../database/query-builder.mjs';
import { Table } from '../database/table.mjs';
import { randomUUID } from 'node:crypto';
import Debug from 'debug';

export const ChannelHandler = {
  onClientJoinChannel,
  onClientCreateChannel,
  onClientLeaveChannel,
  broadcastChannels,
};

const MAX_INSERTION_ATTEMPTS = 3;
const debug = Debug('chatter:ChatServer-channel-handler');

/**
 * Function handles case 'channel_join_request' for IWebServer.
 * Will refuse joining channel if user is already part of that channel, or if the channel
 * does not exist.
 * After succesfully joining a channel database will be updated accordingly, UserEntry of database updated.
 *
 * @param ws - IWebSocket instance of logged in user
 * @param loggedInUser - Information about the sender, User instance
 * @param request - Information about the join channel request, Channel instance
 * @returns - Promise<void>
 */
async function onClientJoinChannel(ws: IWebSocket, loggedInUser: User, request: ChannelJoinRequest): Promise<void> {
  // Load requested channel from database:
  const channel = (
    await new Query(Table.CHANNELS).filter(({ channel_ID }) => channel_ID === request.channel_id).results()
  )[0];

  if (!channel) {
    // Channel does not exist, cannot join a channel that doesn't exist
    handleChannelJoinRefused(ws, request.channel_id, 404);
    return;
  }

  const user = (await new Query(Table.USERS).filter(({ email_ID }) => email_ID === loggedInUser.id).results())[0];
  if (!user || user.channels.includes(channel.channel_ID)) {
    // User is attempting to join a channel he is already a part of.
    handleChannelJoinRefused(ws, request.channel_id, 405);
    return;
  }

  // Now update database:
  await new Query(Table.USERS)
    .filter(({ email_ID }) => email_ID === loggedInUser.id)
    .update((entry) => entry.channels.push(channel.channel_ID));
  debug('Joining channel was succesful, database is updated.');

  // Send ChannelJoinCompleted command:
  const response: ChannelJoinCompleted = {
    channel: { name: channel.name, id: channel.channel_ID },
  };

  ws.send(JSON.stringify({ command: 'channel_join_completed', data: response } as ChannelJoinCompletedCommand));
}

/**
 * Sends a ChannelJoinRefused containing the given error
 *
 * @param ws - The websocket to send the error to
 * @param channel_id - The id of the channel hte user tried to join
 * @param error_code - The error code of the error
 * @param reason - The reason of the error
 * @returns void
 */
function handleChannelJoinRefused(
  ws: IWebSocket,
  channel_id: ChannelId,
  error_code: number,
  reason?: string | undefined,
): void {
  debug(`Joining channel failed, refuse command has been sent and database remains unchanged. Error ${error_code}`);
  ws.send(
    JSON.stringify({
      command: 'channel_join_refused',
      data: {
        channel_id,
        error_code,
        reason,
      },
    } as ChannelJoinRefusedCommand),
  );
}

/**
 * Function handles case 'channel_create_request' for IWebServer.
 * Will refuse to create channel if there is already one in the database with same ID.
 * Upon succesful completion of the create request, UserEntry and ChannelEntry[] of database will
 * be updated to contain new channel.
 *
 * @param ws - IWebSocket instance of logged in user
 * @param loggedInUser - Information about the sender, User instance
 * @param request - Information about the join channel request, Channel instance
 * @returns Promise<void>
 */
async function onClientCreateChannel(
  ws: IWebSocket,
  loggedInUser: User,
  request: ChannelCreateRequest,
  loggedInClients: Map<IWebSocket, User>,
): Promise<void> {
  const channelEntry: ChannelEntry = {
    channel_ID: randomUUID(),
    name: request.name,
  };

  // Attempt to insert the channel into the database
  let inserted = false;
  let attempts = 0;

  while (!inserted) {
    try {
      await new Query(Table.CHANNELS).insert(channelEntry);
      inserted = true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Primary ID already exists.' &&
        attempts < MAX_INSERTION_ATTEMPTS
      ) {
        attempts++;
        debug(`Failed to insert channel, trying again with new ID [attempt ${attempts}/${MAX_INSERTION_ATTEMPTS}]`);
        channelEntry.channel_ID = randomUUID();
      } else {
        handleChannelCreateRefused(ws, request.name, 500, 'Failed to insert channel into the database');
        return;
      }
    }
  }

  // Update user in database:
  await new Query(Table.USERS)
    .filter(({ email_ID }) => email_ID === loggedInUser.id)
    .update((entry) => entry.channels.push(channelEntry.channel_ID));

  // Send ChannelCreateCompleted command over websocket:
  const response: ChannelCreateCompleted = {
    channel: { name: request.name, id: channelEntry.channel_ID },
  };
  ws.send(JSON.stringify({ command: 'channel_create_completed', data: response } as ChannelCreateCompletedCommand));
  debug('Creating channel was succesful, database is updated.');

  // Notify relevant users of the update in the database:
  await ChannelHandler.broadcastChannels(loggedInClients);
}

/**
 * Sends a ChannelCreateRefused containing the given error
 *
 * @param ws - The websocket to send the error to
 * @param channel_name - The name of the channel the user tried to create
 * @param error_code - The error code of the error
 * @param reason - The reason of the error
 * @returns void
 */
function handleChannelCreateRefused(
  ws: IWebSocket,
  channel_name: ChannelId,
  error_code: number,
  reason?: string | undefined,
): void {
  debug(`Joining channel failed, refuse command has been sent and database remains unchanged. Error ${error_code}`);
  ws.send(
    JSON.stringify({
      command: 'channel_create_refused',
      data: {
        channel_name,
        error_code,
        reason,
      },
    } as ChannelCreateRefusedCommand),
  );
}

/**
 * Function handles case 'channel_leave_request' for IWebServer.
 * Will refuse to leave a channel if it tries to leave a non-existing channel,
 * or if it tries to leave a channel the user is not a part of.
 * Upon succesful completion of the leave request, UserEntry of database will be
 * updated so its channels field no longer contain channel it left.
 *
 * @param ws - IWebSocket instance of logged in user
 * @param loggedInUser - Information about the sender, User instance
 * @param request - Information about the join channel request, Channel instance
 * @param loggedInClients - Information about the logged in users and their corresponding websocket
 * @returns Promise<void>
 */
async function onClientLeaveChannel(
  ws: IWebSocket,
  loggedInUser: User,
  request: ChannelLeaveRequest,
  loggedInClients: Map<IWebSocket, User>,
): Promise<void> {
  // Load requested channel from database:
  const channel = (
    await new Query(Table.CHANNELS).filter(({ channel_ID }) => channel_ID === request.channel_id).results()
  )[0];

  // If channel does not exist, it is impossible to leave it. Return channel leave refused command:
  if (!channel) {
    // User is attempting to leave a channel that does not exist.
    handleChannelLeaveRefused(ws, request.channel_id, 404);
    return;
  }

  // Check now if the user is a member of the channel he is trying to leave:
  const user = (await new Query(Table.USERS).filter(({ email_ID }) => email_ID === loggedInUser.id).results())[0];

  if (!user || !user.channels.includes(channel.channel_ID)) {
    handleChannelLeaveRefused(ws, request.channel_id, 407);
    return;
  }

  // Update DB for user:
  await new Query(Table.USERS)
    .filter(({ email_ID }) => email_ID === loggedInUser.id)
    .update((entry) => {
      // Remove the element with the specified channel ID
      entry.channels = entry.channels.filter((channelID) => channelID !== channel.channel_ID);
    });

  // Send leave confirmed command:
  const response: ChannelLeaveCompleted = {
    channel: { name: channel.name, id: channel.channel_ID },
  };
  ws.send(JSON.stringify({ command: 'channel_leave_completed', data: response } as ChannelLeaveCompletedCommand));
  debug('Leaving channel was succesful, database is updated.');

  await ChannelHandler.broadcastChannels(loggedInClients);
}

/**
 * Sends a ChannelJoinRefused containing the given error
 *
 * @param ws - The websocket to send the error to
 * @param channel_id - The id of the channel thee user tried to leave
 * @param error_code - The error code of the error
 * @param reason - The reason of the error
 * @returns void
 */
function handleChannelLeaveRefused(
  ws: IWebSocket,
  channel_id: ChannelId,
  error_code: number,
  reason?: string | undefined,
): void {
  debug(`Leaving channel failed, refuse command has been sent and database remains unchanged. Error ${error_code}`);
  ws.send(
    JSON.stringify({
      command: 'channel_leave_refused',
      data: {
        channel_id,
        error_code,
        reason,
      },
    } as ChannelLeaveRefusedCommand),
  );
}

/**
 * Function sends a ChannelList item to socket, containing a list of all Channels in database.
 * If IWebSocket instance is specified, ChannelList is only sent to this socket.
 * Else every logged in client receives a ChannelList from his IWebSocket.
 *
 * @param receiving - Optional IWebSocket parameter
 * @param loggedInClients - Optional information about logged in clients and their corresponding websocket
 * @returns Promise<void>
 */
async function broadcastChannels(receiving: IWebSocket | Map<IWebSocket, User>): Promise<void> {
  const allChannelsDB = await new Query(Table.CHANNELS).results();
  const response: ChannelList = { channels: [] };
  // Retrieve all active channels from database.
  for (const channelDB of allChannelsDB) {
    const newChannel: Channel = {
      name: channelDB.name,
      id: channelDB.channel_ID,
    };
    response.channels.push(newChannel);
  }

  if (receiving instanceof Map) {
    // Send channelList object to all connected IWebSockets.
    // Often needed when a new Channel is created/removed.
    for (const webSocket of receiving.keys()) {
      webSocket.send(JSON.stringify({ command: 'channel_list', data: response } as ChannelListCommand));
    }
  } else {
    // Send channelList object to only one IWebSocket.
    // Often needed when user logs in or signs up.
    receiving.send(JSON.stringify({ command: 'channel_list', data: response } as ChannelListCommand));
  }
}
