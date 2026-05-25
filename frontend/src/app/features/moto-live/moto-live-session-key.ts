/** Alinea sesión livetiming-lite ↔ clave de URL (fp1, race, q1…). */
export const pulseLiveSessionKeyFromShort = (shortName: string): string => {
  const s = String(shortName ?? '').toUpperCase().replace(/\s+/g, '');
  if (s === 'RACE' || s === 'RAC') return 'race';
  if (s === 'SPRINT' || s === 'SPR') return 'sprint';
  if (s === 'WARM-UP' || s === 'WUP') return 'warmup';
  if (s === 'Q1') return 'q1';
  if (s === 'Q2') return 'q2';
  if (s.startsWith('FP')) {
    const n = s.replace('FP', '');
    return n === '2' ? 'fp2' : 'fp1';
  }
  if (s === 'PRACTICE' || s === 'PR') return 'practice';
  return 'race';
};
