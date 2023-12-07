// @author Jakob Dilen
// @date 2023-11-27

import { describe, it, vi, expect } from 'vitest';
import { Color } from './color-codes.mjs';
import { afterEach } from 'node:test';
import chalk from 'chalk';

describe('Logs the correct messages in the correct color.', () => {
  afterEach(() => vi.clearAllMocks());
  it('logs the message in white if no RGB is supplied', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Color.logMessage('test');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(chalk.white('test'));
  });

  it('logs the correct error in red', () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Color.logError('test');
    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith(chalk.red('test'));
  });

  it('logs the messages in the specified RGB color.', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Color.logMessage('test', [5, 10, 10]);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(chalk.rgb(5, 10, 10)('test'));
  });
});
