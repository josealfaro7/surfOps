/**
 * Fuente única del mapeo entre filas de PostgreSQL (snake_case) y el modelo de
 * React (camelCase). Si cambia una columna en
 * supabase/migrations/*_surfops_schema_v2.sql, se cambia solo aquí.
 */

const n = (v, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

/* ---------------------------- school_configs ---------------------------- */

export const DEFAULT_SCHOOL_CONFIG = {
  priceIndividual: 25000,
  priceGroupBase: 40000,
  priceGroupExtraPax: 18000,
  priceCoursePack8: 160000,
  payIndividual: 7000,
  payGroupBase: 9000,
  payGroupExtraPax: 2000,
  payCourseSingleClass: 6000,
  openTime: '09:00',
  closeTime: '20:00',
  classDurationMinutes: 75,
};

export function configFromRow(row) {
  if (!row) return { ...DEFAULT_SCHOOL_CONFIG };
  const d = DEFAULT_SCHOOL_CONFIG;
  return {
    priceIndividual: n(row.price_individual, d.priceIndividual),
    priceGroupBase: n(row.price_group_base, d.priceGroupBase),
    priceGroupExtraPax: n(row.price_group_extra_pax, d.priceGroupExtraPax),
    priceCoursePack8: n(row.price_course_pack8, d.priceCoursePack8),
    payIndividual: n(row.pay_individual, d.payIndividual),
    payGroupBase: n(row.pay_group_base, d.payGroupBase),
    payGroupExtraPax: n(row.pay_group_extra_pax, d.payGroupExtraPax),
    payCourseSingleClass: n(row.pay_course_single_class, d.payCourseSingleClass),
    openTime: hhmm(row.open_time) || d.openTime,
    closeTime: hhmm(row.close_time) || d.closeTime,
    classDurationMinutes: n(row.class_duration_minutes, d.classDurationMinutes),
  };
}

export function configToRpc(cfg) {
  return {
    price_individual: n(cfg.priceIndividual),
    price_group_base: n(cfg.priceGroupBase),
    price_group_extra_pax: n(cfg.priceGroupExtraPax),
    price_course_pack8: n(cfg.priceCoursePack8),
    pay_individual: n(cfg.payIndividual),
    pay_group_base: n(cfg.payGroupBase),
    pay_group_extra_pax: n(cfg.payGroupExtraPax),
    pay_course_single_class: n(cfg.payCourseSingleClass),
    open_time: cfg.openTime || DEFAULT_SCHOOL_CONFIG.openTime,
    close_time: cfg.closeTime || DEFAULT_SCHOOL_CONFIG.closeTime,
    class_duration_minutes: n(cfg.classDurationMinutes, 75),
  };
}

/* ----------------------------- rental_rates ----------------------------- */

export const DEFAULT_RENTAL_RATES = [
  { id: 'tabla_surf', label: 'Tabla de Surf', pricePerHour: 8000, enabled: true },
  { id: 'traje_surf', label: 'Traje de Surf', pricePerHour: 5000, enabled: true },
  { id: 'bodyboard', label: 'Bodyboard', pricePerHour: 5000, enabled: true },
  { id: 'aletas', label: 'Aletas', pricePerHour: 3000, enabled: true },
];

export function rateFromRow(row) {
  return {
    uuid: row.id,
    id: row.item_code,
    label: row.label,
    pricePerHour: n(row.price_per_hour),
    enabled: Boolean(row.is_enabled),
  };
}

export function rateToRpc(rate) {
  return {
    item_code: rate.id,
    label: rate.label,
    price_per_hour: n(rate.pricePerHour),
    is_enabled: Boolean(rate.enabled),
  };
}

/* ------------------------ instructors + attendance ----------------------- */

export function instructorFromRows(inst, attendance) {
  const active = attendance && !attendance.check_out_at;
  return {
    id: inst.id,
    name: inst.name,
    checkedIn: Boolean(active),
    checkInTime: active ? hhmm(attendance.check_in_time) : null,
    checkInTimestamp: active ? new Date(attendance.check_in_at).getTime() : null,
  };
}

/* ------------------------------ surf_classes ----------------------------- */

export function classFromRow(row) {
  return {
    id: row.id,
    operationDate: row.operation_date,
    status: row.status,
    courseGroupId: row.course_group_id || null,
    sessionIndex: n(row.session_index, 1),
    isPaidInPack: Boolean(row.is_paid_in_pack),
    modality: row.modality,
    pax: n(row.pax, 1),
    category: row.category,
    subtotal: n(row.subtotal),
    discount: n(row.discount),
    paymentMethod: row.payment_method,
    finalTotal: n(row.final_total),
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    instructorId: row.instructor_id || null,
    instructorPay: n(row.instructor_pay),
    wasSuggestedByQueue: Boolean(row.was_suggested_by_queue),
    assignedAtMs: row.assigned_at ? new Date(row.assigned_at).getTime() : null,
    studentName: row.student_name,
    studentPhone: row.student_phone || '',
    studentEmail: row.student_email || '',
    emergencyContactName: row.emergency_contact_name || '',
    emergencyContactPhone: row.emergency_contact_phone || '',
  };
}

export function classToRow(cls, schoolId) {
  return {
    id: cls.id,
    school_id: schoolId,
    instructor_id: cls.instructorId || null,
    status: cls.status,
    operation_date: cls.operationDate,
    start_time: cls.startTime,
    end_time: cls.endTime,
    modality: cls.modality,
    pax: cls.pax,
    category: cls.category,
    course_group_id: cls.courseGroupId || null,
    session_index: cls.sessionIndex || 1,
    is_paid_in_pack: Boolean(cls.isPaidInPack),
    payment_method: cls.paymentMethod,
    subtotal: cls.subtotal,
    discount: cls.discount,
    final_total: cls.finalTotal,
    instructor_pay: cls.instructorPay,
    was_suggested_by_queue: Boolean(cls.wasSuggestedByQueue),
    assigned_at: cls.assignedAtMs ? new Date(cls.assignedAtMs).toISOString() : null,
    student_name: cls.studentName,
    student_phone: cls.studentPhone || '',
    student_email: cls.studentEmail || '',
    emergency_contact_name: cls.emergencyContactName || '',
    emergency_contact_phone: cls.emergencyContactPhone || '',
  };
}

/* --------------------------- equipment_rentals --------------------------- */

export function rentalFromRow(row) {
  return {
    id: row.id,
    operationDate: row.operation_date,
    itemId: row.item_code,
    itemLabel: row.item_label,
    unitPricePerHour: n(row.unit_price_per_hour),
    quantity: n(row.quantity, 1),
    hours: n(row.hours, 1),
    checkInTime: hhmm(row.check_in_time),
    estimatedReturnTime: hhmm(row.estimated_return_time),
    returnedAt: row.returned_time ? hhmm(row.returned_time) : null,
    paymentMethod: row.payment_method,
    subtotal: n(row.subtotal),
    discount: n(row.discount),
    finalTotal: n(row.final_total),
    customerName: row.customer_name,
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    emergencyContact: row.emergency_contact || '',
    idPhotoStoragePath: row.id_photo_storage_path,
    idPhotoDataUrl: null, // en modo real la foto nunca vive en el navegador
    status: row.status,
  };
}

export function rentalToRow(r, schoolId, { rentalRateId, checkInAtIso, estimatedReturnAtIso }) {
  return {
    id: r.id,
    school_id: schoolId,
    rental_rate_id: rentalRateId || null,
    operation_date: r.operationDate,
    item_code: r.itemId,
    item_label: r.itemLabel,
    unit_price_per_hour: r.unitPricePerHour,
    quantity: r.quantity,
    hours: r.hours,
    check_in_time: r.checkInTime,
    estimated_return_time: r.estimatedReturnTime,
    check_in_at: checkInAtIso,
    estimated_return_at: estimatedReturnAtIso,
    payment_method: r.paymentMethod,
    subtotal: r.subtotal,
    discount: r.discount,
    final_total: r.finalTotal,
    customer_name: r.customerName,
    customer_phone: r.customerPhone,
    customer_email: r.customerEmail || '',
    emergency_contact: r.emergencyContact || '',
    id_photo_storage_path: r.idPhotoStoragePath,
    status: r.status,
  };
}

/** Traduce errores de PostgREST/Postgres a mensajes entendibles en recepción */
export function friendlyDbError(error, fallback = 'No se pudo guardar en la base de datos.') {
  if (!error) return fallback;
  const msg = String(error.message || '');
  if (error.code === '23P01' || msg.includes('excl_instructor_overlap')) {
    return 'Ese instructor ya tiene una clase en ese horario (otro equipo la registró recién). Recarga y elige otro.';
  }
  if (msg.includes('horario de atención')) return msg;
  if (msg.includes('PIN')) return msg;
  if (error.code === '42501') return 'No tienes permiso para esta acción.';
  if (msg.toLowerCase().includes('failed to fetch')) {
    return 'Sin conexión a internet. Revisa la red y vuelve a intentar: no se guardó nada.';
  }
  return `${fallback} (${msg || error.code || 'error desconocido'})`;
}
