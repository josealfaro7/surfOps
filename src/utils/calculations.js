/**
 * Reglas de negocio puras de SurfOps (sin React, sin DOM, sin red).
 * Todo lo que mueve dinero o asigna instructores vive aquí y tiene tests en
 * src/utils/__tests__/calculations.test.js.
 */

/* ------------------------------------------------------------------ */
/* Formato y horas                                                     */
/* ------------------------------------------------------------------ */

/** Formatea un número como moneda CLP ($XX.XXX) */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '$' + Math.round(num).toLocaleString('es-CL');
}

/** Convierte "HH:MM" a minutos desde las 00:00 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** Convierte minutos desde las 00:00 a "HH:MM" (sin recortar; puede superar 24:00) */
export function minutesToTime(totalMinutes) {
  const safe = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const h = String(Math.floor(safe / 60)).padStart(2, '0');
  const m = String(safe % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Suma minutos a una hora "HH:MM". Por defecto 75 min (duración de clase).
 * No recorta silenciosamente: si el resultado pasa de 23:59 devuelve p.ej. "25:00",
 * y la validación de horario de atención se encarga de rechazarlo.
 */
export function addMinutesToTime(timeStr, minutesToAdd = 75) {
  return minutesToTime(timeToMinutes(timeStr) + (Number(minutesToAdd) || 0));
}

/** ¿Se solapan [startA, endA) y [startB, endB)? */
export function isTimeOverlapping(startA, endA, startB, endB) {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  if (eA <= sA || eB <= sB) return false;
  return sA < eB && eA > sB;
}

/* ------------------------------------------------------------------ */
/* Estados de clase                                                    */
/* ------------------------------------------------------------------ */

export const CLASS_STATUS = {
  SCHEDULED: 'scheduled',
  PENDING_INSTRUCTOR: 'pending_instructor',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
};

/** Estados que ocupan el horario de un instructor */
export const OCCUPYING_STATUSES = [CLASS_STATUS.SCHEDULED, CLASS_STATUS.COMPLETED];

/** Estados que generan pago al instructor */
export const PAYABLE_STATUSES = [CLASS_STATUS.SCHEDULED, CLASS_STATUS.COMPLETED];

export function isOccupyingClass(cls) {
  return OCCUPYING_STATUSES.includes(cls?.status || CLASS_STATUS.SCHEDULED);
}

/** Pago efectivo al instructor según estado (no-show / cancelada = $0) */
export function getPayableInstructorPay(cls) {
  if (!cls || !cls.instructorId) return 0;
  if (!PAYABLE_STATUSES.includes(cls.status || CLASS_STATUS.SCHEDULED)) return 0;
  return Number(cls.instructorPay) || 0;
}

/* ------------------------------------------------------------------ */
/* Conflictos y fila de rotación                                       */
/* ------------------------------------------------------------------ */

/**
 * Clases del instructor que chocan con [startTime, endTime) en la MISMA fecha.
 * Ignora clases canceladas / no-show y, opcionalmente, una clase (al reasignar).
 */
export function getInstructorConflicts(
  instructorId,
  startTime,
  endTime,
  classes,
  operationDate,
  { excludeClassId = null } = {}
) {
  if (!instructorId || !startTime || !endTime) return [];
  return (classes || []).filter(
    (cls) =>
      cls.id !== excludeClassId &&
      cls.instructorId === instructorId &&
      (!operationDate || !cls.operationDate || cls.operationDate === operationDate) &&
      isOccupyingClass(cls) &&
      isTimeOverlapping(startTime, endTime, cls.startTime, cls.endTime)
  );
}

/**
 * Fila de rotación estricta (round-robin) del día.
 *
 * Orden inicial = hora de check-in. Cada vez que un instructor recibe una clase del
 * día (sugerida, manual o una sesión de curso agendada para hoy), pasa al final de la
 * fila. Si el primero está ocupado en el bloque pedido se salta, pero conserva su
 * lugar porque su "última asignación" no cambia.
 *
 * Orden: sin asignaciones hoy primero (por check-in); luego por última asignación ↑.
 */
export function buildRotationQueue(instructors, classesToday) {
  const lastAssignedById = new Map();
  (classesToday || []).forEach((cls) => {
    if (!cls.instructorId || !isOccupyingClass(cls)) return;
    const ts = Number(cls.assignedAtMs) || 0;
    const prev = lastAssignedById.get(cls.instructorId);
    if (prev === undefined || ts > prev) {
      lastAssignedById.set(cls.instructorId, ts);
    }
  });

  return (instructors || [])
    .filter((inst) => inst.checkedIn && inst.checkInTimestamp !== null && inst.checkInTimestamp !== undefined)
    .map((inst) => ({
      ...inst,
      lastAssignedAtMs: lastAssignedById.has(inst.id) ? lastAssignedById.get(inst.id) : null,
      classesToday: (classesToday || []).filter(
        (c) => c.instructorId === inst.id && isOccupyingClass(c)
      ).length,
    }))
    .sort((a, b) => {
      const aHas = a.lastAssignedAtMs !== null;
      const bHas = b.lastAssignedAtMs !== null;
      if (aHas !== bHas) return aHas ? 1 : -1;
      if (aHas && bHas && a.lastAssignedAtMs !== b.lastAssignedAtMs) {
        return a.lastAssignedAtMs - b.lastAssignedAtMs;
      }
      return a.checkInTimestamp - b.checkInTimestamp;
    })
    .map((inst, index) => ({ ...inst, queuePosition: index + 1 }));
}

/** Primer instructor de la fila libre en el bloque; los ocupados se saltan sin perder lugar */
export function suggestInstructorForSlot(queue, startTime, endTime, classes, operationDate) {
  if (!queue || queue.length === 0) {
    return {
      suggestedInstructor: null,
      skippedInstructors: [],
      reason: 'Sin instructores con check-in en la fila.',
    };
  }
  const skipped = [];
  for (const inst of queue) {
    const conflicts = getInstructorConflicts(inst.id, startTime, endTime, classes, operationDate);
    if (conflicts.length === 0) {
      return {
        suggestedInstructor: inst,
        skippedInstructors: skipped,
        reason:
          skipped.length === 0
            ? `Turno #${inst.queuePosition}: ${inst.name}`
            : `Turno #${inst.queuePosition}: ${inst.name} — ${skipped
                .map((s) => `${s.instructor.name} ocupado (conserva su turno)`)
                .join(', ')}`,
      };
    }
    skipped.push({ instructor: inst, conflicts });
  }
  return {
    suggestedInstructor: null,
    skippedInstructors: skipped,
    reason: 'Todos los instructores en fila tienen clase en este horario.',
  };
}

/* ------------------------------------------------------------------ */
/* Horario de atención                                                 */
/* ------------------------------------------------------------------ */

/**
 * Valida un bloque de clase. Devuelve una lista de errores (vacía = OK).
 * - Debe estar dentro del horario de atención.
 * - Si es para hoy y se conoce el ocaso, no puede terminar después del ocaso.
 */
export function validateClassSlot({ startTime, endTime, openTime, closeTime, sunsetTime = null }) {
  const errors = [];
  if (!startTime || !endTime) {
    errors.push('Falta la hora de inicio.');
    return errors;
  }
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (openTime && s < timeToMinutes(openTime)) {
    errors.push(`La escuela abre a las ${openTime}.`);
  }
  if (closeTime && e > timeToMinutes(closeTime)) {
    errors.push(`La clase termina a las ${endTime}, después del cierre (${closeTime}).`);
  }
  if (sunsetTime && e > timeToMinutes(sunsetTime)) {
    errors.push(`La clase termina a las ${endTime}, después del ocaso (${sunsetTime}).`);
  }
  return errors;
}

/** Horas máximas de arriendo desde checkInTime sin pasar del cierre (máx. 12) */
export function getMaxRentalHours(checkInTime, closeTime, absoluteMax = 12) {
  if (!closeTime) return absoluteMax;
  const available = timeToMinutes(closeTime) - timeToMinutes(checkInTime);
  return Math.max(0, Math.min(absoluteMax, Math.floor(available / 60)));
}

/**
 * ¿El arriendo está atrasado?
 * - Si salió un día anterior a hoy y sigue activo → atrasado.
 * - Si es de hoy → atrasado cuando la hora actual supera la de devolución.
 */
export function isRentalOverdue(rental, nowHHMM, todayIso) {
  if (!rental || rental.status === 'completed') return false;
  if (rental.operationDate && todayIso && rental.operationDate < todayIso) return true;
  return timeToMinutes(nowHHMM) > timeToMinutes(rental.estimatedReturnTime);
}

/* ------------------------------------------------------------------ */
/* Precios y pagos                                                     */
/* ------------------------------------------------------------------ */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Subtotal que paga el alumno (antes de descuento) */
export function calculateStudentSubtotal(schoolConfig, { modality, pax, category, courseAlreadyPaid = false }) {
  const count = modality === 'grupal' ? Math.max(2, num(pax) || 2) : 1;

  if (category === 'curso') {
    if (courseAlreadyPaid) return 0;
    // El pack completo se cobra por alumno al inscribirse
    return num(schoolConfig.priceCoursePack8) * count;
  }

  if (modality === 'individual') {
    return num(schoolConfig.priceIndividual);
  }

  const extraPaxCount = Math.max(0, count - 2);
  return num(schoolConfig.priceGroupBase) + extraPaxCount * num(schoolConfig.priceGroupExtraPax);
}

/** Pago al instructor por UNA sesión (se paga el día que la dicta) */
export function calculateInstructorPayment(schoolConfig, { modality, pax, category }) {
  const count = modality === 'grupal' ? Math.max(2, num(pax) || 2) : 1;
  const extraBonus = Math.max(0, count - 2) * num(schoolConfig.payGroupExtraPax);

  if (category === 'curso') {
    return num(schoolConfig.payCourseSingleClass) + (modality === 'grupal' ? extraBonus : 0);
  }
  if (modality === 'individual') {
    return num(schoolConfig.payIndividual);
  }
  return num(schoolConfig.payGroupBase) + extraBonus;
}

/** Subtotal, descuento y total de un arriendo */
export function calculateRentalTotals(pricePerHour, quantity, hours, discount = 0) {
  const unitRate = Math.max(0, num(pricePerHour));
  const qty = Math.max(1, num(quantity) || 1);
  const hrs = Math.max(1, num(hours) || 1);
  const subtotal = unitRate * qty * hrs;
  const validDiscount = Math.min(subtotal, Math.max(0, num(discount)));
  return {
    subtotal,
    discount: validDiscount,
    finalTotal: Math.max(0, subtotal - validDiscount),
  };
}

/* ------------------------------------------------------------------ */
/* Cierre diario                                                       */
/* ------------------------------------------------------------------ */

export const PAYMENT_METHODS = ['Transferencia', 'Tarjeta', 'Efectivo'];

/**
 * Resumen de cierre para UNA fecha.
 *  - classes / rentals pueden traer otras fechas: se filtran aquí.
 *  - Caja clases: final_total de clases no canceladas de la fecha
 *    (el pack completo cae en la fecha de la sesión #1).
 *  - Nómina: pago de sesiones de la fecha en estado scheduled/completed.
 *  - Arriendos: 100% escuela, por fecha de salida.
 *  - Medios de pago: clases + arriendos (sesiones de pack ya pagadas no cuentan).
 */
export function summarizeClosing(classes, rentals, operationDate) {
  const dayClasses = (classes || []).filter((c) => c.operationDate === operationDate);
  const revenueClasses = dayClasses.filter((c) => c.status !== CLASS_STATUS.CANCELLED);
  const dayRentals = (rentals || []).filter((r) => r.operationDate === operationDate);

  const classesRevenue = revenueClasses.reduce((acc, c) => acc + num(c.finalTotal), 0);
  const payroll = dayClasses.reduce((acc, c) => acc + getPayableInstructorPay(c), 0);
  const rentalsRevenue = dayRentals.reduce((acc, r) => acc + num(r.finalTotal), 0);

  const byPayment = {};
  PAYMENT_METHODS.forEach((m) => {
    byPayment[m] = { count: 0, amount: 0, classesAmount: 0, rentalsAmount: 0 };
  });
  revenueClasses.forEach((c) => {
    if (c.isPaidInPack || num(c.finalTotal) === 0) return;
    const m = byPayment[c.paymentMethod] ? c.paymentMethod : 'Transferencia';
    byPayment[m].count += 1;
    byPayment[m].amount += num(c.finalTotal);
    byPayment[m].classesAmount += num(c.finalTotal);
  });
  dayRentals.forEach((r) => {
    const m = byPayment[r.paymentMethod] ? r.paymentMethod : 'Efectivo';
    byPayment[m].count += 1;
    byPayment[m].amount += num(r.finalTotal);
    byPayment[m].rentalsAmount += num(r.finalTotal);
  });

  return {
    operationDate,
    dayClasses,
    dayRentals,
    totalClasses: revenueClasses.length,
    classesRevenue,
    payroll,
    classesNetProfit: classesRevenue - payroll,
    totalRentals: dayRentals.length,
    rentalsRevenue,
    combinedRevenue: classesRevenue + rentalsRevenue,
    combinedNetProfit: classesRevenue - payroll + rentalsRevenue,
    byPayment,
  };
}

/** Desglose legible de las clases de un instructor: "2 Individuales, 1 Grupal [3 pax], 1 de Curso" */
export function buildInstructorBreakdownSummary(classes) {
  if (!classes || classes.length === 0) return 'Sin clases asignadas';

  let individualCount = 0;
  const groupClasses = [];
  let courseCount = 0;

  classes.forEach((cls) => {
    if (cls.category === 'curso') courseCount += 1;
    else if (cls.modality === 'individual') individualCount += 1;
    else groupClasses.push(cls);
  });

  const parts = [];
  if (individualCount > 0) {
    parts.push(`${individualCount} ${individualCount === 1 ? 'Individual' : 'Individuales'}`);
  }
  groupClasses.forEach((g) => parts.push(`1 Grupal [${g.pax} pax]`));
  if (courseCount > 0) parts.push(`${courseCount} de Curso`);
  return parts.join(', ');
}

/** CSV con separador ';' (Excel en configuración regional es-CL) y BOM UTF-8 */
export function buildCsv(headers, rows, separator = ';') {
  const escape = (value) => {
    const str = String(value ?? '');
    if (str.includes(separator) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers, ...rows].map((r) => r.map(escape).join(separator));
  return '﻿' + lines.join('\r\n');
}
