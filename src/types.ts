import { NoteName } from '@packages/note';
import { PcProperties } from '@packages/pc';
import { IntervalName } from '@packages/interval';

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
