/**
 * Formatea un número como moneda en Pesos Chilenos / formato estándar ($XX.XXX)
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '$' + Math.round(num).toLocaleString('es-CL');
}

/**
 * Convierte una cadena "HH:MM" a minutos desde las 00:00 para comparar rangos horarios
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Suma minutos a una hora "HH:MM" y devuelve "HH:MM"
 * Por defecto suma 75 minutos (1 hora y 15 minutos de duración de clase)
 */
export function addMinutesToTime(timeStr, minutesToAdd = 75) {
  const total = timeToMinutes(timeStr) + minutesToAdd;
  const clamped = Math.min(23 * 60 + 59, Math.max(0, total));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Verifica si dos bloques horarios [startA, endA] y [startB, endB] se solapan
 */
export function isTimeOverlapping(startA, endA, startB, endB) {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  if (eA <= sA || eB <= sB) return false;
  return sA < eB && eA > sB;
}

/**
 * Obtiene las clases que generan choque de horario para un instructor dado en [startTime, endTime]
 */
export function getInstructorConflicts(instructorId, startTime, endTime, dailyClasses) {
  if (!instructorId || !startTime || !endTime) return [];
  return dailyClasses.filter(
    (cls) =>
      cls.instructorId === instructorId &&
      isTimeOverlapping(startTime, endTime, cls.startTime, cls.endTime)
  );
}

/**
 * Calcula el Subtotal Automático de Venta (lo que paga el alumno antes de descuento)
 * según SchoolConfig, modalidad ('individual' | 'grupal'), cantidad de pax y categoría ('unica' | 'curso').
 */
export function calculateStudentSubtotal(schoolConfig, { modality, pax, category, courseAlreadyPaid = false }) {
  const count = modality === 'grupal' ? Math.max(2, Number(pax) || 2) : 1;

  if (category === 'curso') {
    if (courseAlreadyPaid) {
      return 0;
    }
    // Precio Curso Completo (Pack 8 clases) por alumno (si es grupal se multiplica por la cantidad de alumnos en el curso)
    return (Number(schoolConfig.priceCoursePack8) || 0) * count;
  }

  // Categoría: Clase Única
  if (modality === 'individual') {
    return Number(schoolConfig.priceIndividual) || 0;
  }

  // Modalidad Grupal (Base para 2 pax + adicional por cada alumno extra sobre 2 pax)
  const base2Pax = Number(schoolConfig.priceGroupBase) || 0;
  const extraPaxCount = Math.max(0, count - 2);
  const extraPaxCost = extraPaxCount * (Number(schoolConfig.priceGroupExtraPax) || 0);
  return base2Pax + extraPaxCost;
}

/**
 * Cálculo Invisible (Background) de lo que gana el instructor por una clase específica
 * mirando el SchoolConfig.
 *
 * Reglas:
 * - Si la categoría es 'curso' (1 clase de un Curso Pack 8):
 *   - Si es individual (1 pax): Pago por 1 clase de un Curso (ej: $6.000)
 *   - Si es grupal (2+ pax): Pago por 1 clase de Curso + bono por alumno extra sobre 2 pax (si aplica)
 * - Si la categoría es 'unica':
 *   - Individual (1 pax): Pago por Clase Individual (ej: $7.000)
 *   - Grupal (2+ pax): Pago por Clase Grupal 2 pax (ej: $9.000) + Bono por cada alumno extra sobre 2 pax (ej: +$2.000 c/u)
 */
export function calculateInstructorPayment(schoolConfig, { modality, pax, category }) {
  const count = modality === 'grupal' ? Math.max(2, Number(pax) || 2) : 1;

  if (category === 'curso') {
    const baseCoursePay = Number(schoolConfig.payCourseSingleClass) || 0;
    if (modality === 'grupal' && count > 2) {
      const extraBonus = (count - 2) * (Number(schoolConfig.payGroupExtraPax) || 0);
      return baseCoursePay + extraBonus;
    }
    return baseCoursePay;
  }

  if (modality === 'individual') {
    return Number(schoolConfig.payIndividual) || 0;
  }

  // Clase Única Grupal (2 o más personas)
  const baseGroupPay = Number(schoolConfig.payGroupBase) || 0;
  const extraPaxCount = Math.max(0, count - 2);
  const extraBonus = extraPaxCount * (Number(schoolConfig.payGroupExtraPax) || 0);
  return baseGroupPay + extraBonus;
}

/**
 * Genera el texto de desglose legible de clases de un instructor
 * Ejemplo: "2 Individuales, 1 Grupal [3 pax], 1 de Curso"
 */
export function buildInstructorBreakdownSummary(classes) {
  if (!classes || classes.length === 0) return 'Sin clases asignadas';

  let individualCount = 0;
  const groupClasses = []; // guardamos los pax de cada grupal única
  const courseClasses = []; // guardamos las de curso

  classes.forEach((cls) => {
    if (cls.category === 'curso') {
      courseClasses.push(cls);
    } else if (cls.modality === 'individual') {
      individualCount += 1;
    } else {
      groupClasses.push(cls);
    }
  });

  const parts = [];
  if (individualCount > 0) {
    parts.push(`${individualCount} ${individualCount === 1 ? 'Individual' : 'Individuales'}`);
  }
  if (groupClasses.length > 0) {
    // Agrupar por cantidad de pax o listar cada una con sus pax
    groupClasses.forEach((g) => {
      parts.push(`1 Grupal [${g.pax} pax]`);
    });
  }
  if (courseClasses.length > 0) {
    parts.push(`${courseClasses.length} de Curso`);
  }

  return parts.join(', ');
}

/**
 * Calcula el Subtotal, Descuento y Total a Pagar para un arriendo de equipamiento.
 * Función pura de negocio: Subtotal = Tarifa por Hora * Cantidad * Horas
 */
export function calculateRentalTotals(pricePerHour, quantity, hours, discount = 0) {
  const unitRate = Math.max(0, Number(pricePerHour) || 0);
  const qty = Math.max(1, Number(quantity) || 1);
  const hrs = Math.max(1, Number(hours) || 1);
  const subtotal = unitRate * qty * hrs;
  const validDiscount = Math.max(0, Number(discount) || 0);
  const finalTotal = Math.max(0, subtotal - validDiscount);

  return {
    subtotal,
    discount: validDiscount,
    finalTotal,
  };
}
