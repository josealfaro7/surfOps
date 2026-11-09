import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  calculateInstructorPayment,
  calculateRentalTotals,
  getInstructorConflicts,
  timeToMinutes,
  addMinutesToTime,
} from '../utils/calculations';
import {
  supabase,
  isSupabaseConfigured,
  getCachedSchoolBranding,
  loadSchoolBranding,
  cacheSchoolBranding,
  applySchoolThemeToDOM,
  uploadIdCardPhoto,
  DEFAULT_POISSON_BRANDING,
} from '../lib/supabaseClient';

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

export const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatIsoToDisplayDate = (isoDate) => {
  if (!isoDate || typeof isoDate !== 'string') return getTodayDateString();
  if (isoDate.includes('/')) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const addDaysToIsoDate = (isoDateStr, daysToAdd = 1) => {
  const [y, m, d] = (isoDateStr || getTodayIsoDate()).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + daysToAdd);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function SurfSchoolProvider({ children }) {
  // 0. Sesión de Supabase Auth e Identidad Corporativa Multitenant (Zero-FOUC desde surfops_school_branding)
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [isDemoSession, setIsDemoSession] = useState(!isSupabaseConfigured);
  const [schoolBranding, setSchoolBranding] = useState(() => {
    const cached = getCachedSchoolBranding();
    applySchoolThemeToDOM(cached);
    return cached;
  });

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

  // Sincroniza variables CSS en document.documentElement.style cada vez que cambia schoolBranding
  useEffect(() => {
    applySchoolThemeToDOM(schoolBranding);
  }, [schoolBranding]);

  // Carga los datos operativos de la escuela (schoolId = auth.uid()) desde Supabase
  const hydrateSchoolData = async (schoolId) => {
    if (!isSupabaseConfigured || !supabase || !schoolId) return;

    const todayIso = getTodayIsoDate();

    try {
      const [
        configRes,
        ratesRes,
        instructorsRes,
        attendanceRes,
        classesRes,
        rentalsRes,
      ] = await Promise.all([
        supabase
          .from('school_configs')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle(),
        supabase
          .from('rental_rates')
          .select('*')
          .eq('school_id', schoolId)
          .order('item_code', { ascending: true }),
        supabase
          .from('instructors')
          .select('*')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('instructor_attendance')
          .select('*')
          .eq('school_id', schoolId)
          .eq('attendance_date', todayIso),
        supabase
          .from('surf_classes')
          .select('*')
          .eq('school_id', schoolId)
          .eq('operation_date', todayIso)
          .order('start_time', { ascending: true }),
        supabase
          .from('equipment_rentals')
          .select('*')
          .eq('school_id', schoolId)
          .eq('operation_date', todayIso)
          .order('created_at', { ascending: false }),
      ]);

      if (configRes.data) {
        setSchoolConfig({
          priceIndividual: Number(configRes.data.price_individual),
          priceGroupBase: Number(configRes.data.price_group_base),
          priceGroupExtraPax: Number(configRes.data.price_group_extra_pax),
          priceCoursePack8: Number(configRes.data.price_course_pack_8),
          payIndividual: Number(configRes.data.pay_individual),
          payGroupBase: Number(configRes.data.pay_group_base),
          payGroupExtraPax: Number(configRes.data.pay_group_extra_pax),
          payCourseSingleClass: Number(configRes.data.pay_course_single_class),
        });
      }

      if (Array.isArray(ratesRes.data) && ratesRes.data.length > 0) {
        const mappedRates = ratesRes.data.map((r) => ({
          uuid: r.id,
          id: r.item_code,
          label: r.label,
          pricePerHour: Number(r.price_per_hour),
          enabled: Boolean(r.enabled),
        }));
        setRentalRates(mappedRates);
        safeSaveToLocalStorage(RENTAL_RATES_STORAGE_KEY, mappedRates);
      }

      if (Array.isArray(instructorsRes.data) && instructorsRes.data.length > 0) {
        const attendanceMap = new Map(
          (attendanceRes.data || []).map((att) => [att.instructor_id, att])
        );
        const mappedInstructors = instructorsRes.data.map((inst) => {
          const att = attendanceMap.get(inst.id);
          const checkedIn = Boolean(att?.checked_in);
          const checkInTime = att?.check_in_time
            ? String(att.check_in_time).slice(0, 5)
            : null;
          const checkInTimestamp = att?.check_in_at
            ? new Date(att.check_in_at).getTime()
            : checkInTime
            ? getBaseTimestamp(checkInTime)
            : null;

          return {
            id: inst.id,
            name: inst.name,
            checkedIn,
            checkInTime,
            checkInTimestamp,
          };
        });
        setInstructors(mappedInstructors);
      }

      if (Array.isArray(classesRes.data)) {
        const mappedClasses = classesRes.data.map((cls) => ({
          id: cls.id,
          date: formatIsoToDisplayDate(cls.operation_date),
          operationDate: cls.operation_date || todayIso,
          courseGroupId: cls.course_group_id || null,
          status: cls.status || (cls.instructor_id ? 'scheduled' : 'pending_instructor'),
          modality: cls.modality,
          pax: Number(cls.pax),
          category: cls.category,
          subtotal: Number(cls.subtotal),
          discount: Number(cls.discount),
          paymentMethod: cls.payment_method,
          finalTotal: Number(cls.final_total),
          startTime: String(cls.start_time).slice(0, 5),
          endTime: String(cls.end_time).slice(0, 5),
          instructorId: cls.instructor_id || null,
          wasSuggestedByQueue: Boolean(cls.was_suggested_by_queue),
          studentName: cls.student_name,
          studentPhone: cls.student_phone,
          studentEmail: cls.student_email,
          emergencyContactName: cls.emergency_contact_name,
          emergencyContactPhone: cls.emergency_contact_phone,
          instructorPay: Number(cls.instructor_pay),
        }));
        setDailyClasses(mappedClasses);
      }

      if (Array.isArray(rentalsRes.data)) {
        const mappedRentals = rentalsRes.data.map((r) => ({
          id: r.id,
          date: getTodayDateString(),
          itemId: r.item_code,
          itemLabel: r.item_label,
          unitPricePerHour: Number(r.unit_price_per_hour),
          quantity: Number(r.quantity),
          hours: Number(r.hours),
          checkInTime: String(r.check_in_time).slice(0, 5),
          estimatedReturnTime: String(r.estimated_return_time).slice(0, 5),
          returnedAt: r.returned_time ? String(r.returned_time).slice(0, 5) : undefined,
          subtotal: Number(r.subtotal),
          discount: Number(r.discount),
          finalTotal: Number(r.final_total),
          customerName: r.customer_name,
          customerEmail: r.customer_email,
          customerPhone: r.customer_phone,
          emergencyContact: r.emergency_contact,
          idPhotoStoragePath: r.id_photo_storage_path,
          idPhotoBase64: r.id_photo_storage_path || DEMO_ID_PHOTO_SVG,
          status: r.status,
        }));
        setActiveRentals(mappedRentals.filter((r) => r.status === 'active'));
        setCompletedRentals(
          mappedRentals.filter((r) => r.status === 'completed')
        );
      }
    } catch {
      // Mantiene estado local de respaldo si la consulta falla
    }
  };

  // Listener de sesión de Supabase Auth y carga de branding por auth.uid()
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      const currentSession = data?.session || null;
      setSession(currentSession);

      if (currentSession?.user?.id) {
        const branding = await loadSchoolBranding(currentSession.user.id);
        if (isMounted) {
          setSchoolBranding(branding);
          await hydrateSchoolData(currentSession.user.id);
        }
      }
      if (isMounted) {
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);

      if (nextSession?.user?.id) {
        setIsDemoSession(false);
        const branding = await loadSchoolBranding(nextSession.user.id);
        if (isMounted) {
          setSchoolBranding(branding);
          await hydrateSchoolData(nextSession.user.id);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Actualizar branding en public.schools, actualizar caché local (surfops_school_branding)
  // y refrescar el estado global + DOM al instante
  const updateSchoolBranding = async (partialBranding) => {
    const nextBranding = {
      ...schoolBranding,
      ...partialBranding,
      themePalette: {
        ...(schoolBranding?.themePalette || {}),
        ...(partialBranding?.themePalette || {}),
      },
    };

    // 1. Refrescar estado global y DOM al instante
    setSchoolBranding(nextBranding);
    applySchoolThemeToDOM(nextBranding);

    // 2. Actualizar caché local surfops_school_branding
    cacheSchoolBranding(nextBranding);

    // 3. Ejecutar UPDATE en public.schools filtrando por schoolId (auth.uid())
    const targetSchoolId = session?.user?.id || nextBranding.schoolId;
    if (isSupabaseConfigured && supabase && targetSchoolId) {
      const { error } = await supabase
        .from('schools')
        .update({
          display_name: nextBranding.displayName,
          monogram: nextBranding.monogram,
          tagline: nextBranding.tagline,
          theme_palette: nextBranding.themePalette,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetSchoolId);

      if (error) {
        throw error;
      }
    }

    return nextBranding;
  };

  const enterDemoSession = () => {
    const cached = getCachedSchoolBranding();
    setSchoolBranding(cached);
    applySchoolThemeToDOM(cached);
    setIsDemoSession(true);
  };

  const signOutSchool = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setIsDemoSession(false);
  };

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

  // Actualizar configuración de clases únicamente en school_configs sin sobrescribir
  // retroactivamente el instructor_pay de clases históricas cerradas (Inmutabilidad Financiera)
  const updateSchoolConfig = async (newValues) => {
    const updatedConfig = { ...schoolConfig, ...newValues };
    setSchoolConfig(updatedConfig);

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      await supabase.from('school_configs').upsert(
        {
          school_id: schoolBranding.schoolId,
          price_individual: updatedConfig.priceIndividual,
          price_group_base: updatedConfig.priceGroupBase,
          price_group_extra_pax: updatedConfig.priceGroupExtraPax,
          price_course_pack_8: updatedConfig.priceCoursePack8,
          pay_individual: updatedConfig.payIndividual,
          pay_group_base: updatedConfig.payGroupBase,
          pay_group_extra_pax: updatedConfig.payGroupExtraPax,
          pay_course_single_class: updatedConfig.payCourseSingleClass,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'school_id' }
      );
    }
  };

  // Actualizar tarifas de arriendo de equipamiento en Supabase y en caché local
  const updateRentalRates = async (newRates) => {
    const normalized = Array.isArray(newRates) ? newRates : INITIAL_RENTAL_RATES;
    setRentalRates(normalized);
    safeSaveToLocalStorage(RENTAL_RATES_STORAGE_KEY, normalized);

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      const payload = normalized.map((rate) => ({
        school_id: schoolBranding.schoolId,
        item_code: rate.id,
        label: rate.label,
        price_per_hour: Number(rate.pricePerHour) || 0,
        enabled: Boolean(rate.enabled),
        updated_at: new Date().toISOString(),
      }));
      await supabase
        .from('rental_rates')
        .upsert(payload, { onConflict: 'school_id,item_code' });
    }
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
    const rentalId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `rnt-${Date.now()}`;
    const schoolId = schoolBranding?.schoolId || '00000000-0000-0000-0000-000000000001';
    const idPhotoStoragePath = `${schoolId}/${rentalId}.jpg`;

    const newRentalRecord = {
      id: rentalId,
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
      idPhotoStoragePath,
      idPhotoBase64: rentalForm.idPhotoBase64 || '',
      status: 'active',
    };

    const nextActive = [newRentalRecord, ...activeRentals];
    const savedOk = safeSaveToLocalStorage(ACTIVE_RENTALS_STORAGE_KEY, nextActive);
    if (savedOk) {
      setActiveRentals(nextActive);

      if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
        (async () => {
          try {
            const uploadedPath = await uploadIdCardPhoto(
              schoolBranding.schoolId,
              rentalId,
              rentalForm.idPhotoBase64
            );
            const estimatedReturnAt = new Date(
              now.getTime() + hours * 60 * 60 * 1000
            ).toISOString();

            await supabase.from('equipment_rentals').insert({
              id: rentalId,
              school_id: schoolBranding.schoolId,
              rental_rate_id: rateItem?.uuid || null,
              operation_date: getTodayIsoDate(),
              item_code: newRentalRecord.itemId,
              item_label: newRentalRecord.itemLabel,
              unit_price_per_hour: unitPricePerHour,
              quantity,
              hours,
              check_in_time: checkInTime,
              estimated_return_time: estimatedReturnTime,
              check_in_at: now.toISOString(),
              estimated_return_at: estimatedReturnAt,
              subtotal,
              discount,
              final_total: finalTotal,
              customer_name: newRentalRecord.customerName,
              customer_phone: newRentalRecord.customerPhone,
              customer_email: newRentalRecord.customerEmail,
              emergency_contact: newRentalRecord.emergencyContact,
              id_photo_storage_path: uploadedPath,
              status: 'active',
            });
          } catch {
            // Mantiene el registro en estado local si falla la subida en segundo plano
          }
        })();
      }

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

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      supabase
        .from('equipment_rentals')
        .update({
          status: 'completed',
          returned_time: returnedAt,
          returned_at: now.toISOString(),
        })
        .eq('id', rentalId)
        .eq('school_id', schoolBranding.schoolId)
        .then(() => {});
    }
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

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      supabase
        .from('instructor_attendance')
        .upsert(
          {
            school_id: schoolBranding.schoolId,
            instructor_id: instructorId,
            attendance_date: getTodayIsoDate(),
            checked_in: true,
            check_in_time: timeStr,
            check_in_at: new Date(timestamp).toISOString(),
            checked_out_at: null,
          },
          { onConflict: 'school_id,instructor_id,attendance_date' }
        )
        .then(() => {});
    }
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

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      supabase
        .from('instructor_attendance')
        .update({
          checked_in: false,
          check_in_time: null,
          check_in_at: null,
          checked_out_at: new Date().toISOString(),
        })
        .eq('school_id', schoolBranding.schoolId)
        .eq('instructor_id', instructorId)
        .eq('attendance_date', getTodayIsoDate())
        .then(() => {});
    }
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

  // Guardar nueva clase única (con cálculo de pago a instructor en background y soporte para course_group_id / status)
  const addDailyClass = (classForm) => {
    const modality = classForm.modality === 'grupal' ? 'grupal' : 'individual';
    const pax = modality === 'grupal' ? Math.max(2, Number(classForm.pax) || 2) : 1;
    const category = classForm.category === 'curso' ? 'curso' : 'unica';
    const subtotal = Number(classForm.subtotal) || 0;
    const discount = Math.max(0, Number(classForm.discount) || 0);
    const finalTotal = Math.max(0, subtotal - discount);
    const instructorId = classForm.instructorId || null;
    const operationDate = classForm.operationDate || getTodayIsoDate();
    const courseGroupId = classForm.courseGroupId || null;
    const status =
      classForm.status || (instructorId ? 'scheduled' : 'pending_instructor');

    // Background Math: calcula cuánto gana el instructor según SchoolConfig vigente al momento del registro
    // Si instructor_id es null ("Por definir"), instructorPay queda en 0 hasta que se asigne el día de la clase
    const instructorPay = instructorId
      ? calculateInstructorPayment(schoolConfig, {
          modality,
          pax,
          category,
        })
      : 0;

    const classId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cls-${Date.now()}`;

    const newClassRecord = {
      id: classId,
      date: classForm.date || formatIsoToDisplayDate(operationDate),
      operationDate,
      courseGroupId,
      status,
      sessionIndex: classForm.sessionIndex || 1,
      totalSessions: classForm.totalSessions || 1,
      isPaidInPack: Boolean(classForm.isPaidInPack),
      modality,
      pax,
      category,
      subtotal,
      discount,
      paymentMethod: classForm.paymentMethod || 'Transferencia',
      finalTotal,
      startTime: classForm.startTime,
      endTime: classForm.endTime,
      instructorId,
      wasSuggestedByQueue: Boolean(classForm.wasSuggestedByQueue),
      studentName: classForm.studentName?.trim() || 'Alumno',
      studentPhone: classForm.studentPhone?.trim() || '',
      studentEmail: classForm.studentEmail?.trim() || '',
      emergencyContactName: classForm.emergencyContactName?.trim() || '',
      emergencyContactPhone: classForm.emergencyContactPhone?.trim() || '',
      instructorPay,
    };

    setDailyClasses((prev) =>
      [...prev, newClassRecord].sort((a, b) => {
        const dateCmp = String(a.operationDate || '').localeCompare(
          String(b.operationDate || '')
        );
        if (dateCmp !== 0) return dateCmp;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      })
    );

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      supabase
        .from('surf_classes')
        .insert({
          id: classId,
          school_id: schoolBranding.schoolId,
          instructor_id: newClassRecord.instructorId,
          course_group_id: newClassRecord.courseGroupId,
          status: newClassRecord.status,
          operation_date: newClassRecord.operationDate,
          modality: newClassRecord.modality,
          pax: newClassRecord.pax,
          category: newClassRecord.category,
          subtotal: newClassRecord.subtotal,
          discount: newClassRecord.discount,
          payment_method: newClassRecord.paymentMethod,
          final_total: newClassRecord.finalTotal,
          instructor_pay: newClassRecord.instructorPay,
          start_time: newClassRecord.startTime,
          end_time: newClassRecord.endTime,
          was_suggested_by_queue: newClassRecord.wasSuggestedByQueue,
          student_name: newClassRecord.studentName,
          student_phone: newClassRecord.studentPhone,
          student_email: newClassRecord.studentEmail,
          emergency_contact_name: newClassRecord.emergencyContactName,
          emergency_contact_phone: newClassRecord.emergencyContactPhone,
        })
        .then(() => {});
    }

    return newClassRecord;
  };

  // Multi-agendamiento de Curso Pack: agrupa N sesiones mediante course_group_id,
  // carga el valor total únicamente en la Sesión #1 y marca las sesiones #2..N como pagadas ($0 a caja)
  // soportando instructor_id nullable ("Por definir") y status ('scheduled' | 'pending_instructor')
  const addCoursePackClasses = (packPayload) => {
    const modality = packPayload.modality === 'grupal' ? 'grupal' : 'individual';
    const pax =
      modality === 'grupal' ? Math.max(2, Number(packPayload.pax) || 2) : 1;
    const packSubtotal = Number(packPayload.subtotal) || 0;
    const packDiscount = Math.max(0, Number(packPayload.discount) || 0);
    const packFinalTotal = Math.max(0, packSubtotal - packDiscount);
    const paymentMethod = packPayload.paymentMethod || 'Transferencia';

    const courseGroupId =
      packPayload.courseGroupId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cg-${Date.now()}`);

    const rawSessions =
      Array.isArray(packPayload.sessions) && packPayload.sessions.length > 0
        ? packPayload.sessions
        : [
            {
              operationDate: getTodayIsoDate(),
              startTime: packPayload.startTime || '09:00',
              endTime: packPayload.endTime || '10:15',
              instructorId: packPayload.instructorId || null,
              wasSuggestedByQueue: Boolean(packPayload.wasSuggestedByQueue),
            },
          ];

    const totalSessions = rawSessions.length;

    const createdRecords = rawSessions.map((sessionItem, idx) => {
      const isFirstSession = idx === 0;
      const instructorId = sessionItem.instructorId || null;
      const operationDate = sessionItem.operationDate || getTodayIsoDate();
      const startTime = sessionItem.startTime || '09:00';
      const endTime =
        sessionItem.endTime || addMinutesToTime(startTime, 75);
      const status =
        sessionItem.status ||
        (instructorId ? 'scheduled' : 'pending_instructor');

      // Regla financiera estricta: SOLO la primera sesión carga el valor del pack a caja;
      // las sesiones posteriores (2..N) quedan con $0 en caja (marcadas como pagadas en el pack)
      const sessionSubtotal = isFirstSession ? packSubtotal : 0;
      const sessionDiscount = isFirstSession ? packDiscount : 0;
      const sessionFinalTotal = isFirstSession ? packFinalTotal : 0;

      // Pago de instructor por sesión individual de curso (si ya tiene instructor asignado)
      const instructorPay = instructorId
        ? calculateInstructorPayment(schoolConfig, {
            modality,
            pax,
            category: 'curso',
          })
        : 0;

      const classId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cls-${Date.now()}-${idx}`;

      return {
        id: classId,
        date: formatIsoToDisplayDate(operationDate),
        operationDate,
        courseGroupId,
        status,
        sessionIndex: idx + 1,
        totalSessions,
        isPaidInPack: !isFirstSession,
        modality,
        pax,
        category: 'curso',
        subtotal: sessionSubtotal,
        discount: sessionDiscount,
        paymentMethod: isFirstSession
          ? paymentMethod
          : `Pagado en Pack (${paymentMethod})`,
        finalTotal: sessionFinalTotal,
        startTime,
        endTime,
        instructorId,
        wasSuggestedByQueue: Boolean(sessionItem.wasSuggestedByQueue),
        studentName: packPayload.studentName?.trim() || 'Alumno',
        studentPhone: packPayload.studentPhone?.trim() || '',
        studentEmail: packPayload.studentEmail?.trim() || '',
        emergencyContactName: packPayload.emergencyContactName?.trim() || '',
        emergencyContactPhone: packPayload.emergencyContactPhone?.trim() || '',
        instructorPay,
      };
    });

    setDailyClasses((prev) =>
      [...prev, ...createdRecords].sort((a, b) => {
        const dateCmp = String(a.operationDate || '').localeCompare(
          String(b.operationDate || '')
        );
        if (dateCmp !== 0) return dateCmp;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      })
    );

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      const dbRows = createdRecords.map((rec) => ({
        id: rec.id,
        school_id: schoolBranding.schoolId,
        instructor_id: rec.instructorId,
        course_group_id: rec.courseGroupId,
        status: rec.status,
        operation_date: rec.operationDate,
        modality: rec.modality,
        pax: rec.pax,
        category: rec.category,
        subtotal: rec.subtotal,
        discount: rec.discount,
        payment_method: rec.paymentMethod,
        final_total: rec.finalTotal,
        instructor_pay: rec.instructorPay,
        start_time: rec.startTime,
        end_time: rec.endTime,
        was_suggested_by_queue: rec.wasSuggestedByQueue,
        student_name: rec.studentName,
        student_phone: rec.studentPhone,
        student_email: rec.studentEmail,
        emergency_contact_name: rec.emergencyContactName,
        emergency_contact_phone: rec.emergencyContactPhone,
      }));

      supabase
        .from('surf_classes')
        .insert(dbRows)
        .then(() => {});
    }

    return createdRecords;
  };

  // Asignar o cambiar el instructor de una sesión agendada ("Por definir" -> instructor activo)
  const assignInstructorToClass = (classId, instructorId) => {
    const normalizedInstructorId = instructorId || null;

    setDailyClasses((prev) =>
      prev.map((cls) => {
        if (cls.id !== classId) return cls;
        const nextStatus = normalizedInstructorId
          ? 'scheduled'
          : 'pending_instructor';
        const nextInstructorPay = normalizedInstructorId
          ? calculateInstructorPayment(schoolConfig, {
              modality: cls.modality,
              pax: cls.pax,
              category: cls.category,
            })
          : 0;

        if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
          supabase
            .from('surf_classes')
            .update({
              instructor_id: normalizedInstructorId,
              status: nextStatus,
              instructor_pay: nextInstructorPay,
            })
            .eq('id', classId)
            .eq('school_id', schoolBranding.schoolId)
            .then(() => {});
        }

        return {
          ...cls,
          instructorId: normalizedInstructorId,
          status: nextStatus,
          instructorPay: nextInstructorPay,
        };
      })
    );
  };

  const removeDailyClass = (classId) => {
    setDailyClasses((prev) => prev.filter((c) => c.id !== classId));

    if (isSupabaseConfigured && supabase && schoolBranding?.schoolId) {
      supabase
        .from('surf_classes')
        .delete()
        .eq('id', classId)
        .eq('school_id', schoolBranding.schoolId)
        .then(() => {});
    }
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
    session,
    authLoading,
    isDemoSession,
    enterDemoSession,
    signOutSchool,
    schoolBranding,
    setSchoolBrandingState: setSchoolBranding,
    loadSchoolBranding,
    updateSchoolBranding,
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
    addCoursePackClasses,
    assignInstructorToClass,
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
