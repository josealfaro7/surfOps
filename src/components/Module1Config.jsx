import React, { useState, useEffect } from 'react';
import { Check, RotateCcw, Lock, Unlock, AlertCircle, Shield, Palette } from 'lucide-react';
import {
  useSurfSchool,
  INITIAL_SCHOOL_CONFIG,
  INITIAL_RENTAL_RATES,
} from '../context/SurfSchoolContext';
import {
  SCHOOL_THEME_PRESETS,
  DEFAULT_POISSON_BRANDING,
} from '../lib/supabaseClient';
import { formatCurrency } from '../utils/calculations';

const ADMIN_PIN = '0000';

export default function Module1Config() {
  const {
    schoolBranding,
    updateSchoolBranding,
    schoolConfig,
    updateSchoolConfig,
    rentalRates,
    updateRentalRates,
  } = useSurfSchool();

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

  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setIsUnlocked(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleLockPanel = () => {
    setIsUnlocked(false);
    setPinInput('');
    setPinError(false);
  };

  const handleNumberChange = (field, rawValue) => {
    const num = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
    setFormData((prev) => ({ ...prev, [field]: num }));
    setSaved(false);
  };

  const handleRentalRatePriceChange = (itemId, rawValue) => {
    const num = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
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
      themePalette: { ...preset.palette },
    }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanedName =
      brandingForm.displayName?.trim() || DEFAULT_POISSON_BRANDING.displayName;
    const cleanedMonogram = (
      brandingForm.monogram?.trim() ||
      cleanedName.slice(0, 1) ||
      'P'
    )
      .slice(0, 2)
      .toUpperCase();

    try {
      await updateSchoolBranding({
        schoolId: brandingForm.schoolId,
        displayName: cleanedName,
        monogram: cleanedMonogram,
        tagline:
          brandingForm.tagline?.trim() || DEFAULT_POISSON_BRANDING.tagline,
        themeId: brandingForm.themeId,
        themePalette: brandingForm.themePalette,
      });
    } catch {
      // Mantiene la actualización en caché local y estado global si Supabase retorna error de RLS en modo demo
    }

    await updateSchoolConfig(formData);
    await updateRentalRates(rentalRatesForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = async () => {
    setBrandingForm({
      schoolId: schoolBranding?.schoolId || DEFAULT_POISSON_BRANDING.schoolId,
      displayName: DEFAULT_POISSON_BRANDING.displayName,
      monogram: DEFAULT_POISSON_BRANDING.monogram,
      tagline: DEFAULT_POISSON_BRANDING.tagline,
      themeId: 'poisson_default',
      themePalette: { ...DEFAULT_POISSON_BRANDING.themePalette },
    });
    setFormData(INITIAL_SCHOOL_CONFIG);
    setRentalRatesForm(INITIAL_RENTAL_RATES);
    try {
      await updateSchoolBranding({
        ...DEFAULT_POISSON_BRANDING,
        schoolId: schoolBranding?.schoolId || DEFAULT_POISSON_BRANDING.schoolId,
      });
    } catch {
      // Ignorar error de red en reset demo
    }
    await updateSchoolConfig(INITIAL_SCHOOL_CONFIG);
    await updateRentalRates(INITIAL_RENTAL_RATES);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Pantalla de bloqueo por PIN si aún no se ha desbloqueado
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12">
        <div className="border border-slate-300 bg-white rounded-none">
          <div className="px-6 py-4 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-pink-500 inline-block" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">
                Acceso Restringido · Configuración
              </h2>
            </div>
            <Lock className="w-4 h-4 text-sky-400" />
          </div>

          <form onSubmit={handleUnlockSubmit} className="p-6 space-y-5">
            <div>
              <h1 className="text-lg font-bold text-blue-950">
                Ingresa el PIN de Administrador
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Este módulo modifica los precios de venta, las tarifas de pago al staff y los valores de arriendo de equipamiento.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="admin-pin-input"
                className="block text-xs font-semibold uppercase tracking-wider text-blue-950"
              >
                PIN de Seguridad (4 dígitos)
              </label>
              <input
                id="admin-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                required
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (pinError) setPinError(false);
                }}
                className="w-full h-14 px-4 rounded-sm border border-slate-300 bg-slate-50 text-center text-2xl font-mono font-bold tracking-[0.5em] text-blue-950 focus:bg-white focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
              />
            </div>

            {pinError && (
              <div className="p-3 border border-pink-600 bg-pink-50 text-xs font-semibold text-pink-700 flex items-center gap-2 rounded-none">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>PIN incorrecto. Inténtalo nuevamente.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 px-6 rounded-none bg-blue-950 hover:bg-blue-900 border-b-2 border-pink-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
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
    <div className="py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 last:border-b-0 bg-white">
      <div className="space-y-0.5 max-w-xl">
        <label htmlFor={field} className="block text-base font-semibold text-blue-950">
          {label}
        </label>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="relative w-full md:w-64 shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-slate-400 select-none">
          $
        </span>
        <input
          id={field}
          type="number"
          min="0"
          step="500"
          value={formData[field]}
          onChange={(e) => handleNumberChange(field, e.target.value)}
          className="w-full h-12 pl-8 pr-24 rounded-sm border border-slate-300 bg-white text-base font-semibold text-blue-950 tabular-nums focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
        />
        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-medium text-sky-600 font-mono pointer-events-none">
          {formatCurrency(formData[field])}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabecera de Módulo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-300">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-600">
            <span className="w-2 h-2 bg-pink-600 inline-block" />
            Módulo 01 · Parámetros Financieros y Equipamiento
          </span>
          <h1 className="text-2xl font-bold text-blue-950 mt-1">
            Configuración de Precios y Tarifas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Define los valores de cobro en recepción, las tarifas de liquidación para los instructores y el tarifario por hora de arriendos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-sm border border-slate-300 bg-white hover:bg-sky-50 text-blue-950 text-sm font-medium transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-sky-600" />
            Restaurar Valores Base
          </button>

          <button
            type="button"
            onClick={handleLockPanel}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-sm border border-slate-300 bg-white hover:bg-pink-50 text-slate-700 hover:text-pink-600 text-sm font-medium transition cursor-pointer"
            title="Bloquear panel con PIN"
          >
            <Lock className="w-4 h-4 text-pink-600" />
            Bloquear
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Bloque Identidad de la Escuela y Tema Visual */}
        <section className="border border-slate-300 rounded-none bg-white">
          <div className="px-6 py-4 bg-[var(--brand-primary,#172554)] text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-[var(--brand-accent,#db2777)] inline-block" />
              <Palette className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                Identidad de la Escuela y Tema Visual
              </h2>
            </div>
            <span className="text-xs font-mono text-sky-300">
              public.schools · surfops_school_branding
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* School ID (Solo lectura) */}
            <div className="space-y-1.5">
              <label
                htmlFor="school-id-readonly"
                className="block text-xs font-semibold uppercase tracking-wider text-blue-950"
              >
                School ID (UUID · Solo Lectura)
              </label>
              <input
                id="school-id-readonly"
                type="text"
                readOnly
                value={brandingForm.schoolId}
                className="w-full h-11 px-4 rounded-sm border border-slate-300 bg-slate-100 text-xs font-mono font-semibold text-slate-600 cursor-not-allowed outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nombre de la Escuela (displayName) */}
              <div className="md:col-span-2 space-y-1.5">
                <label
                  htmlFor="school-display-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-blue-950"
                >
                  Nombre de la Escuela (displayName)
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
                  className="w-full h-12 px-4 rounded-sm border border-slate-300 bg-white text-base font-bold uppercase text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
                />
              </div>

              {/* Inicial / Monograma (monogram) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="school-monogram"
                  className="block text-xs font-semibold uppercase tracking-wider text-blue-950"
                >
                  Monograma (monogram)
                </label>
                <input
                  id="school-monogram"
                  type="text"
                  maxLength={2}
                  value={brandingForm.monogram}
                  onChange={(e) => {
                    setBrandingForm((prev) => ({
                      ...prev,
                      monogram: e.target.value.toUpperCase(),
                    }));
                    setSaved(false);
                  }}
                  placeholder="P"
                  className="w-full h-12 px-4 rounded-sm border border-slate-300 bg-white text-center text-base font-bold uppercase text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
                />
              </div>
            </div>

            {/* Selector de las 4 Paletas de SCHOOL_THEME_PRESETS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-950">
                  Selector de Tema Visual (SCHOOL_THEME_PRESETS)
                </span>
                <span className="text-xs text-slate-500">
                  Elige una de las 4 paletas corporativas
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
                      className={`p-3.5 border text-left rounded-none transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-950 bg-sky-50/70 ring-1 ring-blue-950'
                          : 'border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-blue-950">
                          {preset.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {preset.palette.primary} · {preset.palette.secondary} ·{' '}
                          {preset.palette.accent}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className="w-5 h-5 border border-slate-300 inline-block"
                          style={{ backgroundColor: preset.palette.primary }}
                        />
                        <span
                          className="w-5 h-5 border border-slate-300 inline-block"
                          style={{ backgroundColor: preset.palette.secondary }}
                        />
                        <span
                          className="w-5 h-5 border border-slate-300 inline-block"
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

        {/* Bloque A: Precios de Venta */}
        <section className="border border-slate-300 rounded-none bg-white">
          <div className="px-6 py-4 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-sky-400 inline-block" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                A. Precios de Venta al Alumno (Ingresos Caja)
              </h2>
            </div>
            <span className="text-xs font-mono text-sky-300">SchoolConfig.Sales</span>
          </div>

          <div>
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
        <section className="border border-slate-300 rounded-none bg-white">
          <div className="px-6 py-4 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-pink-500 inline-block" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                B. Tarifas de Pago a Instructores (Nómina Staff)
              </h2>
            </div>
            <span className="text-xs font-mono text-pink-300">SchoolConfig.Rates</span>
          </div>

          <div>
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
        <section className="border border-slate-300 rounded-none bg-white">
          <div className="px-6 py-4 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-sky-400 inline-block" />
              <Shield className="w-4 h-4 text-pink-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                C. Tarifas de Arriendo (Equipamiento)
              </h2>
            </div>
            <span className="text-xs font-mono text-sky-300">surfops_rental_rates</span>
          </div>

          <div className="divide-y divide-slate-200">
            {rentalRatesForm.map((item) => (
              <div
                key={item.id}
                className={`py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                  item.enabled ? 'bg-white' : 'bg-slate-50/80'
                }`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-semibold text-blue-950">
                      {item.label}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 border border-slate-300 text-slate-600 rounded-none">
                      {item.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none ${
                        item.enabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-400'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {item.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Precio base cobrado por cada hora de arriendo en el Módulo 05.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  {/* Switch / Checkbox de estado Habilitado / Deshabilitado */}
                  <label
                    htmlFor={`toggle-${item.id}`}
                    className="inline-flex items-center gap-2.5 cursor-pointer select-none px-3 py-2 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-sm"
                  >
                    <input
                      id={`toggle-${item.id}`}
                      type="checkbox"
                      checked={Boolean(item.enabled)}
                      onChange={() => handleRentalRateToggle(item.id)}
                      className="w-4 h-4 accent-pink-600 rounded-none cursor-pointer"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-950">
                      {item.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </label>

                  {/* Input Precio por Hora (CLP) */}
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-slate-400 select-none">
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
                      className={`w-full h-12 pl-8 pr-28 rounded-sm border border-slate-300 text-base font-semibold tabular-nums outline-none transition ${
                        item.enabled
                          ? 'bg-white text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-medium text-sky-600 font-mono pointer-events-none">
                      {formatCurrency(item.pricePerHour)} / hr
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Barra de acción */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-4">
          {saved && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-950 bg-sky-50 px-4 py-2.5 border border-sky-400 border-l-4 border-l-pink-600 rounded-none">
              <Check className="w-4 h-4 text-pink-600" />
              Parámetros y tarifas de arriendo guardados
            </span>
          )}
          <button
            type="submit"
            className="w-full sm:w-auto h-12 px-8 rounded-sm bg-blue-950 hover:bg-blue-900 border-b-2 border-pink-600 text-white text-sm font-semibold uppercase tracking-wider transition cursor-pointer"
          >
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  );
}
