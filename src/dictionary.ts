import { BaseFunctional } from 'ann-music-base';
import { Pc } from 'ann-music-pc';

import SCALE_LIST from './data';
import { ScaleType } from './types';

const { map } = BaseFunctional;
type ScaleTypes = Record<string, ScaleType>;

function toScaleType([ivls, type, abbrvs]: string[]): ScaleType {
  const intervals = ivls.split(' ');
  const aliases = abbrvs ? abbrvs.split(' ') : [];
  const { pcnum, chroma, normalized } = Pc({ intervals });

  return {
    pc: { pcnum, chroma, normalized },
    type,
    aliases,
    intervals,
  };
}

function toScales(chordTypes: ScaleType[]) {
  return chordTypes.reduce((index: ScaleTypes, scale) => {
    index[scale.type] = scale;
    scale.aliases.forEach(alias => {
      index[alias] = scale;
    });
    return index;
  }, {});
}

export const SCALE_TYPES: ScaleType[] = SCALE_LIST.map(toScaleType);
export const SCALES: ScaleTypes = toScales(SCALE_TYPES);

export const scaleBySize = (size: number) => SCALE_TYPES.filter(scale => scale.intervals.length === size);
export const scaleTypeList = SCALE_TYPES.map(scale => scale.type);
