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
  const brandAccent = schoolBranding?.themePalette?.accent || '#38bdf8';

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
      <div className="min-h-screen flex items-center justify-center bg-cream-paper">
        <span className="ed-eyebrow">Verificando sesión de escuela en Supabase</span>
      </div>
    );
  }

  // Si no hay sesión autenticada ni sesión Demo activa, mostrar pantalla de Login
  if (!session && !isDemoSession) {
    return <Login />;
  }

  const tabs = [
    { id: 'mod1', code: '01', label: 'Configuración', icon: Sliders },
    {
      id: 'mod2',
      code: '02',
      label: 'Asistencia',
      count: `${virtualQueue.length}/${instructors.length}`,
      icon: UserCheck,
    },
    { id: 'mod3', code: '03', label: 'Ingreso de Clase', icon: PlusSquare },
    {
      id: 'mod4',
      code: '04',
      label: 'Cierre Diario',
      count: dailyClasses.length,
      icon: BarChart2,
    },
    {
      id: 'mod5',
      code: '05',
      label: 'Arriendos',
      count: activeRentals.length,
      icon: Shield,
    },
  ];

  const displayName = schoolBranding?.displayName || 'POISSON';

  return (
    <div
      className="min-h-screen bg-cream-paper text-midnight-ink font-usual lg:pl-20"
      style={{
        '--brand-primary': brandPrimary,
        '--brand-secondary': brandSecondary,
        '--brand-accent': brandAccent,
      }}
    >
      {/* Riel izquierdo: hamburguesa + glifo geométrico + wordmark vertical (schoolBranding) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-20 border-r border-midnight-ink bg-cream-paper flex-col items-center py-11 gap-10 z-40">
        <button
          type="button"
          onClick={() => setShowStateInspector((v) => !v)}
          title={showStateInspector ? 'Ocultar estado en memoria' : 'Inspeccionar memoria'}
          className="flex flex-col gap-[6px] cursor-pointer p-2"
        >
          <span className="block w-7 h-[3px] bg-midnight-ink" />
          <span className="block w-7 h-[3px] bg-midnight-ink" />
        </button>

        {/* Glifo geométrico con los colores de marca de la escuela */}
        <div className="w-10 h-10 grid grid-cols-2 border border-midnight-ink" aria-hidden="true">
          <span style={{ background: 'var(--brand-primary)' }} />
          <span className="bg-cream-paper flex items-center justify-center">
            <span className="w-3 h-3 rounded-full" style={{ background: 'var(--brand-accent)' }} />
          </span>
          <span className="bg-saffron-yellow" />
          <span style={{ background: 'var(--brand-secondary)' }} />
        </div>

        <div className="flex-1 flex items-start justify-center">
          <span
            className="font-usual font-bold text-caption uppercase tracking-[0.2em] whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {displayName} · SurfOp ERP
          </span>
        </div>

        <span className="font-display font-bold text-subheading">
          {schoolBranding?.monogram || 'P'}
        </span>
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-cream-paper border-b border-midnight-ink">
        <div className="ed-page">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-4">
              <div className="lg:hidden w-10 h-10 bg-midnight-ink text-cream-paper font-display font-bold text-subheading flex items-center justify-center">
                {schoolBranding?.monogram || 'P'}
              </div>
              <div>
                <div className="font-display font-bold text-subheading leading-none uppercase tracking-[0.04em]">
                  {displayName}
                </div>
                <div className="ed-caption ed-muted leading-tight mt-1">
                  {schoolBranding?.tagline || 'Sistema de Gestión Operativa'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowStateInspector((v) => !v)}
                className={`ed-btn ed-btn-sm ${showStateInspector ? 'ed-btn-active' : ''}`}
              >
                <Database className="w-4 h-4" />
                {showStateInspector ? 'Ocultar Estado' : 'Memoria'}
              </button>
              <button type="button" onClick={resetDayEmpty} className="ed-btn ed-btn-sm">
                <Trash2 className="w-4 h-4" />
                Reiniciar Día
              </button>
              <button type="button" onClick={restoreDemoData} className="ed-btn ed-btn-sm">
                <RotateCcw className="w-4 h-4" />
                Cargar Demo
              </button>
              <button
                type="button"
                onClick={signOutSchool}
                title={session ? 'Cerrar sesión de Supabase Auth' : 'Ir a Login de Escuela'}
                className="ed-link ml-2"
              >
                {session ? 'Salir' : 'Login'}
              </button>
            </div>
          </div>

          {/* Navegación de módulos: links usuales, activo en Signal Blue */}
          <nav className="flex gap-8 overflow-x-auto -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-2 py-4 border-b-2 font-usual font-bold text-caption whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'border-signal-blue text-signal-blue'
                      : 'border-transparent text-midnight-ink hover:text-signal-blue'
                  }`}
                >
                  <span className="ed-num">{tab.code}</span>
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`ed-num rounded-pill border px-2 leading-[1.5] ${
                        isActive ? 'border-signal-blue' : 'border-midnight-ink'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
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
        <div className="bg-midnight-ink text-cream-paper border-b border-midnight-ink">
          <div className="ed-page py-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                title: '1. SchoolBranding & Config',
                data: { schoolBranding, schoolConfig, rentalRates },
              },
              { title: '2. Instructors', data: instructors },
              { title: `3. DailyClasses (${dailyClasses.length})`, data: dailyClasses },
              {
                title: `4. ActiveRentals (${activeRentals.length}) · Caja: $${rentalsTotalRevenue}`,
                data: sanitizedRentalsForInspector,
              },
            ].map((block) => (
              <div
                key={block.title}
                className="p-5 border border-cream-paper/30 overflow-auto max-h-64"
              >
                <div className="font-bold text-caption text-saffron-yellow mb-2">
                  {block.title}
                </div>
                <pre className="text-caption leading-snug text-cream-paper/80">
                  {JSON.stringify(block.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Área Operativa Principal */}
      <main className="ed-page py-12 lg:py-16">
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
