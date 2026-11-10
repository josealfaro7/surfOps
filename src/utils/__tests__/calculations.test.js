import { describe, it, expect } from 'vitest';
import {
  addMinutesToTime,
  getInstructorConflicts,
  buildRotationQueue,
  suggestInstructorForSlot,
  validateClassSlot,
  getMaxRentalHours,
  isRentalOverdue,
  calculateStudentSubtotal,
  calculateInstructorPayment,
  calculateRentalTotals,
  summarizeClosing,
  getPayableInstructorPay,
  buildCsv,
} from '../calculations';
import {
  getTodayIsoDate,
  getNowHHMM,
  addDaysToIsoDate,
  getWeekRange,
  localDateTimeToDate,
} from '../dates';

const CONFIG = {
  priceIndividual: 25000,
  priceGroupBase: 40000,
  priceGroupExtraPax: 18000,
  priceCoursePack8: 160000,
  payIndividual: 7000,
  payGroupBase: 9000,
  payGroupExtraPax: 2000,
  payCourseSingleClass: 6000,
};

const TODAY = '2026-11-09';
const TOMORROW = '2026-11-10';

const inst = (id, checkInTimestamp) => ({
  id,
  name: id,
  checkedIn: true,
  checkInTime: '08:00',
  checkInTimestamp,
});

const cls = (over) => ({
  id: Math.random().toString(36).slice(2),
  operationDate: TODAY,
  status: 'scheduled',
  startTime: '09:00',
  endTime: '10:15',
  modality: 'individual',
  pax: 1,
  category: 'unica',
  finalTotal: 25000,
  instructorPay: 7000,
  paymentMethod: 'Efectivo',
  ...over,
});

describe('addMinutesToTime', () => {
  it('suma 75 minutos', () => {
    expect(addMinutesToTime('10:30')).toBe('11:45');
  });
  it('no recorta silenciosamente en 23:59', () => {
    expect(addMinutesToTime('14:00', 12 * 60)).toBe('26:00');
  });
});

describe('getInstructorConflicts', () => {
  const classes = [cls({ instructorId: 'diego', operationDate: TOMORROW, startTime: '10:30', endTime: '11:45' })];
  it('una clase de otro día no genera choque', () => {
    expect(getInstructorConflicts('diego', '10:30', '11:45', classes, TODAY)).toHaveLength(0);
  });
  it('la misma fecha sí choca', () => {
    expect(getInstructorConflicts('diego', '11:00', '12:15', classes, TOMORROW)).toHaveLength(1);
  });
  it('no-show y canceladas no ocupan horario', () => {
    const c = [cls({ instructorId: 'diego', status: 'no_show' })];
    expect(getInstructorConflicts('diego', '09:00', '10:15', c, TODAY)).toHaveLength(0);
  });
});

describe('fila de rotación estricta', () => {
  const instructors = [inst('diego', 1), inst('jose', 2), inst('vitoco', 3)];

  it('sin clases respeta el orden de llegada', () => {
    const q = buildRotationQueue(instructors, []);
    expect(q.map((i) => i.id)).toEqual(['diego', 'jose', 'vitoco']);
  });

  it('tras asignar, el instructor pasa al final', () => {
    const q = buildRotationQueue(instructors, [cls({ instructorId: 'diego', assignedAtMs: 100 })]);
    expect(q.map((i) => i.id)).toEqual(['jose', 'vitoco', 'diego']);
  });

  it('reparte una clase a cada uno antes de repetir', () => {
    let classes = [];
    const slots = ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00'];
    slots.forEach((start, idx) => {
      const end = addMinutesToTime(start, 75);
      const q = buildRotationQueue(instructors, classes);
      const { suggestedInstructor } = suggestInstructorForSlot(q, start, end, classes, TODAY);
      classes = [
        ...classes,
        cls({ instructorId: suggestedInstructor.id, startTime: start, endTime: end, assignedAtMs: idx + 10 }),
      ];
    });
    const counts = classes.reduce((acc, c) => ({ ...acc, [c.instructorId]: (acc[c.instructorId] || 0) + 1 }), {});
    expect(counts).toEqual({ diego: 2, jose: 2, vitoco: 2 });
  });

  it('las sesiones de curso no mueven la fila; si está ocupado se salta y conserva su turno', () => {
    // Diego tiene una sesión de curso suya a las 10:30
    const classes = [
      cls({ instructorId: 'diego', category: 'curso', courseGroupId: 'p1', startTime: '10:30', endTime: '11:45', assignedAtMs: 0 }),
    ];
    const q1 = buildRotationQueue(instructors, classes);
    expect(q1[0].id).toBe('diego'); // sigue primero
    // Para 10:30 está ocupado → se salta a Jose
    expect(suggestInstructorForSlot(q1, '10:30', '11:45', classes, TODAY).suggestedInstructor.id).toBe('jose');
    // Para 12:00 vuelve a ser Diego (conservó su turno)
    expect(suggestInstructorForSlot(q1, '12:00', '13:15', classes, TODAY).suggestedInstructor.id).toBe('diego');
  });

  it('una clase única asignada a mano también rota', () => {
    const q = buildRotationQueue(instructors, [
      cls({ instructorId: 'vitoco', wasSuggestedByQueue: false, assignedAtMs: 50 }),
    ]);
    expect(q.map((i) => i.id)).toEqual(['diego', 'jose', 'vitoco']);
    const q2 = buildRotationQueue(instructors, [cls({ instructorId: 'diego', wasSuggestedByQueue: false, assignedAtMs: 50 })]);
    expect(q2[q2.length - 1].id).toBe('diego');
  });

  it('ignora instructores sin check-in', () => {
    const q = buildRotationQueue([...instructors, { id: 'caco', checkedIn: false, checkInTimestamp: null }], []);
    expect(q.map((i) => i.id)).not.toContain('caco');
  });
});

describe('validateClassSlot (horario de atención 09:00–20:00)', () => {
  it('acepta un bloque dentro del horario', () => {
    expect(validateClassSlot({ startTime: '18:30', endTime: '19:45', openTime: '09:00', closeTime: '20:00' })).toEqual([]);
  });
  it('rechaza clases que terminan después del cierre', () => {
    expect(validateClassSlot({ startTime: '19:00', endTime: '20:15', openTime: '09:00', closeTime: '20:00' })).toHaveLength(1);
  });
  it('rechaza clases antes de abrir', () => {
    expect(validateClassSlot({ startTime: '08:00', endTime: '09:15', openTime: '09:00', closeTime: '20:00' })).toHaveLength(1);
  });
  it('rechaza clases después del ocaso', () => {
    expect(
      validateClassSlot({ startTime: '18:30', endTime: '19:45', openTime: '09:00', closeTime: '20:00', sunsetTime: '19:30' })
    ).toHaveLength(1);
  });
});

describe('arriendos', () => {
  it('limita las horas al cierre', () => {
    expect(getMaxRentalHours('14:00', '20:00')).toBe(6);
    expect(getMaxRentalHours('19:30', '20:00')).toBe(0);
  });
  it('un arriendo activo de ayer está atrasado', () => {
    expect(isRentalOverdue({ status: 'active', operationDate: '2026-11-08', estimatedReturnTime: '18:00' }, '10:00', TODAY)).toBe(true);
  });
  it('un arriendo de hoy se atrasa al pasar la hora de devolución', () => {
    const r = { status: 'active', operationDate: TODAY, estimatedReturnTime: '11:00' };
    expect(isRentalOverdue(r, '10:59', TODAY)).toBe(false);
    expect(isRentalOverdue(r, '11:01', TODAY)).toBe(true);
  });
  it('el descuento no supera el subtotal', () => {
    expect(calculateRentalTotals(5000, 1, 2, 99999)).toEqual({ subtotal: 10000, discount: 10000, finalTotal: 0 });
  });
});

describe('precios y pagos', () => {
  it('curso pack con config incompleta no se cobra NaN', () => {
    expect(calculateStudentSubtotal({ ...CONFIG, priceCoursePack8: undefined }, { modality: 'individual', category: 'curso' })).toBe(0);
  });
  it('curso grupal de 3 cobra pack por alumno', () => {
    expect(calculateStudentSubtotal(CONFIG, { modality: 'grupal', pax: 3, category: 'curso' })).toBe(480000);
  });
  it('grupal de 4: base + 2 extras', () => {
    expect(calculateStudentSubtotal(CONFIG, { modality: 'grupal', pax: 4, category: 'unica' })).toBe(76000);
    expect(calculateInstructorPayment(CONFIG, { modality: 'grupal', pax: 4, category: 'unica' })).toBe(13000);
  });
  it('no-show no paga al instructor', () => {
    expect(getPayableInstructorPay(cls({ instructorId: 'diego', status: 'no_show' }))).toBe(0);
  });
});

describe('summarizeClosing', () => {
  const groupId = 'pack-1';
  const classes = [
    // Sesión #1 de un pack de 3: cobra todo hoy, paga 1 sesión hoy
    cls({ instructorId: 'diego', category: 'curso', courseGroupId: groupId, finalTotal: 160000, instructorPay: 6000, paymentMethod: 'Transferencia' }),
    // Sesiones futuras del pack: no afectan el cierre de hoy
    cls({ instructorId: 'diego', category: 'curso', courseGroupId: groupId, operationDate: TOMORROW, finalTotal: 0, isPaidInPack: true, instructorPay: 6000 }),
    cls({ instructorId: 'diego', category: 'curso', courseGroupId: groupId, operationDate: '2026-11-11', finalTotal: 0, isPaidInPack: true, instructorPay: 6000 }),
    // Clase de hoy con no-show: el ingreso queda, el pago no
    cls({ instructorId: 'jose', status: 'no_show', instructorPay: 0, startTime: '10:30', endTime: '11:45' }),
  ];
  const rentals = [
    { operationDate: TODAY, finalTotal: 10000, paymentMethod: 'Efectivo' },
    { operationDate: '2026-11-08', finalTotal: 99999, paymentMethod: 'Efectivo' },
  ];

  const s = summarizeClosing(classes, rentals, TODAY);

  it('caja de clases incluye el pack completo y la clase no-show', () => {
    expect(s.classesRevenue).toBe(185000);
  });
  it('nómina solo paga la sesión de hoy', () => {
    expect(s.payroll).toBe(6000);
  });
  it('arriendos de ayer no cuentan hoy', () => {
    expect(s.rentalsRevenue).toBe(10000);
  });
  it('medios de pago incluyen arriendos', () => {
    expect(s.byPayment.Efectivo.amount).toBe(35000);
    expect(s.byPayment.Transferencia.amount).toBe(160000);
  });
  it('ganancia neta total', () => {
    expect(s.combinedNetProfit).toBe(185000 - 6000 + 10000);
  });
});

describe('fechas con zona horaria', () => {
  // 2026-11-10 01:30 UTC = 2026-11-09 22:30 en Chile (UTC−3)
  const lateNight = new Date('2026-11-10T01:30:00Z');
  it('"hoy" en Chile no salta al día siguiente por UTC', () => {
    expect(getTodayIsoDate('America/Santiago', lateNight)).toBe('2026-11-09');
    expect(getNowHHMM('America/Santiago', lateNight)).toBe('22:30');
  });
  it('suma días cruzando mes', () => {
    expect(addDaysToIsoDate('2026-11-30', 1)).toBe('2026-12-01');
  });
  it('semana lunes a domingo', () => {
    expect(getWeekRange('2026-11-09')).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    expect(getWeekRange('2026-11-15')).toEqual({ from: '2026-11-09', to: '2026-11-15' });
  });
  it('hora local a instante absoluto', () => {
    expect(localDateTimeToDate('2026-11-09', '10:00', 'America/Santiago').toISOString()).toBe('2026-11-09T13:00:00.000Z');
  });
});

describe('buildCsv', () => {
  it('usa ; y escapa campos', () => {
    const csv = buildCsv(['a', 'b'], [['x;y', 'z']]);
    expect(csv).toBe('﻿a;b\r\n"x;y";z');
  });
});

import { purgeReturnedIdPhotos } from '../../lib/demoStore';

describe('borrado de foto de carnet (demo)', () => {
  const rentals = [
    { id: 'ayer', status: 'completed', returnedOn: '2026-11-08', operationDate: '2026-11-08', idPhotoDataUrl: 'data:x' },
    { id: 'hoy', status: 'completed', returnedOn: TODAY, operationDate: TODAY, idPhotoDataUrl: 'data:x' },
    { id: 'activo', status: 'active', operationDate: '2026-11-07', idPhotoDataUrl: 'data:x' },
  ];
  const out = Object.fromEntries(purgeReturnedIdPhotos(rentals, TODAY).map((r) => [r.id, r]));
  it('borra la foto devuelta ayer', () => expect(out.ayer.idPhotoDataUrl).toBeNull());
  it('conserva la devuelta hoy', () => expect(out.hoy.idPhotoDataUrl).toBe('data:x'));
  it('conserva la de un arriendo activo aunque sea antiguo', () => expect(out.activo.idPhotoDataUrl).toBe('data:x'));
});
