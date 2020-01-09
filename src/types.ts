import { NoteName } from 'ann-music-note';
import { PcProperties } from 'ann-music-pc';
import { IntervalName } from 'ann-music-interval';

export type ScalePc = Pick<PcProperties, 'pcnum' | 'chroma' | 'normalized'>;

export interface ScaleType {
  pc: ScalePc;
  type: string;
  aliases: string[];
  intervals: IntervalName[];
}

export interface ScaleProps extends ScaleType {
  name: string;
  tonic: string;
  formula: string;
  notes: NoteName[];
  length: number;
  valid: boolean;
}
