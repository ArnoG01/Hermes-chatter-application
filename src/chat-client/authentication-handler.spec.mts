// @author Pieter Vanderschueren, Mataro Langeraert
// @date 2023-12-04

import type { LogInCompletedCommand, SignUpCompletedCommand } from '../protocol/proto.mjs';
import { expect, describe, it, vi, afterEach, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockWebSocket, MockWebSocketServer } from '../protocol/__mock__/ws-mock.mjs';
import { AuthenticationHandler } from './authentication-handler.mjs';
import { toServerCommandSchema } from '../protocol/proto.zod.mjs';
import { ChatClient } from './chat-client.mjs';
import { Color } from './color-codes.mjs';
import chalk, { Chalk } from 'chalk';

let inputValue = '';
let passwordValue = '';
let selectValue = '';

function flushValues() {
  inputValue = '';
  passwordValue = '';
  selectValue = '';
}

afterEach(() => {
  vi.restoreAllMocks();
  flushValues();
});

beforeEach(() => {
  vi.mock('@inquirer/prompts', () => ({
    input: () => new Promise<string>((resolve) => resolve(inputValue)),
    password: () => new Promise<string>((resolve) => resolve(passwordValue)),
    select: () => new Promise<string>((resolve) => resolve(selectValue)),
  }));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

beforeAll(() => {
  vi.useFakeTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

describe('loginHandler', () => {
  it('sends a login request on mock input', async () => {
    const fakeURL = 'ws://fake-url-login-handler-1';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-1');

    inputValue = 'test@test.com';
    passwordValue = 'testTEST!1234';
    selectValue = 'login';

    await AuthenticationHandler.loginUser(ws);
    expect(wss.data.length).toBe(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('login_request');
      if (res.data.command === 'login_request') {
        expect(res.data.data).toEqual({
          user: { id: 'test@test.com' },
          password: 'testTEST!1234',
        });
      }
    }
  });

  it('sends a signup request on mock input', async () => {
    const fakeURL = 'ws://fake-url-login-handler-2';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-2');

    inputValue = 'test@test.com';
    passwordValue = 'testTEST!1234';
    selectValue = 'agree';

    await AuthenticationHandler.registerUser(ws);
    expect(wss.data.length).toBe(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('signup_request');
      if (res.data.command === 'signup_request') {
        expect(res.data.data).toEqual({
          user: { id: 'test@test.com', username: 'test@test.com' },
          password: 'testTEST!1234',
        });
      }
    }
  });

  it('sends a signup request with a strong password on mock input', async () => {
    const fakeURL = 'ws://fake-url-login-handler-3';
    const wss = new MockWebSocketServer(fakeURL);
    const ws = new MockWebSocket(fakeURL, 'client-3');

    inputValue = 'test@test.com';
    passwordValue = 'testTEST!1234 dqmjjez jqmjzief';
    selectValue = 'agree';

    await AuthenticationHandler.registerUser(ws);
    expect(wss.data.length).toBe(1);
    const res = toServerCommandSchema.safeParse(wss.data[0]);
    expect(res).toBeTruthy();
    if (res.success) {
      expect(res.data.command).toBe('signup_request');
      if (res.data.command === 'signup_request') {
        expect(res.data.data).toEqual({
          user: { id: 'test@test.com', username: 'test@test.com' },
          password: 'testTEST!1234 dqmjjez jqmjzief',
        });
      }
    }
  });

  it('sends a signup request with an incorrect email on mock input', async () => {
    const fakeURL = 'ws://fake-url-login-handler';
    const ws = new MockWebSocket(fakeURL, 'client');

    inputValue = 'test.com';
    passwordValue = 'testTEST!1234';
    selectValue = 'agree';

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const authenticateUserSpy = vi
      .spyOn(AuthenticationHandler, 'authenticateUser')
      .mockImplementation((): Promise<void> => {
        return Promise.resolve();
      });

    await AuthenticationHandler.registerUser(ws);

    expect(errorSpy).toBeCalledTimes(1);
    expect(errorSpy).toBeCalledWith('Email is invalid, please try again');
    expect(authenticateUserSpy).toBeCalledTimes(1);
    expect(authenticateUserSpy).toBeCalledWith(ws);
  });

  it('logs in a user when login is selected', async () => {
    const fakeURL = 'ws://fake-url-login-handler-3';
    const ws = new MockWebSocket(fakeURL, 'client-3');

    inputValue = 'test@test.com';
    passwordValue = 'testTEST!1234';
    selectValue = 'login';

    const loginUserSpy = vi.spyOn(AuthenticationHandler, 'loginUser').mockImplementation(async () => {});
    await AuthenticationHandler.authenticateUser(ws);
    expect(loginUserSpy).toHaveBeenCalled();
  });

  it('registers a user when signup is selected', async () => {
    const fakeURL = 'ws://fake-url-login-handler-4';
    const ws = new MockWebSocket(fakeURL, 'client-4');

    inputValue = 'test@test.com';
    passwordValue = 'testTEST!1234';
    selectValue = 'register';

    const registerUserSpy = vi.spyOn(AuthenticationHandler, 'registerUser').mockImplementation(async () => {});
    await AuthenticationHandler.authenticateUser(ws);
    expect(registerUserSpy).toHaveBeenCalled();
  });

  it('exits the process when the user does not agree to TOS', async () => {
    const fakeURL = 'ws://fake-url-login-handler-5';
    const ws = new MockWebSocket(fakeURL, 'client-5');

    inputValue = 'test@test.con';
    passwordValue = 'testTEST!1234';
    selectValue = 'disagree';

    // Mocking process.exit to throw an error so we can catch it
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    await AuthenticationHandler.registerUser(ws).catch(() => {
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  it('handles a login completed response on mock input', () => {
    const mockLoginCompletedCommand: LogInCompletedCommand = {
      command: 'login_completed',
      data: {
        user: { id: 'test@gmail.com' },
        currentChannels: {
          channels: [],
        },
      },
    };

    const fakeURL = 'ws://fake-url-login-handler-2';
    const ws = new MockWebSocket(fakeURL, 'client-2');
    const launchAppSpy = vi.spyOn(ChatClient, 'launchApp');
    // mocking log to avoid the figlet print
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    AuthenticationHandler.onLoginCompleted(ws, mockLoginCompletedCommand.data);

    expect(launchAppSpy).toHaveBeenCalled();
    expect(launchAppSpy).toHaveBeenCalledTimes(1);
    expect(launchAppSpy).toHaveBeenCalledWith(ws, mockLoginCompletedCommand.data);

    expect(logSpy).toHaveBeenCalled();
  });

  it('handles a login refused response on mock input with unknown error code', async () => {
    const mockLoginRefusedCommand = {
      command: 'login_refused',
      data: {
        user: { id: 'test@gmail.com' },
        error_code: 1,
        reason: 'test',
      },
    };
    const fakeURL = 'ws://fake-url-login-handler-3';
    const ws = new MockWebSocket(fakeURL, 'client-3');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await AuthenticationHandler.onLoginRefused(ws, mockLoginRefusedCommand.data);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      chalk.red(
        `Unknown error code: ${mockLoginRefusedCommand.data.error_code}, reason: ${mockLoginRefusedCommand.data.reason}`,
      ),
    );
  });

  it('handles a login refused response on mock input with known error code: 101', async () => {
    const mockLoginRefusedCommand = {
      command: 'login_refused',
      data: {
        user: { id: 'test@gmail.com' },
        error_code: 101,
        reason: 'test',
      },
    };

    const fakeURL = 'ws://fake-url-login-handler-4';
    const ws = new MockWebSocket(fakeURL, 'client-4');
    const launchAppSpy = vi.spyOn(ChatClient, 'launchApp');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const authenticateUserSpy = vi.spyOn(AuthenticationHandler, 'authenticateUser').mockImplementation(async () => {});
    await AuthenticationHandler.onLoginRefused(ws, mockLoginRefusedCommand.data);

    // access should not be granted after login refused
    expect(launchAppSpy).toHaveBeenCalledTimes(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red(`Password or email is incorrect`));
    expect(authenticateUserSpy).toHaveBeenCalledTimes(1);
  });

  it('handles a login refused response on mock input with known error code: 102', async () => {
    const mockLoginRefusedCommand = {
      command: 'login_refused',
      data: {
        user: { id: 'test@gmail.com' },
        error_code: 102,
        reason: 'test',
      },
    };

    const fakeURL = 'ws://fake-url-login-handler-5';
    const ws = new MockWebSocket(fakeURL, 'client-5');
    const launchAppSpy = vi.spyOn(ChatClient, 'launchApp');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const authenticateUserSpy = vi.spyOn(AuthenticationHandler, 'authenticateUser').mockImplementation(async () => {});

    await AuthenticationHandler.onLoginRefused(ws, mockLoginRefusedCommand.data);

    // access should not be granted after login refused
    expect(launchAppSpy).toHaveBeenCalledTimes(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red(`Password or email is incorrect`));
    expect(authenticateUserSpy).toHaveBeenCalledTimes(1);
  });

  it('times out after a set amount of time', async () => {
    inputValue = 'test@test.con';
    passwordValue = 'test1234BeepBoeeppp';
    selectValue = 'agree';
    const fakeURL = 'ws://fake-url-login-handler-6';
    const ws = new MockWebSocket(fakeURL, 'client-6');
    const loginRequestTimedOutSpy = vi.spyOn(AuthenticationHandler, 'onLoginRequestTimedOut');

    await AuthenticationHandler.loginUser(ws);

    vi.advanceTimersByTime(10000);

    expect(loginRequestTimedOutSpy).toHaveBeenCalledTimes(1);
  });

  it('handles a signup completed response on mock input', () => {
    const mockSignUpCompletedCommand: SignUpCompletedCommand = {
      command: 'signup_completed',
      data: {
        user: { id: 'test@gmail.com' },
      },
    };
    const fakeURL = 'ws://fake-url-login-handler-7';
    const ws = new MockWebSocket(fakeURL, 'client-7');
    const launchAppSpy = vi.spyOn(ChatClient, 'launchApp');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    AuthenticationHandler.onSignUpCompleted(ws, mockSignUpCompletedCommand.data);
    expect(launchAppSpy).toHaveBeenCalledWith(ws, mockSignUpCompletedCommand.data);
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles a signup refused response on mock input with unknown error code', () => {
    const mockSignUpRefusedCommand = {
      command: 'signup_refused',
      data: {
        user: { id: 'test@gmail.com' },
        error_code: 1,
        reason: 'test',
      },
    };
    const fakeURL = 'ws://fake-url-login-handler-8';
    const ws = new MockWebSocket(fakeURL, 'client-8');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const launchAppSpy = vi.spyOn(ChatClient, 'launchApp');
    AuthenticationHandler.onSignUpRefused(ws, mockSignUpRefusedCommand.data);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      chalk.red(
        `Unknown error code: ${mockSignUpRefusedCommand.data.error_code}, reason: ${mockSignUpRefusedCommand.data.reason} contact the administrator`,
      ),
    );
    expect(launchAppSpy).toHaveBeenCalledTimes(0);
  });

  it('handles a signup refused response on mock input with known error code: 103', () => {
    const mockSignUpRefusedCommand = {
      command: 'signup_refused',
      data: {
        user: { id: 'test@gmail.com' },
        error_code: 103,
        reason: 'test',
      },
    };
    const fakeURL = 'ws://fake-url-login-handler-9';
    const ws = new MockWebSocket(fakeURL, 'client-9');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const launchAppSpy = vi.spyOn(ChatClient, 'launchApp');
    const authenticateUserSpy = vi.spyOn(AuthenticationHandler, 'authenticateUser').mockImplementation(async () => {});
    AuthenticationHandler.onSignUpRefused(ws, mockSignUpRefusedCommand.data);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red(`Email already in use`));
    expect(authenticateUserSpy).toHaveBeenCalledTimes(1);
    expect(launchAppSpy).toHaveBeenCalledTimes(0);
  });
});

describe('Password entropy', () => {
  it('checks the validity of the password: returns false on final attempt', async () => {
    const nonValidPassword = 'password';
    const res = await AuthenticationHandler.passwordValidityChecker(nonValidPassword, 1);
    expect(res).toBe(false);
  });

  it('checks the validity of the password: logs error on penultimate on attempt', async () => {
    const nonValidPassword = 'password';

    const colorLogErrorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    await AuthenticationHandler.passwordValidityChecker(nonValidPassword, 2);

    expect(colorLogErrorSpy).toBeCalled();
    expect(colorLogErrorSpy).toBeCalledWith(
      'The given password did not meet the requirements.\nYou have 1 more attempt. \nPlease try again:',
    );
  });

  it('checks the validity of the password: logs error on attempt', async () => {
    const nonValidPassword = 'password';

    const colorLogErrorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    await AuthenticationHandler.passwordValidityChecker(nonValidPassword, 3);

    expect(colorLogErrorSpy).toBeCalled();
    expect(colorLogErrorSpy).toBeCalledWith(
      'The given password did not meet the requirements.\nYou have 2 more attempts. \nPlease try again:',
    );
  });

  it('checks the validity of the password: returns true on valid password', async () => {
    const validPassword = 'TESTtest1234!';
    const colorLogErrorSpy = vi.spyOn(Color, 'logError').mockImplementation(() => {});

    const res = await AuthenticationHandler.passwordValidityChecker(validPassword, 1);

    expect(res === validPassword).toEqual(true);
    expect(colorLogErrorSpy).not.toBeCalled();
  });

  it('checks the strenght of the password: returns strong on strong password', async () => {
    const strongPassword = 'testTESTTEST123!!';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const color = new Chalk({ level: 1 });
    const strength = color.green('STRONG');

    const res = await AuthenticationHandler.passwordStrengthChecker(strongPassword);

    expect(logSpy).toBeCalled();
    expect(logSpy).toBeCalledWith('Your password is ' + strength + '.');
    expect(res).toEqual(strongPassword);
  });

  it('checks the strenght of the password: returns medium on medium password and mock continue response', async () => {
    const mediumPassword = 'testTESTTEST123';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const color = new Chalk({ level: 1 });
    const strength = color.yellow('MEDIUM');
    selectValue = 'continue';

    const res = await AuthenticationHandler.passwordStrengthChecker(mediumPassword);

    expect(logSpy).toBeCalled();
    expect(logSpy).toBeCalledWith('Your password is ' + strength + '.');
    expect(res).toEqual(mediumPassword);
  });

  it('checks the strenght of the password: returns medium on medium password and mock continue response', async () => {
    const mediumPassword = 'testTESTTEST123';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const color = new Chalk({ level: 1 });
    const strength = color.yellow('MEDIUM');
    selectValue = 'again';

    const res = await AuthenticationHandler.passwordStrengthChecker(mediumPassword);

    expect(logSpy).toBeCalled();
    expect(logSpy).toBeCalledWith('Your password is ' + strength + '.');
    expect(res).toBeTruthy();
  });

  it('checks the strenght of the password: returns weak on weak password', async () => {
    const weakPassword = 'test';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const color = new Chalk({ level: 1 });
    const strength = color.red('WEAK');
    selectValue = 'again';

    const res = await AuthenticationHandler.passwordStrengthChecker(weakPassword);

    expect(logSpy).toBeCalled();
    expect(logSpy).toBeCalledWith('Your password is ' + strength + '.');
    expect(res).toBeTruthy();
  });

  it('checks the strenght of the password: returns weak on weak password', async () => {
    const weakPassword = 'test';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const color = new Chalk({ level: 1 });
    const strength = color.red('WEAK');
    selectValue = 'exit';

    const res = await AuthenticationHandler.passwordStrengthChecker(weakPassword);

    expect(logSpy).toBeCalled();
    expect(logSpy).toBeCalledWith('Your password is ' + strength + '.');
    expect(res).not.toBeTruthy();
  });

  it('prints the password requirements', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    AuthenticationHandler.printPasswordRequirements();

    expect(consoleSpy).toBeCalled();
    expect(consoleSpy).toHaveBeenCalledTimes(6);

    expect(consoleSpy).toHaveBeenCalledWith(
      '  Please keep in mind the following requirements for setting your password:   ',
    );
    expect(consoleSpy).toHaveBeenCalledWith('   - At least 8 characters and at most 30 long');
    expect(consoleSpy).toHaveBeenCalledWith('   - At least one uppercase letter');
    expect(consoleSpy).toHaveBeenCalledWith('   - At least one lowercase letter');
    expect(consoleSpy).toHaveBeenCalledWith('   - At least one number');
    expect(consoleSpy).toHaveBeenCalledWith('   - Has a sufficient password entropy');
  });

  it('password iteration calls helper functions correctly', async () => {
    const strongPassword = 'testTESTTEST123!!';

    passwordValue = strongPassword;

    // Mocking the helper functions, functionality is tested above
    const printPasswordRequirementsSpy = vi
      .spyOn(AuthenticationHandler, 'printPasswordRequirements')
      .mockImplementation(() => {});
    const passwordValidityCheckerSpy = vi
      .spyOn(AuthenticationHandler, 'passwordValidityChecker')
      .mockImplementation(() => Promise.resolve(strongPassword));
    const passwordStrengthCheckerSpy = vi
      .spyOn(AuthenticationHandler, 'passwordStrengthChecker')
      .mockImplementation(() => Promise.resolve(strongPassword));

    const res = await AuthenticationHandler.passwordIteration();

    expect(printPasswordRequirementsSpy).toBeCalled();

    expect(passwordValidityCheckerSpy).toBeCalled();
    expect(passwordValidityCheckerSpy).toBeCalledWith(strongPassword, 3);

    expect(passwordStrengthCheckerSpy).toBeCalled();
    expect(passwordStrengthCheckerSpy).toBeCalledWith(strongPassword);

    expect(res).toEqual(strongPassword);
  });

  it('password iteration returns false if password is not valid', async () => {
    const weakPassword = 'test';

    passwordValue = weakPassword;

    // Mocking the helper functions, functionality is tested above
    const printPasswordRequirementsSpy = vi
      .spyOn(AuthenticationHandler, 'printPasswordRequirements')
      .mockImplementation(() => {});
    const passwordValidityCheckerSpy = vi
      .spyOn(AuthenticationHandler, 'passwordValidityChecker')
      .mockImplementation(() => Promise.resolve(false));

    const res = await AuthenticationHandler.passwordIteration();

    expect(printPasswordRequirementsSpy).toBeCalled();

    expect(passwordValidityCheckerSpy).toBeCalled();
    expect(passwordValidityCheckerSpy).toBeCalledWith(weakPassword, 3);

    expect(res).not.toBeTruthy();
  });

  it('password iteration returns true if password strenght checker returns true', async () => {
    // password strenght doesn't matter since I will be mocking the implementation of the password strenght checker
    const strongPassword = 'testTESTTEST123!!';

    passwordValue = strongPassword;

    // Mocking the helper functions, functionality is tested above
    const printPasswordRequirementsSpy = vi
      .spyOn(AuthenticationHandler, 'printPasswordRequirements')
      .mockImplementation(() => {});
    const passwordValidityCheckerSpy = vi
      .spyOn(AuthenticationHandler, 'passwordValidityChecker')
      .mockImplementation(() => Promise.resolve(strongPassword));
    const passwordStrengthCheckerSpy = vi
      .spyOn(AuthenticationHandler, 'passwordStrengthChecker')
      .mockImplementation(() => Promise.resolve(true));

    const res = await AuthenticationHandler.passwordIteration();

    expect(printPasswordRequirementsSpy).toBeCalled();

    expect(passwordValidityCheckerSpy).toBeCalled();
    expect(passwordValidityCheckerSpy).toBeCalledWith(strongPassword, 3);

    expect(passwordStrengthCheckerSpy).toBeCalled();
    expect(passwordStrengthCheckerSpy).toBeCalledWith(strongPassword);

    expect(res).toBeTruthy();
  });

  it('password iteration returns false if password strenght checker returns false', async () => {
    // password strenght doesn't matter since I will be mocking the implementation of the password strenght checker
    const strongPassword = 'testTESTTEST123!!';

    passwordValue = strongPassword;

    // Mocking the helper functions, functionality is tested above
    const printPasswordRequirementsSpy = vi
      .spyOn(AuthenticationHandler, 'printPasswordRequirements')
      .mockImplementation(() => {});
    const passwordValidityCheckerSpy = vi
      .spyOn(AuthenticationHandler, 'passwordValidityChecker')
      .mockImplementation(() => Promise.resolve(strongPassword));
    const passwordStrengthCheckerSpy = vi
      .spyOn(AuthenticationHandler, 'passwordStrengthChecker')
      .mockImplementation(() => Promise.resolve(false));

    const res = await AuthenticationHandler.passwordIteration();

    expect(printPasswordRequirementsSpy).toBeCalled();

    expect(passwordValidityCheckerSpy).toBeCalled();
    expect(passwordValidityCheckerSpy).toBeCalledWith(strongPassword, 3);

    expect(passwordStrengthCheckerSpy).toBeCalled();
    expect(passwordStrengthCheckerSpy).toBeCalledWith(strongPassword);

    expect(res).not.toBeTruthy();
  });
});
