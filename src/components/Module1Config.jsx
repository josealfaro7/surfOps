import React, { useState, useEffect } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useSurfSchool, INITIAL_SCHOOL_CONFIG } from '../context/SurfSchoolContext';
import { formatCurrency } from '../utils/calculations';

export default function Module1Config() {
  const { schoolConfig, updateSchoolConfig } = useSurfSchool();
  const [formData, setFormData] = useState(schoolConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(schoolConfig);
  }, [schoolConfig]);

  const handleNumberChange = (field, rawValue) => {
    const num = rawValue === '' ? 0 : Math.max(0, Number(rawValue));
    setFormData((prev) => ({ ...prev, [field]: num }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateSchoolConfig(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setFormData(INITIAL_SCHOOL_CONFIG);
    updateSchoolConfig(INITIAL_SCHOOL_CONFIG);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
          className="w-full h-12 pl-8 pr-24 rounded-sm border border-slate-300 bg-white text-base font-semibold text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
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
            Módulo 01 · Parámetros Financieros
          </span>
          <h1 className="text-2xl font-bold text-blue-950 mt-1">
            Configuración de Precios y Tarifas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Define los valores de cobro en recepción y las tarifas de liquidación para los instructores.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-sm border border-slate-300 bg-white hover:bg-sky-50 text-blue-950 text-sm font-medium transition self-start md:self-auto cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-sky-600" />
          Restaurar Valores Base
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
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

        {/* Barra de acción */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-4">
          {saved && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-950 bg-sky-50 px-4 py-2.5 border border-sky-400 border-l-4 border-l-pink-600 rounded-none">
              <Check className="w-4 h-4 text-pink-600" />
              Parámetros actualizados en memoria
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
