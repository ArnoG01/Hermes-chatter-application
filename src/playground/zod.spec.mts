// author: Dirk Nuyens
// date: 2022-11-15

// This file contains a number of very simple zod tests.
// It is meant just to automatically verify that zod seems to work.

import { expect, describe, it } from 'vitest';

import { z } from 'zod';

// creating a schema for strings
const mySchema = z.string();

describe('zod', () => {
  it('can parse correct values', () => {
    const r = mySchema.parse('tuna');
    expect(r).toStrictEqual('tuna');
  });
  it('throws error on incorrect input', () => {
    // Note that the following expect defines a function which then calls the
    // function which will throw an exception; this is done this way such that
    // the exception is not thrown when "computing" the result to pass to
    // expect, as that would throw the exception without expect knowing it...
    expect(() => mySchema.parse(12)).toThrow();
  });
  it('can safe parse a correct value', () => {
    const r1 = mySchema.safeParse('tuna');
    expect(r1.success).toBeTruthy();
    expect(r1.success ? r1.data : '').toStrictEqual('tuna');
  });
  it('it can safe parse an incorrect value', () => {
    const r2 = mySchema.safeParse(12);
    expect(r2.success).toBeFalsy();
  });
});
