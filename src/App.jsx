import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  UserCheck,
  PlusSquare,
  BarChart2,
  Shield,
  Database,
  RotateCcw,
  Trash2,
  LogOut,
} from 'lucide-react';
import { SurfSchoolProvider, useSurfSchool } from './context/SurfSchoolContext';
import Login from './components/auth/Login';
import Module1Config from './components/Module1Config';
import Module2Attendance from './components/Module2Attendance';
import Module3NewClass from './components/Module3NewClass';
import Module4ClosingDashboard from './components/Module4ClosingDashboard';
import Module5Rentals from './components/Module5Rentals';
import EnvironmentBar from './components/EnvironmentBar';

function SurfSchoolWorkspace() {
  const [activeTab, setActiveTab] = useState('mod3');
  const [showStateInspector, setShowStateInspector] = useState(false);

  const {
    session,
    authLoading,
    isDemoSession,
    signOutSchool,
    schoolBranding,
    schoolConfig,
    rentalRates,
    activeRentals,
    rentalsTotalRevenue,
    instructors,
    virtualQueue,
    dailyClasses,
    resetDayEmpty,
    restoreDemoData,
  } = useSurfSchool();

  const brandPrimary = schoolBranding?.themePalette?.primary || '#172554';
  const brandSecondary = schoolBranding?.themePalette?.secondary || '#0284c7';
  const brandAccent = schoolBranding?.themePalette?.accent || '#db2777';

  // Inyectar dinámicamente las variables CSS (--brand-primary, --brand-secondary, --brand-accent)
  // directamente en document.documentElement.style
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-primary', brandPrimary);
      document.documentElement.style.setProperty('--brand-secondary', brandSecondary);
      document.documentElement.style.setProperty('--brand-accent', brandAccent);
    }
  }, [brandPrimary, brandSecondary, brandAccent]);

  // Truncar idPhotoBase64 en el inspector de memoria para no colapsar la vista
  const sanitizedRentalsForInspector = useMemo(
    () =>
      activeRentals.map((r) => ({
        ...r,
        idPhotoBase64: r.idPhotoBase64 ? '[IMAGE DATA TRUNCATED]' : null,
      })),
    [activeRentals]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 text-xs font-mono uppercase tracking-widest">
        Verificando sesión de escuela en Supabase...
      </div>
    );
  }

  // Si no hay sesión autenticada ni sesión Demo activa, mostrar pantalla de Login
  if (!session && !isDemoSession) {
    return <Login />;
  }

  const tabs = [
    {
      id: 'mod1',
      code: '01',
      label: 'Configuración',
      icon: Sliders,
    },
    {
      id: 'mod2',
      code: '02',
      label: `Fila de Asistencia (${virtualQueue.length}/${instructors.length})`,
      icon: UserCheck,
    },
    {
      id: 'mod3',
      code: '03',
      label: 'Ingreso de Clase',
      icon: PlusSquare,
    },
    {
      id: 'mod4',
      code: '04',
      label: `Cierre Diario (${dailyClasses.length})`,
      icon: BarChart2,
    },
    {
      id: 'mod5',
      code: '05',
      label: `🏄‍♂️ Arriendos (${activeRentals.length})`,
      icon: Shield,
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900"
      style={{
        '--brand-primary': brandPrimary,
        '--brand-secondary': brandSecondary,
        '--brand-accent': brandAccent,
      }}
    >
      {/* Barra Superior ERP Dinámica con schoolBranding.displayName y schoolBranding.monogram */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 sm:py-0">
            {/* Identidad Corporativa Dinámica (schoolBranding) */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--brand-primary)] border-b-2 border-[var(--brand-accent)] text-white font-bold text-sm flex items-center justify-center tracking-wider rounded-none uppercase">
                {schoolBranding?.monogram || 'P'}
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-lg font-bold tracking-tight text-[var(--brand-primary)] uppercase">
                  {schoolBranding?.displayName || 'POISSON'}
                </span>
                <span className="w-1.5 h-1.5 bg-[var(--brand-accent)] rounded-none self-center" />
                <span className="text-xs font-medium text-[var(--brand-secondary)] uppercase tracking-widest">
                  {schoolBranding?.tagline || 'Sistema de Gestión Operativa'}
                </span>
              </div>
            </div>

            {/* Controles de Estado en Memoria y Sesión */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStateInspector((v) => !v)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border text-xs font-medium transition cursor-pointer ${
                  showStateInspector
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-[var(--brand-secondary)]" />
                {showStateInspector ? 'Ocultar Estado' : 'Inspeccionar Memoria'}
              </button>

              <button
                type="button"
                onClick={resetDayEmpty}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                Reiniciar Día
              </button>

              <button
                type="button"
                onClick={restoreDemoData}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[var(--brand-secondary)]" />
                Cargar Demo
              </button>

              <button
                type="button"
                onClick={signOutSchool}
                title={session ? 'Cerrar sesión de Supabase Auth' : 'Ir a Login de Escuela'}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                {session ? 'Salir' : 'Login'}
              </button>
            </div>
          </div>

          {/* Navegación Estructurada Rectangular (5 Módulos) */}
          <nav className="grid grid-cols-2 lg:grid-cols-5 border-t border-slate-200 -mx-4 sm:mx-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-12 px-4 border-r last:border-r-0 border-slate-200 text-sm font-semibold transition flex items-center justify-between cursor-pointer rounded-none ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white border-b-2 border-b-[var(--brand-accent)]'
                      : 'bg-white hover:bg-sky-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-sky-400' : 'text-[var(--brand-secondary)]'
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <span
                    className={`text-xs font-mono ${
                      isActive ? 'text-pink-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {tab.code}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Barra de Condiciones Ambientales Persistente (EnvironmentBar) */}
      <EnvironmentBar />

      {/* Inspector de Objetos Globales en Memoria (con idPhotoBase64 truncado) */}
      {showStateInspector && (
        <div className="bg-[var(--brand-primary)] text-slate-100 border-b border-slate-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-none overflow-auto max-h-52">
              <div className="font-semibold text-sky-400 mb-1.5">
                1. SchoolBranding & Config
              </div>
              <pre className="text-[11px] text-slate-300">
                {JSON.stringify({ schoolBranding, schoolConfig, rentalRates }, null, 2)}
              </pre>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-none overflow-auto max-h-52">
              <div className="font-semibold text-sky-400 mb-1.5">2. Instructors</div>
              <pre className="text-[11px] text-slate-300">
                {JSON.stringify(instructors, null, 2)}
              </pre>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-none overflow-auto max-h-52">
              <div className="font-semibold text-pink-400 mb-1.5">
                3. DailyClasses ({dailyClasses.length})
              </div>
              <pre className="text-[11px] text-slate-300">
                {JSON.stringify(dailyClasses, null, 2)}
              </pre>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-none overflow-auto max-h-52">
              <div className="font-semibold text-emerald-400 mb-1.5">
                4. ActiveRentals ({activeRentals.length}) · Caja: ${rentalsTotalRevenue}
              </div>
              <pre className="text-[11px] text-slate-300">
                {JSON.stringify(sanitizedRentalsForInspector, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Área Operativa Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'mod1' && <Module1Config />}
        {activeTab === 'mod2' && (
          <Module2Attendance onGoToNewClass={() => setActiveTab('mod3')} />
        )}
        {activeTab === 'mod3' && <Module3NewClass />}
        {activeTab === 'mod4' && <Module4ClosingDashboard />}
        {activeTab === 'mod5' && <Module5Rentals />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SurfSchoolProvider>
      <SurfSchoolWorkspace />
    </SurfSchoolProvider>
  );
}
