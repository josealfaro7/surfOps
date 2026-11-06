import React, { useState } from 'react';
import { Sliders, UserCheck, PlusSquare, BarChart2, Database, RotateCcw, Trash2 } from 'lucide-react';
import { SurfSchoolProvider, useSurfSchool } from './context/SurfSchoolContext';
import Module1Config from './components/Module1Config';
import Module2Attendance from './components/Module2Attendance';
import Module3NewClass from './components/Module3NewClass';
import Module4ClosingDashboard from './components/Module4ClosingDashboard';
import EnvironmentBar from './components/EnvironmentBar';

function SurfSchoolWorkspace() {
  const [activeTab, setActiveTab] = useState('mod3');
  const [showStateInspector, setShowStateInspector] = useState(false);

  const {
    schoolConfig,
    instructors,
    virtualQueue,
    dailyClasses,
    resetDayEmpty,
    restoreDemoData,
  } = useSurfSchool();

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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barra Superior ERP Profesional con protagonismo Azul y acento Rosado */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 sm:py-0">
            {/* Identidad Corporativa POISSON */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-950 border-b-2 border-pink-600 text-white font-bold text-sm flex items-center justify-center tracking-wider rounded-none">
                P
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-lg font-bold tracking-tight text-blue-950 uppercase">
                  POISSON
                </span>
                <span className="w-1.5 h-1.5 bg-pink-600 rounded-none self-center" />
                <span className="text-xs font-medium text-sky-600 uppercase tracking-widest">
                  Sistema de Gestión Operativa
                </span>
              </div>
            </div>

            {/* Controles de Estado en Memoria */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStateInspector((v) => !v)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border text-xs font-medium transition cursor-pointer ${
                  showStateInspector
                    ? 'bg-blue-950 text-white border-blue-950'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-sky-500" />
                {showStateInspector ? 'Ocultar Estado' : 'Inspeccionar Memoria'}
              </button>

              <button
                type="button"
                onClick={resetDayEmpty}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-pink-600" />
                Reiniciar Día
              </button>

              <button
                type="button"
                onClick={restoreDemoData}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-500" />
                Cargar Demo
              </button>
            </div>
          </div>

          {/* Navegación Estructurada Rectangular (Protagonismo Azul, detalle complementario Rosado) */}
          <nav className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-200 -mx-4 sm:mx-0">
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
                      ? 'bg-blue-950 text-white border-b-2 border-b-pink-600'
                      : 'bg-white hover:bg-sky-50 text-slate-800'
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

      {/* Barra de Condiciones Ambientales Persistente (EnvironmentBar) debajo de la navegación y sobre el contenido del módulo */}
      <EnvironmentBar />

      {/* Inspector de los 3 Objetos Globales en Memoria */}
      {showStateInspector && (
        <div className="bg-blue-950 text-slate-100 border-b border-slate-300">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-none overflow-auto max-h-52">
              <div className="font-semibold text-sky-400 mb-1.5">1. SchoolConfig</div>
              <pre className="text-[11px] text-slate-300">
                {JSON.stringify(schoolConfig, null, 2)}
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
          </div>
        </div>
      )}

      {/* Área Operativa Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'mod1' && <Module1Config />}
        {activeTab === 'mod2' && (
          <Module2Attendance onGoToNewClass={() => setActiveTab('mod3')} />
        )}
        {activeTab === 'mod3' && <Module3NewClass />}
        {activeTab === 'mod4' && <Module4ClosingDashboard />}
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
