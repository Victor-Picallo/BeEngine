import f1Data      from '../data/f1.data.js';
import motogpData  from '../data/motogp.data.js';
import feData      from '../data/fe.data.js';
import wrcData     from '../data/wrc.data.js';
import indycarData from '../data/indycar.data.js';

const dataMap = {
  f1:      f1Data,
  motogp:  motogpData,
  fe:      feData,
  wrc:     wrcData,
  indycar: indycarData,
};

export const findHomeByCategory = (category) => dataMap[category] ?? null;
