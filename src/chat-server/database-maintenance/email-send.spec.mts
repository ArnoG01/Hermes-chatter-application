// @author: Mathias Brosens
// @date: 2023-12-03

import type { UserEntry } from '../../database/database-interfaces.mjs';
import { vi, describe, it, expect, afterAll, beforeEach } from 'vitest';
import { sendMailToUser } from './email-send.mjs';
import * as nodemailer from 'nodemailer';
import { promises } from 'fs';

const emailTemplatePath = 'src/chat-server/database-maintenance/email-template.html';
const htmlBody = await promises.readFile(emailTemplatePath, 'utf8');

let receivedClientId = '';
let receivedClientSecret = '';
let receivedCredentials = {};
let receivedTransport = {};
let receivedMailOptions = {};

vi.stubEnv('MAIL_ADRESS', 'mocked@mocked.com');
vi.stubEnv('clientID', 'mocked_client_id');
vi.stubEnv('clientSecret', 'mocked_client_secret');
vi.stubEnv('refreshToken', 'mocked_refresh_token');

vi.mock('googleapis', async () => {
  const mod = await vi.importActual<typeof import('googleapis')>('googleapis');
  return {
    ...mod,
    Auth: {
      OAuth2Client: vi.fn((clientId: string, clientSecret: string) => {
        receivedClientId = clientId;
        receivedClientSecret = clientSecret;
        return {
          setCredentials: (credentials: object) => {
            receivedCredentials = credentials;
          },
          getAccessToken: () => Promise.resolve({ token: 'mocked_access_token' }),
        };
      }),
    },
  };
});

vi.mock('nodemailer', async () => {
  const mod = await vi.importActual<typeof import('nodemailer')>('nodemailer');
  return {
    ...mod,
    createTransport: (transport: nodemailer.TransportOptions) => {
      receivedTransport = transport;
      // const transporter = nodemailer.createTransport(transport);
      return {
        sendMail: (mailOptions: object) => {
          receivedMailOptions = mailOptions;
          return Promise.resolve();
        },
      };
    },
  };
});

beforeEach(() => {
  receivedClientId = '';
  receivedClientSecret = '';
  receivedCredentials = {};
  receivedTransport = {};
  receivedMailOptions = {};
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.clearAllMocks();
});

describe('Test mail sending function', () => {
  it('should send an email with the username of the user succesfully', async () => {
    const testUser: UserEntry = {
      email_ID: 'mathias.brosens@student.kuleuven.be',
      user_name: 'Mathias',
      last_seen_utc_timestamp: 'djsq',
      hashed_pass: '99ac8bf4bf76806c',
      channels: ['1', '2'],
      self_destruct_at_utc_timestamp: 'dmqj',
      friends: [],
      destroy_warning: false,
    };

    await sendMailToUser(testUser);

    const emailContent = htmlBody.replace('USER_NICKNAME', 'User ' + testUser.user_name);

    expect(receivedClientId).toBe('mocked_client_id');
    expect(receivedClientSecret).toBe('mocked_client_secret');
    expect(receivedCredentials).toEqual({ refresh_token: 'mocked_refresh_token' });

    expect(receivedTransport).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: 'mocked@mocked.com',
        clientId: 'mocked_client_id',
        clientSecret: 'mocked_client_secret',
        refreshToken: 'mocked_refresh_token',
        accessToken: 'mocked_access_token',
      },
    });

    expect(receivedMailOptions).toEqual({
      from: 'mocked@mocked.com',
      to: testUser.email_ID,
      subject: 'Account Deletion Notice',
      html: emailContent,
    });
  });
});
