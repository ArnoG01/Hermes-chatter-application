// author: Jonas Couwberghs
// date: 2023-11-29

import type { IncomingMessage } from '../protocol/proto.mjs';
import {
  binarySearch,
  exponentialSearch,
  fibMonaccianSearch,
  interpolationSearch,
  linearSearch,
  ternarySearch,
} from './lookup-search.mjs';
import { it, expect, describe } from 'vitest';
import { DateTime } from 'luxon';

const TEST_MESSAGES: IncomingMessage[] = [
  {
    sender: { id: 'test@test.com' },
    msg: 'A',
    time: DateTime.fromISO('2023-09-09T20:02:23.132+01:00', { setZone: true }),
    channel: 'general',
  },
  {
    sender: { id: 'test@test.com' },
    msg: 'B',
    time: DateTime.fromISO('2023-09-09T20:04:45.135+01:00', { setZone: true }),
    channel: 'general',
  },
  {
    sender: { id: 'test@test.com' },
    msg: 'C',
    time: DateTime.fromISO('2023-09-09T19:03:50.165+02:00', { setZone: true }),
    channel: 'general',
  },
  {
    sender: { id: 'test@test.com' },
    msg: 'D',
    time: DateTime.fromISO('2023-09-10T01:20:14.122+02:00', { setZone: true }),
    channel: 'general',
  },
  {
    sender: { id: 'test@test.com' },
    msg: 'E',
    time: DateTime.fromISO('2023-09-10T03:04:47.155+03:00', { setZone: true }),
    channel: 'general',
  },
  {
    sender: { id: 'test@test.com' },
    msg: 'F',
    time: DateTime.fromISO('2023-09-10T03:04:45.135+01:00', { setZone: true }),
    channel: 'general',
  },
  {
    sender: { id: 'test@test.com' },
    msg: 'G',
    time: DateTime.fromISO('2023-09-10T04:05:01.142Z', { setZone: true }),
    channel: 'general',
  },
  {
    sender: { id: 'test@test.com' },
    msg: 'H',
    time: DateTime.fromISO('2023-09-10T05:06:24.475+01:00', { setZone: true }),
    channel: 'general',
  },
];

describe('linearSearch', () => {
  it('finds the message sent closest before the given datetime', () => {
    const index = linearSearch(TEST_MESSAGES, DateTime.fromISO('2023-09-10T03:00:00.000Z'));
    expect(index).toBe(5);
  });
});

describe('binarySearch', () => {
  it('finds the message sent closest before the given datetime', () => {
    const index = binarySearch(TEST_MESSAGES, DateTime.fromISO('2023-09-10T03:00:00.000Z'));
    expect(index).toBe(5);
  });
});

describe('interpolationSearch', () => {
  it('finds the message sent closest before the given datetime', () => {
    const index = interpolationSearch(TEST_MESSAGES, DateTime.fromISO('2023-09-10T03:00:00.000Z'));
    expect(index).toBe(5);
  });
});

describe('exponentialSearch', () => {
  it('finds the message sent closest before the given datetime', () => {
    const index = exponentialSearch(TEST_MESSAGES, DateTime.fromISO('2023-09-10T03:00:00.000Z'));
    expect(index).toBe(5);
  });
});

describe('ternarySearch', () => {
  it('finds the message sent closest before the given datetime', () => {
    const index = ternarySearch(TEST_MESSAGES, DateTime.fromISO('2023-09-10T03:00:00.000Z'));
    expect(index).toBe(5);
  });
});

describe('fibMonaccianSearch', () => {
  it('finds the message sent closest before the given datetime', () => {
    const index = fibMonaccianSearch(TEST_MESSAGES, DateTime.fromISO('2023-09-10T03:00:00.000Z'));
    expect(index).toBe(5);
  });
});
