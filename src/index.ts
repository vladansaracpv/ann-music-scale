import { CHORD, Chord, ChordTypeName, ChordInit } from 'ann-music-chord';
import { PcChroma, PcNum, PcProperties, PC, PitchClass as PcStatic } from 'ann-music-pc';
import { Interval } from 'ann-music-interval';
import { Note, NoteName, NOTE } from 'ann-music-note';
import { BaseArray, BaseStrings } from 'ann-music-base';
import SCALE_LIST from './data';
import { eq, neq } from 'ann-music-base/lib/relations';

const { rotate } = BaseArray;

const { tokenize: noteTokenize } = BaseStrings;

const { isSubsetOf, isSupersetOf, modes: pcmodes, transpose } = PcStatic.Methods;

const EmptyPcSet = PcStatic.Empty;

export type ScaleTypeName = string;

export type ScaleTypeChroma = PcChroma;

export type ScaleTypeSetNum = PcNum;

export type ScaleTypeProp = ScaleTypeName | ScaleTypeChroma | ScaleTypeSetNum;

export type ScaleNameTokens = [string, string, string?]; // [TONIC, SCALE TYPE, OCTAVE]

export type ScaleInit = ScaleTypeName | ScaleNameTokens;

export interface ScaleType extends PcProperties {
  name: string;
  aliases: string[];
}

export type ScaleTypes = Record<ScaleTypeProp, ScaleType>;

export interface Scale extends ScaleType {
  tonic: string;
  type: string;
  notes: NoteName[];
  valid: boolean;
}

export type ScaleMode = [string, string];

namespace Theory {
  export const NoScaleType: ScaleType = {
    ...EmptyPcSet,
    name: '',
    intervals: [],
    aliases: [],
  };

  export const NoScale: Scale = {
    empty: true,
    name: '',
    type: '',
    tonic: '',
    length: 0,
    setNum: NaN,
    chroma: '',
    normalized: '',
    aliases: [],
    notes: [],
    intervals: [],
    valid: false,
  };
}

namespace Dictionary {
  export const types: ScaleType[] = SCALE_LIST.map(toScaleType);
  export const all: ScaleTypes = toScales(types);

  function toScales(chordTypes: ScaleType[]) {
    return chordTypes.reduce((index: Record<ScaleTypeName, ScaleType>, scale) => {
      index[scale.name] = scale;
      index[scale.setNum] = scale;
      index[scale.chroma] = scale;
      scale.aliases.forEach(alias => {
        index[alias] = scale;
      });
      return index;
    }, {});
  }

  function toScaleType([ivls, name, ...aliases]: string[]): ScaleType {
    const intervals = ivls.split(' ');
    return { ...PC(intervals), name, intervals, aliases };
  }
}

namespace Static {
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
  export function tokenize(src: string): ScaleNameTokens {
    const tokens = src.split(' ');
    const { isName } = NOTE.Validators;

    if (isName(tokens[0])) {
      const pc = Note(tokens[0]).pc;
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
   * @param {string} name - the scale name
   * @return {Array<string>} - the chord names
   *
   * @example
   * scaleChords("pentatonic") // => ["5", "64", "M", "M6", "Madd9", "Msus2"]
   */
  export function chords(name: string): string[] {
    const s = Scale(name);
    const inScale = isSubsetOf(s.normalized);
    return CHORD.types.filter(chord => inScale(chord.normalized)).map(chord => chord.aliases[0]);
  }

  /**
   * Given an array of notes, return the scale: a pitch class set starting from
   * the first note of the array
   *
   * @function
   * @param {string[]} notes
   * @return {string[]} pitch classes with same tonic
   * @example
   * notes(['C4', 'c3', 'C5', 'C4', 'c4']) // => ["C"]
   * notes(['D4', 'c#5', 'A5', 'F#6']) // => ["D", "F#", "A", "C#"]
   */
  export function notes(names: NoteName[]) {
    return names
      .map(n => Note(n))
      .filter(n => n.valid)
      .sort((a, b) => a.midi - b.midi)
      .map(n => n.pc)
      .filter((n, i, a) => eq(i, 0) || neq(n, a[i - 1]));
  }

  export function formula(src: ScaleInit) {
    const props = Scale(src);
    return props.intervals.map(ivl => Interval(ivl).semitones);
  }

  export function containsChord(scale: ScaleInit, chord: ChordInit) {
    const c = Chord(chord).chroma.split('');
    const s = Scale(scale).chroma.split('');

    const intersect = [];

    for (let index = 0; index < 12; index++) {
      intersect.push(+s[index] & +c[index]);
    }

    return intersect.join('') === c.join('');
  }

  /**
   * Find mode names of a scale
   *
   * @function
   * @param {string} name - scale name
   * @example
   * modes("C pentatonic") // => [
   *   ["C", "major pentatonic"],
   *   ["D", "egyptian"],
   *   ["E", "malkos raga"],
   *   ["G", "ritusen"],
   *   ["A", "minor pentatonic"]
   * ]
   */
  export function modes(name: string): ScaleMode[] {
    const s = Scale(name);
    if (s.empty) {
      return [];
    }

    const tonics = s.tonic ? s.notes : s.intervals;
    return pcmodes(s.chroma)
      .map(
        (chroma: string, i: number): ScaleMode => {
          const modeName = Scale(chroma).name;
          return modeName ? [tonics[i], modeName] : ['', ''];
        },
      )
      .filter(x => x[0]);
  }

  export function toSteps(src: ScaleInit) {
    const scale = Scale(src);
    const intervals = scale.intervals;

    const semitones = intervals.map(ivl => Interval(ivl).semitones);
    const steps = [];
    for (let i = 1; i < semitones.length; i++) {
      const diff = semitones[i] - semitones[i - 1];
      const step = eq(diff, 1) ? 'H' : eq(diff, 2) ? 'W' : 'W.';
      steps.push(step);
    }

    return steps;
  }

  export function harmonize(srcScale: ScaleInit, srcChords: ChordTypeName[]): ChordTypeName[] {
    const scale = Scale(srcScale);

    if (scale.notes) {
      const harmonized = scale.notes
        .map(note =>
          srcChords.map(type => Chord(note + ' ' + type)).filter(ch => SCALE.containsChord(srcScale, ch.name)),
        )
        .map(c => c[0] || { name: '' })
        .filter(c => c)
        .map(c => c.name || '');
      console.log(harmonized);
    }

    return srcChords;
  }
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
    return Dictionary.types.filter(scale => isSuperset(scale.chroma)).map(scale => scale.name);
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
    return Dictionary.types.filter(scale => isSubset(scale.chroma)).map(scale => scale.name);
  }
}

export const SCALE = {
  ...Theory,
  ...Static,
  ...Dictionary,
};

/**
 * Get a Scale from a scale name.
 */
export function Scale(src: ScaleInit): Scale {
  const [sname, stype, octave] = Array.isArray(src) ? src : SCALE.tokenize(src);
  const tonic = Note((sname + octave) as NoteName);
  const scales = SCALE.all;
  const st = (scales[stype.trim() as ScaleTypeName] || SCALE.NoScaleType) as ScaleType;
  if (st.empty) {
    return SCALE.NoScale;
  }

  const chroma = tonic.chroma ? rotate(-tonic.chroma, st.chroma.split('')).join('') : st.chroma;
  const scType = { ...st, chroma };

  const type = st.name;
  let notes: string[] = [];
  if (tonic.valid) {
    const notesArr = st.intervals.map(i => transpose(tonic.name, i));
    notes = octave ? notesArr.map(n => n.name) : notesArr.map(n => n.pc);
  }
  const name = tonic.valid ? `${tonic.pc} ${type}` : type;

  const valid = true;

  return { ...scType, name, type, tonic: tonic.pc || '', notes, valid };
}
