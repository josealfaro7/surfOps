import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  BarChart2,
  Wallet,
  Users,
  TrendingUp,
  Trophy,
  Calendar,
  Waves,
  Download,
} from 'lucide-react';
import { useSurfSchool, getTodayDateString } from '../context/SurfSchoolContext';
import {
  formatCurrency,
  buildInstructorBreakdownSummary,
} from '../utils/calculations';
import ModuleHeader from './ui/ModuleHeader';

const BASE_WEEK_DAYS = [
  { dayShort: 'LUN', dayName: 'Lunes', classes: 5, revenue: 195000, staffPay: 41000, isToday: false },
  { dayShort: 'MAR', dayName: 'Martes', classes: 4, revenue: 148000, staffPay: 32000, isToday: false },
  { dayShort: 'MIÉ', dayName: 'Miércoles', classes: 7, revenue: 285000, staffPay: 56000, isToday: false },
  { dayShort: 'JUE', dayName: 'Jueves (HOY)', classes: 0, revenue: 0, staffPay: 0, isToday: true },
  { dayShort: 'VIE', dayName: 'Viernes (Proy.)', classes: 8, revenue: 310000, staffPay: 64000, isToday: false, isProjected: true },
  { dayShort: 'SÁB', dayName: 'Sábado (Proy.)', classes: 12, revenue: 465000, staffPay: 98000, isToday: false, isProjected: true },
  { dayShort: 'DOM', dayName: 'Domingo (Proy.)', classes: 10, revenue: 390000, staffPay: 82000, isToday: false, isProjected: true },
];

export default function Module4ClosingDashboard() {
  const {
    instructors,
    dailyClasses,
    activeRentals = [],
    completedRentals = [],
    rentalsTotalRevenue = 0,
    rentalRates = [],
  } = useSurfSchool();
  const [expandedId, setExpandedId] = useState(null);

  // 1. Resumen General del Día (Clases + Arriendos con Silo Financiero para Instructores)
  const summary = useMemo(() => {
    const totalClasses = dailyClasses.length;
    const totalRevenue = dailyClasses.reduce((acc, c) => acc + (Number(c.finalTotal) || 0), 0);
    const totalInstructorPayout = dailyClasses.reduce(
      (acc, c) => acc + (Number(c.instructorPay) || 0),
      0
    );
    const netProfit = totalRevenue - totalInstructorPayout;
    const combinedRevenue = totalRevenue + rentalsTotalRevenue;
    const combinedNetProfit = netProfit + rentalsTotalRevenue;

    return {
      totalClasses,
      totalRevenue,
      totalInstructorPayout,
      netProfit,
      combinedRevenue,
      combinedNetProfit,
    };
  }, [dailyClasses, rentalsTotalRevenue]);

  // 1B. Resumen y Distribución de Arriendos del Día (Módulo 05)
  const rentalSummary = useMemo(() => {
    const allRentals = [...activeRentals, ...completedRentals];
    const activeCount = activeRentals.length;
    const completedCount = completedRentals.length;
    const totalRentals = allRentals.length;
    const totalUnits = allRentals.reduce((acc, r) => acc + (Number(r.quantity) || 1), 0);
    const totalHours = allRentals.reduce((acc, r) => acc + (Number(r.hours) || 1), 0);

    const itemColors = {
      tabla_surf: 'bg-midnight-ink',
      traje_surf: 'bg-signal-blue',
      bodyboard: 'bg-saffron-yellow',
      aletas: 'bg-blush-pink',
    };

    const byItemMap = {};
    rentalRates.forEach((rate) => {
      byItemMap[rate.id] = {
        id: rate.id,
        label: rate.label,
        count: 0,
        units: 0,
        hours: 0,
        amount: 0,
        color: itemColors[rate.id] || 'bg-signal-blue',
      };
    });

    allRentals.forEach((r) => {
      const key = r.itemId || 'tabla_surf';
      if (!byItemMap[key]) {
        byItemMap[key] = {
          id: key,
          label: r.itemLabel || 'Equipamiento',
          count: 0,
          units: 0,
          hours: 0,
          amount: 0,
          color: itemColors[key] || 'bg-signal-blue',
        };
      }
      byItemMap[key].count += 1;
      byItemMap[key].units += Number(r.quantity) || 1;
      byItemMap[key].hours += Number(r.hours) || 1;
      byItemMap[key].amount += Number(r.finalTotal) || 0;
    });

    return {
      activeCount,
      completedCount,
      totalRentals,
      totalUnits,
      totalHours,
      totalRevenue: rentalsTotalRevenue,
      byItem: Object.values(byItemMap),
    };
  }, [activeRentals, completedRentals, rentalRates, rentalsTotalRevenue]);

  // 2. Leaderboard de Instructores (Liquidación Diaria ordenada de mayor a menor)
  const leaderboardSettlements = useMemo(() => {
    const rows = instructors.map((inst) => {
      const classes = dailyClasses.filter((c) => c.instructorId === inst.id);
      const totalToTransfer = classes.reduce(
        (acc, c) => acc + (Number(c.instructorPay) || 0),
        0
      );
      const revenueGenerated = classes.reduce(
        (acc, c) => acc + (Number(c.finalTotal) || 0),
        0
      );
      const breakdown = buildInstructorBreakdownSummary(classes);

      return {
        instructor: inst,
        classes,
        classCount: classes.length,
        breakdown,
        totalToTransfer,
        revenueGenerated,
      };
    });

    return rows.sort((a, b) => {
      if (b.totalToTransfer !== a.totalToTransfer) {
        return b.totalToTransfer - a.totalToTransfer;
      }
      return b.classCount - a.classCount;
    });
  }, [instructors, dailyClasses]);

  const maxInstructorPayout = useMemo(() => {
    return Math.max(...leaderboardSettlements.map((r) => r.totalToTransfer), 1);
  }, [leaderboardSettlements]);

  // 3. Datos Semanales
  const weeklyData = useMemo(() => {
    return BASE_WEEK_DAYS.map((d) => {
      if (d.isToday) {
        return {
          ...d,
          classes: summary.totalClasses,
          rentals: rentalSummary.totalRentals,
          revenue: summary.combinedRevenue,
          staffPay: summary.totalInstructorPayout,
          netProfit: summary.combinedNetProfit,
        };
      }
      return {
        ...d,
        rentals: 0,
        netProfit: d.revenue - d.staffPay,
      };
    });
  }, [summary, rentalSummary.totalRentals]);

  const maxWeeklyRevenue = useMemo(() => {
    return Math.max(...weeklyData.map((d) => d.revenue), 100000);
  }, [weeklyData]);

  const weeklyTotals = useMemo(() => {
    return weeklyData.reduce(
      (acc, d) => ({
        classes: acc.classes + d.classes,
        revenue: acc.revenue + d.revenue,
        staffPay: acc.staffPay + d.staffPay,
        netProfit: acc.netProfit + d.netProfit,
      }),
      { classes: 0, revenue: 0, staffPay: 0, netProfit: 0 }
    );
  }, [weeklyData]);

  // 4. Desglose Diario para Gráficos (Medios de Pago y Modalidad)
  const dailyBreakdowns = useMemo(() => {
    const byPayment = {
      Transferencia: { count: 0, amount: 0, color: 'bg-midnight-ink' },
      Tarjeta: { count: 0, amount: 0, color: 'bg-signal-blue' },
      Efectivo: { count: 0, amount: 0, color: 'bg-saffron-yellow' },
    };

    const byType = {
      Individual: { count: 0, amount: 0, color: 'bg-signal-blue' },
      Grupal: { count: 0, amount: 0, color: 'bg-midnight-ink' },
      'Curso Pack 8': { count: 0, amount: 0, color: 'bg-saffron-yellow' },
    };

    dailyClasses.forEach((cls) => {
      const method = byPayment[cls.paymentMethod] ? cls.paymentMethod : 'Transferencia';
      byPayment[method].count += 1;
      byPayment[method].amount += Number(cls.finalTotal) || 0;

      if (cls.category === 'curso') {
        byType['Curso Pack 8'].count += 1;
        byType['Curso Pack 8'].amount += Number(cls.finalTotal) || 0;
      } else if (cls.modality === 'grupal') {
        byType.Grupal.count += 1;
        byType.Grupal.amount += Number(cls.finalTotal) || 0;
      } else {
        byType.Individual.count += 1;
        byType.Individual.amount += Number(cls.finalTotal) || 0;
      }
    });

    return { byPayment, byType };
  }, [dailyClasses]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleExportCSV = () => {
    const todayStr = getTodayDateString();
    const headers = [
      'ID Clase',
      'Fecha',
      'Hora Inicio',
      'Hora Término',
      'Horario Clase',
      'Modalidad',
      'Instructor',
      'Alumno',
      'Teléfono Alumno',
      'Correo Alumno',
      'Contacto Emergencia',
      'Teléfono Emergencia',
      'Medio de Pago',
      'Subtotal',
      'Descuento',
      'Total Caja',
      'Pago Instructor',
    ];

    const escapeCsvField = (value) => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = dailyClasses.map((cls) => {
      const inst = instructors.find((i) => i.id === cls.instructorId);
      const modalityLabel =
        cls.category === 'curso'
          ? 'Curso'
          : cls.modality === 'grupal'
          ? `Grupal (${cls.pax} pax)`
          : 'Individual';

      return [
        cls.id,
        cls.date || todayStr,
        cls.startTime || '',
        cls.endTime || '',
        `${cls.startTime} - ${cls.endTime}`,
        modalityLabel,
        inst ? inst.name : 'Sin Instructor',
        cls.studentName,
        cls.studentPhone || '',
        cls.studentEmail || '',
        cls.emergencyContactName || '',
        cls.emergencyContactPhone || '',
        cls.paymentMethod || 'Transferencia',
        cls.subtotal,
        cls.discount,
        cls.finalTotal,
        cls.instructorPay,
      ]
        .map(escapeCsvField)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'caja_diaria_poisson.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ed-stack">
      {/* Cabecera Two-Column Feature con BauhausArt */}
      <ModuleHeader
        eyebrow="Módulo 04 · Liquidación y Métricas"
        title="Cierre Diario y"
        accent="Resultados"
        description="Consolidación de ingresos de clases, arriendos independientes de equipamiento, liquidación por orden de mérito a instructores y proyección semanal."
        art="closing"
        actions={
          <button
            type="button"
            onClick={handleExportCSV}
            className="ed-btn"
          >
            <Download className="w-4 h-4 mr-1 text-signal-blue" />
            <span>Exportar Planilla (CSV)</span>
          </button>
        }
      />

      {/* 1. RESUMEN EJECUTIVO DEL DÍA (4 KPIs) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="ed-card">
          <div className="flex items-center justify-between">
            <span className="ed-eyebrow">Caja Clases</span>
            <Wallet className="w-5 h-5 text-signal-blue" />
          </div>
          <div className="mt-4 font-display font-bold text-heading-xs ed-num text-midnight-ink">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div className="mt-2 ed-caption ed-muted ed-num">
            {summary.totalClasses} {summary.totalClasses === 1 ? 'clase registrada' : 'clases registradas'} hoy
          </div>
        </div>

        <div className="ed-card">
          <div className="flex items-center justify-between">
            <span className="ed-eyebrow">Caja Arriendos</span>
            <Waves className="w-5 h-5 text-signal-blue" />
          </div>
          <div className="mt-4 font-display font-bold text-heading-xs ed-num text-midnight-ink">
            {formatCurrency(rentalSummary.totalRevenue)}
          </div>
          <div className="mt-2 ed-caption ed-muted ed-num">
            {rentalSummary.totalRentals} {rentalSummary.totalRentals === 1 ? 'arriendo' : 'arriendos'} ({rentalSummary.activeCount} activos · {rentalSummary.completedCount} devueltos)
          </div>
        </div>

        <div className="ed-card">
          <div className="flex items-center justify-between">
            <span className="ed-eyebrow">Nómina Staff</span>
            <Users className="w-5 h-5 text-signal-blue" />
          </div>
          <div className="mt-4 font-display font-bold text-heading-xs ed-num text-signal-blue">
            {formatCurrency(summary.totalInstructorPayout)}
          </div>
          <div className="mt-2 ed-caption ed-muted">
            Total a liquidar (exclusivo de clases)
          </div>
        </div>

        <div className="ed-card-ink">
          <div className="flex items-center justify-between">
            <span className="font-bold text-caption uppercase text-saffron-yellow tracking-[0.05em]">
              Ganancia Neta Total
            </span>
            <TrendingUp className="w-5 h-5 text-saffron-yellow" />
          </div>
          <div className="mt-4 font-display font-bold text-heading-xs ed-num text-cream-paper">
            {formatCurrency(summary.combinedNetProfit)}
          </div>
          <div className="mt-2 ed-caption text-cream-paper/70 ed-num">
            Caja bruta {formatCurrency(summary.combinedRevenue)} menos nómina
          </div>
        </div>
      </section>

      {/* 2. LEADERBOARD DE INSTRUCTORES */}
      <section className="ed-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-midnight-ink">
          <div>
            <span className="ed-eyebrow">Liquidación del Día</span>
            <h2 className="ed-h2 mt-1 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-signal-blue" />
              Leaderboard de Instructores
            </h2>
          </div>
          <span className="ed-caption ed-muted">
            Haz clic en una fila para ver el desglose individual de clases
          </span>
        </div>

        <div className="border border-midnight-ink overflow-x-auto">
          <table className="ed-table">
            <thead>
              <tr>
                <th className="w-20 text-center">Pos.</th>
                <th>Instructor / Participación</th>
                <th className="text-center">Clases</th>
                <th>Desglose de Tarifas</th>
                <th className="text-right">Monto a Liquidar</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardSettlements.map((row, index) => {
                const isExpanded = expandedId === row.instructor.id;
                const barPercent =
                  row.totalToTransfer > 0
                    ? Math.max(8, Math.round((row.totalToTransfer / maxInstructorPayout) * 100))
                    : 0;

                return (
                  <React.Fragment key={row.instructor.id}>
                    <tr
                      onClick={() => toggleExpand(row.instructor.id)}
                      className="cursor-pointer hover:bg-midnight-ink/5 transition-colors"
                    >
                      {/* Posición */}
                      <td className="text-center">
                        <span
                          className={`ed-tag ${
                            index === 0 && row.totalToTransfer > 0
                              ? 'ed-tag-ink font-bold'
                              : 'font-normal'
                          }`}
                        >
                          #{index + 1}
                        </span>
                      </td>

                      {/* Instructor y barra plana de proporción */}
                      <td>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-signal-blue shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-midnight-ink/40 shrink-0" />
                          )}
                          <span className="font-bold text-caption text-midnight-ink">
                            {row.instructor.name}
                          </span>
                          {index === 0 && row.totalToTransfer > 0 && (
                            <span className="ed-tag ed-tag-blue">
                              Líder Día
                            </span>
                          )}
                        </div>

                        <div className="mt-3 max-w-xs">
                          <div className="ed-bar-track">
                            <div
                              className={`h-full ${
                                index === 0 ? 'bg-signal-blue' : 'bg-midnight-ink'
                              }`}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                          <div className="ed-caption ed-muted ed-num mt-1">
                            Aporte a caja: {formatCurrency(row.revenueGenerated)}
                          </div>
                        </div>
                      </td>

                      {/* Cantidad de Clases */}
                      <td className="text-center ed-num text-body font-bold text-midnight-ink">
                        {row.classCount}
                      </td>

                      {/* Desglose */}
                      <td className="ed-caption">
                        {row.breakdown}
                      </td>

                      {/* Monto a Pagar */}
                      <td className="text-right ed-num font-bold text-subheading text-midnight-ink">
                        {formatCurrency(row.totalToTransfer)}
                      </td>
                    </tr>

                    {/* Sub-tabla desplegable con detalle de sesiones */}
                    {isExpanded && row.classes.length > 0 && (
                      <tr>
                        <td colSpan={5} className="bg-cream-paper p-6 border-b border-midnight-ink">
                          <div className="space-y-3 border-l-2 border-signal-blue pl-4">
                            <div className="font-bold text-caption text-signal-blue uppercase">
                              Sesiones impartidas hoy por {row.instructor.name}:
                            </div>
                            <div className="space-y-2">
                              {row.classes.map((cls) => (
                                <div
                                  key={cls.id}
                                  className="p-3 border border-midnight-ink bg-cream-paper flex items-center justify-between text-caption"
                                >
                                  <div className="flex items-center gap-4">
                                    <span className="font-bold ed-num text-midnight-ink">
                                      {cls.startTime}–{cls.endTime}
                                    </span>
                                    <span className="font-bold text-midnight-ink">
                                      {cls.studentName}
                                    </span>
                                    <span className="ed-muted">
                                      {cls.category === 'curso'
                                        ? 'Curso (Pack 8)'
                                        : cls.modality === 'grupal'
                                        ? `Grupal [${cls.pax} pax]`
                                        : 'Individual (1 pax)'}
                                    </span>
                                  </div>
                                  <span className="font-bold text-signal-blue ed-num">
                                    +{formatCurrency(cls.instructorPay)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="uppercase font-bold text-signal-blue">
                  Total Liquidación Staff
                </td>
                <td className="text-center ed-num font-bold">
                  {summary.totalClasses}
                </td>
                <td className="ed-caption ed-muted">
                  Cálculo según tarifas vigentes del Módulo 01
                </td>
                <td className="text-right font-display font-bold text-heading-xs text-signal-blue ed-num">
                  {formatCurrency(summary.totalInstructorPayout)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 3. GRÁFICOS DE DISTRIBUCIÓN DIARIA */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribución por Medio de Pago */}
        <div className="ed-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-midnight-ink">
            <div>
              <span className="ed-eyebrow">Conciliación de Caja</span>
              <h3 className="ed-h3 mt-1">
                Medios de Pago (Hoy)
              </h3>
            </div>
            <BarChart2 className="w-5 h-5 text-signal-blue" />
          </div>

          <div className="space-y-4">
            {Object.entries(dailyBreakdowns.byPayment).map(([method, info]) => {
              const pct =
                summary.totalRevenue > 0
                  ? Math.round((info.amount / summary.totalRevenue) * 100)
                  : 0;
              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-bold text-midnight-ink">
                      {method}{' '}
                      <span className="ed-muted font-normal ed-num">
                        ({info.count} {info.count === 1 ? 'op.' : 'ops.'})
                      </span>
                    </span>
                    <span className="font-bold ed-num text-midnight-ink">
                      {formatCurrency(info.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="ed-bar-track">
                    <div
                      className={`h-full ${info.color} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribución por Tipo de Clase */}
        <div className="ed-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-midnight-ink">
            <div>
              <span className="ed-eyebrow">Mix Comercial</span>
              <h3 className="ed-h3 mt-1">
                Tipo de Clase (Hoy)
              </h3>
            </div>
            <BarChart2 className="w-5 h-5 text-signal-blue" />
          </div>

          <div className="space-y-4">
            {Object.entries(dailyBreakdowns.byType).map(([typeLabel, info]) => {
              const pct =
                summary.totalRevenue > 0
                  ? Math.round((info.amount / summary.totalRevenue) * 100)
                  : 0;
              return (
                <div key={typeLabel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-bold text-midnight-ink">
                      {typeLabel}{' '}
                      <span className="ed-muted font-normal ed-num">
                        ({info.count} {info.count === 1 ? 'clase' : 'clases'})
                      </span>
                    </span>
                    <span className="font-bold ed-num text-midnight-ink">
                      {formatCurrency(info.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="ed-bar-track">
                    <div
                      className={`h-full ${info.color} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3B. MÉTRICAS DE ARRIENDOS (MÓDULO 05) */}
      <section className="ed-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-midnight-ink">
          <div>
            <span className="ed-eyebrow">Módulo 05 · Silo Independiente</span>
            <h2 className="ed-h2 mt-1 flex items-center gap-2">
              <Waves className="w-6 h-6 text-signal-blue" />
              <span>Rendimiento de Arriendos de Equipamiento</span>
            </h2>
          </div>
          <span className="ed-tag ed-tag-blue">
            100% Margen Escuela
          </span>
        </div>

        {/* Sub-KPIs de Arriendos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 border border-midnight-ink bg-cream-paper">
            <span className="ed-caption ed-muted uppercase">Arriendos Totales</span>
            <div className="mt-2 font-display font-bold text-heading-xs ed-num text-midnight-ink">
              {rentalSummary.totalRentals}
            </div>
            <div className="mt-1 ed-caption ed-muted ed-num">
              {rentalSummary.totalUnits} {rentalSummary.totalUnits === 1 ? 'unidad entregada' : 'unidades entregadas'}
            </div>
          </div>

          <div className="p-5 border border-midnight-ink bg-cream-paper">
            <span className="ed-caption ed-muted uppercase">En el Agua (Activos)</span>
            <div className="mt-2 font-display font-bold text-heading-xs ed-num text-signal-blue">
              {rentalSummary.activeCount}
            </div>
            <div className="mt-1 ed-caption ed-muted">
              Equipos en uso en este momento
            </div>
          </div>

          <div className="p-5 border border-midnight-ink bg-cream-paper">
            <span className="ed-caption ed-muted uppercase">Devueltos Conformes</span>
            <div className="mt-2 font-display font-bold text-heading-xs ed-num text-midnight-ink">
              {rentalSummary.completedCount}
            </div>
            <div className="mt-1 ed-caption ed-muted">
              Recepción conforme registrada
            </div>
          </div>

          <div className="p-5 border border-midnight-ink bg-midnight-ink text-cream-paper">
            <span className="font-bold text-caption text-saffron-yellow uppercase">Recaudación Equipamiento</span>
            <div className="mt-2 font-display font-bold text-heading-xs ed-num text-cream-paper">
              {formatCurrency(rentalSummary.totalRevenue)}
            </div>
            <div className="mt-1 ed-caption text-cream-paper/70 ed-num">
              {rentalSummary.totalHours} {rentalSummary.totalHours === 1 ? 'hora contratada' : 'horas contratadas'}
            </div>
          </div>
        </div>

        {/* Gráfico de Barras por Ítem de Equipamiento */}
        <div className="space-y-4 pt-4 border-t border-midnight-ink/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-bold text-caption text-midnight-ink">
              Demanda por Tipo de Equipamiento
            </span>
            <span className="ed-caption ed-muted ed-num">
              Total arriendos: {formatCurrency(rentalSummary.totalRevenue)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {rentalSummary.byItem.map((item) => {
              const pct =
                rentalSummary.totalRevenue > 0
                  ? Math.round((item.amount / rentalSummary.totalRevenue) * 100)
                  : 0;

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-bold text-midnight-ink">
                      {item.label}{' '}
                      <span className="ed-muted font-normal ed-num">
                        ({item.count} {item.count === 1 ? 'arriendo' : 'arriendos'} · {item.units} uds.)
                      </span>
                    </span>
                    <span className="font-bold ed-num text-midnight-ink">
                      {formatCurrency(item.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="ed-bar-track">
                    <div
                      className={`h-full ${item.color} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. GRÁFICO DE EVOLUCIÓN SEMANAL */}
      <section className="ed-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-midnight-ink">
          <div>
            <span className="ed-eyebrow">Historial Operativo</span>
            <h2 className="ed-h2 mt-1 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-signal-blue" />
              <span>Rendimiento Semanal (Lunes a Domingo)</span>
            </h2>
          </div>

          <div className="flex items-center gap-4 ed-caption font-bold">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-signal-blue border border-midnight-ink inline-block" />
              Hoy (En Vivo)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-midnight-ink inline-block" />
              Días Cerrados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blush-pink border border-midnight-ink inline-block" />
              Proyección
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-7 gap-3 sm:gap-5 items-end h-64 pt-6 pb-2 px-2 border-b border-midnight-ink">
            {weeklyData.map((day) => {
              const heightPercent = Math.max(
                10,
                Math.round((day.revenue / maxWeeklyRevenue) * 100)
              );
              const staffPercentOfBar =
                day.revenue > 0 ? Math.round((day.staffPay / day.revenue) * 100) : 0;

              return (
                <div
                  key={day.dayShort}
                  className="h-full flex flex-col items-center justify-end"
                >
                  <div
                    className={`ed-caption ed-num mb-2 text-center ${
                      day.isToday ? 'font-bold text-signal-blue' : 'text-midnight-ink'
                    }`}
                  >
                    {formatCurrency(day.revenue)}
                  </div>

                  <div className="w-full max-w-[3.75rem] h-44 bg-cream-paper border border-midnight-ink flex items-end">
                    <div
                      className={`w-full transition-all duration-300 flex flex-col justify-end ${
                        day.isToday
                          ? 'bg-signal-blue'
                          : day.isProjected
                          ? 'bg-blush-pink'
                          : 'bg-midnight-ink'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${day.dayName}: Caja ${formatCurrency(day.revenue)} | Staff ${formatCurrency(
                        day.staffPay
                      )} | Neta ${formatCurrency(day.netProfit)}`}
                    >
                      <div
                        className="w-full bg-saffron-yellow/85 border-t border-midnight-ink"
                        style={{ height: `${staffPercentOfBar}%` }}
                        title={`Nómina Staff: ${staffPercentOfBar}%`}
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <div
                      className={`font-bold text-caption ${
                        day.isToday ? 'text-signal-blue' : 'text-midnight-ink'
                      }`}
                    >
                      {day.dayShort}
                    </div>
                    <div className="ed-caption ed-muted ed-num">
                      {day.classes} {day.classes === 1 ? 'clase' : 'clases'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totales Acumulados de la Semana */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="ed-card p-5 flex items-center justify-between">
              <div>
                <span className="ed-caption ed-muted uppercase">Facturación Semanal</span>
                <div className="font-display font-bold text-heading-xs text-midnight-ink ed-num mt-1">
                  {formatCurrency(weeklyTotals.revenue)}
                </div>
              </div>
              <span className="ed-tag ed-tag-ink ed-num">
                {weeklyTotals.classes} CLASES
              </span>
            </div>

            <div className="ed-card p-5">
              <span className="ed-caption ed-muted uppercase">Nómina Semanal Staff</span>
              <div className="font-display font-bold text-heading-xs text-signal-blue ed-num mt-1">
                {formatCurrency(weeklyTotals.staffPay)}
              </div>
            </div>

            <div className="ed-card-ink p-5">
              <span className="font-bold text-caption text-saffron-yellow uppercase">Ganancia Neta Semanal</span>
              <div className="font-display font-bold text-heading-xs text-cream-paper ed-num mt-1">
                {formatCurrency(weeklyTotals.netProfit)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
