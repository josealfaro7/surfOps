import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
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
  MoreHorizontal,
} from 'lucide-react';
import { SurfSchoolProvider, useSurfSchool } from './context/SurfSchoolContext';
import Login from './components/auth/Login';
import EnvironmentBar from './components/EnvironmentBar';
import { ConfirmProvider, useConfirm } from './components/ui/Dialog';

// Cada módulo se descarga solo cuando se abre (menos espera con mala señal en la playa)
const Module1Config = lazy(() => import('./components/Module1Config'));
const Module2Attendance = lazy(() => import('./components/Module2Attendance'));
const Module3NewClass = lazy(() => import('./components/Module3NewClass'));
const Module4ClosingDashboard = lazy(() => import('./components/Module4ClosingDashboard'));
const Module5Rentals = lazy(() => import('./components/Module5Rentals'));

function SurfSchoolWorkspace() {
  const [activeTab, setActiveTab] = useState('mod3');
  const [showStateInspector, setShowStateInspector] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const confirm = useConfirm();

  const {
    mode,
    isDemoSession,
    loadError,
    reload,
    signOutSchool,
    schoolBranding,
    schoolConfig,
    rentalRates,
    activeRentals,
    rentalsTodayRevenue,
    instructors,
    virtualQueue,
    todayClasses,
    resetDemoDay,
    restoreDemoData,
  } = useSurfSchool();

  // El inspector solo existe en demo: en modo real mostraría datos personales de alumnos
  const sanitizedRentalsForInspector = useMemo(
    () =>
      activeRentals.map((r) => ({
        ...r,
        idPhotoDataUrl: r.idPhotoDataUrl ? '[IMAGEN OMITIDA]' : null,
      })),
    [activeRentals]
  );

  useEffect(() => {
    if (!isDemoSession) setShowStateInspector(false);
  }, [isDemoSession]);

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-blue-950 text-sm font-semibold">
        Cargando datos de la escuela…
      </div>
    );
  }

  if (mode === 'login') {
    return <Login />;
  }

  const confirmAndRun = async (opts, fn) => {
    if (await confirm(opts)) fn();
  };

  const tabs = [
    { id: 'mod3', label: 'Clases', icon: PlusSquare },
    { id: 'mod2', label: 'Instructores', badge: `${virtualQueue.length}/${instructors.length}`, icon: UserCheck },
    { id: 'mod5', label: 'Arriendos', badge: activeRentals.length > 0 ? String(activeRentals.length) : null, icon: Shield },
    { id: 'mod4', label: 'Cierre de caja', icon: BarChart2 },
    { id: 'mod1', label: 'Configuración', icon: Sliders },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 overflow-x-hidden">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-blue-950"
      >
        Saltar al contenido
      </a>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="min-h-[64px] flex items-center justify-between gap-3 py-2">
            {/* Escuela */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 shrink-0 bg-blue-950 text-white font-display font-bold text-lg flex items-center justify-center rounded-md"
                aria-hidden="true"
              >
                {schoolBranding?.monogram || 'P'}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-display font-bold text-blue-950 truncate">
                  {schoolBranding?.displayName || 'POISSON'}
                </div>
                <div className="text-sm text-slate-600 truncate">SurfOps</div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 shrink-0">
              {isDemoSession && (
                <span className="hidden md:inline-flex items-center h-11 px-3 rounded-md border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-900">
                  Demo: los datos quedan solo en este navegador
                </span>
              )}
              {isDemoSession && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDemoMenu((v) => !v)}
                    aria-expanded={showDemoMenu}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-2 h-11 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 cursor-pointer"
                  >
                    <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                    <span className="hidden sm:inline">Demo</span>
                    <span className="sr-only sm:hidden">Opciones de la demo</span>
                  </button>
                  {showDemoMenu && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg p-1 z-40"
                    >
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setShowDemoMenu(false);
                          setShowStateInspector((v) => !v);
                        }}
                        className="w-full flex items-center gap-2 h-11 px-3 text-left text-base text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <Database className="w-5 h-5 text-sky-700" aria-hidden="true" />
                        {showStateInspector ? 'Ocultar datos en memoria' : 'Ver datos en memoria'}
                      </button>
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setShowDemoMenu(false);
                          confirmAndRun(
                            {
                              title: 'Vaciar el día de hoy',
                              message: 'Se borran las clases, arriendos y llegadas de hoy en la demo.',
                              confirmLabel: 'Vaciar hoy',
                              tone: 'danger',
                            },
                            resetDemoDay
                          );
                        }}
                        className="w-full flex items-center gap-2 h-11 px-3 text-left text-base text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5 text-rose-700" aria-hidden="true" />
                        Vaciar hoy
                      </button>
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setShowDemoMenu(false);
                          confirmAndRun(
                            {
                              title: 'Reiniciar la demo',
                              message: 'Se reemplaza todo lo registrado en la demo por los datos de ejemplo.',
                              confirmLabel: 'Reiniciar demo',
                              tone: 'danger',
                            },
                            restoreDemoData
                          );
                        }}
                        className="w-full flex items-center gap-2 h-11 px-3 text-left text-base text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <RotateCcw className="w-5 h-5 text-sky-700" aria-hidden="true" />
                        Reiniciar demo
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={signOutSchool}
                className="inline-flex items-center gap-2 h-11 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 cursor-pointer"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">Salir</span>
                <span className="sr-only sm:hidden">Salir</span>
              </button>
            </div>
          </div>

          {/* Navegación: una fila desplazable en pantallas angostas */}
          <nav aria-label="Secciones" className="-mx-3 sm:mx-0 overflow-x-auto">
            <ul className="flex min-w-max sm:min-w-0 sm:grid sm:grid-cols-5 border-t border-slate-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full h-14 px-4 flex items-center justify-center gap-2 text-base font-semibold border-b-4 rounded-none transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'border-blue-950 text-blue-950 bg-slate-50'
                          : 'border-transparent text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="min-w-[1.75rem] px-1.5 h-7 inline-flex items-center justify-center rounded-full bg-blue-950 text-white text-sm tabular-nums">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <EnvironmentBar />

      {loadError && (
        <div role="alert" className="bg-rose-50 border-b border-rose-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-base text-rose-900">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => reload().catch(() => {})}
              className="h-11 px-4 border border-rose-300 bg-white text-sm font-semibold cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {isDemoSession && showStateInspector && (
        <div className="bg-slate-900 text-slate-100 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            {[
              ['Configuración', { schoolBranding, schoolConfig, rentalRates }],
              ['Instructores', instructors],
              [`Clases de hoy (${todayClasses.length})`, todayClasses],
              [`Arriendos activos (${activeRentals.length}) · caja hoy ${rentalsTodayRevenue}`, sanitizedRentalsForInspector],
            ].map(([title, data]) => (
              <div key={title} className="p-3 bg-slate-950 border border-slate-800 rounded-md overflow-auto max-h-52">
                <div className="font-semibold text-sky-300 mb-1.5">{title}</div>
                <pre className="text-xs text-slate-300 font-mono">{JSON.stringify(data, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <main id="contenido" className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <Suspense fallback={<p className="text-base text-slate-600">Cargando…</p>}>
          {activeTab === 'mod1' && <Module1Config />}
          {activeTab === 'mod2' && <Module2Attendance onGoToNewClass={() => setActiveTab('mod3')} />}
          {activeTab === 'mod3' && <Module3NewClass />}
          {activeTab === 'mod4' && <Module4ClosingDashboard />}
          {activeTab === 'mod5' && <Module5Rentals />}
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 text-sm text-slate-600">
          <span>SurfOps</span>
          <span className="tabular-nums">v3.2.0</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SurfSchoolProvider>
      <ConfirmProvider>
        <SurfSchoolWorkspace />
      </ConfirmProvider>
    </SurfSchoolProvider>
  );
}
