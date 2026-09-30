// toALabels converts U-labels a domain at a time, which must give exactly
// what converting each alone does, up to the first that fails.
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toALabel, toALabels } from '../src/idn';

/** Per label, alone: every A-label up to and including the first failure. */
function alone(labels: readonly string[]): (string | undefined)[] {
  const aLabels: (string | undefined)[] = [];
  for (const label of labels) {
    const aLabel = toALabel(label);
    aLabels.push(aLabel);
    if (aLabel === undefined) {
      break;
    }
  }
  return aLabels;
}

// Letters, digits, and hyphens of both directions, and the characters UTS #46
// maps, drops, joins, or splits on.
const label = fc.string({
  unit: fc.constantFrom(
    'a',
    '1',
    '-',
    'ü',
    '例',
    'ب',
    'א',
    '١',
    'ℵ',
    'ｅ',
    '。',
    '😀',
    '\u200D',
    '\u200C',
    '\u00AD',
    '\u0301',
    '\u0610',
  ),
  minLength: 1,
  maxLength: 6,
});

describe('toALabels', () => {
  it('converts each label as it would alone, up to the first failure', () => {
    fc.assert(
      fc.property(fc.array(label, { minLength: 1, maxLength: 8 }), (labels) => {
        const expected = alone(labels);
        expect(toALabels(labels).slice(0, expected.length)).toEqual(expected);
      }),
      { numRuns: 2000 },
    );
  });

  it.each([
    ['Latin and Arabic labels, which fail together', ['1ü', 'بب']],
    ['a failure after many that pass', [...Array(40).fill('ü'), 'x‍y']],
    ['a label that splits in two', ['ü', 'a。ü', 'ü']],
  ])('matches converting alone for %s', (_, labels) => {
    const expected = alone(labels);
    expect(toALabels(labels).slice(0, expected.length)).toEqual(expected);
  });
});
