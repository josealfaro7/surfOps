import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  calculateInstructorPayment,
  getInstructorConflicts,
  timeToMinutes,
} from '../utils/calculations';

const SurfSchoolContext = createContext(null);

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

export function SurfSchoolProvider({ children }) {
  // 1. SchoolConfig
  const [schoolConfig, setSchoolConfig] = useState(INITIAL_SCHOOL_CONFIG);

  // 2. Instructors (Diego, Jose, Vitoco, Caco, Alfred)
  const [instructors, setInstructors] = useState(INITIAL_INSTRUCTORS);

  // 3. DailyClasses
  const [dailyClasses, setDailyClasses] = useState(INITIAL_DAILY_CLASSES);

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

  // Actualizar configuración y recalcular pagos del día en base a las nuevas tarifas
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
  };

  const restoreDemoData = () => {
    setSchoolConfig(INITIAL_SCHOOL_CONFIG);
    setInstructors(INITIAL_INSTRUCTORS);
    setDailyClasses(INITIAL_DAILY_CLASSES);
  };

  const value = {
    schoolConfig,
    updateSchoolConfig,
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
