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
  const brandAccent = schoolBranding?.themePalette?.accent || '#0284c7';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-primary', brandPrimary);
      document.documentElement.style.setProperty('--brand-secondary', brandSecondary);
      document.documentElement.style.setProperty('--brand-accent', brandAccent);
    }
  }, [brandPrimary, brandSecondary, brandAccent]);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-blue-950 text-xs font-semibold uppercase tracking-widest">
        Verificando sesión de escuela en Supabase...
      </div>
    );
  }

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
      label: `Arriendos (${activeRentals.length})`,
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-inter">
      {/* Barra Superior ERP B2B */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 sm:py-0">
            {/* Identidad Corporativa B2B */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-950 border-b-2 border-sky-500 text-white font-bold text-sm flex items-center justify-center tracking-wider rounded-sm uppercase shadow-sm">
                {schoolBranding?.monogram || 'P'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-blue-950 uppercase">
                    {schoolBranding?.displayName || 'POISSON'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                    SURF OPS ERP
                  </span>
                </div>
                <span className="text-xs font-normal text-slate-500">
                  {schoolBranding?.tagline || 'Plataforma Operativa Integral'}
                </span>
              </div>
            </div>

            {/* Acciones de Cabecera B2B */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStateInspector((v) => !v)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm ${
                  showStateInspector
                    ? 'bg-blue-950 text-white border-blue-950'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-sky-600" />
                {showStateInspector ? 'Ocultar Estado' : 'Inspeccionar Memoria'}
              </button>

              <button
                type="button"
                onClick={resetDayEmpty}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700 transition cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Reiniciar Día
              </button>

              <button
                type="button"
                onClick={restoreDemoData}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700 transition cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                Cargar Demo
              </button>

              <button
                type="button"
                onClick={signOutSchool}
                title={session ? 'Cerrar sesión de Supabase Auth' : 'Ir a Login de Escuela'}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700 transition cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-600" />
                {session ? 'Salir' : 'Login'}
              </button>
            </div>
          </div>

          {/* Navegación Modular B2B */}
          <nav className="grid grid-cols-2 lg:grid-cols-5 border-t border-slate-200 -mx-4 sm:mx-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-12 px-4 border-r last:border-r-0 border-slate-200 text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-blue-950 text-white border-b-4 border-b-sky-500 shadow-inner'
                      : 'bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-sky-400' : 'text-sky-600'
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-widest tabular-nums ${
                      isActive ? 'text-sky-300' : 'text-slate-400'
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

      {/* Barra de Condiciones Ambientales Persistente */}
      <EnvironmentBar />

      {/* Inspector de Memoria B2B */}
      {showStateInspector && (
        <div className="bg-slate-900 text-slate-100 border-b border-slate-800 shadow-inner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm overflow-auto max-h-52">
              <div className="font-semibold text-sky-400 mb-1.5 uppercase tracking-wider text-xs">
                1. Configuración & Branding
              </div>
              <pre className="text-xs text-slate-300">
                {JSON.stringify({ schoolBranding, schoolConfig, rentalRates }, null, 2)}
              </pre>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm overflow-auto max-h-52">
              <div className="font-semibold text-sky-400 mb-1.5 uppercase tracking-wider text-xs">
                2. Instructores Activos
              </div>
              <pre className="text-xs text-slate-300">
                {JSON.stringify(instructors, null, 2)}
              </pre>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm overflow-auto max-h-52">
              <div className="font-semibold text-sky-400 mb-1.5 uppercase tracking-wider text-xs">
                3. Clases Diarias ({dailyClasses.length})
              </div>
              <pre className="text-xs text-slate-300">
                {JSON.stringify(dailyClasses, null, 2)}
              </pre>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-sm overflow-auto max-h-52">
              <div className="font-semibold text-sky-400 mb-1.5 uppercase tracking-wider text-xs">
                4. Arriendos ({activeRentals.length}) · Caja: ${rentalsTotalRevenue}
              </div>
              <pre className="text-xs text-slate-300">
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

      {/* Footer B2B */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-950 uppercase tracking-wider">SurfOps ERP</span>
            <span>·</span>
            <span>Estándar Operativo B2B para Escuelas de Surf</span>
          </div>
          <div className="flex items-center gap-2 font-mono tabular-nums text-slate-400">
            <span>v3.0.0-enterprise</span>
          </div>
        </div>
      </footer>
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
