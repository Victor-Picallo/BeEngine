import f1Data from '../data/f1/f1.data.js';
import motogpData from '../data/motogp/motogp.data.js';

const dataMap = {
  f1: f1Data,
  motogp: motogpData,
};

export const findHomeByCategory = (category) => dataMap[category] ?? null;
