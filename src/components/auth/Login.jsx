import React, { useState } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, ArrowRight, Play } from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  loadSchoolBranding,
  applySchoolThemeToDOM,
} from '../../lib/supabaseClient';
import { useSurfSchool } from '../../context/SurfSchoolContext';

export default function Login() {
  const {
    schoolBranding,
    setSchoolBrandingState,
    enterDemoSession,
  } = useSurfSchool();

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

      const authUid = data?.user?.id;
      if (!authUid) {
        throw new Error('No se pudo obtener el auth.uid() de la sesión.');
      }

      // Utilizar auth.uid() como school_id para cargar public.schools y guardar en surfops_school_branding
      const branding = await loadSchoolBranding(authUid);
      applySchoolThemeToDOM(branding);
      setSchoolBrandingState(branding);
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md border border-slate-300 bg-white rounded-none">
        {/* Cabecera Corporativa */}
        <div className="px-6 py-4 bg-[var(--brand-primary,#172554)] text-white border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/10 border-b-2 border-[var(--brand-accent,#db2777)] text-white font-bold text-xs flex items-center justify-center tracking-wider rounded-none uppercase">
              {schoolBranding?.monogram || 'P'}
            </div>
            <div>
              <h1 className="text-xs font-bold uppercase tracking-wider">
                {schoolBranding?.displayName || 'POISSON'} · SurfOps ERP
              </h1>
              <p className="text-[10px] text-sky-300 uppercase tracking-widest">
                Acceso Multitenant de Escuela
              </p>
            </div>
          </div>
          <Lock className="w-4 h-4 text-sky-400 shrink-0" />
        </div>

        {/* Formulario directo Supabase Auth (Email / Password) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-blue-950">
              Iniciar Sesión Operativa
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa con las credenciales de tu escuela para cargar tu configuración, identidad visual y registros del día.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="school-login-email"
              className="block text-xs font-semibold uppercase tracking-wider text-blue-950"
            >
              Correo Electrónico de la Escuela
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="school-login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@poisson.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-sm border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="school-login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-blue-950"
            >
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="school-login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-sm border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none transition"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 border border-pink-600 bg-pink-50 text-xs font-semibold text-pink-700 flex items-start gap-2 rounded-none">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 px-6 rounded-none bg-[var(--brand-primary,#172554)] hover:opacity-95 border-b-2 border-[var(--brand-accent,#db2777)] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{loading ? 'Autenticando Escuela...' : 'Ingresar al ERP'}</span>
            <ArrowRight className="w-4 h-4 text-sky-400" />
          </button>

          {/* Acceso directo a sesión Demo local (útil en GitHub Pages o sin credenciales) */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              ¿Evaluando en GitHub Pages / Local?
            </span>
            <button
              type="button"
              onClick={enterDemoSession}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-secondary,#0284c7)] hover:underline cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Entrar con Datos Semilla Demo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
