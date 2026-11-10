import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateInstructorPayment,
  calculateRentalTotals,
  calculateStudentSubtotal,
  getInstructorConflicts,
  buildRotationQueue,
  suggestInstructorForSlot,
  validateClassSlot,
  getMaxRentalHours,
  summarizeClosing,
  addMinutesToTime,
  timeToMinutes,
  CLASS_STATUS,
} from '../utils/calculations';
import {
  DEFAULT_TIMEZONE,
  getTodayIsoDate,
  getNowHHMM,
  localDateTimeToDate,
  listIsoDates,
  addDaysToIsoDate,
} from '../utils/dates';
import {
  supabase,
  isSupabaseConfigured,
  getCachedSchoolBranding,
  loadSchoolBranding,
  cacheSchoolBranding,
  applySchoolThemeToDOM,
  normalizeSchoolBranding,
  uploadIdCardPhoto,
  getSignedIdCardUrl,
  ID_CARDS_BUCKET,
  DEFAULT_POISSON_BRANDING,
} from '../lib/supabaseClient';
import {
  DEFAULT_SCHOOL_CONFIG,
  DEFAULT_RENTAL_RATES,
  configFromRow,
  configToRpc,
  rateFromRow,
  rateToRpc,
  instructorFromRows,
  classFromRow,
  classToRow,
  rentalFromRow,
  rentalToRow,
  friendlyDbError,
} from '../lib/mappers';
import {
  loadDemoState,
  saveDemoState,
  clearDemoState,
  buildDemoSeed,
  purgeLegacyLocalStorage,
  DEMO_ADMIN_PIN,
} from '../lib/demoStore';

const SurfSchoolContext = createContext(null);

export const MAX_COURSE_PACK_SESSIONS = 8;
const FUTURE_DAYS_TO_LOAD = 90;

const EMPTY_DATA = {
  schoolConfig: { ...DEFAULT_SCHOOL_CONFIG },
  rentalRates: DEFAULT_RENTAL_RATES.map((r) => ({ ...r })),
  instructors: [],
  instructorNames: {},
  classes: [],
  rentals: [],
};

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const sortClasses = (list) =>
  [...list].sort((a, b) => {
    const d = String(a.operationDate).localeCompare(String(b.operationDate));
    return d !== 0 ? d : timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

const fail = (message) => {
  throw new Error(message);
};

const check = (result, fallback) => {
  if (result?.error) fail(friendlyDbError(result.error, fallback));
  return result?.data;
};

export function SurfSchoolProvider({ children }) {
  // ------------------------------------------------------------------
  // Sesión y modo: 'loading' | 'login' | 'demo' | 'live'
  // ------------------------------------------------------------------
  const [mode, setMode] = useState(isSupabaseConfigured ? 'loading' : 'login');
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState('');
  const loadedUserRef = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [schoolBranding, setSchoolBranding] = useState(() => {
    const cached = getCachedSchoolBranding();
    applySchoolThemeToDOM(cached);
    return cached;
  });
  const timezone = schoolBranding?.timezone || DEFAULT_TIMEZONE;

  // Reloj de la escuela (se refresca cada 30 s; detecta el cambio de día)
  const [clockTick, setClockTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClockTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const todayIso = useMemo(() => getTodayIsoDate(timezone, new Date(clockTick)), [timezone, clockTick]);
  const nowHHMM = useMemo(() => getNowHHMM(timezone, new Date(clockTick)), [timezone, clockTick]);

  // ------------------------------------------------------------------
  // Datos operativos (una sola fuente; en demo se persisten en localStorage)
  // ------------------------------------------------------------------
  const [data, setData] = useState(EMPTY_DATA);
  const dataRef = useRef(data);
  dataRef.current = data;
  const demoMetaRef = useRef({ attendanceDate: null });

  const [sunsetInfo, setSunsetInfo] = useState({ sunset: null, isFallback: true });

  useEffect(() => {
    applySchoolThemeToDOM(schoolBranding);
  }, [schoolBranding]);

  useEffect(() => {
    purgeLegacyLocalStorage();
  }, []);

  /** Aplica un cambio en modo demo: guarda primero (si falla, no cambia nada) */
  const commitDemo = useCallback((mutator) => {
    const next = mutator(dataRef.current);
    saveDemoState({
      version: 2,
      attendanceDate: demoMetaRef.current.attendanceDate,
      schoolConfig: next.schoolConfig,
      rentalRates: next.rentalRates,
      instructors: next.instructors,
      classes: next.classes,
      rentals: next.rentals,
    });
    dataRef.current = next;
    setData(next);
    return next;
  }, []);

  const isLive = mode === 'live';
  const schoolId = isLive ? session?.user?.id : null;

  // ------------------------------------------------------------------
  // Carga de datos en modo real
  // ------------------------------------------------------------------
  const hydrateLive = useCallback(async (uid) => {
    setLoadError('');
    const branding = await loadSchoolBranding(uid);
    setSchoolBranding(branding);
    const tz = branding.timezone || DEFAULT_TIMEZONE;
    const today = getTodayIsoDate(tz);
    const until = addDaysToIsoDate(today, FUTURE_DAYS_TO_LOAD);

    const [configRes, ratesRes, instructorsRes, attendanceRes, classesRes, rentalsRes] = await Promise.all([
      supabase.from('school_configs').select('*').eq('school_id', uid).maybeSingle(),
      supabase.from('rental_rates').select('*').eq('school_id', uid).order('item_code'),
      supabase.from('instructors').select('*').eq('school_id', uid).order('sort_order').order('name'),
      supabase.from('instructor_attendance').select('*').eq('school_id', uid).eq('attendance_date', today),
      supabase
        .from('surf_classes')
        .select('*')
        .eq('school_id', uid)
        .gte('operation_date', today)
        .lte('operation_date', until)
        .order('operation_date')
        .order('start_time'),
      supabase
        .from('equipment_rentals')
        .select('*')
        .eq('school_id', uid)
        .or(`operation_date.eq.${today},status.eq.active`)
        .order('created_at', { ascending: false }),
    ]);

    const firstError = [configRes, ratesRes, instructorsRes, attendanceRes, classesRes, rentalsRes].find(
      (r) => r.error
    );
    if (firstError) {
      setLoadError(friendlyDbError(firstError.error, 'No se pudieron cargar los datos de la escuela.'));
    }

    const attendanceById = new Map((attendanceRes.data || []).map((a) => [a.instructor_id, a]));
    const allInstructors = instructorsRes.data || [];
    const instructorNames = {};
    allInstructors.forEach((i) => {
      instructorNames[i.id] = i.name;
    });

    const rates =
      Array.isArray(ratesRes.data) && ratesRes.data.length > 0
        ? ratesRes.data.map(rateFromRow)
        : DEFAULT_RENTAL_RATES.map((r) => ({ ...r, enabled: false }));

    const next = {
      schoolConfig: configFromRow(configRes.data),
      rentalRates: rates,
      instructors: allInstructors
        .filter((i) => i.is_active)
        .map((i) => instructorFromRows(i, attendanceById.get(i.id))),
      instructorNames,
      classes: (classesRes.data || []).map(classFromRow),
      rentals: (rentalsRes.data || []).map(rentalFromRow),
    };
    dataRef.current = next;
    setData(next);
  }, []);

  // Recargar al cambiar de día en modo real
  const hydratedDayRef = useRef(null);
  useEffect(() => {
    if (mode !== 'live' || !schoolId) return;
    if (hydratedDayRef.current && hydratedDayRef.current !== todayIso) {
      hydrateLive(schoolId).catch(() => {});
    }
    hydratedDayRef.current = todayIso;
  }, [mode, schoolId, todayIso, hydrateLive]);

  // ------------------------------------------------------------------
  // Auth: un solo listener (INITIAL_SESSION incluido)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      const uid = nextSession?.user?.id || null;

      if (uid) {
        if (loadedUserRef.current === uid) return; // refresco de token: no recargar
        loadedUserRef.current = uid;
        setMode('loading');
        // Fuera del callback (recomendación de supabase-js para evitar bloqueos)
        setTimeout(() => {
          hydrateLive(uid)
            .catch((err) => setLoadError(err?.message || 'No se pudieron cargar los datos.'))
            .finally(() => setMode('live'));
        }, 0);
      } else {
        loadedUserRef.current = null;
        if (modeRef.current !== 'demo') {
          dataRef.current = EMPTY_DATA;
          setData(EMPTY_DATA);
          setMode('login');
        }
      }
    });

    return () => sub?.subscription?.unsubscribe();
  }, [hydrateLive]);

  const enterDemoSession = useCallback(() => {
    const tz = DEFAULT_TIMEZONE;
    const today = getTodayIsoDate(tz);
    const state = loadDemoState(today, tz);
    demoMetaRef.current = { attendanceDate: state.attendanceDate || today };
    const next = {
      schoolConfig: state.schoolConfig,
      rentalRates: state.rentalRates,
      instructors: state.instructors,
      instructorNames: Object.fromEntries(state.instructors.map((i) => [i.id, i.name])),
      classes: state.classes,
      rentals: state.rentals,
    };
    dataRef.current = next;
    setData(next);
    const demoBranding = { ...DEFAULT_POISSON_BRANDING, ...(state.branding || {}), schoolId: null };
    setSchoolBranding(demoBranding);
    setLoadError('');
    setMode('demo');
  }, []);

  const signOutSchool = useCallback(async () => {
    if (modeRef.current === 'live' && supabase) {
      await supabase.auth.signOut();
    }
    loadedUserRef.current = null;
    hydratedDayRef.current = null;
    dataRef.current = EMPTY_DATA;
    setData(EMPTY_DATA);
    setSession(null);
    setLoadError('');
    setMode('login');
  }, []);

  // ------------------------------------------------------------------
  // Derivados
  // ------------------------------------------------------------------
  const { schoolConfig, rentalRates, instructors, instructorNames, classes, rentals } = data;

  const todayClasses = useMemo(() => classes.filter((c) => c.operationDate === todayIso), [classes, todayIso]);

  const virtualQueue = useMemo(() => buildRotationQueue(instructors, todayClasses), [instructors, todayClasses]);

  const todayRentals = useMemo(() => rentals.filter((r) => r.operationDate === todayIso), [rentals, todayIso]);
  const activeRentals = useMemo(() => rentals.filter((r) => r.status === 'active'), [rentals]);
  const completedRentalsToday = useMemo(
    () => todayRentals.filter((r) => r.status === 'completed'),
    [todayRentals]
  );
  const rentalsTodayRevenue = useMemo(
    () => todayRentals.reduce((acc, r) => acc + (Number(r.finalTotal) || 0), 0),
    [todayRentals]
  );

  const getInstructorName = useCallback(
    (id) => (id ? instructorNames[id] || instructors.find((i) => i.id === id)?.name || 'Instructor' : 'Por definir'),
    [instructorNames, instructors]
  );

  /** Sunset que se usa para validar (solo si viene de la API, no un valor de respaldo) */
  const validationSunset = sunsetInfo.isFallback ? null : sunsetInfo.sunset;

  const getSuggestedInstructorForSlot = useCallback(
    (startTime, endTime) => suggestInstructorForSlot(virtualQueue, startTime, endTime, classes, todayIso),
    [virtualQueue, classes, todayIso]
  );

  // ------------------------------------------------------------------
  // Validaciones comunes
  // ------------------------------------------------------------------
  const validateSessionOrThrow = (session, existingClasses, { label = 'La clase' } = {}) => {
    if (!session.operationDate || session.operationDate < todayIso) {
      fail(`${label}: la fecha no puede ser anterior a hoy.`);
    }
    const errors = validateClassSlot({
      startTime: session.startTime,
      endTime: session.endTime,
      openTime: schoolConfig.openTime,
      closeTime: schoolConfig.closeTime,
      sunsetTime: session.operationDate === todayIso ? validationSunset : null,
    });
    if (errors.length > 0) fail(`${label}: ${errors.join(' ')}`);

    if (session.instructorId) {
      const conflicts = getInstructorConflicts(
        session.instructorId,
        session.startTime,
        session.endTime,
        existingClasses,
        session.operationDate,
        { excludeClassId: session.excludeClassId }
      );
      if (conflicts.length > 0) {
        const c = conflicts[0];
        fail(
          `${label}: ${getInstructorName(session.instructorId)} ya tiene clase ${c.startTime}–${c.endTime} (${c.studentName}) ese día.`
        );
      }
    }
  };

  const insertClassRows = async (records) => {
    if (isLive) {
      const res = await supabase
        .from('surf_classes')
        .insert(records.map((r) => classToRow(r, schoolId)))
        .select('*');
      const rows = check(res, 'No se pudo guardar la clase.');
      const saved = rows.map(classFromRow);
      setData((prev) => ({ ...prev, classes: sortClasses([...prev.classes, ...saved]) }));
      return saved;
    }
    commitDemo((prev) => ({ ...prev, classes: sortClasses([...prev.classes, ...records]) }));
    return records;
  };

  const patchClass = async (classId, patch) => {
    if (isLive) {
      const res = await supabase
        .from('surf_classes')
        .update(classToRowPatch(patch))
        .eq('id', classId)
        .eq('school_id', schoolId)
        .select('*')
        .single();
      const row = check(res, 'No se pudo actualizar la clase.');
      const saved = classFromRow(row);
      setData((prev) => ({ ...prev, classes: prev.classes.map((c) => (c.id === classId ? saved : c)) }));
      return saved;
    }
    let saved = null;
    commitDemo((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => {
        if (c.id !== classId) return c;
        saved = { ...c, ...patch };
        return saved;
      }),
    }));
    return saved;
  };

  // ------------------------------------------------------------------
  // Módulo 02 · Asistencia
  // ------------------------------------------------------------------
  const checkInInstructor = async (instructorId) => {
    const now = new Date();
    const timeStr = getNowHHMM(timezone, now);
    if (isLive) {
      const res = await supabase.from('instructor_attendance').upsert(
        {
          school_id: schoolId,
          instructor_id: instructorId,
          attendance_date: todayIso,
          check_in_time: timeStr,
          check_in_at: now.toISOString(),
          check_out_at: null,
        },
        { onConflict: 'school_id,instructor_id,attendance_date' }
      );
      check(res, 'No se pudo registrar el check-in.');
      setData((prev) => ({
        ...prev,
        instructors: prev.instructors.map((i) =>
          i.id === instructorId
            ? { ...i, checkedIn: true, checkInTime: timeStr, checkInTimestamp: now.getTime() }
            : i
        ),
      }));
      return;
    }
    commitDemo((prev) => ({
      ...prev,
      instructors: prev.instructors.map((i) =>
        i.id === instructorId ? { ...i, checkedIn: true, checkInTime: timeStr, checkInTimestamp: now.getTime() } : i
      ),
    }));
  };

  const checkOutInstructor = async (instructorId) => {
    if (isLive) {
      const res = await supabase
        .from('instructor_attendance')
        .update({ check_out_at: new Date().toISOString() })
        .eq('school_id', schoolId)
        .eq('instructor_id', instructorId)
        .eq('attendance_date', todayIso);
      check(res, 'No se pudo registrar la salida.');
      setData((prev) => ({
        ...prev,
        instructors: prev.instructors.map((i) =>
          i.id === instructorId ? { ...i, checkedIn: false, checkInTime: null, checkInTimestamp: null } : i
        ),
      }));
      return;
    }
    commitDemo((prev) => ({
      ...prev,
      instructors: prev.instructors.map((i) =>
        i.id === instructorId ? { ...i, checkedIn: false, checkInTime: null, checkInTimestamp: null } : i
      ),
    }));
  };

  // ------------------------------------------------------------------
  // Módulo 03 · Clases
  // ------------------------------------------------------------------
  const duration = Number(schoolConfig.classDurationMinutes) || 75;

  const buildStudentFields = (form) => ({
    studentName: form.studentName?.trim() || 'Alumno',
    studentPhone: form.studentPhone?.trim() || '',
    studentEmail: form.studentEmail?.trim() || '',
    emergencyContactName: form.emergencyContactName?.trim() || '',
    emergencyContactPhone: form.emergencyContactPhone?.trim() || '',
  });

  /** Clase única (individual o grupal) para hoy */
  const addSingleClass = async (form) => {
    const modality = form.modality === 'grupal' ? 'grupal' : 'individual';
    const pax = modality === 'grupal' ? Math.max(2, Number(form.pax) || 2) : 1;
    if (!form.instructorId) fail('Selecciona un instructor libre para la clase.');

    const startTime = form.startTime;
    const endTime = addMinutesToTime(startTime, duration);
    const operationDate = todayIso;
    validateSessionOrThrow({ operationDate, startTime, endTime, instructorId: form.instructorId }, classes);

    const subtotal = calculateStudentSubtotal(schoolConfig, { modality, pax, category: 'unica' });
    const discount = Math.min(subtotal, Math.max(0, Number(form.discount) || 0));

    const record = {
      id: newId(),
      operationDate,
      status: CLASS_STATUS.SCHEDULED,
      courseGroupId: null,
      sessionIndex: 1,
      isPaidInPack: false,
      modality,
      pax,
      category: 'unica',
      subtotal,
      discount,
      finalTotal: subtotal - discount,
      paymentMethod: form.paymentMethod || 'Transferencia',
      startTime,
      endTime,
      instructorId: form.instructorId,
      instructorPay: calculateInstructorPayment(schoolConfig, { modality, pax, category: 'unica' }),
      wasSuggestedByQueue: Boolean(form.wasSuggestedByQueue),
      assignedAtMs: Date.now(),
      ...buildStudentFields(form),
    };
    const [saved] = await insertClassRows([record]);
    return saved;
  };

  /**
   * Curso Pack: el alumno paga el pack completo en la sesión #1 (fecha de esa sesión);
   * las sesiones 2..N quedan en $0. El instructor cobra cada sesión en su propia fecha.
   */
  const addCoursePack = async (payload) => {
    const modality = payload.modality === 'grupal' ? 'grupal' : 'individual';
    const pax = modality === 'grupal' ? Math.max(2, Number(payload.pax) || 2) : 1;
    const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    if (sessions.length === 0) fail('El curso necesita al menos una sesión.');
    if (sessions.length > MAX_COURSE_PACK_SESSIONS) fail(`Máximo ${MAX_COURSE_PACK_SESSIONS} sesiones por pack.`);

    const subtotal = calculateStudentSubtotal(schoolConfig, { modality, pax, category: 'curso' });
    const discount = Math.min(subtotal, Math.max(0, Number(payload.discount) || 0));
    const paymentMethod = payload.paymentMethod || 'Transferencia';
    const courseGroupId = newId();
    const sessionPay = calculateInstructorPayment(schoolConfig, { modality, pax, category: 'curso' });
    const now = Date.now();
    const student = buildStudentFields(payload);

    // Validar cada sesión contra lo existente y contra las sesiones anteriores del mismo pack
    const records = [];
    sessions
      .map((s) => ({ ...s, endTime: addMinutesToTime(s.startTime, duration) }))
      .sort((a, b) =>
        a.operationDate === b.operationDate
          ? timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
          : a.operationDate.localeCompare(b.operationDate)
      )
      .forEach((s, idx) => {
        const isFirst = idx === 0;
        const instructorId = s.instructorId || null;
        validateSessionOrThrow(
          { operationDate: s.operationDate, startTime: s.startTime, endTime: s.endTime, instructorId },
          [...classes, ...records],
          { label: `Sesión #${idx + 1}` }
        );
        records.push({
          id: newId(),
          operationDate: s.operationDate,
          status: instructorId ? CLASS_STATUS.SCHEDULED : CLASS_STATUS.PENDING_INSTRUCTOR,
          courseGroupId,
          sessionIndex: idx + 1,
          isPaidInPack: !isFirst,
          modality,
          pax,
          category: 'curso',
          subtotal: isFirst ? subtotal : 0,
          discount: isFirst ? discount : 0,
          finalTotal: isFirst ? subtotal - discount : 0,
          paymentMethod,
          startTime: s.startTime,
          endTime: s.endTime,
          instructorId,
          instructorPay: instructorId ? sessionPay : 0,
          wasSuggestedByQueue: Boolean(s.wasSuggestedByQueue),
          assignedAtMs: instructorId ? now : null,
          ...student,
        });
      });

    return insertClassRows(records);
  };

  /** Agrega una sesión más a un pack existente (sin costo; el instructor cobra al dictarla) */
  const addSessionToPack = async (courseGroupId, session) => {
    const packSessions = classes.filter((c) => c.courseGroupId === courseGroupId);
    if (packSessions.length === 0) fail('No se encontró el curso.');
    if (packSessions.length >= MAX_COURSE_PACK_SESSIONS) fail(`El pack ya tiene ${MAX_COURSE_PACK_SESSIONS} sesiones.`);
    const ref = packSessions.find((c) => c.sessionIndex === 1) || packSessions[0];
    const endTime = addMinutesToTime(session.startTime, duration);
    // Regla de la escuela: el curso pertenece al instructor que lo tomó (sesión #1).
    // Si no se indica otro y ese instructor está libre, se le asigna; si no, queda "Por definir".
    let instructorId = session.instructorId === undefined ? ref.instructorId || null : session.instructorId || null;
    if (
      session.instructorId === undefined &&
      instructorId &&
      getInstructorConflicts(instructorId, session.startTime, endTime, classes, session.operationDate).length > 0
    ) {
      instructorId = null;
    }
    validateSessionOrThrow(
      { operationDate: session.operationDate, startTime: session.startTime, endTime, instructorId },
      classes,
      { label: 'Nueva sesión' }
    );
    const record = {
      ...ref,
      id: newId(),
      operationDate: session.operationDate,
      status: instructorId ? CLASS_STATUS.SCHEDULED : CLASS_STATUS.PENDING_INSTRUCTOR,
      sessionIndex: Math.max(...packSessions.map((c) => c.sessionIndex || 1)) + 1,
      isPaidInPack: true,
      subtotal: 0,
      discount: 0,
      finalTotal: 0,
      startTime: session.startTime,
      endTime,
      instructorId,
      instructorPay: instructorId
        ? calculateInstructorPayment(schoolConfig, { modality: ref.modality, pax: ref.pax, category: 'curso' })
        : 0,
      wasSuggestedByQueue: false,
      assignedAtMs: instructorId ? Date.now() : null,
    };
    const [saved] = await insertClassRows([record]);
    return saved;
  };

  const assignInstructorToClass = async (classId, instructorId) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) fail('Clase no encontrada.');
    const nextInstructorId = instructorId || null;
    if (nextInstructorId) {
      validateSessionOrThrow(
        {
          operationDate: cls.operationDate,
          startTime: cls.startTime,
          endTime: cls.endTime,
          instructorId: nextInstructorId,
          excludeClassId: cls.id,
        },
        classes,
        { label: 'Asignación' }
      );
    }
    return patchClass(classId, {
      instructorId: nextInstructorId,
      status: nextInstructorId ? CLASS_STATUS.SCHEDULED : CLASS_STATUS.PENDING_INSTRUCTOR,
      instructorPay: nextInstructorId
        ? calculateInstructorPayment(schoolConfig, { modality: cls.modality, pax: cls.pax, category: cls.category })
        : 0,
      assignedAtMs: nextInstructorId ? Date.now() : null,
    });
  };

  /** Realizada / No-show (sin pago al instructor) / volver a agendada */
  const setClassStatus = async (classId, status) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) fail('Clase no encontrada.');
    if (![CLASS_STATUS.SCHEDULED, CLASS_STATUS.COMPLETED, CLASS_STATUS.NO_SHOW].includes(status)) {
      fail('Estado no permitido.');
    }
    if (!cls.instructorId) fail('Primero asigna un instructor.');
    if (status !== CLASS_STATUS.NO_SHOW && cls.status === CLASS_STATUS.NO_SHOW) {
      // Volver a ocupar el horario: revisar que siga libre
      const conflicts = getInstructorConflicts(cls.instructorId, cls.startTime, cls.endTime, classes, cls.operationDate, {
        excludeClassId: cls.id,
      });
      if (conflicts.length > 0) {
        fail(`${getInstructorName(cls.instructorId)} ya tiene otra clase en ese horario.`);
      }
    }
    return patchClass(classId, {
      status,
      instructorPay:
        status === CLASS_STATUS.NO_SHOW
          ? 0
          : calculateInstructorPayment(schoolConfig, { modality: cls.modality, pax: cls.pax, category: cls.category }),
    });
  };

  /**
   * Eliminar una clase. Si es la sesión #1 de un pack (la que tiene el pago),
   * se elimina el pack completo para no dejar sesiones "pagadas" sin ingreso.
   * Devuelve los ids eliminados.
   */
  const getClassesToRemove = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return [];
    if (cls.courseGroupId && !cls.isPaidInPack) {
      return classes.filter((c) => c.courseGroupId === cls.courseGroupId).map((c) => c.id);
    }
    return [cls.id];
  };

  const removeClass = async (classId) => {
    const ids = getClassesToRemove(classId);
    if (ids.length === 0) return [];
    if (isLive) {
      const res = await supabase.from('surf_classes').delete().in('id', ids).eq('school_id', schoolId);
      check(res, 'No se pudo eliminar la clase.');
      setData((prev) => ({ ...prev, classes: prev.classes.filter((c) => !ids.includes(c.id)) }));
      return ids;
    }
    commitDemo((prev) => ({ ...prev, classes: prev.classes.filter((c) => !ids.includes(c.id)) }));
    return ids;
  };

  // ------------------------------------------------------------------
  // Módulo 05 · Arriendos
  // ------------------------------------------------------------------
  const addRental = async (form) => {
    const rate = rentalRates.find((r) => r.id === form.itemId && r.enabled);
    if (!rate) fail('Selecciona un equipo habilitado.');
    if (!form.customerName?.trim() || !form.customerPhone?.trim()) {
      fail('Completa el nombre y teléfono del cliente.');
    }
    if (!form.photoDataUrl) fail('Debes adjuntar la foto del carnet de identidad.');

    const checkInTime = form.checkInTime || nowHHMM;
    if (timeToMinutes(checkInTime) < timeToMinutes(schoolConfig.openTime)) {
      fail(`La escuela abre a las ${schoolConfig.openTime}.`);
    }
    const maxHours = getMaxRentalHours(checkInTime, schoolConfig.closeTime);
    const hours = Math.max(1, Number(form.hours) || 1);
    if (maxHours < 1) fail(`No quedan horas de arriendo antes del cierre (${schoolConfig.closeTime}).`);
    if (hours > maxHours) {
      fail(`Desde las ${checkInTime} se puede arrendar hasta ${maxHours} h (cierre ${schoolConfig.closeTime}).`);
    }
    const quantity = Math.min(50, Math.max(1, Number(form.quantity) || 1));
    const totals = calculateRentalTotals(rate.pricePerHour, quantity, hours, form.discount);
    const estimatedReturnTime = addMinutesToTime(checkInTime, hours * 60);
    const id = newId();

    const record = {
      id,
      operationDate: todayIso,
      itemId: rate.id,
      itemLabel: rate.label,
      unitPricePerHour: Number(rate.pricePerHour) || 0,
      quantity,
      hours,
      checkInTime,
      estimatedReturnTime,
      returnedAt: null,
      paymentMethod: form.paymentMethod || 'Efectivo',
      ...totals,
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail?.trim() || '',
      customerPhone: form.customerPhone.trim(),
      emergencyContact: form.emergencyContact?.trim() || '',
      idPhotoStoragePath: null,
      idPhotoDataUrl: null,
      status: 'active',
    };

    if (isLive) {
      let storagePath;
      try {
        storagePath = await uploadIdCardPhoto(schoolId, id, form.photoDataUrl);
      } catch (err) {
        fail(friendlyDbError(err, 'No se pudo subir la foto del carnet.'));
      }
      const checkInAt = localDateTimeToDate(todayIso, checkInTime, timezone);
      const estimatedReturnAt = new Date(checkInAt.getTime() + hours * 3600 * 1000);
      const res = await supabase
        .from('equipment_rentals')
        .insert(
          rentalToRow({ ...record, idPhotoStoragePath: storagePath }, schoolId, {
            rentalRateId: rate.uuid,
            checkInAtIso: checkInAt.toISOString(),
            estimatedReturnAtIso: estimatedReturnAt.toISOString(),
          })
        )
        .select('*')
        .single();
      if (res.error) {
        // No dejar fotos huérfanas si el arriendo no se guardó
        await supabase.storage.from(ID_CARDS_BUCKET).remove([storagePath]).catch(() => {});
      }
      const saved = rentalFromRow(check(res, 'No se pudo registrar el arriendo.'));
      setData((prev) => ({ ...prev, rentals: [saved, ...prev.rentals] }));
      return saved;
    }

    const demoRecord = { ...record, idPhotoDataUrl: form.photoDataUrl };
    commitDemo((prev) => ({ ...prev, rentals: [demoRecord, ...prev.rentals] }));
    return demoRecord;
  };

  const completeRental = async (rentalId) => {
    const now = new Date();
    const returnedAt = getNowHHMM(timezone, now);
    if (isLive) {
      const res = await supabase
        .from('equipment_rentals')
        .update({ status: 'completed', returned_time: returnedAt, returned_at: now.toISOString() })
        .eq('id', rentalId)
        .eq('school_id', schoolId)
        .select('*')
        .single();
      const saved = rentalFromRow(check(res, 'No se pudo registrar la devolución.'));
      setData((prev) => ({ ...prev, rentals: prev.rentals.map((r) => (r.id === rentalId ? saved : r)) }));
      return saved;
    }
    commitDemo((prev) => ({
      ...prev,
      rentals: prev.rentals.map((r) =>
        r.id === rentalId ? { ...r, status: 'completed', returnedAt, returnedOn: todayIso } : r
      ),
    }));
    return null;
  };

  /** URL para ver el carnet: firmada (60 s) en modo real, data URL en demo */
  const getIdPhotoUrl = async (rental) => {
    if (!rental || rental.idPhotoPurged) return null;
    if (!isLive) return rental.idPhotoDataUrl || null;
    if (!rental.idPhotoStoragePath) return null;
    return getSignedIdCardUrl(rental.idPhotoStoragePath, 60);
  };

  // ------------------------------------------------------------------
  // Módulo 01 · Administración (PIN validado en servidor en modo real)
  // ------------------------------------------------------------------
  const verifyAdminPin = async (pin) => {
    if (!isLive) return pin === DEMO_ADMIN_PIN;
    const res = await supabase.rpc('verify_admin_pin', { p_pin: pin });
    if (res.error) fail(friendlyDbError(res.error, 'No se pudo validar el PIN.'));
    return res.data === true;
  };

  const saveAdminSettings = async ({ pin, config, rates, branding }) => {
    if (isLive) {
      const res = await supabase.rpc('admin_save_settings', {
        p_pin: pin,
        p_config: config ? configToRpc(config) : null,
        p_rates: rates ? rates.map(rateToRpc) : null,
        p_branding: branding
          ? {
              display_name: branding.displayName,
              monogram: branding.monogram,
              tagline: branding.tagline,
              theme_palette: branding.themePalette,
            }
          : null,
      });
      const pinError = check(res, 'No se pudo guardar la configuración.');
      if (pinError) fail(pinError);
      await hydrateLive(schoolId);
      return;
    }
    // Demo
    commitDemo((prev) => ({
      ...prev,
      schoolConfig: config ? { ...prev.schoolConfig, ...config } : prev.schoolConfig,
      rentalRates: rates || prev.rentalRates,
    }));
    if (branding) {
      setSchoolBranding((prev) => normalizeSchoolBranding({ ...prev, ...branding }));
    }
  };

  const changeAdminPin = async (currentPin, newPin) => {
    if (!isLive) fail('En modo demo el PIN es siempre 0000.');
    const res = await supabase.rpc('admin_change_pin', { p_current_pin: currentPin, p_new_pin: newPin });
    const pinError = check(res, 'No se pudo cambiar el PIN.');
    if (pinError) fail(pinError);
  };

  // Mantener la caché de branding de la escuela real al día
  useEffect(() => {
    if (isLive && schoolBranding?.schoolId) cacheSchoolBranding(schoolBranding);
  }, [isLive, schoolBranding]);

  // ------------------------------------------------------------------
  // Módulo 04 · Cierre por rango (semana)
  // ------------------------------------------------------------------
  const fetchClosingRange = async (from, to) => {
    if (isLive) {
      const res = await supabase.rpc('get_closing_range', { p_from: from, p_to: to });
      const rows = check(res, 'No se pudo cargar el resumen semanal.') || [];
      return rows.map((r) => ({
        operationDate: r.operation_date,
        totalClasses: Number(r.total_classes) || 0,
        classesRevenue: Number(r.classes_revenue) || 0,
        payroll: Number(r.instructor_payroll) || 0,
        totalRentals: Number(r.total_rentals) || 0,
        rentalsRevenue: Number(r.rentals_revenue) || 0,
        combinedRevenue: Number(r.combined_revenue) || 0,
        combinedNetProfit: Number(r.combined_net_profit) || 0,
      }));
    }
    return listIsoDates(from, to).map((d) => {
      const s = summarizeClosing(dataRef.current.classes, dataRef.current.rentals, d);
      return {
        operationDate: d,
        totalClasses: s.totalClasses,
        classesRevenue: s.classesRevenue,
        payroll: s.payroll,
        totalRentals: s.totalRentals,
        rentalsRevenue: s.rentalsRevenue,
        combinedRevenue: s.combinedRevenue,
        combinedNetProfit: s.combinedNetProfit,
      };
    });
  };

  // ------------------------------------------------------------------
  // Utilidades solo-demo
  // ------------------------------------------------------------------
  const restoreDemoData = () => {
    if (isLive) return;
    clearDemoState();
    const seed = buildDemoSeed(todayIso, timezone);
    demoMetaRef.current = { attendanceDate: todayIso };
    commitDemo(() => ({
      schoolConfig: seed.schoolConfig,
      rentalRates: seed.rentalRates,
      instructors: seed.instructors,
      instructorNames: Object.fromEntries(seed.instructors.map((i) => [i.id, i.name])),
      classes: seed.classes,
      rentals: seed.rentals,
    }));
  };

  const resetDemoDay = () => {
    if (isLive) return;
    commitDemo((prev) => ({
      ...prev,
      instructors: prev.instructors.map((i) => ({ ...i, checkedIn: false, checkInTime: null, checkInTimestamp: null })),
      classes: prev.classes.filter((c) => c.operationDate !== todayIso),
      rentals: prev.rentals.filter((r) => r.operationDate !== todayIso),
    }));
  };

  const value = {
    // sesión
    mode,
    isDemoSession: mode === 'demo',
    isLive,
    session,
    authLoading: mode === 'loading',
    loadError,
    enterDemoSession,
    signOutSchool,
    reload: () => (isLive ? hydrateLive(schoolId) : Promise.resolve()),
    // escuela
    schoolBranding,
    timezone,
    todayIso,
    nowHHMM,
    schoolConfig,
    rentalRates,
    // instructores
    instructors,
    getInstructorName,
    virtualQueue,
    checkInInstructor,
    checkOutInstructor,
    getSuggestedInstructorForSlot,
    // clases
    classes,
    todayClasses,
    addSingleClass,
    addCoursePack,
    addSessionToPack,
    assignInstructorToClass,
    setClassStatus,
    getClassesToRemove,
    removeClass,
    // arriendos
    rentals,
    todayRentals,
    activeRentals,
    completedRentalsToday,
    rentalsTodayRevenue,
    addRental,
    completeRental,
    getIdPhotoUrl,
    // admin
    verifyAdminPin,
    saveAdminSettings,
    changeAdminPin,
    // cierre
    fetchClosingRange,
    // ambiente
    sunsetTime: sunsetInfo.sunset,
    sunsetIsFallback: sunsetInfo.isFallback,
    setSunsetInfo,
    // demo
    restoreDemoData,
    resetDemoDay,
  };

  return <SurfSchoolContext.Provider value={value}>{children}</SurfSchoolContext.Provider>;
}

/** Solo las columnas que cambian en un update parcial de surf_classes */
function classToRowPatch(patch) {
  const map = {
    instructorId: 'instructor_id',
    status: 'status',
    instructorPay: 'instructor_pay',
    assignedAtMs: 'assigned_at',
  };
  const out = {};
  Object.entries(patch).forEach(([k, v]) => {
    if (!map[k]) return;
    out[map[k]] = k === 'assignedAtMs' ? (v ? new Date(v).toISOString() : null) : v;
  });
  return out;
}

export function useSurfSchool() {
  const context = useContext(SurfSchoolContext);
  if (!context) {
    throw new Error('useSurfSchool debe usarse dentro de un SurfSchoolProvider');
  }
  return context;
}
