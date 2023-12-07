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
import { describe, bench, expect } from 'vitest';
import { DateTime } from 'luxon';

function generateSortedMessages(
  count: number = 100,
  minDate: DateTime = DateTime.fromISO('2020-04-16T00:00:00.000'),
  maxDate: DateTime = DateTime.now(),
): IncomingMessage[] {
  const messages: IncomingMessage[] = [];

  const min = minDate.toMillis();
  const max = maxDate.toMillis();

  for (let i = 0; i < count; i++) {
    const time = DateTime.fromMillis(Math.floor(Math.random() * (max - min)) + min);
    messages.push({
      sender: { id: 'test@test.com' },
      msg: `Message ${i}`,
      time,
      channel: 'general',
    });
  }

  return messages.sort(({ time: time1 }, { time: time2 }) => (time1 as DateTime).diff(time2 as DateTime).toMillis());
}

describe.each([10, 100, 500, 1000, 2500, 5000, 7500, 10000, 25000])('lookup-search-benchmark', (n) => {
  const messages = generateSortedMessages(n);

  bench(`binary search n=${n}`, () => {
    for (let i = 0; i < messages.length; i++) {
      expect(binarySearch(messages, messages[i]?.time as DateTime)).toBe(i);
    }
  });

  bench(`interpolation search n=${n}`, () => {
    for (let i = 0; i < messages.length; i++) {
      expect(interpolationSearch(messages, messages[i]?.time as DateTime)).toBe(i);
    }
  });

  bench(`exponential search n=${n}`, () => {
    for (let i = 0; i < messages.length; i++) {
      expect(exponentialSearch(messages, messages[i]?.time as DateTime)).toBe(i);
    }
  });

  bench(`ternary search n=${n}`, () => {
    for (let i = 0; i < messages.length; i++) {
      expect(ternarySearch(messages, messages[i]?.time as DateTime)).toBe(i);
    }
  });

  bench(`fib monaccian search n=${n}`, () => {
    for (let i = 0; i < messages.length; i++) {
      expect(fibMonaccianSearch(messages, messages[i]?.time as DateTime)).toBe(i);
    }
  });

  if (n <= 100) {
    bench(`linear search n=${n}`, () => {
      for (let i = 0; i < messages.length; i++) {
        expect(linearSearch(messages, messages[i]?.time as DateTime)).toBe(i);
      }
    });

    bench(`built in n=${n}`, () => {
      for (let i = 0; i < messages.length; i++) {
        let index = messages.findIndex(
          (message) => (message.time as DateTime).diff(messages[i]?.time as DateTime).toMillis() > 0,
        );
        if (index === -1) index = messages.length;
        expect(index - 1).toBe(i);
      }
    });
  }
});
