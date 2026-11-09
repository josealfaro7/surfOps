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
import ModuleHeader from './ui/ModuleHeader';
import BauhausArt from './ui/BauhausArt';

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
      <div className="ed-stack py-6 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div>
              <span className="ed-eyebrow">Acceso Restringido · Módulo 01</span>
              <h1 className="ed-display mt-4">
                Configuración <span className="text-signal-blue">protegida.</span>
              </h1>
              <p className="ed-body ed-measure mt-4">
                Este módulo modifica la identidad visual de la escuela, los precios de venta a clientes, las tarifas de nómina del staff y los arriendos. Ingresa el PIN maestro para continuar.
              </p>
            </div>

            <div className="ed-card max-w-md">
              <form onSubmit={handleUnlockSubmit} className="space-y-6">
                <div>
                  <label htmlFor="admin-pin-input" className="ed-label">
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
                    className="ed-input text-center text-heading-xs tracking-[0.4em] ed-num"
                  />
                  <p className="ed-help">PIN predeterminado en demostración: 0000</p>
                </div>

                {pinError && (
                  <div className="ed-notice ed-notice-alert">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>PIN incorrecto. Inténtalo nuevamente.</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="ed-btn ed-btn-block"
                >
                  <Unlock className="w-4 h-4 mr-2 text-signal-blue" />
                  <span>Desbloquear Configuración</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <BauhausArt variant="config" className="w-full max-w-[380px] aspect-square" />
          </div>
        </div>
      </div>
    );
  }

  const renderField = (label, description, field) => (
    <div className="py-6 border-b border-midnight-ink/15 last:border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1 max-w-xl">
        <label htmlFor={field} className="block font-bold text-caption text-midnight-ink">
          {label}
        </label>
        <p className="ed-caption ed-muted">
          {description}
        </p>
      </div>

      <div className="relative w-full md:w-64 shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-caption text-midnight-ink select-none">
          $
        </span>
        <input
          id={field}
          type="number"
          min="0"
          step="500"
          value={formData[field]}
          onChange={(e) => handleNumberChange(field, e.target.value)}
          className="ed-input pl-8 pr-28 text-right ed-num"
        />
        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center font-bold text-caption text-signal-blue ed-num pointer-events-none">
          {formatCurrency(formData[field])}
        </span>
      </div>
    </div>
  );

  return (
    <div className="ed-stack">
      {/* Cabecera de Módulo */}
      <ModuleHeader
        eyebrow="Módulo 01 · Parámetros Financieros y Equipamiento"
        title="Configuración de Precios"
        accent="y Tarifas"
        description="Ajusta la identidad corporativa de la escuela, los precios de venta a clientes, las tarifas de liquidación por clase para instructores y el arriendo de equipos."
        art="config"
        actions={
          <>
            <button
              type="button"
              onClick={handleReset}
              className="ed-btn"
            >
              <RotateCcw className="w-4 h-4 mr-1 text-signal-blue" />
              Restaurar Valores Base
            </button>
            <button
              type="button"
              onClick={handleLockPanel}
              className="ed-btn"
              title="Bloquear panel con PIN"
            >
              <Lock className="w-4 h-4 mr-1 text-signal-blue" />
              Bloquear Panel
            </button>
          </>
        }
      />

      <form onSubmit={handleSave} className="space-y-12">
        {/* Bloque Identidad de la Escuela y Tema Visual */}
        <section className="ed-card space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-midnight-ink">
            <div>
              <span className="ed-eyebrow">Personalización Multitenant</span>
              <h2 className="ed-h2 mt-1 flex items-center gap-2">
                <Palette className="w-6 h-6 text-signal-blue" />
                <span>Identidad de la Escuela y Tema Visual</span>
              </h2>
            </div>
            <span className="ed-tag">public.schools</span>
          </div>

          <div className="space-y-6">
            {/* School ID (Solo lectura) */}
            <div>
              <label
                htmlFor="school-id-readonly"
                className="ed-label"
              >
                School ID (UUID · Solo Lectura)
              </label>
              <input
                id="school-id-readonly"
                type="text"
                readOnly
                value={brandingForm.schoolId}
                className="ed-input opacity-60 cursor-not-allowed ed-num"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nombre de la Escuela (displayName) */}
              <div className="md:col-span-2">
                <label
                  htmlFor="school-display-name"
                  className="ed-label"
                >
                  Nombre Comercial de la Escuela
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
                  className="ed-input font-bold uppercase"
                />
              </div>

              {/* Inicial / Monograma (monogram) */}
              <div>
                <label
                  htmlFor="school-monogram"
                  className="ed-label"
                >
                  Monograma (Glifo)
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
                  className="ed-input text-center font-display font-bold text-subheading uppercase"
                />
              </div>
            </div>

            {/* Selector de las 4 Paletas de SCHOOL_THEME_PRESETS */}
            <div className="space-y-4 pt-4 border-t border-midnight-ink/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="ed-eyebrow">
                  Paleta de Identidad (Glifo y Presets)
                </span>
                <span className="ed-caption ed-muted">
                  Se refleja en el monograma del riel lateral y sincroniza con Supabase
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className={`p-5 border text-left transition cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-2 border-signal-blue bg-cream-paper'
                          : 'border-midnight-ink bg-cream-paper hover:bg-midnight-ink/5'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-caption text-midnight-ink">
                            {preset.name}
                          </span>
                          {isSelected && (
                            <span className="ed-tag ed-tag-blue">
                              Activa
                            </span>
                          )}
                        </div>
                        <div className="ed-caption ed-muted ed-num">
                          {preset.palette.primary} · {preset.palette.secondary}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="w-6 h-6 border border-midnight-ink inline-block"
                          style={{ backgroundColor: preset.palette.primary }}
                        />
                        <span
                          className="w-6 h-6 border border-midnight-ink inline-block"
                          style={{ backgroundColor: preset.palette.secondary }}
                        />
                        <span
                          className="w-6 h-6 border border-midnight-ink inline-block"
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
        <section className="ed-card space-y-6">
          <div className="pb-4 border-b border-midnight-ink">
            <span className="ed-eyebrow">Matriz de Cobro en Caja</span>
            <h2 className="ed-h2 mt-1">
              A. Precios de Venta al Alumno
            </h2>
          </div>

          <div>
            {renderField(
              'Precio Clase Individual (1 pax)',
              'Tarifa estándar por una sesión individual única de 1 alumno.',
              'priceIndividual'
            )}
            {renderField(
              'Precio Clase Grupal (Base 2 pax)',
              'Tarifa base cobrada para una clase de 2 alumnos.',
              'priceGroupBase'
            )}
            {renderField(
              'Adicional por alumno extra en grupo',
              'Monto añadido por cada participante adicional a partir del 3er alumno.',
              'priceGroupExtraPax'
            )}
            {renderField(
              'Precio Curso Completo (Pack 8 clases)',
              'Tarifa del programa de 8 clases (solo cobra en caja la 1ra sesión).',
              'priceCoursePack8'
            )}
          </div>
        </section>

        {/* Bloque B: Tarifas de Instructor */}
        <section className="ed-card space-y-6">
          <div className="pb-4 border-b border-midnight-ink">
            <span className="ed-eyebrow">Nómina y Liquidación de Staff</span>
            <h2 className="ed-h2 mt-1">
              B. Tarifas de Pago a Instructores
            </h2>
          </div>

          <div>
            {renderField(
              'Pago por Clase Individual',
              'Honorario asignado al instructor por impartir 1 clase individual.',
              'payIndividual'
            )}
            {renderField(
              'Pago por Clase Grupal (Base 2 pax)',
              'Honorario base asignado por impartir una clase grupal de 2 alumnos.',
              'payGroupBase'
            )}
            {renderField(
              'Bono por alumno extra sobre 2 pax',
              'Compensación adicional por cada alumno adicional en el grupo.',
              'payGroupExtraPax'
            )}
            {renderField(
              'Pago por 1 clase de Curso',
              'Honorario asignado al instructor por cada sesión impartida de un Curso Pack 8.',
              'payCourseSingleClass'
            )}
          </div>
        </section>

        {/* Bloque C: Tarifas de Arriendo (Equipamiento) */}
        <section className="ed-card space-y-6">
          <div className="pb-4 border-b border-midnight-ink">
            <span className="ed-eyebrow">Equipamiento Operativo</span>
            <h2 className="ed-h2 mt-1 flex items-center gap-2">
              <Shield className="w-6 h-6 text-signal-blue" />
              <span>C. Tarifas de Arriendo por Hora</span>
            </h2>
          </div>

          <div className="divide-y divide-midnight-ink/15">
            {rentalRatesForm.map((item) => (
              <div
                key={item.id}
                className={`py-6 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                  item.enabled ? '' : 'opacity-50'
                }`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-caption text-midnight-ink">
                      {item.label}
                    </span>
                    <span className="ed-tag font-normal">
                      {item.id}
                    </span>
                    <span
                      className={`ed-tag ${
                        item.enabled ? 'ed-tag-blue' : 'ed-muted'
                      }`}
                    >
                      {item.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                  <p className="ed-caption ed-muted">
                    Tarifa aplicada por cada hora de uso en el Módulo 05.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  {/* Checkbox plano para Habilitar/Deshabilitar */}
                  <label
                    htmlFor={`toggle-${item.id}`}
                    className="inline-flex items-center gap-2.5 cursor-pointer select-none px-4 py-3 border border-midnight-ink bg-cream-paper"
                  >
                    <input
                      id={`toggle-${item.id}`}
                      type="checkbox"
                      checked={Boolean(item.enabled)}
                      onChange={() => handleRentalRateToggle(item.id)}
                      className="w-4 h-4 accent-midnight-ink cursor-pointer"
                    />
                    <span className="font-bold text-caption text-midnight-ink">
                      {item.enabled ? 'En Servicio' : 'Pausado'}
                    </span>
                  </label>

                  {/* Input Precio por Hora */}
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-caption text-midnight-ink select-none">
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
                      className="ed-input pl-8 pr-28 text-right ed-num"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center font-bold text-caption text-signal-blue ed-num pointer-events-none">
                      {formatCurrency(item.pricePerHour)} / hr
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Barra de acción */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-6">
          {saved && (
            <div className="ed-notice ed-notice-blue">
              <Check className="w-5 h-5 text-signal-blue shrink-0" />
              <span>Parámetros, identidad y tarifas guardados exitosamente.</span>
            </div>
          )}
          <button
            type="submit"
            className="ed-btn px-10 py-4 text-body"
          >
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  );
}
