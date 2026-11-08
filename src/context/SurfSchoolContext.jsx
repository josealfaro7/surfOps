import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  calculateInstructorPayment,
  calculateRentalTotals,
  getInstructorConflicts,
  timeToMinutes,
  addMinutesToTime,
} from '../utils/calculations';

const SurfSchoolContext = createContext(null);

export const RENTAL_RATES_STORAGE_KEY = 'surfops_rental_rates';
export const ACTIVE_RENTALS_STORAGE_KEY = 'surfops_active_rentals';
export const COMPLETED_RENTALS_STORAGE_KEY = 'surfops_completed_rentals';

export const INITIAL_SCHOOL_CONFIG = {
  // Precios de Venta (Lo que paga el alumno)
  priceIndividual: 25000,      // Clase Individual (1 pax)
  priceGroupBase: 40000,       // Clase Grupal (Base para 2 pax)
  priceGroupExtraPax: 18000,   // Adicional por alumno extra en grupo
  priceCoursePack8: 160000,    // Curso Completo (Pack 8 clases)

  // Tarifas de Instructor (Lo que gana el staff)
  payIndividual: 7000,         // Pago por Clase Individual
  payGroupBase: 9000,          // Pago por Clase Grupal 2 pax
  payGroupExtraPax: 2000,      // Bono por cada alumno extra sobre 2 pax
  payCourseSingleClass: 6000,  // Pago por 1 clase de un Curso
};

export const INITIAL_RENTAL_RATES = [
  {
    id: 'tabla_surf',
    label: 'Tabla de Surf',
    pricePerHour: 8000,
    enabled: true,
  },
  {
    id: 'traje_surf',
    label: 'Traje de Surf',
    pricePerHour: 5000,
    enabled: true,
  },
  {
    id: 'bodyboard',
    label: 'Bodyboard',
    pricePerHour: 5000,
    enabled: true,
  },
  {
    id: 'aletas',
    label: 'Aletas',
    pricePerHour: 3000,
    enabled: true,
  },
];

function safeReadFromLocalStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    const parsed = JSON.parse(raw);
    return parsed ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function safeSaveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    const isQuotaError =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22);
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(
        isQuotaError
          ? '⚠️ Alerta de Memoria: Se alcanzó el límite de 5 MB de almacenamiento local del navegador (localStorage). Marca devoluciones pendientes para liberar espacio de fotos de carnet.'
          : '⚠️ No se pudo guardar en el almacenamiento local del navegador.'
      );
    }
    return false;
  }
}

const getBaseTimestamp = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

export const getTodayDateString = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// Lista predefinida de staff: Diego, Jose, Vitoco, Caco, Alfred
export const INITIAL_INSTRUCTORS = [
  {
    id: 'inst-diego',
    name: 'Diego',
    checkedIn: true,
    checkInTime: '08:10',
    checkInTimestamp: getBaseTimestamp('08:10'),
  },
  {
    id: 'inst-jose',
    name: 'Jose',
    checkedIn: true,
    checkInTime: '08:20',
    checkInTimestamp: getBaseTimestamp('08:20'),
  },
  {
    id: 'inst-vitoco',
    name: 'Vitoco',
    checkedIn: true,
    checkInTime: '08:35',
    checkInTimestamp: getBaseTimestamp('08:35'),
  },
  {
    id: 'inst-caco',
    name: 'Caco',
    checkedIn: false,
    checkInTime: null,
    checkInTimestamp: null,
  },
  {
    id: 'inst-alfred',
    name: 'Alfred',
    checkedIn: false,
    checkInTime: null,
    checkInTimestamp: null,
  },
];

export const INITIAL_DAILY_CLASSES = [
  {
    id: 'cls-1',
    date: getTodayDateString(),
    modality: 'individual',
    pax: 1,
    category: 'unica',
    subtotal: 25000,
    discount: 0,
    paymentMethod: 'Transferencia',
    finalTotal: 25000,
    startTime: '09:00',
    endTime: '10:15',
    instructorId: 'inst-diego',
    wasSuggestedByQueue: true,
    studentName: 'Martín Echeverría',
    studentPhone: '+56 9 8421 1102',
    studentEmail: 'martin.echeverria@correo.cl',
    emergencyContactName: 'Carolina Soto',
    emergencyContactPhone: '+56 9 7112 3344',
    instructorPay: 7000,
  },
  {
    id: 'cls-2',
    date: getTodayDateString(),
    modality: 'grupal',
    pax: 3,
    category: 'unica',
    subtotal: 58000,
    discount: 3000,
    paymentMethod: 'Tarjeta',
    finalTotal: 55000,
    startTime: '10:30',
    endTime: '11:45',
    instructorId: 'inst-diego',
    wasSuggestedByQueue: true,
    studentName: 'Familia Aguirre',
    studentPhone: '+56 9 7612 9088',
    studentEmail: 'contacto@familiaaguirre.cl',
    emergencyContactName: 'Roberto Aguirre',
    emergencyContactPhone: '+56 9 6554 1122',
    instructorPay: 11000,
  },
  {
    id: 'cls-3',
    date: getTodayDateString(),
    modality: 'individual',
    pax: 1,
    category: 'unica',
    subtotal: 25000,
    discount: 0,
    paymentMethod: 'Efectivo',
    finalTotal: 25000,
    startTime: '10:30',
    endTime: '11:45',
    instructorId: 'inst-jose',
    wasSuggestedByQueue: true,
    studentName: 'Sofía Larraín',
    studentPhone: '+56 9 9231 4451',
    studentEmail: 'sofia.larrain@correo.cl',
    emergencyContactName: 'Elena Valdés',
    emergencyContactPhone: '+56 9 8877 6655',
    instructorPay: 7000,
  },
  {
    id: 'cls-4',
    date: getTodayDateString(),
    modality: 'individual',
    pax: 1,
    category: 'unica',
    subtotal: 25000,
    discount: 0,
    paymentMethod: 'Transferencia',
    finalTotal: 25000,
    startTime: '12:00',
    endTime: '13:15',
    instructorId: 'inst-vitoco',
    wasSuggestedByQueue: true,
    studentName: 'Camila Orrego',
    studentPhone: '+56 9 6332 1980',
    studentEmail: 'camila.orrego@correo.cl',
    emergencyContactName: 'Pablo Orrego',
    emergencyContactPhone: '+56 9 5443 2211',
    instructorPay: 7000,
  },
  {
    id: 'cls-5',
    date: getTodayDateString(),
    modality: 'individual',
    pax: 1,
    category: 'unica',
    subtotal: 25000,
    discount: 0,
    paymentMethod: 'Transferencia',
    finalTotal: 25000,
    startTime: '12:30',
    endTime: '13:45',
    instructorId: 'inst-diego',
    wasSuggestedByQueue: true,
    studentName: 'Tomás Kunstmann',
    studentPhone: '+56 9 6543 2210',
    studentEmail: 'tomas.k@correo.cl',
    emergencyContactName: 'Andrés Kunstmann',
    emergencyContactPhone: '+56 9 9110 3322',
    instructorPay: 7000,
  },
  {
    id: 'cls-6',
    date: getTodayDateString(),
    modality: 'individual',
    pax: 1,
    category: 'curso',
    subtotal: 160000,
    discount: 0,
    paymentMethod: 'Transferencia',
    finalTotal: 160000,
    startTime: '15:00',
    endTime: '16:15',
    instructorId: 'inst-diego',
    wasSuggestedByQueue: false,
    studentName: 'Ignacio Zúñiga',
    studentPhone: '+56 9 5119 8844',
    studentEmail: 'ignacio.zuniga@correo.cl',
    emergencyContactName: 'Marcela Ríos',
    emergencyContactPhone: '+56 9 7788 9900',
    instructorPay: 6000,
  },
];

const DEMO_ID_PHOTO_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
      <rect width="320" height="200" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/>
      <rect width="320" height="38" fill="#172554"/>
      <text x="16" y="24" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">REPÚBLICA DE CHILE · CÉDULA DE IDENTIDAD</text>
      <rect x="20" y="56" width="76" height="96" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
      <circle cx="58" cy="88" r="18" fill="#64748b"/>
      <path d="M32 142 C32 118 84 118 84 142 Z" fill="#64748b"/>
      <text x="112" y="72" font-family="sans-serif" font-size="11" fill="#475569">DOCUMENTO EN GARANTÍA ERP</text>
      <text x="112" y="96" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">RUN 19.482.310-K</text>
      <text x="112" y="120" font-family="sans-serif" font-size="11" fill="#334155">ESTADO: VERIFICADO RECEPCIÓN</text>
      <text x="112" y="144" font-family="monospace" font-size="11" fill="#0284c7">LA HERRADURA · COQUIMBO</text>
    </svg>`
  );

export const INITIAL_ACTIVE_RENTALS = [
  {
    id: 'rnt-demo-1',
    date: getTodayDateString(),
    itemId: 'tabla_surf',
    itemLabel: 'Tabla de Surf',
    unitPricePerHour: 8000,
    quantity: 2,
    hours: 2,
    checkInTime: '10:30',
    estimatedReturnTime: '22:30',
    subtotal: 32000,
    discount: 2000,
    finalTotal: 30000,
    customerName: 'Lucas Valenzuela',
    customerEmail: 'lucas.valenzuela@correo.cl',
    customerPhone: '+56 9 8412 3390',
    emergencyContact: 'Andrea Valenzuela · +56 9 8412 0011',
    idPhotoBase64: DEMO_ID_PHOTO_SVG,
    status: 'active',
  },
  {
    id: 'rnt-demo-2',
    date: getTodayDateString(),
    itemId: 'traje_surf',
    itemLabel: 'Traje de Surf',
    unitPricePerHour: 5000,
    quantity: 1,
    hours: 2,
    checkInTime: '09:00',
    estimatedReturnTime: '11:00',
    subtotal: 10000,
    discount: 0,
    finalTotal: 10000,
    customerName: 'Martina Gómez',
    customerEmail: 'martina.gomez@correo.cl',
    customerPhone: '+56 9 7621 4410',
    emergencyContact: 'Rodrigo Gómez · +56 9 7621 9988',
    idPhotoBase64: DEMO_ID_PHOTO_SVG,
    status: 'active',
  },
];

export const INITIAL_COMPLETED_RENTALS = [
  {
    id: 'rnt-demo-3',
    date: getTodayDateString(),
    itemId: 'bodyboard',
    itemLabel: 'Bodyboard',
    unitPricePerHour: 5000,
    quantity: 2,
    hours: 1,
    checkInTime: '09:15',
    estimatedReturnTime: '10:15',
    returnedAt: '10:12',
    subtotal: 10000,
    discount: 0,
    finalTotal: 10000,
    customerName: 'Cristóbal Pizarro',
    customerEmail: 'cpizarro@correo.cl',
    customerPhone: '+56 9 6334 1122',
    emergencyContact: 'Claudia Pizarro · +56 9 6334 8877',
    idPhotoBase64: DEMO_ID_PHOTO_SVG,
    status: 'completed',
  },
  {
    id: 'rnt-demo-4',
    date: getTodayDateString(),
    itemId: 'aletas',
    itemLabel: 'Aletas',
    unitPricePerHour: 3000,
    quantity: 2,
    hours: 1,
    checkInTime: '09:15',
    estimatedReturnTime: '10:15',
    returnedAt: '10:12',
    subtotal: 6000,
    discount: 0,
    finalTotal: 6000,
    customerName: 'Cristóbal Pizarro',
    customerEmail: 'cpizarro@correo.cl',
    customerPhone: '+56 9 6334 1122',
    emergencyContact: 'Claudia Pizarro · +56 9 6334 8877',
    idPhotoBase64: DEMO_ID_PHOTO_SVG,
    status: 'completed',
  },
];

export function SurfSchoolProvider({ children }) {
  // 1. SchoolConfig
  const [schoolConfig, setSchoolConfig] = useState(INITIAL_SCHOOL_CONFIG);

  // 2. Instructors (Diego, Jose, Vitoco, Caco, Alfred)
  const [instructors, setInstructors] = useState(INITIAL_INSTRUCTORS);

  // 3. DailyClasses
  const [dailyClasses, setDailyClasses] = useState(INITIAL_DAILY_CLASSES);

  // 4. Tarifas de Arriendo (Equipamiento - Módulo 01 & Módulo 05)
  const [rentalRates, setRentalRates] = useState(() => {
    const saved = safeReadFromLocalStorage(RENTAL_RATES_STORAGE_KEY, null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return INITIAL_RENTAL_RATES;
  });

  // 5. Arriendos Activos y Completados (Módulo 05)
  const [activeRentals, setActiveRentals] = useState(() => {
    const saved = safeReadFromLocalStorage(ACTIVE_RENTALS_STORAGE_KEY, null);
    return Array.isArray(saved) ? saved : INITIAL_ACTIVE_RENTALS;
  });

  const [completedRentals, setCompletedRentals] = useState(() => {
    const saved = safeReadFromLocalStorage(COMPLETED_RENTALS_STORAGE_KEY, null);
    return Array.isArray(saved) ? saved : INITIAL_COMPLETED_RENTALS;
  });

  // Hora del ocaso compartida desde EnvironmentBar para validación de luz en Módulo 3
  const [sunsetTime, setSunsetTime] = useState('20:15');

  // Fila Virtual ordenada por hora de llegada (checkInTimestamp ascendente)
  const virtualQueue = useMemo(() => {
    return instructors
      .filter((inst) => inst.checkedIn && inst.checkInTimestamp !== null)
      .sort((a, b) => a.checkInTimestamp - b.checkInTimestamp)
      .map((inst, index) => ({
        ...inst,
        queuePosition: index + 1,
      }));
  }, [instructors]);

  // Resumen financiero derivado de arriendos del día (sin alterar métricas de instructores)
  const rentalsTotalRevenue = useMemo(() => {
    const activeSum = activeRentals.reduce(
      (acc, r) => acc + (Number(r.finalTotal) || 0),
      0
    );
    const completedSum = completedRentals.reduce(
      (acc, r) => acc + (Number(r.finalTotal) || 0),
      0
    );
    return activeSum + completedSum;
  }, [activeRentals, completedRentals]);

  // Actualizar configuración de clases y recalcular pagos del día en base a las nuevas tarifas
  const updateSchoolConfig = (newValues) => {
    const updatedConfig = { ...schoolConfig, ...newValues };
    setSchoolConfig(updatedConfig);

    setDailyClasses((prev) =>
      prev.map((cls) => ({
        ...cls,
        instructorPay: calculateInstructorPayment(updatedConfig, {
          modality: cls.modality,
          pax: cls.pax,
          category: cls.category,
        }),
      }))
    );
  };

  // Actualizar tarifas de arriendo de equipamiento y guardar en localStorage
  const updateRentalRates = (newRates) => {
    const normalized = Array.isArray(newRates) ? newRates : INITIAL_RENTAL_RATES;
    setRentalRates(normalized);
    safeSaveToLocalStorage(RENTAL_RATES_STORAGE_KEY, normalized);
  };

  // Registrar nuevo arriendo activo (Módulo 05) reutilizando addMinutesToTime(checkIn, hours * 60)
  const addRental = (rentalForm) => {
    const rateItem =
      rentalRates.find((r) => r.id === rentalForm.itemId) || rentalRates[0];
    const unitPricePerHour = Number(rateItem?.pricePerHour) || 0;
    const quantity = Math.max(1, Number(rentalForm.quantity) || 1);
    const hours = Math.min(12, Math.max(1, Number(rentalForm.hours) || 1));
    const discountInput = Math.max(0, Number(rentalForm.discount) || 0);

    const { subtotal, discount, finalTotal } = calculateRentalTotals(
      unitPricePerHour,
      quantity,
      hours,
      discountInput
    );

    const now = new Date();
    const checkInTime =
      rentalForm.checkInTime ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Reutilización estricta de addMinutesToTime multiplicando horas * 60
    const estimatedReturnTime = addMinutesToTime(checkInTime, hours * 60);

    const newRentalRecord = {
      id: `rnt-${Date.now()}`,
      date: getTodayDateString(),
      itemId: rateItem?.id || 'tabla_surf',
      itemLabel: rateItem?.label || 'Tabla de Surf',
      unitPricePerHour,
      quantity,
      hours,
      checkInTime,
      estimatedReturnTime,
      subtotal,
      discount,
      finalTotal,
      customerName: rentalForm.customerName?.trim() || 'Cliente',
      customerEmail: rentalForm.customerEmail?.trim() || '',
      customerPhone: rentalForm.customerPhone?.trim() || '',
      emergencyContact: rentalForm.emergencyContact?.trim() || '',
      idPhotoBase64: rentalForm.idPhotoBase64 || '',
      status: 'active',
    };

    const nextActive = [newRentalRecord, ...activeRentals];
    const savedOk = safeSaveToLocalStorage(ACTIVE_RENTALS_STORAGE_KEY, nextActive);
    if (savedOk) {
      setActiveRentals(nextActive);
      return newRentalRecord;
    }
    return null;
  };

  // Marcar devolución recibida: quita de activos y pasa al historial de completados
  const completeRental = (rentalId) => {
    const target = activeRentals.find((r) => r.id === rentalId);
    if (!target) return;

    const now = new Date();
    const returnedAt = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const nextActive = activeRentals.filter((r) => r.id !== rentalId);
    // Se conserva idPhotoBase64 en sesión o se libera espacio en localStorage si es necesario
    const completedRecord = {
      ...target,
      status: 'completed',
      returnedAt,
    };
    const nextCompleted = [completedRecord, ...completedRentals];

    setActiveRentals(nextActive);
    setCompletedRentals(nextCompleted);
    safeSaveToLocalStorage(ACTIVE_RENTALS_STORAGE_KEY, nextActive);
    safeSaveToLocalStorage(COMPLETED_RENTALS_STORAGE_KEY, nextCompleted);
  };

  // Check-in de instructor
  const checkInInstructor = (instructorId, customTimeStr = null) => {
    const now = new Date();
    const timeStr =
      customTimeStr ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let timestamp;
    if (customTimeStr) {
      const [h, m] = customTimeStr.split(':').map(Number);
      const d = new Date();
      d.setHours(h || 0, m || 0, now.getSeconds(), now.getMilliseconds());
      timestamp = d.getTime();
    } else {
      timestamp = now.getTime();
    }

    setInstructors((prev) =>
      prev.map((inst) =>
        inst.id === instructorId
          ? {
              ...inst,
              checkedIn: true,
              checkInTime: timeStr,
              checkInTimestamp: timestamp,
            }
          : inst
      )
    );
  };

  // Quitar Check-in de instructor
  const checkOutInstructor = (instructorId) => {
    setInstructors((prev) =>
      prev.map((inst) =>
        inst.id === instructorId
          ? {
              ...inst,
              checkedIn: false,
              checkInTime: null,
              checkInTimestamp: null,
            }
          : inst
      )
    );
  };

  // Sugerir el Instructor #1 de la Fila Virtual que esté libre en el bloque horario
  const getSuggestedInstructorForSlot = (startTime, endTime) => {
    if (virtualQueue.length === 0) {
      return {
        suggestedInstructor: null,
        skippedInstructors: [],
        reason: 'Sin instructores con check-in en la fila.',
      };
    }

    const skipped = [];
    for (const inst of virtualQueue) {
      const conflicts = getInstructorConflicts(inst.id, startTime, endTime, dailyClasses);
      if (conflicts.length === 0) {
        return {
          suggestedInstructor: inst,
          skippedInstructors: skipped,
          reason:
            skipped.length === 0
              ? `Sugerido #${inst.queuePosition} en fila (${inst.name}, llegada ${inst.checkInTime})`
              : `Sugerido #${inst.queuePosition} (${inst.name}) — ${skipped
                  .map((s) => `${s.instructor.name} ocupado`)
                  .join(', ')}`,
        };
      } else {
        skipped.push({ instructor: inst, conflicts });
      }
    }

    return {
      suggestedInstructor: null,
      skippedInstructors: skipped,
      reason: 'Todos los instructores en fila tienen clases en este horario.',
    };
  };

  // Guardar nueva clase (con cálculo de pago a instructor en background)
  const addDailyClass = (classForm) => {
    const modality = classForm.modality === 'grupal' ? 'grupal' : 'individual';
    const pax = modality === 'grupal' ? Math.max(2, Number(classForm.pax) || 2) : 1;
    const category = classForm.category === 'curso' ? 'curso' : 'unica';
    const subtotal = Number(classForm.subtotal) || 0;
    const discount = Math.max(0, Number(classForm.discount) || 0);
    const finalTotal = Math.max(0, subtotal - discount);

    // Background Math: calcula cuánto gana el instructor según SchoolConfig
    const instructorPay = calculateInstructorPayment(schoolConfig, {
      modality,
      pax,
      category,
    });

    const newClassRecord = {
      id: `cls-${Date.now()}`,
      date: classForm.date || getTodayDateString(),
      modality,
      pax,
      category,
      subtotal,
      discount,
      paymentMethod: classForm.paymentMethod || 'Transferencia',
      finalTotal,
      startTime: classForm.startTime,
      endTime: classForm.endTime,
      instructorId: classForm.instructorId,
      wasSuggestedByQueue: Boolean(classForm.wasSuggestedByQueue),
      studentName: classForm.studentName?.trim() || 'Alumno',
      studentPhone: classForm.studentPhone?.trim() || '',
      studentEmail: classForm.studentEmail?.trim() || '',
      emergencyContactName: classForm.emergencyContactName?.trim() || '',
      emergencyContactPhone: classForm.emergencyContactPhone?.trim() || '',
      instructorPay,
    };

    setDailyClasses((prev) =>
      [...prev, newClassRecord].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      )
    );

    return newClassRecord;
  };

  const removeDailyClass = (classId) => {
    setDailyClasses((prev) => prev.filter((c) => c.id !== classId));
  };

  const resetDayEmpty = () => {
    setDailyClasses([]);
    setInstructors((prev) =>
      prev.map((inst) => ({
        ...inst,
        checkedIn: false,
        checkInTime: null,
        checkInTimestamp: null,
      }))
    );
    setActiveRentals([]);
    setCompletedRentals([]);
    safeSaveToLocalStorage(ACTIVE_RENTALS_STORAGE_KEY, []);
    safeSaveToLocalStorage(COMPLETED_RENTALS_STORAGE_KEY, []);
  };

  const restoreDemoData = () => {
    setSchoolConfig(INITIAL_SCHOOL_CONFIG);
    setInstructors(INITIAL_INSTRUCTORS);
    setDailyClasses(INITIAL_DAILY_CLASSES);
    setRentalRates(INITIAL_RENTAL_RATES);
    setActiveRentals(INITIAL_ACTIVE_RENTALS);
    setCompletedRentals(INITIAL_COMPLETED_RENTALS);
    safeSaveToLocalStorage(RENTAL_RATES_STORAGE_KEY, INITIAL_RENTAL_RATES);
    safeSaveToLocalStorage(ACTIVE_RENTALS_STORAGE_KEY, INITIAL_ACTIVE_RENTALS);
    safeSaveToLocalStorage(COMPLETED_RENTALS_STORAGE_KEY, INITIAL_COMPLETED_RENTALS);
  };

  const value = {
    schoolConfig,
    updateSchoolConfig,
    rentalRates,
    updateRentalRates,
    activeRentals,
    completedRentals,
    rentalsTotalRevenue,
    addRental,
    completeRental,
    instructors,
    virtualQueue,
    checkInInstructor,
    checkOutInstructor,
    dailyClasses,
    addDailyClass,
    removeDailyClass,
    getSuggestedInstructorForSlot,
    resetDayEmpty,
    restoreDemoData,
    sunsetTime,
    setSunsetTime,
  };

  return (
    <SurfSchoolContext.Provider value={value}>
      {children}
    </SurfSchoolContext.Provider>
  );
}

export function useSurfSchool() {
  const context = useContext(SurfSchoolContext);
  if (!context) {
    throw new Error('useSurfSchool debe usarse dentro de un SurfSchoolProvider');
  }
  return context;
}
