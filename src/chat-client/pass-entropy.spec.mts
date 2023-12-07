// @author Jakob Dilen
// @date 2023-11-28

import { passwordEntropy, passwordStrength } from './pass-entropy.mjs';
import { describe, expect, it } from 'vitest';
import { Chalk } from 'chalk';

describe('Testing the entropy of passwords', () => {
  it('Gives the correct entropy for lowercase passwords', () => {
    expect(passwordEntropy('test')).toBeCloseTo(Math.log2(26) * 4);
  });
  it('Gives the correct entropy for uppercase passwords', () => {
    expect(passwordEntropy('TEST')).toBeCloseTo(Math.log2(26) * 4);
  });
  it('Gives the correct entropy for uppercase and lowercase passwords', () => {
    expect(passwordEntropy('TEst')).toBeCloseTo(Math.log2(26 * 2) * 4);
  });
  it('Gives the correct entropy for number passwords', () => {
    expect(passwordEntropy('10000')).toBeCloseTo(Math.log2(10) * 5);
  });
  it('Gives the correct entropy for number, lowercase and uppercase passwords', () => {
    expect(passwordEntropy('10000Tt')).toBeCloseTo(Math.log2(10 + 26 * 2) * 7);
  });
  it('Gives the correct entropy for number, lowercase, uppercase and specialcase passwords', () => {
    expect(passwordEntropy('10000Tt*')).toBeCloseTo(Math.log2(10 + 26 * 2 + 32) * 8);
  });
});

describe('Tests the password strength checker', () => {
  const color = new Chalk({ level: 1 });
  it('Returns the strength of a weak password', () => {
    expect(passwordStrength('test')).toEqual(color.red('WEAK'));
  });
  it('Returns the strength of a medium password', () => {
    expect(passwordStrength('testTESTTEST123')).toEqual(color.yellow('MEDIUM'));
  });
  it('Returns the strength of a strong password', () => {
    expect(passwordStrength('testTESTTEST123!!')).toEqual(color.green('STRONG'));
  });
});
