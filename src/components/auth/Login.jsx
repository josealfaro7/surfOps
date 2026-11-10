import React, { useState } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, ArrowRight, Play } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useSurfSchool } from '../../context/SurfSchoolContext';

export default function Login() {
  const { schoolBranding, enterDemoSession } = useSurfSchool();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        'Variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no detectadas en el entorno. Configúralas en tu archivo .env o ingresa en modo Demo.'
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data?.user?.id) {
        throw new Error('No se pudo obtener la sesión de la escuela.');
      }
      // El listener de SurfSchoolContext carga branding y datos operativos.
    } catch (err) {
      setErrorMessage(
        err?.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Verifica el correo y contraseña de tu escuela.'
          : err?.message || 'Error al iniciar sesión con Supabase Auth.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-slate-100 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
        {/* Cabecera Corporativa B2B */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-11 bg-blue-950 border-b-2 border-sky-500 text-white font-bold text-sm flex items-center justify-center">
              {schoolBranding?.monogram || 'P'}
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-blue-950">
                {schoolBranding?.displayName || 'POISSON SURF'}
              </h1>
            </div>
          </div>
          <Lock aria-hidden="true" className="w-5 h-5 text-sky-700 shrink-0" />
        </div>

        {/* Formulario de Autenticación */}
        <form onSubmit={handleSubmit} className="pt-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-blue-950">
              Entrar
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mt-1">
              Usa el correo y la contraseña de tu escuela.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="school-login-email"
              className="block text-sm font-bold text-sky-700"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail aria-hidden="true" className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="school-login-email"
                type="email"
                required
                autoComplete="email"
                name="email"
                spellCheck={false}
                placeholder="operaciones@escuela.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="school-login-password"
              className="block text-sm font-bold text-sky-700"
            >
              Contraseña
            </label>
            <div className="relative">
              <KeyRound aria-hidden="true" className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="school-login-password"
                type="password"
                required
                autoComplete="current-password"
                name="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-4 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950 transition"
              />
            </div>
          </div>

          {errorMessage && (
            <div role="alert" className="p-3 border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700 flex items-start gap-2">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-950 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{loading ? 'Entrando…' : 'Acceder al Sistema'}</span>
            <ArrowRight aria-hidden="true" className="w-4 h-4 text-sky-400" />
          </button>

          {/* Acceso a Modo Demo */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-sm text-slate-600">
              ¿Modo evaluación sin backend?
            </span>
            <button
              type="button"
              onClick={enterDemoSession}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              <Play aria-hidden="true" className="w-3.5 h-3.5 text-sky-700" />
              Cargar Sesión Demo
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
