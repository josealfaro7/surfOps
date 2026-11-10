/**
 * Modo Demo: datos de ejemplo que viven SOLO en este navegador.
 *
 * - Nada de esto se usa cuando hay una sesión real de Supabase.
 * - Todas las claves llevan el prefijo surfops_demo_v2_ para no mezclarse con
 *   las del prototipo anterior ni con otra escuela.
 * - Los datos se generan relativos a "hoy" para que el cierre diario siempre
 *   tenga algo que mostrar.
 */
import { DEFAULT_SCHOOL_CONFIG, DEFAULT_RENTAL_RATES } from './mappers';
import { addDaysToIsoDate, localDateTimeToDate } from '../utils/dates';

const KEY = 'surfops_demo_v2_state';

/** Claves del prototipo anterior (pueden contener fotos de carnet): se borran */
const LEGACY_KEYS = ['surfops_rental_rates', 'surfops_active_rentals', 'surfops_completed_rentals', 'surfops_school_branding'];

export function purgeLegacyLocalStorage() {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignorar
  }
}

const DEMO_ID_PHOTO_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
      <rect width="320" height="200" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/>
      <rect width="320" height="38" fill="#172554"/>
      <text x="16" y="24" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">DOCUMENTO DE EJEMPLO · DEMO</text>
      <rect x="20" y="56" width="76" height="96" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
      <circle cx="58" cy="88" r="18" fill="#64748b"/>
      <path d="M32 142 C32 118 84 118 84 142 Z" fill="#64748b"/>
      <text x="112" y="96" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">SIN VALIDEZ</text>
    </svg>`
  );

export function buildDemoSeed(todayIso, timeZone) {
  const ts = (hhmm, iso = todayIso) => localDateTimeToDate(iso, hhmm, timeZone).getTime();

  const instructors = [
    { id: 'demo-diego', name: 'Diego', checkedIn: true, checkInTime: '08:10', checkInTimestamp: ts('08:10') },
    { id: 'demo-jose', name: 'Jose', checkedIn: true, checkInTime: '08:20', checkInTimestamp: ts('08:20') },
    { id: 'demo-vitoco', name: 'Vitoco', checkedIn: true, checkInTime: '08:35', checkInTimestamp: ts('08:35') },
    { id: 'demo-caco', name: 'Caco', checkedIn: false, checkInTime: null, checkInTimestamp: null },
    { id: 'demo-alfred', name: 'Alfred', checkedIn: false, checkInTime: null, checkInTimestamp: null },
  ];

  const base = {
    status: 'scheduled',
    courseGroupId: null,
    sessionIndex: 1,
    isPaidInPack: false,
    discount: 0,
    wasSuggestedByQueue: true,
  };

  const packId = 'demo-pack-1';
  const classes = [
    { ...base, id: 'demo-cls-1', operationDate: todayIso, modality: 'individual', pax: 1, category: 'unica', subtotal: 25000, finalTotal: 25000, paymentMethod: 'Transferencia', startTime: '09:00', endTime: '10:15', instructorId: 'demo-diego', instructorPay: 7000, assignedAtMs: ts('08:40'), studentName: 'Martín Echeverría', studentPhone: '+56 9 8421 1102', studentEmail: 'martin@correo.cl', emergencyContactName: 'Carolina Soto', emergencyContactPhone: '+56 9 7112 3344' },
    { ...base, id: 'demo-cls-2', operationDate: todayIso, modality: 'grupal', pax: 3, category: 'unica', subtotal: 58000, discount: 3000, finalTotal: 55000, paymentMethod: 'Tarjeta', startTime: '09:00', endTime: '10:15', instructorId: 'demo-jose', instructorPay: 11000, assignedAtMs: ts('08:45'), studentName: 'Familia Aguirre', studentPhone: '+56 9 7612 9088', studentEmail: 'aguirre@correo.cl', emergencyContactName: 'Roberto Aguirre', emergencyContactPhone: '+56 9 6554 1122' },
    { ...base, id: 'demo-cls-3', operationDate: todayIso, modality: 'individual', pax: 1, category: 'unica', subtotal: 25000, finalTotal: 25000, paymentMethod: 'Efectivo', startTime: '10:30', endTime: '11:45', instructorId: 'demo-vitoco', instructorPay: 7000, assignedAtMs: ts('09:30'), studentName: 'Sofía Larraín', studentPhone: '+56 9 9231 4451', studentEmail: 'sofia@correo.cl', emergencyContactName: 'Elena Valdés', emergencyContactPhone: '+56 9 8877 6655' },
    // Curso Pack: se paga completo en la sesión #1; el instructor cobra cada sesión el día que la dicta
    { ...base, id: 'demo-cls-4', operationDate: todayIso, courseGroupId: packId, sessionIndex: 1, modality: 'individual', pax: 1, category: 'curso', subtotal: 160000, finalTotal: 160000, paymentMethod: 'Transferencia', startTime: '15:00', endTime: '16:15', instructorId: 'demo-diego', instructorPay: 6000, wasSuggestedByQueue: false, assignedAtMs: ts('10:00'), studentName: 'Ignacio Zúñiga', studentPhone: '+56 9 5119 8844', studentEmail: 'ignacio@correo.cl', emergencyContactName: 'Marcela Ríos', emergencyContactPhone: '+56 9 7788 9900' },
    { ...base, id: 'demo-cls-5', operationDate: addDaysToIsoDate(todayIso, 1), courseGroupId: packId, sessionIndex: 2, isPaidInPack: true, modality: 'individual', pax: 1, category: 'curso', subtotal: 0, finalTotal: 0, paymentMethod: 'Transferencia', startTime: '15:00', endTime: '16:15', instructorId: 'demo-diego', instructorPay: 6000, wasSuggestedByQueue: false, assignedAtMs: ts('10:00'), studentName: 'Ignacio Zúñiga', studentPhone: '+56 9 5119 8844', studentEmail: 'ignacio@correo.cl', emergencyContactName: 'Marcela Ríos', emergencyContactPhone: '+56 9 7788 9900' },
    { ...base, id: 'demo-cls-6', operationDate: addDaysToIsoDate(todayIso, 2), courseGroupId: packId, sessionIndex: 3, isPaidInPack: true, modality: 'individual', pax: 1, category: 'curso', subtotal: 0, finalTotal: 0, paymentMethod: 'Transferencia', startTime: '15:00', endTime: '16:15', instructorId: 'demo-diego', instructorPay: 6000, wasSuggestedByQueue: false, assignedAtMs: ts('10:00'), studentName: 'Ignacio Zúñiga', studentPhone: '+56 9 5119 8844', studentEmail: 'ignacio@correo.cl', emergencyContactName: 'Marcela Ríos', emergencyContactPhone: '+56 9 7788 9900' },
  ];

  const rentalBase = { operationDate: todayIso, idPhotoStoragePath: null, idPhotoDataUrl: DEMO_ID_PHOTO_SVG, discount: 0 };
  const rentals = [
    { ...rentalBase, id: 'demo-rnt-1', itemId: 'tabla_surf', itemLabel: 'Tabla de Surf', unitPricePerHour: 8000, quantity: 2, hours: 2, checkInTime: '10:30', estimatedReturnTime: '12:30', returnedAt: null, paymentMethod: 'Efectivo', subtotal: 32000, discount: 2000, finalTotal: 30000, customerName: 'Lucas Valenzuela', customerEmail: 'lucas@correo.cl', customerPhone: '+56 9 8412 3390', emergencyContact: 'Andrea Valenzuela · +56 9 8412 0011', status: 'active' },
    { ...rentalBase, id: 'demo-rnt-2', itemId: 'traje_surf', itemLabel: 'Traje de Surf', unitPricePerHour: 5000, quantity: 1, hours: 2, checkInTime: '09:00', estimatedReturnTime: '11:00', returnedAt: null, paymentMethod: 'Tarjeta', subtotal: 10000, finalTotal: 10000, customerName: 'Martina Gómez', customerEmail: 'martina@correo.cl', customerPhone: '+56 9 7621 4410', emergencyContact: 'Rodrigo Gómez · +56 9 7621 9988', status: 'active' },
    { ...rentalBase, id: 'demo-rnt-3', itemId: 'bodyboard', itemLabel: 'Bodyboard', unitPricePerHour: 5000, quantity: 2, hours: 1, checkInTime: '09:15', estimatedReturnTime: '10:15', returnedAt: '10:12', returnedOn: todayIso, paymentMethod: 'Efectivo', subtotal: 10000, finalTotal: 10000, customerName: 'Cristóbal Pizarro', customerEmail: 'cpizarro@correo.cl', customerPhone: '+56 9 6334 1122', emergencyContact: 'Claudia Pizarro · +56 9 6334 8877', status: 'completed' },
  ];

  return {
    version: 2,
    seededFor: todayIso,
    attendanceDate: todayIso,
    schoolConfig: { ...DEFAULT_SCHOOL_CONFIG },
    rentalRates: DEFAULT_RENTAL_RATES.map((r) => ({ ...r })),
    instructors,
    classes,
    rentals,
  };
}

/**
 * Misma regla que en producción: la foto del carnet se elimina el día siguiente
 * a la devolución del equipo.
 */
export function purgeReturnedIdPhotos(rentals, todayIso) {
  return (rentals || []).map((r) =>
    r.status === 'completed' && r.idPhotoDataUrl && (r.returnedOn || r.operationDate) < todayIso
      ? { ...r, idPhotoDataUrl: null, idPhotoPurged: true }
      : r
  );
}

export function loadDemoState(todayIso, timeZone) {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 2) {
        parsed.rentals = purgeReturnedIdPhotos(parsed.rentals, todayIso);
        // Nuevo día: la asistencia se reinicia (clases y arriendos históricos se conservan con su fecha)
        if (parsed.attendanceDate !== todayIso) {
          parsed.instructors = parsed.instructors.map((i) => ({
            ...i,
            checkedIn: false,
            checkInTime: null,
            checkInTimestamp: null,
          }));
          parsed.attendanceDate = todayIso;
        }
        return parsed;
      }
    }
  } catch {
    // estado corrupto: se vuelve a sembrar
  }
  return buildDemoSeed(todayIso, timeZone);
}

/** Guarda el estado demo. Lanza un Error legible si el navegador no tiene espacio. */
export function saveDemoState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    const quota = err && (err.name === 'QuotaExceededError' || err.code === 22);
    throw new Error(
      quota
        ? 'El navegador se quedó sin espacio para el modo demo (fotos de carnet). Usa "Reiniciar Demo" en la barra superior.'
        : 'No se pudo guardar el estado demo en este navegador.'
    );
  }
}

export function clearDemoState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignorar
  }
}

export const DEMO_ADMIN_PIN = '0000';
