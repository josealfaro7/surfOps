import React, { useState, useEffect } from 'react';
import { Check, RotateCcw, Lock, Unlock, AlertCircle, Shield, Palette } from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import { SCHOOL_THEME_PRESETS, DEFAULT_POISSON_BRANDING } from '../lib/supabaseClient';
import { DEFAULT_SCHOOL_CONFIG, DEFAULT_RENTAL_RATES } from '../lib/mappers';
import { formatCurrency, timeToMinutes } from '../utils/calculations';

export default function Module1Config() {
  const {
    isLive,
    isDemoSession,
    schoolBranding,
    schoolConfig,
    rentalRates,
    verifyAdminPin,
    saveAdminSettings,
    changeAdminPin,
  } = useSurfSchool();
  // El PIN validado se mantiene solo en memoria mientras el panel está desbloqueado:
  // el servidor lo vuelve a exigir en cada guardado.
  const [unlockedPin, setUnlockedPin] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  const [brandingForm, setBrandingForm] = useState(() => ({
    schoolId: schoolBranding?.schoolId || DEFAULT_POISSON_BRANDING.schoolId,
    displayName: schoolBranding?.displayName || DEFAULT_POISSON_BRANDING.displayName,
    monogram: schoolBranding?.monogram || DEFAULT_POISSON_BRANDING.monogram,
    tagline: schoolBranding?.tagline || DEFAULT_POISSON_BRANDING.tagline,
    themeId: schoolBranding?.themeId || 'poisson_default',
    themePalette:
      schoolBranding?.themePalette || DEFAULT_POISSON_BRANDING.themePalette,
  }));
  const [formData, setFormData] = useState(schoolConfig);
  const [rentalRatesForm, setRentalRatesForm] = useState(rentalRates);
  const [saved, setSaved] = useState(false);

  // Estado de bloqueo por PIN (0000)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    if (schoolBranding) {
      setBrandingForm({
        schoolId: schoolBranding.schoolId || DEFAULT_POISSON_BRANDING.schoolId,
        displayName:
          schoolBranding.displayName || DEFAULT_POISSON_BRANDING.displayName,
        monogram: schoolBranding.monogram || DEFAULT_POISSON_BRANDING.monogram,
        tagline: schoolBranding.tagline || DEFAULT_POISSON_BRANDING.tagline,
        themeId: schoolBranding.themeId || 'poisson_default',
        themePalette:
          schoolBranding.themePalette || DEFAULT_POISSON_BRANDING.themePalette,
      });
    }
  }, [schoolBranding]);

  useEffect(() => {
    setFormData(schoolConfig);
  }, [schoolConfig]);

  useEffect(() => {
    setRentalRatesForm(rentalRates);
  }, [rentalRates]);

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    const pin = pinInput.trim();
    setPinInput('');
    try {
      const ok = await verifyAdminPin(pin);
      if (ok) {
        setUnlockedPin(pin);
        setIsUnlocked(true);
        setPinError(false);
      } else {
        setPinError(true);
      }
    } catch (err) {
      setPinError(true);
      setSaveError(err.message);
    }
  };

  const handleLockPanel = () => {
    setIsUnlocked(false);
    setUnlockedPin('');
    setPinInput('');
    setPinError(false);
  };

  const toSafeNumber = (rawValue) => {
    const n = Number(rawValue);
    return rawValue === '' || !Number.isFinite(n) ? 0 : Math.max(0, n);
  };

  const handleTimeChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleNumberChange = (field, rawValue) => {
    const num = toSafeNumber(rawValue);
    setFormData((prev) => ({ ...prev, [field]: num }));
    setSaved(false);
  };

  const handleRentalRatePriceChange = (itemId, rawValue) => {
    const num = toSafeNumber(rawValue);
    setRentalRatesForm((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, pricePerHour: num } : item
      )
    );
    setSaved(false);
  };

  const handleRentalRateToggle = (itemId) => {
    setRentalRatesForm((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, enabled: !item.enabled } : item
      )
    );
    setSaved(false);
  };

  const handleThemeSelect = (preset) => {
    setBrandingForm((prev) => ({
      ...prev,
      themeId: preset.id,
      themePalette: preset.palette,
    }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaved(false);
    if (timeToMinutes(formData.closeTime) <= timeToMinutes(formData.openTime)) {
      setSaveError('La hora de cierre debe ser posterior a la de apertura.');
      return;
    }
    setIsBusy(true);
    try {
      await saveAdminSettings({
        pin: unlockedPin,
        config: formData,
        rates: rentalRatesForm,
        branding: brandingForm,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  /** Restaura SOLO precios, nómina, horario y arriendos (no toca el nombre ni la paleta) */
  const handleReset = () => {
    const ok = window.confirm(
      '¿Cargar los valores base de precios, nómina, horario y arriendos en el formulario? No se guarda hasta que presiones "Guardar Configuración".'
    );
    if (!ok) return;
    setFormData({ ...DEFAULT_SCHOOL_CONFIG });
    setRentalRatesForm(DEFAULT_RENTAL_RATES.map((r) => ({ ...r })));
    setSaved(false);
  };

  const handleChangePin = async () => {
    setPinMessage('');
    try {
      await changeAdminPin(unlockedPin, newPin.trim());
      setUnlockedPin(newPin.trim());
      setNewPin('');
      setPinMessage('PIN actualizado.');
    } catch (err) {
      setPinMessage(err.message);
    }
  };

  // Pantalla de bloqueo por PIN si aún no se ha desbloqueado
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12">
        <div className="bg-white border border-slate-200 border-t-4 border-t-blue-950 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Seguridad Corporativa
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Acceso a Configuración
              </h2>
            </div>
            <Lock className="w-5 h-5 text-sky-600 shrink-0" />
          </div>

          <form onSubmit={handleUnlockSubmit} className="pt-6 space-y-5">
            <div>
              <p className="text-sm font-light text-slate-600 leading-relaxed">
                Este módulo modifica los precios de venta en recepción, liquidación a instructores y tarifas de arriendo. Ingresa el PIN maestro.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-pin-input"
                className="block text-xs font-bold uppercase tracking-widest text-sky-700"
              >
                PIN de Seguridad{isDemoSession ? ' (demo: 0000)' : ''}
              </label>
              <input
                id="admin-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={8}
                autoFocus
                required
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (pinError) setPinError(false);
                  if (saveError) setSaveError('');
                }}
                className="w-full h-14 px-4 border border-slate-200 bg-slate-50 text-center text-2xl font-mono font-bold tracking-[0.5em] text-blue-950 focus:bg-white focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
              />
            </div>

            {pinError && (
              <div className="p-3 border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{saveError || 'PIN incorrecto. Tras 5 intentos fallidos se bloquea 15 minutos.'}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-blue-950 hover:bg-sky-700 text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-sky-400" />
              Desbloquear Configuración
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderField = (label, description, field) => (
    <div className="py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50/50 transition">
      <div className="space-y-0.5 max-w-xl">
        <label htmlFor={field} className="block text-sm font-semibold text-blue-950">
          {label}
        </label>
        <p className="text-sm font-light text-slate-600 leading-relaxed">{description}</p>
      </div>

      <div className="relative w-full md:w-64 shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-medium text-slate-400 select-none">
          $
        </span>
        <input
          id={field}
          type="number"
          min="0"
          step="500"
          value={formData[field]}
          onChange={(e) => handleNumberChange(field, e.target.value)}
          className="w-full h-11 pl-8 pr-24 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
        />
        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-medium text-sky-700 tabular-nums pointer-events-none">
          {formatCurrency(formData[field])}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-inter">
      {/* Cabecera de Módulo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
            Módulo 01 · Parámetros Financieros & Equipamiento
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
            Configuración de Precios y Tarifas
          </h1>
          <p className="text-sm font-light text-slate-600 leading-relaxed mt-1">
            Define los valores de cobro en recepción, las tarifas de liquidación para los instructores y el tarifario por hora de arriendos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 h-9 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
            Valores Base
          </button>

          <button
            type="button"
            onClick={handleLockPanel}
            className="inline-flex items-center gap-2 h-9 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm"
            title="Bloquear panel con PIN"
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            Bloquear
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Bloque Identidad de la Escuela y Tema Visual */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-sky-600" />
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                  Branding & Apariencia
                </span>
                <h2 className="text-lg font-bold tracking-tight text-blue-950">
                  Identidad Corporativa y Paleta
                </h2>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">
              public.schools
            </span>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label
                htmlFor="school-id-readonly"
                className="block text-xs font-bold uppercase tracking-widest text-sky-700"
              >
                School ID (UUID · Solo Lectura)
              </label>
              <input
                id="school-id-readonly"
                type="text"
                readOnly
                value={brandingForm.schoolId || 'Demo (sin base de datos)'}
                className="w-full h-11 px-4 border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-600 cursor-not-allowed outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label
                  htmlFor="school-display-name"
                  className="block text-xs font-bold uppercase tracking-widest text-sky-700"
                >
                  Nombre de la Escuela
                </label>
                <input
                  id="school-display-name"
                  type="text"
                  maxLength={36}
                  value={brandingForm.displayName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBrandingForm((prev) => ({
                      ...prev,
                      displayName: val,
                      monogram:
                        val.trim().slice(0, 1).toUpperCase() || prev.monogram,
                    }));
                    setSaved(false);
                  }}
                  placeholder="Ej. POISSON"
                  className="w-full h-11 px-4 border border-slate-200 bg-white text-sm font-semibold uppercase text-slate-800 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="school-monogram"
                  className="block text-xs font-bold uppercase tracking-widest text-sky-700"
                >
                  Monograma (1-3 Letras)
                </label>
                <input
                  id="school-monogram"
                  type="text"
                  maxLength={3}
                  value={brandingForm.monogram}
                  onChange={(e) => {
                    setBrandingForm((prev) => ({
                      ...prev,
                      monogram: e.target.value.toUpperCase(),
                    }));
                    setSaved(false);
                  }}
                  placeholder="P"
                  className="w-full h-11 px-4 border border-slate-200 bg-white text-center text-sm font-bold uppercase text-slate-800 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
                />
              </div>
            </div>

            {/* Selector de Temas */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                  Paleta de Marca
                </span>
                <span className="text-xs text-slate-500">
                  Selecciona uno de los presets de color
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(SCHOOL_THEME_PRESETS).map((preset) => {
                  const isSelected =
                    brandingForm.themeId === preset.id ||
                    brandingForm.themePalette?.primary ===
                      preset.palette.primary;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleThemeSelect(preset)}
                      className={`p-3.5 border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-950 bg-slate-50 shadow-sm ring-1 ring-blue-950'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                          {preset.name}
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          {preset.palette.primary} · {preset.palette.secondary}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="w-5 h-5 border border-slate-300 inline-block shadow-sm"
                          style={{ backgroundColor: preset.palette.primary }}
                        />
                        <span
                          className="w-5 h-5 border border-slate-300 inline-block shadow-sm"
                          style={{ backgroundColor: preset.palette.secondary }}
                        />
                        <span
                          className="w-5 h-5 border border-slate-300 inline-block shadow-sm"
                          style={{ backgroundColor: preset.palette.accent }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Bloque 0: Horario de atención */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Operación
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Horario de Atención y Duración de Clase
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">school_configs</span>
          </div>
          <p className="text-sm font-light text-slate-600 py-2">
            No se pueden agendar clases ni despachar arriendos que terminen fuera de este horario.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <label className="space-y-1.5 text-xs font-medium text-slate-600">
              Apertura
              <input
                type="time"
                value={formData.openTime || '09:00'}
                onChange={(e) => handleTimeChange('openTime', e.target.value)}
                className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950 outline-none"
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-slate-600">
              Cierre
              <input
                type="time"
                value={formData.closeTime || '20:00'}
                onChange={(e) => handleTimeChange('closeTime', e.target.value)}
                className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950 outline-none"
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-slate-600">
              Duración de clase (minutos)
              <input
                type="number"
                min="15"
                max="300"
                step="5"
                value={formData.classDurationMinutes ?? 75}
                onChange={(e) =>
                  handleTimeChange('classDurationMinutes', Math.min(300, Math.max(15, toSafeNumber(e.target.value) || 75)))
                }
                className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950 outline-none"
              />
            </label>
          </div>
        </section>

        {/* Bloque A: Precios de Venta */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Sección A · Ingresos Caja
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Precios de Venta al Alumno
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">SchoolConfig.Sales</span>
          </div>

          <div className="divide-y divide-slate-100">
            {renderField(
              'Precio Clase Individual (1 pax)',
              'Tarifa estándar por una sesión individual única.',
              'priceIndividual'
            )}
            {renderField(
              'Precio Clase Grupal (Base 2 pax)',
              'Tarifa base para un grupo de 2 personas.',
              'priceGroupBase'
            )}
            {renderField(
              'Adicional por alumno extra en grupo',
              'Monto que se suma por cada integrante extra sobre 2 personas.',
              'priceGroupExtraPax'
            )}
            {renderField(
              'Precio Curso Completo (Pack 8 clases)',
              'Valor comercial del programa formativo completo de 8 sesiones.',
              'priceCoursePack8'
            )}
          </div>
        </section>

        {/* Bloque B: Tarifas de Instructor */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Sección B · Nómina Staff
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Tarifas de Liquidación a Instructores
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">SchoolConfig.Rates</span>
          </div>

          <div className="divide-y divide-slate-100">
            {renderField(
              'Pago por Clase Individual',
              'Honorario del instructor por dictar 1 clase individual.',
              'payIndividual'
            )}
            {renderField(
              'Pago por Clase Grupal (Base 2 pax)',
              'Honorario base del instructor por una clase grupal de 2 alumnos.',
              'payGroupBase'
            )}
            {renderField(
              'Bono por alumno extra sobre 2 pax',
              'Adicional pagado al instructor por cada alumno extra en el grupo.',
              'payGroupExtraPax'
            )}
            {renderField(
              'Pago por 1 clase de Curso',
              'Honorario del instructor por cada sesión perteneciente a un Curso (Pack 8).',
              'payCourseSingleClass'
            )}
          </div>
        </section>

        {/* Bloque C: Tarifas de Arriendo (Equipamiento) */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-600" />
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                  Sección C · Equipamiento
                </span>
                <h2 className="text-lg font-bold tracking-tight text-blue-950">
                  Tarifas de Arriendo por Hora
                </h2>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">rental_rates</span>
          </div>

          <div className="divide-y divide-slate-100">
            {rentalRatesForm.map((item) => (
              <div
                key={item.id}
                className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                  item.enabled ? 'bg-white' : 'opacity-70 bg-slate-50'
                }`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-blue-950">
                      {item.label}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 border border-slate-200 text-slate-600">
                      {item.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        item.enabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {item.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                  <p className="text-sm font-light text-slate-600 leading-relaxed">
                    Precio base cobrado por cada hora de arriendo en el Módulo 05.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  <label
                    htmlFor={`toggle-${item.id}`}
                    className="inline-flex items-center gap-2.5 cursor-pointer select-none px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                  >
                    <input
                      id={`toggle-${item.id}`}
                      type="checkbox"
                      checked={Boolean(item.enabled)}
                      onChange={() => handleRentalRateToggle(item.id)}
                      className="w-4 h-4 accent-blue-950 cursor-pointer"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      {item.enabled ? 'Activo' : 'Pausado'}
                    </span>
                  </label>

                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-medium text-slate-400 select-none">
                      $
                    </span>
                    <input
                      id={`rental-price-${item.id}`}
                      type="number"
                      min="0"
                      step="500"
                      disabled={!item.enabled}
                      value={item.pricePerHour}
                      onChange={(e) =>
                        handleRentalRatePriceChange(item.id, e.target.value)
                      }
                      aria-label={`Precio por Hora para ${item.label}`}
                      className={`w-full h-11 pl-8 pr-28 border border-slate-200 text-sm font-medium tabular-nums outline-none transition ${
                        item.enabled
                          ? 'bg-white text-slate-800 focus:border-blue-950 focus:ring-1 focus:ring-blue-950'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-medium text-sky-700 tabular-nums pointer-events-none">
                      {formatCurrency(item.pricePerHour)} / hr
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cambio de PIN (solo modo real) */}
        {isLive && (
          <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-blue-950">Cambiar PIN de Administrador</h2>
            <p className="text-sm font-light text-slate-600">
              El PIN se valida en el servidor. Tras 5 intentos fallidos se bloquea 15 minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="Nuevo PIN (4 a 8 dígitos)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="h-11 px-3 border border-slate-200 bg-white text-sm font-mono tracking-widest focus:border-blue-950 outline-none"
              />
              <button
                type="button"
                onClick={handleChangePin}
                disabled={newPin.length < 4}
                className="h-11 px-5 bg-white border border-slate-300 text-xs font-semibold uppercase tracking-wider text-blue-950 disabled:opacity-50 cursor-pointer"
              >
                Cambiar PIN
              </button>
            </div>
            {pinMessage && <p className="text-sm text-slate-700">{pinMessage}</p>}
          </section>
        )}

        {/* Barra de acción */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-4">
          {saveError && (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-rose-800 bg-rose-50 px-4 py-2 border border-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              {saveError}
            </span>
          )}
          {saved && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-950 bg-emerald-50 px-4 py-2 border border-emerald-300 border-l-4 border-l-emerald-600 shadow-sm">
              <Check className="w-4 h-4 text-emerald-600" />
              Parámetros y tarifas guardados con éxito
            </span>
          )}
          <button
            type="submit"
            disabled={isBusy}
            className="w-full sm:w-auto h-11 px-8 bg-blue-950 hover:bg-sky-700 text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {isBusy ? 'Guardando…' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
