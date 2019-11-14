import { BaseArray, BaseStrings } from 'ann-music-base';
import { eq, neq } from 'ann-music-base/lib/relations';
import { CHORD, ChordTypeName } from 'ann-music-chord';
import { Interval, IntervalName } from 'ann-music-interval';
import { Note, NOTE, NoteLetter, NoteName, NoteProps } from 'ann-music-note';

import { PC, PcChroma, PcNum, PcProperties, PitchClass as PcStatic } from 'ann-music-pc';

import SCALE_LIST from './data';

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
  name: ScaleTypeName;
  aliases: ScaleTypeName[];
}

export type ScaleTypes = Record<ScaleTypeProp, ScaleType>;

export interface ScaleProps extends ScaleType {
  tonic: string;
  type: string;
  notes: NoteName[];
  scaleFormula: string;
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

  export const NoScale: ScaleProps = {
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
    scaleFormula: '',
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
   * @param {ScaleInit} scale name of the scale
   * @returns {ChordTypeName[]} array of chord names
   *
   * @example
   * scaleChords("pentatonic") // => ["5", "64", "M", "M6", "Madd9", "Msus2"]
   */
  export function chords(scale: ScaleInit): ChordTypeName[] {
    const s = Scale(scale);
    const inScale = isSubsetOf(s.normalized);
    return CHORD.types.filter(chord => inScale(chord.normalized)).map(chord => chord.aliases[0]);
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
      .map(n => Note(n))
      .filter(n => n.valid)
      .sort((a, b) => a.midi - b.midi)
      .map(n => n.pc)
      .filter((n, i, a) => eq(i, 0) || neq(n, a[i - 1]));
  }

  /**
   * Find mode names of a scale
   *
   * @function
   * @param {ScaleInit} scale name of the scale
   * @example
   * modes("C pentatonic") // => [
   *   ["C", "major pentatonic"],
   *   ["D", "egyptian"],
   *   ["E", "malkos raga"],
   *   ["G", "ritusen"],
   *   ["A", "minor pentatonic"]
   * ]
   */
  export function modes(scale: ScaleInit): ScaleMode[] {
    const s = Scale(scale);
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

  /**
   * Get all scales names that are a superset of the given one
   * (has the same notes and at least one more)
   *
   * @function
   * @param {ScaleInit} scale - name of the scale
   * @return {ScaleTypeName[]} list of scale names
   *
   * @example
   * extended("major") // => ["bebop", "bebop dominant", "bebop major", "chromatic", "ichikosucho"]
   */
  export function extended(scale: ScaleInit): string[] {
    const s = Scale(scale);
    const isSuperset = isSupersetOf(s.chroma);
    return Dictionary.types.filter(sc => isSuperset(sc.chroma)).map(sc => sc.name);
  }

  /**
   * Find all scales names that are a subset of the given one
   * (has less notes but all from the given scale)
   *
   * @function
   * @param {ScaleInit} scale - name of the scale
   * @return {ScaleTypeName[]} list of scale names
   *
   * @example
   * reduced("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
   */
  export function reduced(scale: ScaleInit): string[] {
    const isSubset = isSubsetOf(Scale(scale).chroma);
    return Dictionary.types.filter(sc => isSubset(sc.chroma)).map(sc => sc.name);
  }

  /**
   * Convert scale to scaleSteps W. / W / H
   *
   * @function
   * @param {string} scale - name of the scale
   * @return {ScaleTypeName[]} list of scale names
   *
   * @example
   * reduced("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
   */
  export function toSteps(scale: ScaleInit): string[] {
    const s = Scale(scale);
    const intervals = s.intervals;

    const semitones = intervals.map(ivl => Interval(ivl).semitones);
    const scaleSteps = [];
    for (let i = 1; i < semitones.length; i++) {
      const diff = semitones[i] - semitones[i - 1];
      const step = eq(diff, 1) ? 'H' : eq(diff, 2) ? 'W' : 'W.';
      scaleSteps.push(step);
    }

    return scaleSteps;
  }

  export function harmonize(srcScale: ScaleInit, srcChords: ChordTypeName[]): ChordTypeName[] {
    const scale = Scale(srcScale);

    return [];
  }
}

export const SCALE = {
  ...Theory,
  ...Static,
};

const nextScaleStep = (currentNote: NoteProps, scaleSteps: number, midi: number) => {
  const midiTransposedNote = Note(currentNote.midi + midi, 'midi');
  const newLetter = NOTE.NATURAL[(NOTE.Letter.toStep(currentNote.letter) + 1) % 7];
  const octaveOffset = newLetter === 'C' ? currentNote.octave + 1 : currentNote.octave;
  const letterTransposedNote = Note(newLetter + octaveOffset);

  const diff = midiTransposedNote.midi - letterTransposedNote.midi;

  if (diff === 0) {
    return letterTransposedNote.name;
  }
  return diff < 0
    ? letterTransposedNote.letter + 'b'.repeat(-1 * diff) + letterTransposedNote.octave
    : letterTransposedNote.letter + '#'.repeat(diff) + letterTransposedNote.octave;
};

export const scaleNotes = (tonic: NoteName, intervals: IntervalName[]) => {
  const note = Note(tonic);
  const scaleDegrees = intervals.map(i => Interval(i).num);
  const scaleFormula = intervals.map(ivl => Interval(ivl).semitones);

  const notes = [note.name];
  for (let i = 1; i < scaleFormula.length; i++) {
    const currentNote = Note(notes[i - 1]);
    const scaleSteps = scaleDegrees[i] - scaleDegrees[i - 1];
    const midi = scaleFormula[i] - scaleFormula[i - 1];
    const nextStep = nextScaleStep(currentNote, scaleSteps, midi);
    notes.push(nextStep);
  }
  return notes;
};

export function Scale(src: ScaleInit): ScaleProps {
  const [sname, stype, octave] = Array.isArray(src) ? src : SCALE.tokenize(src);
  const tonic = Note((sname + octave) as NoteName);
  const scales = Dictionary.all;
  const st = (scales[stype.trim() as ScaleTypeName] || SCALE.NoScaleType) as ScaleType;

  if (st.empty) {
    return SCALE.NoScale;
  }

  const chroma = tonic.chroma ? rotate(-tonic.chroma, st.chroma.split('')).join('') : st.chroma;
  const scType = { ...st, chroma };

  const type = st.name;
  let notes: string[] = [];
  if (tonic.valid) {
    notes = scaleNotes(tonic.name, st.intervals);
  }
  const name = tonic.valid ? `${tonic.pc} ${type}` : type;

  const scaleFormula = scType.intervals.map(ivl => Interval(ivl).semitones).join('-');

  const valid = true;

  return { ...scType, name, type, tonic: tonic.pc || '', notes, scaleFormula, valid };
}
