import { BaseRelations, BaseStrings } from 'ann-music-base';
import { CHORD } from 'ann-music-chord';
import { Interval } from 'ann-music-interval';
import { Note, NOTE, NoteName } from 'ann-music-note';
import { PC } from 'ann-music-pc';

import { SCALES, SCALE_TYPES } from './dictionary';
import { Scale } from './properties';

const { eq, neq } = BaseRelations;
const { tokenize: noteTokenize } = BaseStrings;

const { isSubsetOf, isSupersetOf, modes: pcmodes } = PC.Methods;

/**
 * Given a string with a scale name and (optionally) a tonic, split
 * that components.
 *
 * It retuns an array with the form [ name, tonic ] where tonic can be a
 * note name or null and name can be any arbitrary string
 * (this function doesn"t check if that scale name exists)
 *
 * @function
 * @param {string} name - the scale name
 * @return {Array} an array [tonic, name]
 * @example
 * tokenize("C mixolydean") // => ["C", "mixolydean"]
 * tokenize("anything is valid") // => ["", "anything is valid"]
 * tokenize() // => ["", ""]
 */
export function tokenize(src: string): string[] {
  const tokens = src.split(' ');
  const { isName } = NOTE.Validators;

  if (isName(tokens[0])) {
    const pc = Note({ name: tokens[0] }).pc;
    const type = tokens.slice(1).join(' ');
    const octave = noteTokenize(tokens[0], NOTE.REGEX).Toct || '';

    return [pc, type, octave];
  } else {
    return ['', tokens.join(' '), ''];
  }
}

/**
 * Get all chords that fits a given scale
 *
 * @function
 * @param {string} scale name of the scale
 * @returns {string[]} array of chord names
 *
 * @example
 * scaleChords("pentatonic") // => ["5", "64", "M", "M6", "Madd9", "Msus2"]
 */
export function chords(scale: string): string[] {
  const s = Scale(scale);
  const inScale = isSubsetOf({ chroma: s.pc.normalized });
  return CHORD.CHORD_TYPES.filter(chord => inScale({ chroma: chord.pc.normalized })).map(chord => chord.aliases[0]);
}

/**
 * Given an array of notes, return the scale: a pitch class set starting from
 * the first note of the array
 *
 * @function
 * @param {NoteName[]} names
 * @return {NoteName[]} array of scale notes
 *
 * @example
 * notes(['C4', 'c3', 'C5', 'C4', 'c4']) // => ["C"]
 * notes(['D4', 'c#5', 'A5', 'F#6']) // => ["D", "F#", "A", "C#"]
 */
export function notes(names: NoteName[]): NoteName[] {
  return names
    .map(n => Note({ name: n }))
    .filter(n => n.valid)
    .sort((a, b) => a.midi - b.midi)
    .map(n => n.pc)
    .filter((n, i, a) => eq(i, 0) || neq(n, a[i - 1]));
}

/**
 * Get all scales names that are a superset of the given one
 * (has the same notes and at least one more)
 *
 * @function
 * @param {string} scale - name of the scale
 * @return {string[]} list of scale names
 *
 * @example
 * extended("major") // => ["bebop", "bebop dominant", "bebop major", "chromatic", "ichikosucho"]
 */
export function extended(scale: string): string[] {
  const s = Scale(scale);
  const isSuperset = isSupersetOf({ chroma: s.pc.chroma });
  return SCALE_TYPES.filter(sc => isSuperset({ chroma: sc.pc.chroma })).map(sc => sc.type);
}

/**
 * Find all scales names that are a subset of the given one
 * (has less notes but all from the given scale)
 *
 * @function
 * @param {string} scale - name of the scale
 * @return {string[]} list of scale names
 *
 * @example
 * reduced("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
 */
export function reduced(scale: string): string[] {
  const s = Scale(scale);
  const isSubset = isSubsetOf({ chroma: s.pc.chroma });
  return SCALE_TYPES.filter(sc => isSubset({ chroma: sc.pc.chroma })).map(sc => sc.type);
}

/**
 * Convert scale to scaleSteps W. / W / H
 *
 * @function
 * @param {string} scale - name of the scale
 * @return {string[]} list of scale names
 *
 * @example
 * reduced("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
 */
export function toSteps(scale: string): string[] {
  const s = Scale(scale);
  const intervals = s.intervals;

  const semitones = intervals.map(ivl => Interval({ name: ivl }).width);
  const scaleSteps = [];
  for (let i = 1; i < semitones.length; i++) {
    const diff = semitones[i] - semitones[i - 1];
    const step = eq(diff, 1) ? 'H' : eq(diff, 2) ? 'W' : 'W.';
    scaleSteps.push(step);
  }

  return scaleSteps;
}

export function harmonize(srcScale: string, srcChords: string[]): string[] {
  const scale = Scale(srcScale);

  return [];
}
