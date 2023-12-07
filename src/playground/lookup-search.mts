// author: Jonas Couwberghs
// date: 2023-11-29

import { DateTime } from 'luxon';
import type { IncomingMessage } from '../protocol/proto.mjs';

function compare(time1: DateTime, time2: DateTime): number {
  return time1.diff(time2).toMillis();
}

/**
 * A search algorithm which iterates over the messages until it finds a match
 *
 * @param messages A sorted array of messages
 * @param time The time to look for
 * @returns The index of the message which was last send before the given time
 */
export function linearSearch(messages: IncomingMessage[], time: DateTime): number {
  for (let i = 1; i < messages.length; i++) {
    if (compare(messages[i]?.time as DateTime, time) > 0) {
      return i - 1;
    }
  }

  return messages.length - 1;
}

/**
 * A search algorithm which performs binary search on the messages to find a match
 *
 * @param messages A sorted array of messages
 * @param time The time to look for
 * @returns The index of the message which was last send before the given time
 */
export function binarySearch(messages: IncomingMessage[], time: DateTime, min: number = 0, max: number = -1): number {
  if (max === -1) {
    max = messages.length - 1;
  }
  while (min < max) {
    const mid = Math.ceil((min + max) / 2);
    const message = messages[mid];
    if (message) {
      const diff = compare(message.time as DateTime, time);
      if (diff < 0) {
        min = mid + 1;
      } else if (diff > 0) {
        max = mid - 1;
      } else {
        return mid;
      }
    } else {
      throw new Error(`Binary search: Message at index [${mid}] is undefined or null`);
    }
  }

  return Math.min(min, max);
}

/**
 * A search algorithm which performs interpolation search on the messages to find a match
 *
 * @param messages A sorted array of messages
 * @param time The time to look for
 * @returns The index of the message which was last send before the given time
 */
export function interpolationSearch(messages: IncomingMessage[], time: DateTime): number {
  let low = 0;
  let high = messages.length - 1;
  while (
    messages[low] !== messages[high] &&
    compare(time, messages[low]?.time as DateTime) >= 0 &&
    compare(time, messages[high]?.time as DateTime) <= 0
  ) {
    const mid =
      low +
      Math.floor(
        (compare(time, messages[low]?.time as DateTime) * (high - low)) /
          compare(messages[high]?.time as DateTime, messages[low]?.time as DateTime),
      );
    const message = messages[mid];
    if (message) {
      const diff = compare(message.time as DateTime, time);
      if (diff < 0) {
        low = mid + 1;
      } else if (diff > 0) {
        high = mid - 1;
      } else {
        return mid;
      }
    } else {
      throw new Error(`Binary search: Message at index [${mid}] is undefined or null`);
    }
  }

  if (compare(time, messages[high]?.time as DateTime) > 0) return high;
  return low;
}

/**
 * A search algorithm which performs exponential search on the messages to find a match
 *
 * @param messages A sorted array of messages
 * @param time The time to look for
 * @returns The index of the message which was last send before the given time
 */
export function exponentialSearch(messages: IncomingMessage[], time: DateTime): number {
  const size = messages.length;
  let bound = 1;

  while (bound < size && compare(messages[bound]?.time as DateTime, time) <= 0) {
    bound *= 2;
  }

  return binarySearch(messages, time, Math.floor(bound / 2), Math.min(bound + 1, size - 1));
}

/**
 * A search algorithm which performs ternary search on the messages to find a match
 *
 * @param messages A sorted array of messages
 * @param time The time to look for
 * @returns The index of the message which was last send before the given time
 */
export function ternarySearch(messages: IncomingMessage[], time: DateTime): number {
  let l = 0;
  let r = messages.length - 1;

  while (r >= l) {
    const mid1 = l + Math.floor((r - l) / 3);
    const mid2 = r - Math.floor((r - l) / 3);

    const diff1 = compare(time, messages[mid1]?.time as DateTime);
    const diff2 = compare(time, messages[mid2]?.time as DateTime);

    if (diff1 === 0) {
      return mid1;
    }
    if (diff2 === 0) {
      return mid2;
    }

    if (diff1 < 0) {
      r = mid1 - 1;
    } else if (diff2 > 0) {
      l = mid2 + 1;
    } else {
      l = mid1 + 1;
      r = mid2 - 1;
    }
  }

  return r;
}

/**
 * A search algorithm which performs fibonacci search on the messages to find a match
 *
 * Source: https://www.geeksforgeeks.org/fibonacci-search/
 *
 * @param messages A sorted array of messages
 * @param time The time to look for
 * @returns The index of the message which was last send before the given time
 */
export function fibMonaccianSearch(messages: IncomingMessage[], time: DateTime): number {
  const size = messages.length;
  let fibMMm2 = 0;
  let fibMMm1 = 1;
  let fibM = fibMMm2 + fibMMm1;

  while (fibM < size) {
    fibMMm2 = fibMMm1;
    fibMMm1 = fibM;
    fibM = fibMMm2 + fibMMm1;
  }

  let offset = -1;

  while (fibM > 1) {
    const index = Math.min(offset + fibMMm2, size - 1);
    const diff = compare(messages[index]?.time as DateTime, time);
    if (diff < 0) {
      fibM = fibMMm1;
      fibMMm1 = fibMMm2;
      fibMMm2 = fibM - fibMMm1;
      offset = index;
    } else if (diff > 0) {
      fibM = fibMMm2;
      fibMMm1 = fibMMm1 - fibMMm2;
      fibMMm2 = fibM - fibMMm1;
    } else {
      return index;
    }
  }

  return offset;
}
