// @author Jonas Couwberghs, Mataro Langeraert, Toon Neyens
// @date 2023-12-04

import { expect, describe, it, expectTypeOf, beforeEach } from 'vitest';
import { DateTime } from 'luxon';
import {
  channelCreateCompletedSchema,
  channelCreateRefusedSchema,
  channelCreateRequestSchema,
  lookupRequestSchema,
  channelIdSchema,
  channelJoinCompletedSchema,
  channelJoinRefusedSchema,
  channelJoinRequestSchema,
  channelLeaveCompletedSchema,
  channelLeaveRefusedSchema,
  channelLeaveRequestSchema,
  channelListSchema,
  channelNameSchema,
  channelSchema,
  dateTimeSchema,
  logInCompletedSchema,
  logInRefusedSchema,
  logInRequestSchema,
  lookupResultSchema,
  toClientCommandSchema,
  toServerCommandSchema,
  userIdSchema,
  userNickSchema,
  userSchema,
  passwordSchema,
  huffmanEncodedFileSchema,
  outgoingEncodedFileSchema,
  incomingEncodedFileSchema,
  fileEncodingErrorSchema,
  lookupErrorSchema,
  outgoingMessageSchema,
  incomingMessageSchema,
  messageSendingErrorSchema,
  requestMessageHistorySchema,
  messageHistoryResponseSchema,
  messageHistoryErrorSchema,
  signUpRequestRefusedSchema,
  signUpRequestSchema,
  signUpRequestCompletedCommandSchema,
  signUpRequestRefusedCommandSchema,
  signUpRequestCompletedSchema,
  nicknameChangeRefusedSchema,
  nicknameChangeSuccessSchema,
  nicknameChangeRequestSchema,
  serverErrorSchema,
  nicknameChangeSuccessCommandSchema,
  nicknameChangeRefusedCommandSchema,
} from './proto.zod.mjs';
import type {
  Channel,
  ChannelCreateCompleted,
  ChannelCreateRefused,
  ChannelCreateRequest,
  ChannelJoinCompleted,
  ChannelJoinRefused,
  ChannelJoinRequest,
  ChannelLeaveCompleted,
  ChannelLeaveRefused,
  ChannelLeaveRequest,
  ChannelList,
  LogInCompleted,
  LogInRefused,
  LogInRequest,
  LookupError,
  LookupRequest,
  LookupResult,
  ToClientCommand,
  ToServerCommand,
  User,
  HuffmanEncodedFile,
  OutgoingEncodedFile,
  IncomingEncodedFile,
  FileEncodingError,
  OutgoingMessage,
  IncomingMessage,
  MessageSendingError,
  RequestMessageHistory,
  MessageHistoryResponse,
  MessageHistoryError,
  SignUpRefused,
  SignUpRequest,
  NicknameChangeRefused,
  NicknameChangeSuccess,
  NicknameChangeRequest,
  SignUpCompleted,
  SignUpRefusedCommand,
  SignUpCompletedCommand,
  ServerError,
  InternalError,
  ParsingError,
  MissingPermissionsError,
  NicknameChangeSuccessCommand,
  NicknameChangeRefusedCommand,
} from './proto.mjs';

describe('userIdSchema', () => {
  it('Passes when a string representing a valid email adress is passed', () => {
    const res = userIdSchema.safeParse('dirk.nuyens@cs.kuleuven.be');
    expect(res.success).toBeTruthy();
  });

  it("Fails when a string which doesn't represent a valid email adress is passed", () => {
    const res = userIdSchema.safeParse('dirk.nuyens@ cs.kuleuven.be');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The userID has to be an email');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when something that is not a string is passed', () => {
    const res = userIdSchema.safeParse(5);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});

describe('channelIdSchema', () => {
  it('Passes when a non-empty string is passed', () => {
    const res = channelIdSchema.safeParse('general');
    expect(res.success).toBeTruthy();
  });

  it('Fails when an empty string is passed', () => {
    const res = channelIdSchema.safeParse('');
    expect(res.success).toBeFalsy();
  });

  it('Fails when something that is not a string is passed', () => {
    const res = userIdSchema.safeParse(5);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});

describe('userNickSchema', () => {
  it('Passes when a non-empty string which is max 30 characters long is passed', () => {
    const res = userNickSchema.safeParse('I take 40 seconds to finish');
    expect(res.success).toBeTruthy();
  });

  it('Fails when an empty string is passed', () => {
    const res = userNickSchema.safeParse('');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The user nickname can not be an empty string');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when a string longer than 30 characters is passed', () => {
    const res = userNickSchema.safeParse('abcdefghijklmnopqrstuvwxyz12345');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The user nickname has a max length of 30');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when something that is not a string is passed', () => {
    const res = userNickSchema.safeParse(5);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});

describe('channelNameSchema', () => {
  it('Passes when a non-empty string which is max 30 characters long is passed', () => {
    const res = channelNameSchema.safeParse('I take 40 seconds to finish');
    expect(res.success).toBeTruthy();
  });

  it('Fails when an empty string is passed', () => {
    const res = channelNameSchema.safeParse('');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The channel name can not be an empty string');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when a string longer than 30 characters is passed', () => {
    const res = channelNameSchema.safeParse('abcdefghijklmnopqrstuvwxyz12345');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The channel name has a max length of 30');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when something that is not a string is passed', () => {
    const res = channelNameSchema.safeParse(5);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});

describe('passwordSchema', () => {
  it('Passes when a string is passed', () => {
    const res = passwordSchema.safeParse('Password12345');
    expect(res.success).toBeTruthy();
  });

  it('Fails when an empty string is passed', () => {
    const res = passwordSchema.safeParse('');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(5);
      expect(res.error.errors[0]?.message).toBe('A password can not be an empty string');
      expect(res.error.errors[0]?.path).toEqual([]);
      expect(res.error.errors[1]?.message).toBe('A password has a minimum length of 8');
      expect(res.error.errors[1]?.path).toEqual([]);
      expect(res.error.errors[2]?.message).toBe('A password contains at least 1 number');
      expect(res.error.errors[2]?.path).toEqual([]);
      expect(res.error.errors[3]?.message).toBe('A password contains at least 1 lowercase letter');
      expect(res.error.errors[3]?.path).toEqual([]);
      expect(res.error.errors[4]?.message).toBe('A password contains at least 1 uppercase letter');
      expect(res.error.errors[4]?.path).toEqual([]);
    }
  });

  it('Fails when a string longer than 30 characters is passed', () => {
    const res = passwordSchema.safeParse('abcdefghijklmnopqrstuvwxyz12345');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(2);
      expect(res.error.errors[0]?.message).toBe('A password has a max length of 30');
      expect(res.error.errors[0]?.path).toEqual([]);
      expect(res.error.errors[1]?.message).toBe('A password contains at least 1 uppercase letter');
      expect(res.error.errors[1]?.path).toEqual([]);
    }
  });

  it('Fails when a string shorter than 8 characters is passed', () => {
    const res = passwordSchema.safeParse('abcdef');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(3);
      expect(res.error.errors[0]?.message).toBe('A password has a minimum length of 8');
      expect(res.error.errors[0]?.path).toEqual([]);
      expect(res.error.errors[1]?.message).toBe('A password contains at least 1 number');
      expect(res.error.errors[1]?.path).toEqual([]);
      expect(res.error.errors[2]?.message).toBe('A password contains at least 1 uppercase letter');
      expect(res.error.errors[2]?.path).toEqual([]);
    }
  });

  it('Fails when a string with only lowercase letters is passed', () => {
    const res = passwordSchema.safeParse('abcdefbcdef');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(2);
      expect(res.error.errors[0]?.message).toBe('A password contains at least 1 number');
      expect(res.error.errors[1]?.message).toBe('A password contains at least 1 uppercase letter');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when a string without lowercase letters is passed', () => {
    const res = passwordSchema.safeParse('TEST1234');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('A password contains at least 1 lowercase letter');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when something that is not a string is passed', () => {
    const res = passwordSchema.safeParse(5);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});

describe('dateTimeSchema', () => {
  it('Parses an ISO string to a luxon DateTime instance', () => {
    const res = dateTimeSchema.safeParse('2023-11-07T16:02:15.365+02:00');

    expect(res.success).toBeTruthy();
    if (res.success) {
      const timestamp: DateTime = res.data;
      expect(timestamp.day).toBe(7);
      expect(timestamp.month).toBe(11);
      expect(timestamp.year).toBe(2023);
      expect(timestamp.hour).toBe(16);
      expect(timestamp.minute).toBe(2);
      expect(timestamp.second).toBe(15);
      expect(timestamp.millisecond).toBe(365);
      expect(timestamp.offset).toBe(120); // Offset in minutes
      expect(timestamp.zoneName).toBe('UTC+2');
    }
  });

  it("Fails if a string which isn't in ISO format gets passed", () => {
    const res = dateTimeSchema.safeParse('2023-11-07 16:02:15.365+02:00');
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe("The given string isn't in the ISO date time format");
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});

describe('userSchema', () => {
  it('Checks if an unknown object matches the User interface and returns it as an instance of the User interface', () => {
    const input: unknown = {
      id: 'jonas.couwberghs@student.kuleuven.be',
      username: 'Jonas',
    };
    const res = userSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const user: User = res.data;
      expect(Object.keys(user).sort()).toEqual(['id', 'username']);
      expect(user.id).toBe('jonas.couwberghs@student.kuleuven.be');
      expect(user.username).toBe('Jonas');
    }
  });

  it('Checks if an unknown object matches the User interface and returns it as an instance of the User interface, with missing optional values', () => {
    const input: unknown = {
      id: 'jonas.couwberghs@student.kuleuven.be',
    };
    const res = userSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const user: User = res.data;
      expect(Object.keys(user).sort()).toEqual(['id']);
      expect(user.id).toBe('jonas.couwberghs@student.kuleuven.be');
      expect(user.username).toBeUndefined();
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      username: 'Jonas',
    };
    const res = userSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['id']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      id: 'jonas.couwberghs@student.kuleuven.be',
      username: 'Jonas',
      test: 'test',
    };
    const res = userSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const user: User = res.data;
      expect(Object.keys(user).sort()).toEqual(['id', 'username']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      id: 'jonas.couwberghs@student.kuleuven.be',
      username: 12345,
    };
    const res = userSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual(['username']);
    }
  });

  it("Fails if the user field isn't an email", () => {
    const input: unknown = {
      id: '123456789',
      username: 'Jonas',
    };
    const res = userSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The userID has to be an email');
      expect(res.error.errors[0]?.path).toEqual(['id']);
    }
  });
});

describe('outgoingMessageSchema', () => {
  it('Checks if an unknown object matches the OutgoingMessage interface and returns it as an instance of the OutgoingMessage interface', () => {
    const input: unknown = {
      msg: 'Hello world!',
      channel: 'general',
    };
    const res = outgoingMessageSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const message: OutgoingMessage = res.data;
      expect(Object.keys(message).sort()).toEqual(['channel', 'msg']);
      expect(message.msg).toBe('Hello world!');
      expect(message.channel).toBe('general');
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      channel: 'general',
    };
    const res = outgoingMessageSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['msg']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      sender: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      msg: 'Hello world!',
      channel: 'general',
      time: '2023-11-07T18:44:36.134+02:00',
    };
    const res = outgoingMessageSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const message: OutgoingMessage = res.data;
      expect(Object.keys(message).sort()).toEqual(['channel', 'msg']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      msg: 'Hello world!',
      channel: 1,
    };
    const res = outgoingMessageSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual(['channel']);
    }
  });

  it('Fails when the message is empty', () => {
    const input: unknown = {
      msg: '',
      channel: 'general',
    };
    const res = outgoingMessageSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('A message can not be empty');
      expect(res.error.errors[0]?.path).toEqual(['msg']);
    }
  });
});

describe('incomingMessageSchema', () => {
  it('Checks if an unknown object matches the IncomingMessage interface and returns it as an instance of the IncomingMessage interface', () => {
    const input: unknown = {
      sender: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      msg: 'Hello world!',
      channel: 'general',
      time: '2023-11-07T18:44:36.134+02:00',
    };
    const res = incomingMessageSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const message: IncomingMessage = res.data;
      expect(Object.keys(message).sort()).toEqual(['channel', 'msg', 'sender', 'time']);
      expect(message.sender).toStrictEqual({ id: 'jonas.couwberghs@student.kuleuven.be' });
      expect(message.msg).toBe('Hello world!');
      expect(message.channel).toBe('general');
      expect(message.time).toEqual(DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }));
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      sender: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      channel: 'general',
      time: '2023-11-07T18:44:36.134+02:00',
    };
    const res = incomingMessageSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['msg']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      sender: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      to: {
        id: 'pieter.vanderschueren2@student.kuleuven.be',
      },
      msg: 'Hello world!',
      channel: 'general',
      time: '2023-11-07T18:44:36.134+02:00',
    };
    const res = incomingMessageSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const message: IncomingMessage = res.data;
      expect(Object.keys(message).sort()).toEqual(['channel', 'msg', 'sender', 'time']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      sender: 'jonas.couwberghs@student.kuleuven.be',
      msg: 'Hello world!',
      channel: 'general',
      time: '2023-11-07T18:44:36.134+02:00',
    };
    const res = incomingMessageSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected object, received string');
      expect(res.error.errors[0]?.path).toEqual(['sender']);
    }
  });

  it('Fails when the message is empty', () => {
    const input: unknown = {
      sender: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      msg: '',
      channel: 'general',
      time: '2023-11-07T18:44:36.134+02:00',
    };
    const res = incomingMessageSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('A message can not be empty');
      expect(res.error.errors[0]?.path).toEqual(['msg']);
    }
  });
});

describe('messageSendingErrorSchema', () => {
  it('Checks if an unknown object matches the MessageSendingError interface and returns it as an instance of the MessageSendingError interface', () => {
    const input: unknown = {
      error_code: 404,
      reason: 'Channel does not exist',
    };
    const res = messageSendingErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const error: MessageSendingError = res.data;
      expect(Object.keys(error).sort()).toEqual(['error_code', 'reason']);
      expect(error.error_code).toBe(404);
      expect(error.reason).toBe('Channel does not exist');
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      reason: 'Channel does not exist',
    };
    const res = messageSendingErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['error_code']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      error_code: 404,
      reason: 'Channel does not exist',
      channel_id: 'general',
    };
    const res = messageSendingErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const error: MessageSendingError = res.data;
      expect(Object.keys(error).sort()).toEqual(['error_code', 'reason']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      error_code: 'Not found',
      reason: 'Channel does not exist',
    };
    const res = messageSendingErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected number, received string');
      expect(res.error.errors[0]?.path).toEqual(['error_code']);
    }
  });
});

describe('requestMessageHistorySchema', () => {
  it('Checks if an unknown object matches the RequestMessageHistory interface and returns it as an instance of the RequestMessageHistory interface', () => {
    const input: unknown = {
      channel_id: 'general',
      amount: 25,
    };
    const res = requestMessageHistorySchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const request: RequestMessageHistory = res.data;
      expect(Object.keys(request).sort()).toEqual(['amount', 'channel_id']);
      expect(request.channel_id).toBe('general');
      expect(request.amount).toBe(25);
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      channel_id: 'general',
    };
    const res = requestMessageHistorySchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['amount']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: { id: 'test@test.com' },
      channel_id: 'general',
      amount: 25,
    };
    const res = requestMessageHistorySchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const request: RequestMessageHistory = res.data;
      expect(Object.keys(request).sort()).toEqual(['amount', 'channel_id']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      channel_id: 1,
      amount: 25,
    };
    const res = requestMessageHistorySchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual(['channel_id']);
    }
  });
});

describe('messageHistoryResponseSchema', () => {
  it('Checks if an unknown object matches the MessageHistoryResponse interface and returns it as an instance of the MessageHistoryResponse interface', () => {
    const input: unknown = {
      channel_id: 'general',
      messages: [
        {
          sender: {
            id: 'test@test.com',
            username: 'Testaccount 1',
          },
          time: '2023-11-29T12:49:15.152Z',
          channel: 'general',
          msg: 'Hello',
        },
        {
          sender: {
            id: 'test@test.com',
            username: 'Testaccount 1',
          },
          time: '2023-11-29T12:50:13.165Z',
          channel: 'general',
          msg: 'Hello world',
        },
      ],
    };
    const res = messageHistoryResponseSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const response: MessageHistoryResponse = res.data;
      expect(Object.keys(response).sort()).toEqual(['channel_id', 'messages']);
      expect(response.channel_id).toBe('general');
      expect(response.messages).toEqual([
        {
          sender: {
            id: 'test@test.com',
            username: 'Testaccount 1',
          },
          time: DateTime.fromISO('2023-11-29T12:49:15.152Z', { setZone: true }),
          channel: 'general',
          msg: 'Hello',
        },
        {
          sender: {
            id: 'test@test.com',
            username: 'Testaccount 1',
          },
          time: DateTime.fromISO('2023-11-29T12:50:13.165Z', { setZone: true }),
          channel: 'general',
          msg: 'Hello world',
        },
      ]);
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      channel_id: 'general',
    };
    const res = messageHistoryResponseSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['messages']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      channel_id: 'general',
      messages: [
        {
          sender: {
            id: 'test@test.com',
            username: 'Testaccount 1',
          },
          time: '2023-11-29T12:49:15.152Z',
          channel: 'general',
          msg: 'Hello',
        },
        {
          sender: {
            id: 'test@test.com',
            username: 'Testaccount 1',
          },
          time: '2023-11-29T12:50:13.165Z',
          channel: 'general',
          msg: 'Hello world',
        },
      ],
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
    };
    const res = messageHistoryResponseSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const response: MessageHistoryResponse = res.data;
      expect(Object.keys(response).sort()).toEqual(['channel_id', 'messages']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      channel_id: 'general',
      messages: {
        sender: {
          id: 'test@test.com',
          username: 'Testaccount 1',
        },
        time: '2023-11-29T12:49:15.152Z',
        channel: 'general',
        msg: 'Hello',
      },
    };
    const res = messageHistoryResponseSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected array, received object');
      expect(res.error.errors[0]?.path).toEqual(['messages']);
    }
  });
});

describe('messageHistoryErrorSchema', () => {
  it('Checks if an unknown object matches the MessageHistoryError interface and returns it as an instance of the MessageHistoryError interface', () => {
    const input: unknown = {
      error_code: 404,
      reason: 'Channel does not exist',
    };
    const res = messageHistoryErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const error: MessageHistoryError = res.data;
      expect(Object.keys(error).sort()).toEqual(['error_code', 'reason']);
      expect(error.error_code).toBe(404);
      expect(error.reason).toBe('Channel does not exist');
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      reason: 'Channel does not exist',
    };
    const res = messageHistoryErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['error_code']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      error_code: 404,
      reason: 'Channel does not exist',
      channel_id: 'general',
    };
    const res = messageHistoryErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const error: MessageHistoryError = res.data;
      expect(Object.keys(error).sort()).toEqual(['error_code', 'reason']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      error_code: 'Not found',
      reason: 'Channel does not exist',
    };
    const res = messageHistoryErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected number, received string');
      expect(res.error.errors[0]?.path).toEqual(['error_code']);
    }
  });
});

describe('channelSchema', () => {
  it('Checks if an unknown object matches the Message interface and returns it as an instance of the Message interface', () => {
    const input: unknown = {
      id: 'general',
      name: 'General',
    };
    const res = channelSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channel: Channel = res.data;
      expect(Object.keys(channel).sort()).toEqual(['id', 'name']);
      expect(channel.id).toBe('general');
      expect(channel.name).toBe('General');
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      name: 'General',
    };
    const res = channelSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['id']);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      id: 'general',
      name: 'General',
      test: 'test',
    };
    const res = channelSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const user: User = res.data;
      expect(Object.keys(user).sort()).toEqual(['id', 'name']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      id: 12,
      name: 'General',
    };
    const res = channelSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected string, received number');
      expect(res.error.errors[0]?.path).toEqual(['id']);
    }
  });
});

describe('channelListSchema', () => {
  it('Checks if an unknown object matches the ChannelList interface and returns it as an instance of the ChannelList interface', () => {
    const input: unknown = {
      channels: [
        { id: 'general', name: 'General' },
        { id: 'memes', name: 'Memes' },
      ],
    };
    const res = channelListSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelList: ChannelList = res.data;
      expect(Object.keys(channelList).sort()).toEqual(['channels']);
      expect(channelList.channels).toEqual([
        { id: 'general', name: 'General' },
        { id: 'memes', name: 'Memes' },
      ]);
    }
  });

  it("Fails if an entry in the channels array doesn't match the Channel interface", () => {
    const input: unknown = {
      channels: ['General', { id: 'memes', name: 'Memes' }],
    };
    const res = channelListSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected object, received string');
      expect(res.error.errors[0]?.path).toEqual(['channels', 0]);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      channels: [
        { id: 'general', name: 'General' },
        { id: 'memes', name: 'Memes' },
      ],
      test: 1234,
    };
    const res = channelListSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelList: ChannelList = res.data;
      expect(Object.keys(channelList).sort()).toEqual(['channels']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      channels: { id: 'general', name: 'General' },
    };
    const res = channelListSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected array, received object');
      expect(res.error.errors[0]?.path).toEqual(['channels']);
    }
  });
});

describe('lookupRequestSchema', () => {
  it('Checks if an unknown object matches the LookupRequest interface and returns it as an instance of the LookupRequest interface', () => {
    const input: unknown = {
      time: '2023-11-07T18:44:36.134+02:00',
      channel_id: 'general',
    };
    const res = lookupRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const lookupRequest: LookupRequest = res.data;
      expect(Object.keys(lookupRequest).sort()).toEqual(['channel_id', 'time']);
      expect(lookupRequest.time).toEqual(DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }));
      expect(lookupRequest.channel_id).toEqual('general');
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      time: '2023-11-07T18:44:36.134+02:00',
      channel_id: 'general',
      test: 1234,
    };
    const res = lookupRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const lookupRequest: LookupRequest = res.data;
      expect(Object.keys(lookupRequest).sort()).toEqual(['channel_id', 'time']);
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      time: '2023-11-07T18:44:36.134+02:00',
      channel_id: 2,
    };
    const res = lookupRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.path).toEqual(['channel_id']);
    }
  });
});

describe('lookupResultSchema', () => {
  it('Checks if an unknown object matches the LookupResult interface and returns it as an instance of the LookupResult interface', () => {
    const input: unknown = {
      messages: [
        {
          sender: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          msg: 'Hello world!',
          channel: 'general',
          time: '2023-11-07T18:44:36.134+02:00',
        },
      ],
      resultIndex: 2,
    };
    const res = lookupResultSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const lookupResult: LookupResult = res.data;
      expect(Object.keys(lookupResult).sort()).toEqual(['messages', 'resultIndex']);
      expect(lookupResult.messages).toEqual([
        {
          sender: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          msg: 'Hello world!',
          channel: 'general',
          time: DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }),
        },
      ]);
      expect(lookupResult.resultIndex).toEqual(2);
    }
  });

  it('Fails when resultIndex is of an incorrect type', () => {
    const input: unknown = {
      messages: [
        {
          sender: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          msg: 'Hello world!',
          channel: 'general',
          time: '2023-11-07T18:44:36.134+02:00',
        },
      ],
      resultIndex: '2',
    };
    const res = lookupResultSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected number, received string');
      expect(res.error.errors[0]?.path).toEqual(['resultIndex']);
    }
  });

  it('Fails when messages is of an incorrect type', () => {
    const input: unknown = {
      messages: 'messages',
      resultIndex: 2,
    };
    const res = lookupResultSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected array, received string');
      expect(res.error.errors[0]?.path).toEqual(['messages']);
    }
  });
});

describe('lookupErrorSchema', () => {
  it('Checks if an unknown object matches the LookupError interface and returns it as an instance of the LookupError interface', () => {
    const input: unknown = {
      error_code: 404,
      reason: 'Requested channel does not exist',
    };
    const res = lookupErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const lookupError: LookupError = res.data;
      expect(Object.keys(lookupError).sort()).toEqual(['error_code', 'reason']);
      expect(lookupError.error_code).toBe(404);
      expect(lookupError.reason).toBe('Requested channel does not exist');
    }
  });

  it('Fails when a field is of an incorrect type', () => {
    const input: unknown = {
      error_code: 'Not found',
      reason: 'Requested channel does not exist',
    };
    const res = lookupErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Expected number, received string');
      expect(res.error.errors[0]?.path).toEqual(['error_code']);
    }
  });

  it('Fails when a required field is missing', () => {
    const input: unknown = {
      error_code: 404,
    };
    const res = lookupErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['reason']);
    }
  });
});

describe('channelJoinRequestSchema', () => {
  it('Checks if an unknown object matches the ChannelJoinRequest interface and returns it as an instance of the ChannelJoinRequest interface', () => {
    const input: unknown = {
      channel_id: '1',
    };
    const res = channelJoinRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelJoinRequest: ChannelJoinRequest = res.data;
      expect(Object.keys(channelJoinRequest).sort()).toEqual(['channel_id']);
      expect(channelJoinRequest.channel_id).toBe('1');
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      channel_id: '1',
      test: 12345,
    };
    const res = channelJoinRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelJoinRequest: ChannelJoinRequest = res.data;
      expect(Object.keys(channelJoinRequest).sort()).toEqual(['channel_id']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = channelJoinRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['channel_id']);
    }
  });
});

describe('channelJoinCompletedSchema', () => {
  it('Checks if an unknown object matches the ChannelJoinCompleted interface and returns it as an instance of the ChannelJoinCompleted interface', () => {
    const input: unknown = {
      channel: {
        id: '1',
        name: 'General',
      },
    };
    const res = channelJoinCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelJoinCompleted: ChannelJoinCompleted = res.data;
      expect(Object.keys(channelJoinCompleted).sort()).toEqual(['channel']);
      expect(channelJoinCompleted.channel).toEqual({
        id: '1',
        name: 'General',
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      channel: {
        id: '1',
        name: 'General',
      },
      test: 'abc',
    };
    const res = channelJoinCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelJoinCompleted: ChannelJoinCompleted = res.data;
      expect(Object.keys(channelJoinCompleted).sort()).toEqual(['channel']);
    }
  });
});

describe('channelJoinRefusedSchema', () => {
  it('Checks if an unknown object matches the ChannelJoinRefused interface and returns it as an instance of the ChannelJoinRefused interface', () => {
    const input: unknown = {
      channel_id: '1',
      error_code: 404,
      reason: 'Channel not found',
    };
    const res = channelJoinRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelJoinRefused: ChannelJoinRefused = res.data;
      expect(Object.keys(channelJoinRefused).sort()).toEqual(['channel_id', 'error_code', 'reason']);
      expect(channelJoinRefused.channel_id).toBe('1');
      expect(channelJoinRefused.error_code).toBe(404);
      expect(channelJoinRefused.reason).toBe('Channel not found');
    }
  });

  it('Checks if an unknown object matches the ChannelJoinRefused interface and returns it as an instance of the ChannelJoinRefused interface, with missing optionals', () => {
    const input: unknown = {
      channel_id: '1',
      error_code: 404,
    };
    const res = channelJoinRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelJoinRefused: ChannelJoinRefused = res.data;
      expect(Object.keys(channelJoinRefused).sort()).toEqual(['channel_id', 'error_code']);
      expect(channelJoinRefused.channel_id).toBe('1');
      expect(channelJoinRefused.error_code).toBe(404);
      expect(channelJoinRefused.reason).toBeUndefined();
    }
  });
});

describe('channelLeaveRequestSchema', () => {
  it('Checks if an unknown object matches the ChannelLeaveRequest interface and returns it as an instance of the ChannelLeaveRequest interface', () => {
    const input: unknown = {
      channel_id: '1',
    };
    const res = channelLeaveRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelLeaveRequest: ChannelLeaveRequest = res.data;
      expect(Object.keys(channelLeaveRequest).sort()).toEqual(['channel_id']);
      expect(channelLeaveRequest.channel_id).toBe('1');
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      channel_id: '1',
      test: 'abc',
    };
    const res = channelLeaveRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelLeaveRequest: ChannelLeaveRequest = res.data;
      expect(Object.keys(channelLeaveRequest).sort()).toEqual(['channel_id']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = channelLeaveRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['channel_id']);
    }
  });
});

describe('channelLeaveCompletedSchema', () => {
  it('Checks if an unknown object matches the ChannelLeaveCompleted interface and returns it as an instance of the ChannelLeaveCompleted interface', () => {
    const input: unknown = {
      channel: {
        id: '1',
        name: 'General',
      },
    };
    const res = channelLeaveCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelLeaveCompleted: ChannelLeaveCompleted = res.data;
      expect(Object.keys(channelLeaveCompleted).sort()).toEqual(['channel']);
      expect(channelLeaveCompleted.channel).toEqual({
        id: '1',
        name: 'General',
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'mataro.langeraert@student.kuleuven.be',
      },
      channel: {
        id: '1',
        name: 'General',
      },
      test: 'abc',
    };
    const res = channelLeaveCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelLeaveCompleted: ChannelLeaveCompleted = res.data;
      expect(Object.keys(channelLeaveCompleted).sort()).toEqual(['channel']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = channelLeaveCompletedSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['channel']);
    }
  });
});

describe('channelLeaveRefusedSchema', () => {
  it('Checks if an unknown object matches the ChannelLeaveRefused interface and returns it as an instance of the ChannelLeaveRefused interface', () => {
    const input: unknown = {
      channel_id: '1',
      error_code: 404,
      reason: 'Channel not found',
    };
    const res = channelLeaveRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelLeaveRefused: ChannelLeaveRefused = res.data;
      expect(Object.keys(channelLeaveRefused).sort()).toEqual(['channel_id', 'error_code', 'reason']);
      expect(channelLeaveRefused.channel_id).toBe('1');
      expect(channelLeaveRefused.error_code).toBe(404);
      expect(channelLeaveRefused.reason).toBe('Channel not found');
    }
  });

  it('Checks if an unknown object matches the ChannelLeaveRefused interface and returns it as an instance of the ChannelLeaveRefused interface, with missing optionals', () => {
    const input: unknown = {
      channel_id: '1',
      error_code: 404,
    };
    const res = channelLeaveRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelLeaveRefused: ChannelLeaveRefused = res.data;
      expect(Object.keys(channelLeaveRefused).sort()).toEqual(['channel_id', 'error_code']);
      expect(channelLeaveRefused.channel_id).toBe('1');
      expect(channelLeaveRefused.error_code).toBe(404);
      expect(channelLeaveRefused.reason).toBeUndefined();
    }
  });
});

describe('signUpRequestSchema', () => {
  it('Checks if an unknown object matches the signUpRequestSchema interface and returns it as an instance of the signUpRequestSchema interface', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
      password: 'HelloKitty123',
    };
    const res = signUpRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const request: SignUpRequest = res.data;
      expect(Object.keys(request).sort()).toEqual(['password', 'user']);
      expect(request.user).toEqual({
        id: 'test@test.com',
        username: 'Testaccount 1',
      });
      expect(request.password).toBe('HelloKitty123');
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
    };
    const res = signUpRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['password']);
    }
  });
});

describe('signUpRequestSchema', () => {
  it('Checks if an unknown object matches the signUpRequestSchema interface and returns it as an instance of the signUpRequestSchema interface', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
      password: 'HelloKitty123',
    };
    const res = signUpRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const request: SignUpRequest = res.data;
      expect(Object.keys(request).sort()).toEqual(['password', 'user']);
      expect(request.user).toEqual({
        id: 'test@test.com',
        username: 'Testaccount 1',
      });
      expect(request.password).toBe('HelloKitty123');
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
    };
    const res = signUpRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['password']);
    }
  });
});

describe('signUpRequestRefusedSchema', () => {
  it('Checks if an unknown object matches the SignUpRequestRefused interface and returns it as an instance of the SignUpRequestRefused interface', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
      error_code: 404,
      reason: 'User already exists',
    };
    const res = signUpRequestRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestRefused: SignUpRefused = res.data;
      expect(Object.keys(signUpRequestRefused).sort()).toEqual(['error_code', 'reason', 'user']);
      expect(signUpRequestRefused.error_code).toBe(404);
      expect(signUpRequestRefused.reason).toBe('User already exists');
    }
  });

  it('Checks if an unknown object matches the SignUpRequestRefused interface and returns it as an instance of the SignUpRequestRefused interface, with missing optionals', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
      error_code: 404,
    };
    const res = signUpRequestRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestRefused: SignUpRefused = res.data;
      expect(Object.keys(signUpRequestRefused).sort()).toEqual(['error_code', 'user']);
      expect(signUpRequestRefused.error_code).toBe(404);
      expect(signUpRequestRefused.reason).toBeUndefined();
    }
  });
});

describe('signUpRequestCompletedSchema', () => {
  it('Checks if an unknown object matches the SignUpRequestCompleted interface and returns it as an instance of the SignUpRequestCompleted interface', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
    };
    const res = signUpRequestCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestCompleted: SignUpCompleted = res.data;
      expect(Object.keys(signUpRequestCompleted).sort()).toEqual(['user']);
      expect(signUpRequestCompleted.user).toEqual({
        id: 'test@test.com',
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
      test: 'abc',
    };
    const res = signUpRequestCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestCompleted: SignUpCompleted = res.data;
      expect(Object.keys(signUpRequestCompleted).sort()).toEqual(['user']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = signUpRequestCompletedSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['user']);
    }
  });
});

describe('signUpRequestCompletedCommandSchema', () => {
  it('Checks if an unknown object matches the SignUpRequestCompletedCommand interface and returns it as an instance of the SignUpRequestCompletedCommand interface', () => {
    const input: unknown = {
      command: 'signup_completed',
      data: {
        user: {
          id: 'test@test.com',
        },
      },
    };
    const res = signUpRequestCompletedCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestCompletedCommand: SignUpCompletedCommand = res.data;
      expect(Object.keys(signUpRequestCompletedCommand).sort()).toEqual(['command', 'data']);
      expect(signUpRequestCompletedCommand.command).toBe('signup_completed');
      expect(signUpRequestCompletedCommand.data).toEqual({
        user: {
          id: 'test@test.com',
        },
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      command: 'signup_completed',
      data: {
        user: {
          id: 'test@test.com',
        },
      },
      test: 'abc',
    };
    const res = signUpRequestCompletedCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestCompletedCommand: SignUpCompletedCommand = res.data;
      expect(Object.keys(signUpRequestCompletedCommand).sort()).toEqual(['command', 'data']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      command: 'signup_completed',
    };
    const res = signUpRequestCompletedCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['data']);
    }
  });
});

describe('nicknameChangeSuccessCommandSchema', () => {
  it('Checks if an unknown object matches the nicknameChangeSuccessCommandSchema interface and returns it as an instance of the nicknameChangeSuccessCommand interface', () => {
    const input: unknown = {
      command: 'nickname_change_success',
      data: {
        user: {
          id: 'test@test.com',
          username: 'test',
        },
      },
    };
    const res = nicknameChangeSuccessCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeSuccessCommand: NicknameChangeSuccessCommand = res.data;
      expect(Object.keys(nicknameChangeSuccessCommand).sort()).toEqual(['command', 'data']);
      expect(nicknameChangeSuccessCommand.command).toBe('nickname_change_success');
      expect(nicknameChangeSuccessCommand.data).toEqual({
        user: {
          id: 'test@test.com',
          username: 'test',
        },
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      command: 'nickname_change_success',
      data: {
        user: {
          id: 'test@test.com',
        },
      },
      test: 'abc',
    };
    const res = nicknameChangeSuccessCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeSuccessCommand: NicknameChangeSuccessCommand = res.data;
      expect(Object.keys(nicknameChangeSuccessCommand).sort()).toEqual(['command', 'data']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      command: 'nickname_change_success',
    };
    const res = nicknameChangeSuccessCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['data']);
    }
  });
});

describe('nicknameChangeRefusedCommandSchema', () => {
  it('Checks if an unknown object matches the nicknameChangeRefusedCommandSchema interface and returns it as an instance of the nicknameChangeRefusedCommand interface', () => {
    const input: unknown = {
      command: 'nickname_change_refused',
      data: {
        user: {
          id: 'test@test.com',
        },
        error_code: 1,
      },
    };
    const res = nicknameChangeRefusedCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRefusedCommand: NicknameChangeRefusedCommand = res.data;
      expect(Object.keys(nicknameChangeRefusedCommand).sort()).toEqual(['command', 'data']);
      expect(nicknameChangeRefusedCommand.command).toBe('nickname_change_refused');
      expect(nicknameChangeRefusedCommand.data).toEqual({
        user: {
          id: 'test@test.com',
        },
        error_code: 1,
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      command: 'nickname_change_refused',
      data: {
        user: {
          id: 'test@test.com',
        },
        error_code: 1,
      },
      test: 'abc',
    };
    const res = nicknameChangeRefusedCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRefusedCommand: NicknameChangeRefusedCommand = res.data;
      expect(Object.keys(nicknameChangeRefusedCommand).sort()).toEqual(['command', 'data']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      command: 'nickname_change_refused',
    };
    const res = nicknameChangeRefusedCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['data']);
    }
  });
});

describe('signUpRequestRefusedCommandSchema', () => {
  it('Checks if an unknown object matches the SignUpRequestRefusedCommand interface and returns it as an instance of the SignUpRequestRefusedCommand interface', () => {
    const input: unknown = {
      command: 'signup_refused',
      data: {
        user: {
          id: 'test@test.com',
        },
        error_code: 404,
        reason: 'User already exists',
      },
    };
    const res = signUpRequestRefusedCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestRefusedCommand: SignUpRefusedCommand = res.data;
      expect(Object.keys(signUpRequestRefusedCommand).sort()).toEqual(['command', 'data']);
      expect(signUpRequestRefusedCommand.command).toBe('signup_refused');
      expect(signUpRequestRefusedCommand.data).toEqual({
        user: {
          id: 'test@test.com',
        },
        error_code: 404,
        reason: 'User already exists',
      });
    }
  });

  it('Checks if an unknown object matches the SignUpRequestRefusedCommand interface and returns it as an instance of the SignUpRequestRefusedCommand interface, with missing optionals', () => {
    const input: unknown = {
      command: 'signup_refused',
      data: {
        user: {
          id: 'test@test.com',
        },
        error_code: 404,
      },
    };
    const res = signUpRequestRefusedCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestRefusedCommand: SignUpRefusedCommand = res.data;
      expect(Object.keys(signUpRequestRefusedCommand).sort()).toEqual(['command', 'data']);
      expect(signUpRequestRefusedCommand.command).toBe('signup_refused');
      expect(signUpRequestRefusedCommand.data).toEqual({
        user: {
          id: 'test@test.com',
        },
        error_code: 404,
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      command: 'signup_refused',
      data: {
        user: {
          id: 'test@test.com',
        },
        error_code: 404,
        reason: 'User already exists',
      },
      test: 'abc',
    };
    const res = signUpRequestRefusedCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const signUpRequestRefusedCommand: SignUpRefusedCommand = res.data;
      expect(Object.keys(signUpRequestRefusedCommand).sort()).toEqual(['command', 'data']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      command: 'signup_refused',
    };
    const res = signUpRequestRefusedCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['data']);
    }
  });
});

describe('channelCreateRequestSchema', () => {
  it('Checks if an unknown object matches the ChannelCreateRequest interface and returns it as an instance of the ChannelCreateRequest interface', () => {
    const input: unknown = {
      name: 'General',
    };
    const res = channelCreateRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelCreateRequest: ChannelCreateRequest = res.data;
      expect(Object.keys(channelCreateRequest).sort()).toEqual(['name']);
      expect(channelCreateRequest).toEqual({
        name: 'General',
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      name: 'General',
      test: 'abc',
    };
    const res = channelCreateRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelCreateRequest: ChannelCreateRequest = res.data;
      expect(Object.keys(channelCreateRequest).sort()).toEqual(['name']);
      expect(channelCreateRequest).toEqual({
        name: 'General',
      });
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = channelCreateRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The channel name is required');
      expect(res.error.errors[0]?.path).toEqual(['name']);
    }
  });
});

describe('channelCreateCompletedSchema', () => {
  it('Checks if an unknown object matches the ChannelCreateCompleted interface and returns it as an instance of the ChannelCreateCompleted interface', () => {
    const input: unknown = {
      channel: {
        id: '1',
        name: 'General',
      },
    };
    const res = channelCreateCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelCreateCompleted: ChannelCreateCompleted = res.data;
      expect(Object.keys(channelCreateCompleted).sort()).toEqual(['channel']);
      expect(channelCreateCompleted.channel).toEqual({
        id: '1',
        name: 'General',
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      channel: {
        id: '1',
        name: 'General',
      },
      user: {
        id: 'mataro.langeraert@student.kuleuven.be',
      },
      test: 'abc',
    };
    const res = channelCreateCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelCreateCompleted: ChannelCreateCompleted = res.data;
      expect(Object.keys(channelCreateCompleted).sort()).toEqual(['channel']);
      expect(channelCreateCompleted.channel).toEqual({
        id: '1',
        name: 'General',
      });
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = channelCreateCompletedSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['channel']);
    }
  });
});

describe('channelCreateRefusedSchema', () => {
  it('Checks if an unknown object matches the ChannelCreateRefused interface and returns it as an instance of the ChannelCreateRefused interface', () => {
    const input: unknown = {
      channel_name: 'General',
      error_code: 404,
      reason: 'Channel not found',
    };
    const res = channelCreateRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelCreateRefused: ChannelCreateRefused = res.data;
      expect(Object.keys(channelCreateRefused).sort()).toEqual(['channel_name', 'error_code', 'reason']);
      expect(channelCreateRefused.channel_name).toEqual('General');
      expect(channelCreateRefused.error_code).toBe(404);
      expect(channelCreateRefused.reason).toBe('Channel not found');
    }
  });

  it('Checks if an unknown object matches the ChannelCreateRefused interface and returns it as an instance of the ChannelCreateRefused interface, with missing optionals', () => {
    const input: unknown = {
      channel_name: 'General',
      error_code: 404,
    };
    const res = channelCreateRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const channelCreateRefused: ChannelCreateRefused = res.data;
      expect(Object.keys(channelCreateRefused).sort()).toEqual(['channel_name', 'error_code']);
      expect(channelCreateRefused.channel_name).toEqual('General');
      expect(channelCreateRefused.error_code).toBe(404);
      expect(channelCreateRefused.reason).toBeUndefined();
    }
  });
});

describe('logInRequestSchema', () => {
  it('Checks if an unknown object matches the LogInRequest interface and returns it as an instance of the LogInRequest interface', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      password: 'Password12345',
    };
    const res = logInRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const logInRequest: LogInRequest = res.data;
      expect(Object.keys(logInRequest).sort()).toEqual(['password', 'user']);
      expect(logInRequest.user).toEqual({
        id: 'jonas.couwberghs@student.kuleuven.be',
      });
      expect(logInRequest.password).toBe('Password12345');
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      password: 'Password12345',
    };
    const res = logInRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const logInRequest: LogInRequest = res.data;
      expect(Object.keys(logInRequest).sort()).toEqual(['password', 'user']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      password: 'Password12345',
    };
    const res = logInRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['user']);
    }
  });
});

describe('logInCompletedSchema', () => {
  it('Checks if an unknown object matches the LogInCompleted interface and returns it as an instance of the LogInCompleted interface', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
        username: 'Jonas',
      },
      currentChannels: {
        channels: [
          { id: '1', name: 'General' },
          { id: '2', name: 'Memes' },
        ],
      },
    };
    const res = logInCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const logInRequest: LogInCompleted = res.data;
      expect(Object.keys(logInRequest).sort()).toEqual(['currentChannels', 'user']);
      expect(logInRequest.user).toEqual({
        id: 'jonas.couwberghs@student.kuleuven.be',
        username: 'Jonas',
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
        username: 'Jonas',
      },
      currentChannels: {
        channels: [
          { id: '1', name: 'General' },
          { id: '2', name: 'Memes' },
        ],
      },
      test: 'abc',
    };
    const res = logInCompletedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const logInRequest: LogInCompleted = res.data;
      expect(Object.keys(logInRequest).sort()).toEqual(['currentChannels', 'user']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = logInCompletedSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(2);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['user']);
      expect(res.error.errors[1]?.message).toBe('Required');
      expect(res.error.errors[1]?.path).toEqual(['currentChannels']);
    }
  });
});

describe('logInRefusedSchema', () => {
  it('Checks if an unknown object matches the LogInRefused interface and returns it as an instance of the LogInRefused interface', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      error_code: 401,
      reason: 'Incorrect password',
    };
    const res = logInRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const logInRefused: LogInRefused = res.data;
      expect(Object.keys(logInRefused).sort()).toEqual(['error_code', 'reason', 'user']);
      expect(logInRefused.user).toEqual({
        id: 'jonas.couwberghs@student.kuleuven.be',
      });
      expect(logInRefused.error_code).toBe(401);
      expect(logInRefused.reason).toBe('Incorrect password');
    }
  });

  it('Checks if an unknown object matches the LogInRefused interface and returns it as an instance of the LogInRefused interface, without optional fields', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      error_code: 404,
    };
    const res = logInRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const logInRefused: LogInRefused = res.data;
      expect(Object.keys(logInRefused).sort()).toEqual(['error_code', 'user']);
      expect(logInRefused.user).toEqual({
        id: 'jonas.couwberghs@student.kuleuven.be',
      });
      expect(logInRefused.reason).toBeUndefined();
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      error_code: 401,
      reason: 'Incorrect password',
      test: 5,
    };
    const res = logInRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const logInRefused: LogInRefused = res.data;
      expect(Object.keys(logInRefused).sort()).toEqual(['error_code', 'reason', 'user']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      user: {
        id: 'jonas.couwberghs@student.kuleuven.be',
      },
      reason: 'Incorrect password',
    };
    const res = logInRefusedSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['error_code']);
    }
  });
});

describe('huffmanEncodedFileSchema', () => {
  let tree: [number, string][];
  let encodedBuffer: string;
  beforeEach(() => {
    //mississippi river -> tree + encoding.
    tree = [
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
    encodedBuffer = Buffer.from('6820bfe7566ae0', 'hex').toString('base64');
  });

  it('Checks if an unknow object matches the HuffmanEncodedFile interface and returns it as an instance of the HuffmanEncodedFile interface', () => {
    const input: unknown = {
      huffman_tree: tree,
      encoded_file: encodedBuffer,
    };
    const result = huffmanEncodedFileSchema.safeParse(input);
    expect(result.success).toBeTruthy();
    if (result.success) {
      const huffman: HuffmanEncodedFile = result.data;
      expect(huffman.huffman_tree).toEqual(tree);
      expect(huffman.encoded_file).toEqual(encodedBuffer);
    }
  });

  it('Fails if the unknown object is missing a required field', () => {
    const input: unknown = {
      encoded_file: encodedBuffer,
    };
    const result = huffmanEncodedFileSchema.safeParse(input);
    expect(result.success).toBeFalsy();
    if (!result.success) {
      expect(result.error.errors.length).toBe(1);
      expect(result.error.errors[0]?.message).toBe('Required');
      expect(result.error.errors[0]?.path).toEqual(['huffman_tree']);
    }
  });

  it('Fails if the the tree or message is empty', () => {
    const input: unknown = {
      huffman_tree: [],
      encoded_file: '',
    };
    const result = huffmanEncodedFileSchema.safeParse(input);
    expect(result.success).toBeFalsy();
    if (!result.success) {
      expect(result.error.errors.length).toBe(2);
      expect(result.error.errors[0]?.message).toBe('We can not send an empty tree');
      expect(result.error.errors[0]?.path).toEqual(['huffman_tree']);
      expect(result.error.errors[1]?.message).toBe('We can not send an empty file');
      expect(result.error.errors[1]?.path).toEqual(['encoded_file']);
    }
  });
});

describe('outgoingEncodedFileSchema', () => {
  it('Checks if an unknown object matches the OutgoingEncodedFile interface and returns it as an instance of the OutgoingEncodedFile interface', () => {
    const input: unknown = {
      channel_id: 'test_channel',
      file: {
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      },
      file_name: 'testFile.txt',
    };
    const res = outgoingEncodedFileSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const outgoingEncodedFile: OutgoingEncodedFile = res.data;
      expect(Object.keys(outgoingEncodedFile).sort()).toEqual(['channel_id', 'file', 'file_name']);
      expect(outgoingEncodedFile.channel_id).toBe('test_channel');
      expect(outgoingEncodedFile.file).toEqual({
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      });
      expect(outgoingEncodedFile.file_name).toEqual('testFile.txt');
    }
  });

  it('Filters out unnecesarry fields', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
      channel_id: 'test_channel',
      file: {
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from(Buffer.from([97, 71]).toString('base64')).toString('base64'),
      },
      file_name: 'someName.txt',
    };
    const res = outgoingEncodedFileSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const outgoingEncodedFile: OutgoingEncodedFile = res.data;
      expect(Object.keys(outgoingEncodedFile).sort()).toEqual(['channel_id', 'file', 'file_name']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      channel_id: 'test_channel',
    };
    const res = outgoingEncodedFileSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(2);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['file']);
      expect(res.error.errors[1]?.message).toBe('Required');
      expect(res.error.errors[1]?.path).toEqual(['file_name']);
    }
  });
});

describe('incomingEncodedFileSchema', () => {
  it('Checks if an unknown object matches the IncomingEncodedFile interface and returns it as an instance of the IncomingEncodedFile interface', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
      channel_id: 'test_channel',
      file: {
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      },
      file_name: 'testFile.txt',
    };
    const res = incomingEncodedFileSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const incomingEncodedFile: IncomingEncodedFile = res.data;
      expect(Object.keys(incomingEncodedFile).sort()).toEqual(['channel_id', 'file', 'file_name', 'user']);
      expect(incomingEncodedFile.user).toEqual({
        id: 'test@test.com',
        username: 'Testaccount 1',
      });
      expect(incomingEncodedFile.channel_id).toBe('test_channel');
      expect(incomingEncodedFile.file).toEqual({
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      });

      expect(incomingEncodedFile.file_name).toEqual('testFile.txt');
    }
  });

  it('Filters out unnecesarry fields', () => {
    const input: unknown = {
      test: 'test',
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
      channel_id: 'test_channel',
      file: {
        huffman_tree: [
          [115, '00'],
          [3, '01'],
          [80, '100'],
          [101, '101'],
          [110, '110'],
          [105, '111'],
        ],
        encoded_file: Buffer.from([97, 71]).toString('base64'),
      },
      file_name: 'testFile.txt',
    };
    const res = incomingEncodedFileSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const incomingEncodedFile: IncomingEncodedFile = res.data;
      expect(Object.keys(incomingEncodedFile).sort()).toEqual(['channel_id', 'file', 'file_name', 'user']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
      channel_id: 'test_channel',
    };
    const res = incomingEncodedFileSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(2);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['file']);
      expect(res.error.errors[1]?.message).toBe('Required');
      expect(res.error.errors[1]?.path).toEqual(['file_name']);
    }
  });
});

describe('fileEncodingErrorSchema', () => {
  it('Checks if an unknown object matches the FileEncodingError interface and returns it as an instance of the FileEncodingError interface', () => {
    const input: unknown = {
      error_code: 404,
      reason: 'Channel not found',
    };
    const res = fileEncodingErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const fileEncodingError: FileEncodingError = res.data;
      expect(Object.keys(fileEncodingError).sort()).toEqual(['error_code', 'reason']);
      expect(fileEncodingError.error_code).toBe(404);
      expect(fileEncodingError.reason).toBe('Channel not found');
    }
  });

  it('Filters out unnecesarry fields', () => {
    const input: unknown = {
      test: 'test',
      error_code: 404,
      reason: 'Channel not found',
    };
    const res = fileEncodingErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const fileEncodingError: FileEncodingError = res.data;
      expect(Object.keys(fileEncodingError).sort()).toEqual(['error_code', 'reason']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      error_code: 404,
    };
    const res = fileEncodingErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['reason']);
    }
  });
});

describe('serverErrorSchema', () => {
  it('Passes if a valid InternalError is passed', () => {
    const input: unknown = {
      error_code: 0,
      message: 'Index out of bounds',
    };
    const res = serverErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const error: ServerError = res.data;
      expect(error.error_code).toBe(0);
      expectTypeOf(error).not.toEqualTypeOf<InternalError>();
      if (error.error_code === 0) {
        expectTypeOf(error).toEqualTypeOf<InternalError>();
        expect(error.message).toBe('Index out of bounds');
      }
    }
  });

  it('Fails if an invalid InternalError is passed', () => {
    const input: unknown = {
      error_code: 0,
      message: 2,
    };
    const res = serverErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a valid ParsingError is passed', () => {
    const input: unknown = {
      error_code: 1,
      errors: [
        {
          path: ['data', 'user'],
          message: 'Expected object, received string',
        },
        {
          path: ['command'],
          message: 'Expected string, received number',
        },
      ],
    };
    const res = serverErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const error: ServerError = res.data;
      expect(error.error_code).toBe(1);
      expectTypeOf(error).not.toEqualTypeOf<ParsingError>();
      if (error.error_code === 1) {
        expectTypeOf(error).toEqualTypeOf<ParsingError>();
        expect(error.errors).toEqual([
          {
            path: ['data', 'user'],
            message: 'Expected object, received string',
          },
          {
            path: ['command'],
            message: 'Expected string, received number',
          },
        ]);
      }
    }
  });

  it('Fails if an invalid ParsingError is passed', () => {
    const input: unknown = {
      error_code: 1,
      errors: {
        path: ['data', 'user'],
        message: 'Expected object, received string',
      },
    };
    const res = serverErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a valid MissingPermissionsError is passed', () => {
    const input: unknown = {
      error_code: 2,
      command: 'send_message',
    };
    const res = serverErrorSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const error: ServerError = res.data;
      expect(error.error_code).toBe(2);
      expectTypeOf(error).not.toEqualTypeOf<MissingPermissionsError>();
      if (error.error_code === 2) {
        expectTypeOf(error).toEqualTypeOf<MissingPermissionsError>();
        expect(error.command).toBe('send_message');
      }
    }
  });

  it('Fails if an invalid MissingPermissionsError is passed', () => {
    const input: unknown = {
      error_code: 2,
      commmand: 'send_message',
    };
    const res = serverErrorSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});

describe('nicknameChangeRefusedSchema', () => {
  it('Checks if an unknown object matches the NicknameChangeRefused interface and returns it as an instance of the NicknameChangeRefused interface', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
      error_code: 4,
      reason: 'Invalid nickname',
    };
    const res = nicknameChangeRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRefused: NicknameChangeRefused = res.data;
      expect(Object.keys(nicknameChangeRefused).sort()).toEqual(['error_code', 'reason', 'user']);
      expect(nicknameChangeRefused.user).toEqual({
        id: 'test@test.com',
      });
      expect(nicknameChangeRefused.error_code).toBe(4);
      expect(nicknameChangeRefused.reason).toBe('Invalid nickname');
    }
  });

  it('Checks if an unknown object matches the NicknameChangeRefused interface and returns it as an instance of the NicknameChangeRefused interface without optional fields', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
      error_code: 4,
    };
    const res = nicknameChangeRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRefused: NicknameChangeRefused = res.data;
      expect(Object.keys(nicknameChangeRefused).sort()).toEqual(['error_code', 'user']);
      expect(nicknameChangeRefused.user).toEqual({
        id: 'test@test.com',
      });
      expect(nicknameChangeRefused.error_code).toBe(4);
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
      },
      error_code: 4,
      reason: 'Invalid nickname',
      test: 'test',
    };
    const res = nicknameChangeRefusedSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRefused: NicknameChangeRefused = res.data;
      expect(Object.keys(nicknameChangeRefused).sort()).toEqual(['error_code', 'reason', 'user']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {
      error_code: 4,
      reason: 'Invalid nickname',
    };
    const res = nicknameChangeRefusedSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['user']);
    }
  });
});

describe('nicknameChangeSuccessSchema', () => {
  it('Checks if an unknown object matches the NicknameChangeSuccess interface and returns it as an instance of the NicknameChangeSuccess interface', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
    };
    const res = nicknameChangeSuccessSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeSuccess: NicknameChangeSuccess = res.data;
      expect(Object.keys(nicknameChangeSuccess).sort()).toEqual(['user']);
      expect(nicknameChangeSuccess.user).toEqual({
        id: 'test@test.com',
        username: 'Testaccount 1',
      });
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      user: {
        id: 'test@test.com',
        username: 'Testaccount 1',
      },
      test: 'test',
    };
    const res = nicknameChangeSuccessSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRefused: NicknameChangeSuccess = res.data;
      expect(Object.keys(nicknameChangeRefused).sort()).toEqual(['user']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = nicknameChangeSuccessSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Required');
      expect(res.error.errors[0]?.path).toEqual(['user']);
    }
  });
});

describe('nicknameChangeRequestSchema', () => {
  it('Checks if an unknown object matches the NicknameChangeRequest interface and returns it as an instance of the NicknameChangeRequest interface', () => {
    const input: unknown = {
      nickname: 'Aapje123',
    };
    const res = nicknameChangeRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRequest: NicknameChangeRequest = res.data;
      expect(Object.keys(nicknameChangeRequest).sort()).toEqual(['nickname']);
      expect(nicknameChangeRequest.nickname).toBe('Aapje123');
    }
  });

  it('Filters out unwanted fields in the object', () => {
    const input: unknown = {
      nickname: 'Aapje123',
      user: { id: 'test@test.com' },
    };
    const res = nicknameChangeRequestSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const nicknameChangeRequest: NicknameChangeRequest = res.data;
      expect(Object.keys(nicknameChangeRequest).sort()).toEqual(['nickname']);
    }
  });

  it("Fails if the unknown object doesn't have the required fields", () => {
    const input: unknown = {};
    const res = nicknameChangeRequestSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The user nickname is required');
      expect(res.error.errors[0]?.path).toEqual(['nickname']);
    }
  });
});

describe('toServerCommandSchema', () => {
  it('Passes if a buffer representing a valid SendMessageCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'send_message',
        data: {
          msg: 'Hello world!',
          channel: 'general',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToServerCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('send_message');
      // The data isn't confirmed to be an instance of the OutgoingMessage interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<OutgoingMessage>();
      if (command.command === 'send_message') {
        expectTypeOf(command.data).toEqualTypeOf<OutgoingMessage>();
        expect(command.data).toEqual({
          msg: 'Hello world!',
          channel: 'general',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid SendMessageCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'send_message',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid RequestMessageHistoryCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'request_message_history',
        data: {
          channel_id: 'general',
          amount: 25,
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToServerCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('request_message_history');
      // The data isn't confirmed to be an instance of the RequestMessageHistory interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<RequestMessageHistory>();
      if (command.command === 'request_message_history') {
        expectTypeOf(command.data).toEqualTypeOf<RequestMessageHistory>();
        expect(command.data).toEqual({
          channel_id: 'general',
          amount: 25,
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid RequestMessageHistoryCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'request_message_history',
        data: {
          channel_id: 'general',
          amount: '25',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid LookupRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'lookup_request',
        data: {
          time: '2023-11-07T18:44:36.134+02:00',
          channel_id: 'general',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToServerCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('lookup_request');
      // The data isn't confirmed to be an instance of the LookupRequest interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<LookupRequest>();
      if (command.command === 'lookup_request') {
        expectTypeOf(command.data).toEqualTypeOf<LookupRequest>();
        expect(command.data).toEqual({
          time: DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }),
          channel_id: 'general',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid LookupRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'lookup_request',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid ChannelJoinRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'channel_join_request',
        data: {
          channel_id: '1',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToServerCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('channel_join_request');
      // The data isn't confirmed to be an instance of the ChannelJoinRequest interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<ChannelJoinRequest>();
      if (command.command === 'channel_join_request') {
        expectTypeOf(command.data).toEqualTypeOf<ChannelJoinRequest>();
        expect(command.data).toEqual({
          channel_id: '1',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid ChannelJoinRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'channel_join_request',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid LogInRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'login_request',
        data: {
          user: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          password: 'Password12345',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToServerCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('login_request');
      // The data isn't confirmed to be an instance of the LogInRequest interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<LogInRequest>();
      if (command.command === 'login_request') {
        expectTypeOf(command.data).toEqualTypeOf<LogInRequest>();
        expect(command.data).toEqual({
          user: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          password: 'Password12345',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid LogInRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'login_request',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Fails when an unkown command is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'crash_system',
        data: {
          user: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          password: 'Password12345',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid OutgoingEncodedFileCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'outgoing_encoded_file',
        data: {
          channel_id: 'test_channel',
          file: {
            huffman_tree: [
              [115, '00'],
              [3, '01'],
              [80, '100'],
              [101, '101'],
              [110, '110'],
              [105, '111'],
            ],
            encoded_file: Buffer.from([97, 71]).toString('base64'),
          },
          file_name: 'testFile.txt',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToServerCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('outgoing_encoded_file');
      // The data isn't confirmed to be an instance of the OutgoingEncodedFile interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<OutgoingEncodedFile>();
      if (command.command === 'outgoing_encoded_file') {
        expectTypeOf(command.data).toEqualTypeOf<OutgoingEncodedFile>();
        expect(command.data).toEqual({
          channel_id: 'test_channel',
          file: {
            huffman_tree: [
              [115, '00'],
              [3, '01'],
              [80, '100'],
              [101, '101'],
              [110, '110'],
              [105, '111'],
            ],
            encoded_file: Buffer.from([97, 71]).toString('base64'),
          },
          file_name: 'testFile.txt',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid OutgoingEncodedFileCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'outgoing_encoded_file',
        data: {
          channel_id: 'test_channel',
          file: {
            huffman_tree: [
              [115, '00'],
              [3, '01'],
              [80, '100'],
              [101, '101'],
              [110, '110'],
              [105, '111'],
            ],
          },
          file_name: 'testFile.txt',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid NicknameChangeRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'nickname_change_request',
        data: {
          nickname: 'Kaas',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToServerCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('nickname_change_request');
      // The data isn't confirmed to be an instance of the OutgoingEncodedFile interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<NicknameChangeRequest>();
      if (command.command === 'nickname_change_request') {
        expectTypeOf(command.data).toEqualTypeOf<NicknameChangeRequest>();
        expect(command.data).toEqual({
          nickname: 'Kaas',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid NicknameChangeRequestCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'nickname_change_request',
        data: {
          nickname: '',
        },
      }),
    );
    const res = toServerCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('The user nickname can not be an empty string');
      expect(res.error.errors[0]?.path).toEqual(['data', 'nickname']);
    }
  });
});

describe('toClientCommandSchema', () => {
  it('Passes if a buffer representing a valid MessageReceivedCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_received',
        data: {
          sender: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          msg: 'Hello world!',
          channel: 'general',
          time: '2023-11-07T18:44:36.134+02:00',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('message_received');
      // The data isn't confirmed to be an instance of the IncomingMessage interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<IncomingMessage>();
      if (command.command === 'message_received') {
        expectTypeOf(command.data).toEqualTypeOf<IncomingMessage>();
        expect(command.data).toEqual({
          sender: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          msg: 'Hello world!',
          channel: 'general',
          time: DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }),
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid MessageReceivedCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_received',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid MessageSendingErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_sending_error',
        data: {
          error_code: 404,
          reason: 'Channel does not exist',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('message_sending_error');
      // The data isn't confirmed to be an instance of the MessageSendingError interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<MessageSendingError>();
      if (command.command === 'message_sending_error') {
        expectTypeOf(command.data).toEqualTypeOf<MessageSendingError>();
        expect(command.data).toEqual({
          error_code: 404,
          reason: 'Channel does not exist',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid MessageSendingErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_sending_error',
        data: {
          error_code: 'Not found',
          reason: 'Channel does not exist',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid MessageHistoryResponseCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_history_response',
        data: {
          channel_id: 'general',
          messages: [
            {
              sender: {
                id: 'test@test.com',
                username: 'Testaccount 1',
              },
              time: '2023-11-29T13:03:15.263Z',
              msg: 'Hello',
              channel: 'general',
            },
            {
              sender: {
                id: 'test@test.com',
                username: 'Testaccount 1',
              },
              time: '2023-11-29T13:03:25.258Z',
              msg: 'World',
              channel: 'general',
            },
          ],
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('message_history_response');
      // The data isn't confirmed to be an instance of the MessageHistoryResponse interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<MessageHistoryResponse>();
      if (command.command === 'message_history_response') {
        expectTypeOf(command.data).toEqualTypeOf<MessageHistoryResponse>();
        expect(command.data).toEqual({
          channel_id: 'general',
          messages: [
            {
              sender: {
                id: 'test@test.com',
                username: 'Testaccount 1',
              },
              time: DateTime.fromISO('2023-11-29T13:03:15.263Z', { setZone: true }),
              msg: 'Hello',
              channel: 'general',
            },
            {
              sender: {
                id: 'test@test.com',
                username: 'Testaccount 1',
              },
              time: DateTime.fromISO('2023-11-29T13:03:25.258Z', { setZone: true }),
              msg: 'World',
              channel: 'general',
            },
          ],
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid MessageHistoryResponseCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_history_response',
        data: {
          channel_id: 'general',
          messages: {
            sender: {
              id: 'test@test.com',
              username: 'Testaccount 1',
            },
            time: '2023-11-29T13:03:15.263Z',
            msg: 'Hello',
            channel: 'general',
          },
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid MessageHistoryErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_history_error',
        data: {
          error_code: 404,
          reason: 'Channel does not exist',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('message_history_error');
      // The data isn't confirmed to be an instance of the MessageHistoryError interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<MessageHistoryError>();
      if (command.command === 'message_history_error') {
        expectTypeOf(command.data).toEqualTypeOf<MessageHistoryError>();
        expect(command.data).toEqual({
          error_code: 404,
          reason: 'Channel does not exist',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid MessageHistoryErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'message_history_error',
        data: {
          error_code: 'Not found',
          reason: 'Channel does not exist',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid LookupResultCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'lookup_result',
        data: {
          messages: [
            {
              sender: {
                id: 'jonas.couwberghs@student.kuleuven.be',
              },
              msg: 'Hello world!',
              channel: 'general',
              time: '2023-11-07T18:44:36.134+02:00',
            },
            {
              sender: {
                id: 'jonas.couwberghs@student.kuleuven.be',
              },
              msg: 'Hello world!',
              channel: 'general',
              time: '2023-11-07T18:44:36.134+02:00',
            },
            {
              sender: {
                id: 'jonas.couwberghs@student.kuleuven.be',
              },
              msg: 'Hello world!',
              channel: 'general',
              time: '2023-11-07T18:44:36.134+02:00',
            },
          ],
          resultIndex: 2,
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('lookup_result');
      // The data isn't confirmed to be an instance of the Message interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<LookupResult>();
      if (command.command === 'lookup_result') {
        expectTypeOf(command.data).toEqualTypeOf<LookupResult>();
        expect(command.data).toEqual({
          messages: [
            {
              sender: {
                id: 'jonas.couwberghs@student.kuleuven.be',
              },
              msg: 'Hello world!',
              channel: 'general',
              time: DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }),
            },
            {
              sender: {
                id: 'jonas.couwberghs@student.kuleuven.be',
              },
              msg: 'Hello world!',
              channel: 'general',
              time: DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }),
            },
            {
              sender: {
                id: 'jonas.couwberghs@student.kuleuven.be',
              },
              msg: 'Hello world!',
              channel: 'general',
              time: DateTime.fromISO('2023-11-07T18:44:36.134+02:00', { setZone: true }),
            },
          ],
          resultIndex: 2,
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid LookupResultCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'lookup_result',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid LookupErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'lookup_error',
        data: {
          error_code: 404,
          reason: 'The requested channel does not exist',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('lookup_error');
      // The data isn't confirmed to be an instance of the LookupError interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<LookupError>();
      if (command.command === 'lookup_error') {
        expectTypeOf(command.data).toEqualTypeOf<LookupError>();
        expect(command.data).toEqual({
          error_code: 404,
          reason: 'The requested channel does not exist',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid LookupErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'lookup_error',
        data: {
          error_code: 'Not found',
          reason: 'The requested channel does not exist',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid ChannelList is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'channel_list',
        data: {
          channels: [],
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('channel_list');
      // The data isn't confirmed to be an instance of the ChannelList interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<ChannelList>();
      if (command.command === 'channel_list') {
        expectTypeOf(command.data).toEqualTypeOf<ChannelList>();
        expect(command.data).toEqual({
          channels: [],
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid ChannelList is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'channel_list',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid ChannelJoinCompleted is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'channel_join_completed',
        data: {
          channel: {
            id: '1',
            name: 'General',
          },
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('channel_join_completed');
      // The data isn't confirmed to be an instance of the ChannelJoinCompleted interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<ChannelJoinCompleted>();
      if (command.command === 'channel_join_completed') {
        expectTypeOf(command.data).toEqualTypeOf<ChannelJoinCompleted>();
        expect(command.data).toEqual({
          channel: {
            id: '1',
            name: 'General',
          },
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid ChannelJoinCompleted is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'channel_join_completed',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid LogInCompleted is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'login_completed',
        data: {
          user: {
            id: 'jonas.couwberghs@student.kuleuven.be',
            username: 'Jonas',
          },
          currentChannels: {
            channels: [
              { id: '1', name: 'General' },
              { id: '2', name: 'Memes' },
            ],
          },
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('login_completed');
      // The data isn't confirmed to be an instance of the LogInCompleted interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<LogInCompleted>();
      if (command.command === 'login_completed') {
        expectTypeOf(command.data).toEqualTypeOf<LogInCompleted>();
        expect(command.data).toEqual({
          user: {
            id: 'jonas.couwberghs@student.kuleuven.be',
            username: 'Jonas',
          },
          currentChannels: {
            channels: [
              { id: '1', name: 'General' },
              { id: '2', name: 'Memes' },
            ],
          },
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid LogInCompleted is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'login_completed',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid LogInRefused is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'login_refused',
        data: {
          user: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          error_code: 401,
          reason: 'Incorrect password',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('login_refused');
      // The data isn't confirmed to be an instance of the LogInRefused interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<LogInRefused>();
      if (command.command === 'login_refused') {
        expectTypeOf(command.data).toEqualTypeOf<LogInRefused>();
        expect(command.data).toEqual({
          user: {
            id: 'jonas.couwberghs@student.kuleuven.be',
          },
          error_code: 401,
          reason: 'Incorrect password',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid LogInRefused is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'login_refused',
        data: {
          id: 'jonas.couwberghs@student.kuleuven.be',
          username: 'Jonas',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid IncomingEncodedFileCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'incoming_encoded_file',
        data: {
          user: {
            id: 'test@test.com',
            username: 'Test account',
          },
          channel_id: 'test_channel',
          file: {
            huffman_tree: [
              [115, '00'],
              [3, '01'],
              [80, '100'],
              [101, '101'],
              [110, '110'],
              [105, '111'],
            ],
            encoded_file: Buffer.from([97, 71]).toString('base64'),
          },
          file_name: 'testFile.txt',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('incoming_encoded_file');
      // The data isn't confirmed to be an instance of the IncomingEncodedFile interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<IncomingEncodedFile>();
      if (command.command === 'incoming_encoded_file') {
        expectTypeOf(command.data).toEqualTypeOf<IncomingEncodedFile>();
        expect(command.data).toEqual({
          user: {
            id: 'test@test.com',
            username: 'Test account',
          },
          channel_id: 'test_channel',
          file: {
            huffman_tree: [
              [115, '00'],
              [3, '01'],
              [80, '100'],
              [101, '101'],
              [110, '110'],
              [105, '111'],
            ],
            encoded_file: Buffer.from([97, 71]).toString('base64'),
          },
          file_name: 'testFile.txt',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid IncomingEncodedFile is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'incoming_encoded_file',
        data: {
          channel_id: 'test_channel',
          file: {
            huffman_tree: [
              [115, '00'],
              [3, '01'],
              [80, '100'],
              [101, '101'],
              [110, '110'],
              [105, '111'],
            ],
            encoded_file: Buffer.from([97, 71]).toString('base64'),
          },
          file_name: 'testFile.txt',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid FileEncodingErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'file_encoding_error',
        data: {
          error_code: 404,
          reason: 'Channel not found',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('file_encoding_error');
      // The data isn't confirmed to be an instance of the FileEncodingError interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<FileEncodingError>();
      if (command.command === 'file_encoding_error') {
        expectTypeOf(command.data).toEqualTypeOf<FileEncodingError>();
        expect(command.data).toEqual({
          error_code: 404,
          reason: 'Channel not found',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid FileEncodingError is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'file_encoding_error',
        data: {
          error_code: '404',
          reason: 'Channel not found',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid ServerErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'server_error',
        data: {
          error_code: 0,
          message: 'Index out of bounds',
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('server_error');
      // The data isn't confirmed to be an instance of the ServerError interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<ServerError>();
      if (command.command === 'server_error') {
        expectTypeOf(command.data).toEqualTypeOf<ServerError>();
        expect(command.data).toEqual({
          error_code: 0,
          message: 'Index out of bounds',
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid ServerErrorCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'server_error',
        data: {
          error_code: 0,
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid NicknameChangeSuccessCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'nickname_change_success',
        data: {
          user: {
            id: 'test@test.com',
            username: 'Aap',
          },
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('nickname_change_success');
      // The data isn't confirmed to be an instance of the NicknameChangeSuccess interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<NicknameChangeSuccess>();
      if (command.command === 'nickname_change_success') {
        expectTypeOf(command.data).toEqualTypeOf<NicknameChangeSuccess>();
        expect(command.data).toEqual({
          user: {
            id: 'test@test.com',
            username: 'Aap',
          },
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid NicknameChangeSuccessCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'nickname_change_success',
        data: {
          user: {
            username: 'Aap',
          },
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });

  it('Passes if a buffer representing a valid NicknameChangeRefusedCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'nickname_change_refused',
        data: {
          user: {
            id: 'test@test.com',
          },
          error_code: 4,
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeTruthy();
    if (res.success) {
      const command: ToClientCommand = res.data;
      expect(Object.keys(command).sort()).toEqual(['command', 'data']);
      expect(command.command).toBe('nickname_change_refused');
      // The data isn't confirmed to be an instance of the NicknameChangeRefused interface until the command gets confirmed
      expectTypeOf(command.data).not.toEqualTypeOf<NicknameChangeRefused>();
      if (command.command === 'nickname_change_refused') {
        expectTypeOf(command.data).toEqualTypeOf<NicknameChangeRefused>();
        expect(command.data).toEqual({
          user: {
            id: 'test@test.com',
          },
          error_code: 4,
        });
      }
    }
  });

  it('Fails if a buffer representing a invalid NicknameChangeRefusedCommand is passed', () => {
    const input: unknown = Buffer.from(
      JSON.stringify({
        command: 'nickname_change_refused',
        data: {
          error_code: 4,
        },
      }),
    );
    const res = toClientCommandSchema.safeParse(input);
    expect(res.success).toBeFalsy();
    if (!res.success) {
      expect(res.error.errors.length).toBe(1);
      expect(res.error.errors[0]?.message).toBe('Invalid input');
      expect(res.error.errors[0]?.path).toEqual([]);
    }
  });
});
