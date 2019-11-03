import { CHORD, ChordQuality, Chord, ChordTypeName, ChordNameTokens } from 'ann-music-chord';
import {
  isSubsetOf,
  isSupersetOf,
  modes,
  transpose,
  PcsetChroma,
  PcsetNum,
  PcsetProps,
  EmptySet,
  pcset,
} from 'ann-music-pc';
import { Interval, IntervalName } from 'ann-music-interval';
import { Note, NoteName } from 'ann-music-note';
import { BaseArray } from 'ann-music-base';
import SCALE_LIST from './data';

const { rotate } = BaseArray;

export type ScaleTypeName = string | PcsetChroma | PcsetNum;
export type ScaleName = string;
export type ScaleNameTokens = [string, string]; // [TONIC, SCALE TYPE]

export interface ScaleType extends PcsetProps {
  name: string;
  intervals: IntervalName[];
  aliases: string[];
}

export type ScaleTypes = Record<ScaleTypeName, ScaleType>;

export interface Scale extends ScaleType {
  tonic: string | null;
  type: string;
  notes: NoteName[];
}

export interface Scale extends ScaleType {
  tonic: string | null;
  type: string;
  notes: NoteName[];
}

export interface ScalePcset extends PcsetProps {
  name: string;
  quality: ChordQuality;
  intervals: IntervalName[];
  aliases: string[];
}

export type ScaleMode = [string, string];

/**
 * Properties for a scale in the scale dictionary. It's a pitch class set
 * properties with the following additional information:
 * - name: the scale name
 * - aliases: alternative list of names
 * - intervals: an array of interval names
 */

namespace Theory {
  export const NoScaleType: ScaleType = {
    ...EmptySet,
    name: '',
    intervals: [],
    aliases: [],
  };

  export const NoScale: Scale = {
    empty: true,
    name: '',
    type: '',
    tonic: null,
    length: 0,
    setNum: NaN,
    chroma: '',
    normalized: '',
    aliases: [],
    notes: [],
    intervals: [],
  };
}

namespace Dictionary {
  export const TYPES: ScaleType[] = SCALE_LIST.map(dataToScaleType);
  export const SCALES: ScaleTypes = TYPES.reduce((index: Record<ScaleTypeName, ScaleType>, scale) => {
    index[scale.name] = scale;
    index[scale.setNum] = scale;
    index[scale.chroma] = scale;
    scale.aliases.forEach(alias => {
      index[alias] = scale;
    });
    return index;
  }, {});
  export const KEYS = Object.keys(SCALES);

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
  export function tokenize(name: ScaleName): ScaleNameTokens {
    if (typeof name !== 'string') {
      return ['', ''];
    }
    const i = name.indexOf(' ');
    const tonic = Note(name.substring(0, i));
    if (!tonic.valid) {
      const n = Note(name);
      return !n.valid ? ['', name] : [n.name, ''];
    }

    const type = name.substring(tonic.name.length);
    return [tonic.name, type.length ? type : ''];
  }

  /**
   * Return a list of all scale types
   */
  export function entries() {
    return Dictionary.TYPES.slice();
  }

  export function keys() {
    return Dictionary.KEYS.slice();
  }

  export function dataToScaleType([ivls, name, ...aliases]: string[]): ScaleType {
    const intervals = ivls.split(' ');
    return { ...(pcset && pcset(intervals)), name, intervals, aliases };
  }
}

namespace SetMethods {
  /**
   * Get all scales names that are a superset of the given one
   * (has the same notes and at least one more)
   *
   * @function
   * @param {string} name
   * @return {Array} a list of scale names
   * @example
   * extended("major") // => ["bebop", "bebop dominant", "bebop major", "chromatic", "ichikosucho"]
   */
  export function extended(name: string): string[] {
    const s = Scale(name);
    const isSuperset = isSupersetOf(s.chroma);
    return Dictionary.entries()
      .filter(scale => isSuperset(scale.chroma))
      .map(scale => scale.name);
  }

  /**
   * Find all scales names that are a subset of the given one
   * (has less notes but all from the given scale)
   *
   * @function
   * @param {string} name
   * @return {Array} a list of scale names
   *
   * @example
   * reduced("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
   */
  export function reduced(name: string): string[] {
    const isSubset = isSubsetOf(Scale(name).chroma);
    return Dictionary.entries()
      .filter(scale => isSubset(scale.chroma))
      .map(scale => scale.name);
  }
}

namespace Static {
  /**
   * Get all chords that fits a given scale
   *
   * @function
   * @param {string} name - the scale name
   * @return {Array<string>} - the chord names
   *
   * @example
   * scaleChords("pentatonic") // => ["5", "64", "M", "M6", "Madd9", "Msus2"]
   */
  export function scaleChords(name: string): string[] {
    const s = Scale(name);
    const inScale = isSubsetOf(s.chroma);
    return CHORD.types.filter(chord => inScale(chord.chroma)).map(chord => chord.aliases[0]);
  }

  export function containsChord(scale: ScaleName, src: ChordTypeName | ChordNameTokens) {
    const c = parseInt(Chord(src).chroma, 2);
    const s = parseInt(Scale(scale).chroma, 2);
    return (s & c) === c;
  }

  /**
   * Given an array of notes, return the scale: a pitch class set starting from
   * the first note of the array
   *
   * @function
   * @param {string[]} notes
   * @return {string[]} pitch classes with same tonic
   * @example
   * scaleNotes(['C4', 'c3', 'C5', 'C4', 'c4']) // => ["C"]
   * scaleNotes(['D4', 'c#5', 'A5', 'F#6']) // => ["D", "F#", "A", "C#"]
   */
  export function scaleNotes(notes: NoteName[]) {
    const pcSet: string[] = notes.map(n => Note(n).pc).filter(x => x);
    const tonic = pcset[0];
    const scale = sortedUniqNoteNames(pcSet);
    return rotate(scale.indexOf(tonic), scale);
  }

  export function scaleFormula(src: ScaleName) {
    const props = Scale(src);
    return props.intervals.map(ivl => Interval(ivl).semitones);
  }

  /**
   * Find mode names of a scale
   *
   * @function
   * @param {string} name - scale name
   * @example
   * modeNames("C pentatonic") // => [
   *   ["C", "major pentatonic"],
   *   ["D", "egyptian"],
   *   ["E", "malkos raga"],
   *   ["G", "ritusen"],
   *   ["A", "minor pentatonic"]
   * ]
   */
  export function modeNames(name: string): ScaleMode[] {
    const s = Scale(name);
    if (s.empty) {
      return [];
    }

    const tonics = s.tonic ? s.notes : s.intervals;
    return modes(s.chroma)
      .map(
        (chroma: string, i: number): ScaleMode => {
          const modeName = Scale(chroma).name;
          return modeName ? [tonics[i], modeName] : ['', ''];
        },
      )
      .filter(x => x[0]);
  }

  /**
   * Sort an array of notes in ascending order. Pitch classes are listed
   * before notes. Any string that is not a note is removed.
   *
   * @param {string[]} notes
   * @return {string[]} sorted array of notes
   *
   * @example
   * sortedNoteNames(['c2', 'c5', 'c1', 'c0', 'c6', 'c'])
   * // => ['C', 'C0', 'C1', 'C2', 'C5', 'C6']
   * sortedNoteNames(['c', 'F', 'G', 'a', 'b', 'h', 'J'])
   * // => ['C', 'F', 'G', 'A', 'B']
   */
  export function sortedNoteNames(notes: NoteName[]): string[] {
    const valid = notes.map(n => Note(n)).filter(n => n.valid);
    return valid.sort((a, b) => a.midi - b.midi).map(n => n.pc);
  }

  /**
   * Get sorted notes with duplicates removed. Pitch classes are listed
   * before notes.
   *
   * @function
   * @param {string[]} array
   * @return {string[]} unique sorted notes
   *
   * @example
   * Array.sortedUniqNoteNames(['a', 'b', 'c2', '1p', 'p2', 'c2', 'b', 'c', 'c3' ])
   * // => [ 'C', 'A', 'B', 'C2', 'C3' ]
   */
  export function sortedUniqNoteNames(notes: NoteName[]): string[] {
    return sortedNoteNames(notes).filter((n, i, a) => i === 0 || n !== a[i - 1]);
  }

  export function semitonesToStep(semitones: number): string {
    let char: string;
    switch (semitones) {
      case 1:
        char = 'H';
        break;
      case 2:
        char = 'W';
        break;
      case 3:
        char = 'W.';
        break;
      default:
        break;
    }
    return char;
  }

  export function scaleToSteps(src: ScaleName | ScaleNameTokens) {
    const scale = Scale(src);
    const intervals = scale.intervals;

    const semitones = intervals.map(ivl => Interval(ivl).semitones);
    const steps = [];
    for (let i = 1; i < semitones.length; i++) {
      const diff = semitones[i] - semitones[i - 1];
      const step = semitonesToStep(diff);
      steps.push(step);
    }

    return steps;
  }
}

export const SCALE = {
  types: Dictionary.TYPES,
  scales: Dictionary.SCALES,
  entries: Dictionary.entries,
  ...Static,
  ...SetMethods,
};

/**
 * Get a Scale from a scale name.
 */
export function Scale(src: ScaleName | ScaleNameTokens): Scale {
  const tokens = Array.isArray(src) ? src : Dictionary.tokenize(src);
  const tonic = Note(tokens[0]).pc;
  const st = Dictionary.SCALES[tokens[1]] || Theory.NoScaleType;
  if (st.empty) {
    return Theory.NoScale;
  }

  const type = st.name;
  const notes: string[] = tonic ? st.intervals.map(i => transpose(tonic, i).letter) : [];

  const name = tonic ? tonic + ' ' + type : type;

  return { ...st, name, type, tonic, notes };
}
