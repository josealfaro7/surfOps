/**
 * Utilidades de fecha y hora con zona horaria explícita.
 *
 * Toda la lógica operativa usa la hora de la escuela (por defecto America/Santiago),
 * no la del dispositivo ni UTC, para que "hoy" signifique lo mismo en la tablet de
 * recepción, en el notebook del dueño y en la base de datos.
 */

export const DEFAULT_TIMEZONE = 'America/Santiago';

function getParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = {};
  fmt.formatToParts(date).forEach((p) => {
    parts[p.type] = p.value;
  });
  return parts;
}

/** Fecha de hoy "YYYY-MM-DD" en la zona horaria de la escuela */
export function getTodayIsoDate(timeZone = DEFAULT_TIMEZONE, now = new Date()) {
  const p = getParts(now, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora actual "HH:MM" en la zona horaria de la escuela */
export function getNowHHMM(timeZone = DEFAULT_TIMEZONE, now = new Date()) {
  const p = getParts(now, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** "YYYY-MM-DD" → "DD/MM/YYYY" */
export function formatIsoToDisplayDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  if (isoDate.includes('/')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/** Suma días a una fecha ISO sin depender de la zona horaria del dispositivo */
export function addDaysToIsoDate(isoDate, daysToAdd = 1) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + daysToAdd);
  return dt.toISOString().slice(0, 10);
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de una fecha "YYYY-MM-DD" */
export function getIsoWeekday(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** Lunes y domingo de la semana que contiene isoDate */
export function getWeekRange(isoDate) {
  const monday = addDaysToIsoDate(isoDate, 1 - getIsoWeekday(isoDate));
  return { from: monday, to: addDaysToIsoDate(monday, 6) };
}

/** Lista de fechas ISO entre from y to (inclusive) */
export function listIsoDates(from, to) {
  const out = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDaysToIsoDate(cur, 1);
    guard += 1;
  }
  return out;
}

const WEEKDAY_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const WEEKDAY_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function getWeekdayLabels(isoDate) {
  const idx = getIsoWeekday(isoDate) - 1;
  return { short: WEEKDAY_SHORT[idx], long: WEEKDAY_LONG[idx] };
}

/**
 * Convierte fecha ISO + "HH:MM" (hora local de la escuela) a un Date absoluto.
 * Se calcula el desfase de la zona horaria para ese instante.
 */
export function localDateTimeToDate(isoDate, hhmm, timeZone = DEFAULT_TIMEZONE) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const [hh, mm] = String(hhmm || '00:00').split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const p = getParts(new Date(asUtc), timeZone);
  const tzAsUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute)
  );
  const offset = tzAsUtc - asUtc;
  return new Date(asUtc - offset);
}
