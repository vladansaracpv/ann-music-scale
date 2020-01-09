import { BaseArray, BaseTypings } from 'ann-music-base';
import { Interval, IntervalName } from 'ann-music-interval';
import { Note, NOTE, NoteName, NoteProps, NoteLetter } from 'ann-music-note';

import { SCALES } from './dictionary';
import { tokenize } from './methods';
import { ScaleProps, ScaleType } from './types';

const { rotate } = BaseArray;
const { isArray } = BaseTypings;

const EmptyPc = {
  pcnum: 0,
  chroma: '000000000000',
  normalized: '000000000000',
  intervals: [],
  length: 0,
  empty: true,
};

export const NoScaleType: ScaleType = {
  pc: EmptyPc,
  type: '',
  intervals: [],
  aliases: [],
};

export const NoScale: ScaleProps = {
  pc: EmptyPc,
  name: '',
  type: '',
  tonic: '',
  aliases: [],
  notes: [],
  intervals: [],
  formula: '',
  length: 0,
  valid: false,
};

const nextScaleStep = (currentNote: NoteProps, midi: number) => {
  // currentNote: C#, midi: +2
  const midiTransposedNote = Note({ midi: currentNote.midi + midi });
  const newLetter = NOTE.NATURAL[(NOTE.Letter.toStep(currentNote.letter) + 1) % 7] as NoteLetter;
  const ltn1 = Note({ name: newLetter + currentNote.octave });
  const ltn2 = Note({ name: newLetter + (currentNote.octave + 1) });

  let octaveOffset;
  const diff1 = Math.abs(midiTransposedNote.midi - ltn1.midi);
  const diff2 = Math.abs(midiTransposedNote.midi - ltn2.midi);

  if (diff1 < diff2) {
    octaveOffset = ltn1.octave;
  } else {
    octaveOffset = ltn2.octave;
  }
  // console.log(diff1, diff2);

  const letterTransposedNote = Note({ name: newLetter + octaveOffset });

  const diff = midiTransposedNote.midi - letterTransposedNote.midi;

  // console.log('current: ', currentNote);
  // console.log('midi: ', midiTransposedNote);
  // console.log('letter: ', letterTransposedNote);
  // console.log('diff: ', diff);
  // console.log('-------------------------------------');

  if (diff === 0) {
    return letterTransposedNote.name;
  }
  return diff < 0
    ? letterTransposedNote.letter + 'b'.repeat(-1 * diff) + letterTransposedNote.octave
    : letterTransposedNote.letter + '#'.repeat(diff) + octaveOffset;
};

const scaleNotes = (tonic: NoteName, intervals: IntervalName[]) => {
  const note = Note({ name: tonic });
  if (!note.valid) return [];

  const scaleDegrees = intervals.map(i => Interval({ name: i }).inumber);
  const scaleFormula = intervals.map(ivl => Interval({ name: ivl }).width);

  const notes = [note.name];
  for (let i = 1; i < scaleFormula.length; i++) {
    const currentNote = Note({ name: notes[i - 1] });
    const midi = scaleFormula[i] - scaleFormula[i - 1];
    const nextStep = nextScaleStep(currentNote, midi);
    notes.push(nextStep);
  }
  return notes.map(note => note.replace('##', 'x'));
};

const scaleType = (type: string): ScaleType => (SCALES[type.trim()] || NoScaleType) as ScaleType;

const scaleFormula = (intervals: IntervalName[]) => intervals.map(ivl => Interval({ name: ivl }).width).join('-');

export function Scale(src: string): ScaleProps {
  // tokenize given property
  const [sname, stype, octave] = tokenize(src);

  // try to get tonic note
  const root = Note({ name: sname + octave });

  // get scale type
  const { type, aliases, intervals } = scaleType(stype);
  let pc = scaleType(stype).pc;

  if (!intervals.length) {
    return NoScale;
  }

  const chromaArr = pc.chroma.split('');

  pc.chroma = root.valid ? rotate(-root.chroma, chromaArr).join('') : pc.chroma;

  const name = root.valid ? `${root.pc} ${type}` : type;

  const tonic = root.valid ? root.pc : '';

  const formula = scaleFormula(intervals);

  const notes: NoteName[] = scaleNotes(root.name, intervals);

  const length = intervals.length;

  const valid = true;

  return {
    type,
    aliases,
    intervals,
    pc,
    name,
    formula,
    tonic,
    notes,
    length,
    valid,
  };
}
