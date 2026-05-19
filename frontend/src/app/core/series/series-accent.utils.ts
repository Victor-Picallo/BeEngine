/** Texto legible sobre fondo del color acento de la serie. */
export function accentForeground(accent: string): string {
  return accent.toUpperCase() === '#FFD100' ? '#000' : '#fff';
}

/** Sustituto de `accent() === '#FFD100' ? x : accent()` para enlaces secundarios. */
export function accentMutedLink(accent: string): string {
  return accent.toUpperCase() === '#FFD100' ? '#888' : accent;
}

/** Podio / top-3: oro F1, acento de serie en F2/F3. */
export function accentPodiumHighlight(accent: string): string {
  return accent.toUpperCase() === '#FFD100' ? '#C8963E' : accent;
}
