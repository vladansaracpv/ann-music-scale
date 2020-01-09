import * as Dictionary from './dictionary';
import * as Methods from './methods';
import * as Theory from './theory';

export * from './types';

export { Scale } from './properties';

export const SCALE = {
  ...Dictionary,
  ...Methods,
  ...Theory,
};
