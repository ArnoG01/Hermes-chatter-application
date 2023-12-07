// @author Jakob Dilen
// @date 2023-11-27

import type { ZodError } from 'zod';
import chalk from 'chalk';

export const Color = {
  logError,
  logMessage,
};

/**
 * Logs an error in a red color.
 *
 * @param log - The error  message to log.
 */
function logError(log: ZodError<string> | string): void {
  console.error(chalk.red(log));
}
/**
 * Logs a given message, possibly in a specific color.
 *
 * @param log - The message to log.
 * @param RGB - A specified color. If this field is left blanck the message is logged in white.
 */
function logMessage(log: string, RGB?: [number, number, number]): void {
  if (RGB !== undefined) {
    console.log(chalk.rgb(RGB[0], RGB[1], RGB[2])(log));
  } else {
    console.log(chalk.white(log));
  }
}
