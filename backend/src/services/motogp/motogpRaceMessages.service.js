const STATUS_LABELS = {
  I: 'Sesión en curso',
  R: 'BANDERA ROJA',
  F: 'Sesión finalizada',
  N: 'Sesión no iniciada',
  D: 'Sesión retrasada',
  C: 'Sesión cancelada',
};

/**
 * Mensajes estilo race control a partir del estado Pulse (livetiming-lite / sesión).
 */
export const buildRaceMessages = ({ head, session, condition, riders }) => {
  const now = new Date().toISOString();
  const messages = [];

  const statusId = String(
    head?.session_status_id ?? head?.sessionStatusId ?? session?.status ?? '',
  ).toUpperCase();
  const statusName = String(
    head?.session_status_name ?? head?.sessionStatus ?? '',
  ).toUpperCase();

  if (statusId === 'R' || statusName.includes('RED')) {
    messages.push({
      date: now,
      category: 'Flag',
      message: 'BANDERA ROJA — sesión interrumpida',
      flag: 'RED',
      urgent: true,
    });
  } else if (statusId === 'I' || statusName.includes('PROGRESS') || statusName === 'L') {
    messages.push({
      date: now,
      category: 'Session',
      message: STATUS_LABELS.I,
      flag: null,
      urgent: false,
    });
  } else if (statusId === 'F' || statusName === 'F' || statusName.includes('FINISH')) {
    messages.push({
      date: now,
      category: 'Session',
      message: STATUS_LABELS.F,
      flag: null,
      urgent: false,
    });
  }

  if (session?.type) {
    messages.push({
      date: now,
      category: 'Session',
      message: `Tipo de sesión: ${session.type}${session.number ? ` ${session.number}` : ''}`,
      flag: null,
      urgent: false,
    });
  }

  if (condition?.weather || condition?.track) {
    messages.push({
      date: now,
      category: 'Weather',
      message: `Condiciones: ${[condition.weather, condition.track].filter(Boolean).join(' · ')}`,
      flag: null,
      urgent: /wet|rain|mojado/i.test(String(condition.track ?? '')),
    });
  }

  const remaining = head?.remaining ?? head?.time_remaining;
  if (remaining != null && String(remaining) !== '0' && statusId !== 'F') {
    messages.push({
      date: now,
      category: 'Session',
      message: `Tiempo restante (aprox.): ${remaining}`,
      flag: null,
      urgent: false,
    });
  }

  const inPit = (riders ?? []).filter((r) => r.onPit && r.position > 0).slice(0, 5);
  if (inPit.length) {
    const names = inPit.map((r) => r.shortName || r.driver?.split(' ')?.pop() || `#${r.riderNumber}`).join(', ');
    messages.push({
      date: now,
      category: 'Pit',
      message: `En boxes: ${names}`,
      flag: null,
      urgent: false,
    });
  }

  const yellowTrack = (riders ?? []).filter(
    (r) => r.trackStatus === 'Y' && r.position > 0,
  );
  if (yellowTrack.length) {
    messages.push({
      date: now,
      category: 'Flag',
      message: `Bandera amarilla en pista (${yellowTrack.length} piloto(s) afectados)`,
      flag: 'YELLOW',
      urgent: true,
    });
  }

  return messages.slice(0, 25);
};
