import React, { useState } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, ArrowRight, Play } from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  loadSchoolBranding,
  applySchoolThemeToDOM,
} from '../../lib/supabaseClient';
import { useSurfSchool } from '../../context/SurfSchoolContext';
import BauhausArt from '../ui/BauhausArt';

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
    <div className="min-h-screen bg-cream-paper text-midnight-ink font-usual flex items-center justify-center p-6 md:p-12">
      <div className="max-w-page w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        {/* Columna Izquierda: Formulario e Identidad */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <span className="ed-eyebrow">Acceso Multitenant · SurfOp ERP</span>
            <h1 className="ed-display mt-4">
              Tu escuela, <span className="text-signal-blue">en orden.</span>
            </h1>
            <p className="ed-body ed-measure mt-4">
              Ingresa con las credenciales de tu escuela para sincronizar tu configuración, tarifas, fila de instructores y cierres diarios.
            </p>
          </div>

          <div className="ed-card max-w-xl">
            <div className="flex items-center justify-between pb-4 border-b border-midnight-ink mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-midnight-ink text-cream-paper font-display font-bold text-caption flex items-center justify-center">
                  {schoolBranding?.monogram || 'P'}
                </div>
                <span className="font-display font-bold text-subheading uppercase">
                  {schoolBranding?.displayName || 'POISSON'}
                </span>
              </div>
              <span className="ed-tag">Seguro SSL</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="school-login-email" className="ed-label">
                  Correo Electrónico de la Escuela
                </label>
                <div className="relative">
                  <input
                    id="school-login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@poisson.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ed-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="school-login-password" className="ed-label">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="school-login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ed-input"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="ed-notice ed-notice-alert">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="ed-btn ed-btn-block"
              >
                <span>{loading ? 'Autenticando Escuela...' : 'Ingresar al ERP'}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>

              <div className="pt-4 border-t border-midnight-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="ed-caption ed-muted">
                  ¿Evaluando la plataforma?
                </span>
                <button
                  type="button"
                  onClick={enterDemoSession}
                  className="ed-link"
                >
                  Entrar en modo Demo
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Ilustración Geométrica Bauhaus */}
        <div className="lg:col-span-5 flex justify-center">
          <BauhausArt variant="login" className="w-full max-w-[440px] aspect-square" />
        </div>
      </div>
    </div>
  );
}
