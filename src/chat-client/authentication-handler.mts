// @author Pieter Vanderschueren, Mataro Langeraert
// @date 2023-12-04

import type {
  LogInCompleted,
  LogInRefused,
  LogInRequestCommand,
  SignUpRequest,
  SignUpRequestCommand,
  SignUpRefused,
  SignUpCompleted,
  UserNick,
} from '../protocol/proto.mjs';
import type { IWebSocket } from '../protocol/ws-interface.mjs';
import { passwordSchema } from '../protocol/proto.zod.mjs';
import { userIdSchema } from '../protocol/proto.zod.mjs';
import { passwordStrength } from './pass-entropy.mjs';
import { ChatClient } from './chat-client.mjs';
import * as inquirer from '@inquirer/prompts';
import { Color } from './color-codes.mjs';
import { Chalk } from 'chalk';
import Debug from 'debug';

const debug = Debug('chatter:login-handler');

export const AuthenticationHandler = {
  onLoginRequestTimedOut,
  onLoginRefused,
  onLoginCompleted,
  authenticateUser,
  onSignUpRefused,
  onSignUpCompleted,
  loginUser,
  registerUser,
  passwordIteration,
  printPasswordRequirements,
  passwordStrengthChecker,
  passwordValidityChecker,
};

const MAX_PASSWORD_ATTEMPTS = 3;

let requestTimeout: NodeJS.Timeout;

/**
 * Handles the user login for the chat client: asks for email and password and sends a LoginRequest to the server
 *  - debug mode: uses a predefined email and password
 *
 * @param ws - websocket which is used to send and receive messages
 */
async function authenticateUser(ws: IWebSocket) {
  const answers = await inquirer.select({
    message: 'What do you want to do?',
    choices: [
      { name: 'Log in', value: 'login' },
      { name: 'Register', value: 'register' },
      { name: 'Exit', value: 'exit' },
    ],
  });
  switch (answers) {
    case 'login':
      await AuthenticationHandler.loginUser(ws);
      break;
    case 'register':
      await AuthenticationHandler.registerUser(ws);
      break;
    case 'exit':
      exit();
      break;
    default:
      throw new Error('Unknown choice');
  }
}

/**
 * exits the application
 */
function exit() {
  process.exit(0);
}

/**
 * Handles the user login for the chat client: asks for email and password and sends a LoginRequest to the server
 *
 * @param ws - websocket which is used to send and receive messages
 */
async function loginUser(ws: IWebSocket) {
  const userId = await inquirer.input({ message: 'Email: ' });
  while (!userIdSchema.safeParse(userId).success) {
    Color.logError('Password or email is incorrect');
    void AuthenticationHandler.authenticateUser(ws);
    return;
  }

  const userPassword: string = await inquirer.password({ message: 'Password: ', mask: '*' });
  const passwordCheck = passwordSchema.safeParse(userPassword);

  // If parsing fails the password is invalid since there can't be a user in the database with an invalid password.
  // No need to send a request to the server.
  if (!passwordCheck.success) {
    Color.logError('Password or email is incorrect');
    void AuthenticationHandler.authenticateUser(ws);
    return;
  }
  const requestLoginCommand: LogInRequestCommand = {
    command: 'login_request',
    data: { user: { id: userId }, password: userPassword },
  };
  ws.send(JSON.stringify(requestLoginCommand));
  requestTimeout = setTimeout(AuthenticationHandler.onLoginRequestTimedOut, 10000);
}

/**
 * Handles the user registration for the chat client: asks for email, username and password and sends a SignUpRequest to the server
 *
 * @param ws - websocket which is used to send and receive messages
 */
async function registerUser(ws: IWebSocket) {
  const answer = await inquirer.select({
    message: 'In order to register, you need to agree that we store your data conform to the GDPR.',
    choices: [
      { name: 'I agree', value: 'agree' },
      { name: 'I do not agree', value: 'disagree' },
    ],
  });
  if (answer === 'agree') {
    const userId = await inquirer.input({ message: 'Email: ' });
    if (!userIdSchema.safeParse(userId).success) {
      console.error('Email is invalid, please try again');
      void AuthenticationHandler.authenticateUser(ws);
      return;
    }
    const userName: UserNick = await inquirer.input({ message: 'Username: ' });
    let userPassword: boolean | string = true;
    while (userPassword === true) {
      userPassword = await passwordIteration();
      if (userPassword === false) {
        void AuthenticationHandler.authenticateUser(ws);
        return;
      }
    }

    const userPasswordRepeat: string = await inquirer.password({ message: 'Repeat password: ', mask: '*' });
    if (userPassword !== userPasswordRepeat) {
      Color.logError('Passwords do not match');
      void AuthenticationHandler.authenticateUser(ws);
      return;
    }
    const requestLoginCommand: SignUpRequestCommand = {
      command: 'signup_request',
      data: { user: { id: userId, username: userName }, password: userPassword } as SignUpRequest,
    };
    ws.send(JSON.stringify(requestLoginCommand));
    requestTimeout = setTimeout(AuthenticationHandler.onLoginRequestTimedOut, 10000);
  } else {
    process.exit(0);
  }
}

/**
 * Handles the refusal of a signup request and throws an error.
 *
 * @param ws - websocket which is used to send and receive messages
 * @param data - signupRefused data: error code and reason
 *             -- error_code: 103 - email is already in use
 */
function onSignUpRefused(ws: IWebSocket, data: SignUpRefused) {
  clearTimeout(requestTimeout);
  switch (data.error_code) {
    case 103:
      Color.logError('Email already in use');
      void AuthenticationHandler.authenticateUser(ws);
      break;
    default:
      Color.logError(`Unknown error code: ${data.error_code}, reason: ${data.reason} contact the administrator`);
  }
}

/**
 * Handles the completion of a signup request and launches the chat application.
 *
 * @param ws - websocket which is used to send and receive messages
 * @param data - signupCompleted data: id and username, if known user
 */
function onSignUpCompleted(ws: IWebSocket, data: SignUpCompleted) {
  debug('SignUpCompleted received');
  clearTimeout(requestTimeout);
  ChatClient.launchApp(ws, data);
}

/**
 * Handles the completion of a login request and launches the chat application.
 *
 * @param ws - websocket which is used to send and receive messages
 * @param data - loginCompleted data: id and username, if known user
 */
function onLoginCompleted(ws: IWebSocket, data: LogInCompleted) {
  clearTimeout(requestTimeout);
  ChatClient.launchApp(ws, data);
}

/**
 * Handles the refusal of a login request and throws an error.
 *
 * @param ws - websocket which is used to send and receive messages
 * @param data - loginRefused data: error code and reason
 *             -- error_code: 101 - user is not known to the database
 *             -- error_code: 102 - password is incorrect
 */
async function onLoginRefused(ws: IWebSocket, data: LogInRefused) {
  clearTimeout(requestTimeout);
  switch (data.error_code) {
    case 101:
    case 102:
      Color.logError(`Password or email is incorrect`);
      await AuthenticationHandler.authenticateUser(ws);
      break;
    default:
      Color.logError(`Unknown error code: ${data.error_code}, reason: ${data.reason}`);
      break;
  }
}

/**
 * Handles timed out event of a login request.
 */
function onLoginRequestTimedOut() {
  debug('No response received from server, login request timed out');
}

/**
 * Prints the password requirements.
 */
function printPasswordRequirements() {
  console.log('  Please keep in mind the following requirements for setting your password:   ');
  console.log('   - At least 8 characters and at most 30 long');
  console.log('   - At least one uppercase letter');
  console.log('   - At least one lowercase letter');
  console.log('   - At least one number');
  console.log('   - Has a sufficient password entropy');
}

/**
 * Checks if the given password is valid
 *
 * @param password - the password to be checked
 * @param count - the amount of attempts the user has left
 * @returns a valid password
 * @returns a boolean indicating whether or not the user wants to try again
 */
async function passwordValidityChecker(password: string, count: number): Promise<string | boolean> {
  let passwordCheck = passwordSchema.safeParse(password);
  while (!passwordCheck.success) {
    if (count === 1) {
      return false;
    }
    count--;
    if (count === 1) {
      Color.logError(
        'The given password did not meet the requirements.\nYou have ' + count + ' more attempt. \nPlease try again:',
      );
    } else {
      Color.logError(
        'The given password did not meet the requirements.\nYou have ' + count + ' more attempts. \nPlease try again:',
      );
    }
    password = await inquirer.password({ message: 'Password: ', mask: '*' });
    passwordCheck = passwordSchema.safeParse(password);
  }
  return password;
}

/**
 * Checks if the given password is strong enough
 *
 * @param password - the password to be checked
 * @returns a strong enough password
 * @returns a boolean indicating whether or not the user wants to try again
 */
async function passwordStrengthChecker(password: string): Promise<string | boolean> {
  const strength = passwordStrength(password);
  const color = new Chalk({ level: 1 });
  if (strength === color.green('STRONG')) {
    console.log('Your password is ' + strength + '.');
    return password;
  }
  if (strength === color.yellow('MEDIUM')) {
    console.log('Your password is ' + strength + '.');
    const answer = await inquirer.select({
      message: 'You can try again to increase the strength of your password, or continue on your own risk.',
      choices: [
        { name: 'Try again', value: 'again' },
        { name: 'Continue', value: 'continue' },
      ],
    });
    if (answer === 'again') return true;
    else return password;
  }
  if (strength === color.red('WEAK')) {
    console.log('Your password is ' + strength + '.');
    const answer = await inquirer.select({
      message: 'You can try again now or exit.',
      choices: [
        { name: 'Try again', value: 'again' },
        { name: 'Exit', value: 'exit' },
      ],
    });
    if (answer === 'again') return true;
    else return false;
  }
  return false; // should never happen, avoids linting error
}

/**
 * Handles the password checks.
 *
 * @param count - the amount of attempts the user has left.
 * @returns a correct password.
 * @returns a boolean indicating whether or not the user wants to try again
 */
async function passwordIteration(): Promise<string | boolean> {
  AuthenticationHandler.printPasswordRequirements();
  const userPassword: string = await inquirer.password({ message: 'Password: ', mask: '*' });
  const resultValidity = await AuthenticationHandler.passwordValidityChecker(userPassword, MAX_PASSWORD_ATTEMPTS);
  if (resultValidity === false) {
    return false;
  }
  if (typeof resultValidity === 'string') {
    const resultStrength = await AuthenticationHandler.passwordStrengthChecker(resultValidity);
    if (resultStrength === true) {
      return true;
    } else if (resultStrength === false) {
      return false;
    } else if (typeof resultStrength === 'string') {
      return resultStrength;
    }
  }
  return false; // should never happen, avoids linting error
}
