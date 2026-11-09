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

  // 1. Resumen General del Día
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

  // 1B. Resumen y Distribución de Arriendos del Día
  const rentalSummary = useMemo(() => {
    const allRentals = [...activeRentals, ...completedRentals];
    const activeCount = activeRentals.length;
    const completedCount = completedRentals.length;
    const totalRentals = allRentals.length;
    const totalUnits = allRentals.reduce((acc, r) => acc + (Number(r.quantity) || 1), 0);
    const totalHours = allRentals.reduce((acc, r) => acc + (Number(r.hours) || 1), 0);

    const itemColors = {
      tabla_surf: 'bg-blue-950',
      traje_surf: 'bg-sky-600',
      bodyboard: 'bg-sky-400',
      aletas: 'bg-slate-500',
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
        color: itemColors[rate.id] || 'bg-sky-600',
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
          color: itemColors[key] || 'bg-sky-600',
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

  // 2. Leaderboard de Instructores
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

  // 4. Desglose Diario para Gráficos
  const dailyBreakdowns = useMemo(() => {
    const byPayment = {
      Transferencia: { count: 0, amount: 0, color: 'bg-blue-950' },
      Tarjeta: { count: 0, amount: 0, color: 'bg-sky-600' },
      Efectivo: { count: 0, amount: 0, color: 'bg-sky-400' },
    };

    const byType = {
      Individual: { count: 0, amount: 0, color: 'bg-sky-600' },
      Grupal: { count: 0, amount: 0, color: 'bg-blue-950' },
      'Curso Pack 8': { count: 0, amount: 0, color: 'bg-slate-700' },
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
    link.setAttribute('download', `caja_diaria_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-inter">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
            Módulo 04 · Inteligencia de Negocio & Liquidación
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
            Cierre Diario y Balance Operativo
          </h1>
          <p className="text-sm font-light text-slate-600 leading-relaxed mt-1">
            Estado de resultados de la jornada, balance de nómina a transferir y proyección semanal consolidada.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-sm transition-colors self-start md:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-sky-600" />
          Exportar Caja (CSV)
        </button>
      </div>

      {/* 1. RESUMEN EJECUTIVO (4 KPI Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Caja Clases (Hoy)
            </span>
            <Wallet className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold tabular-nums text-blue-950">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div className="mt-1 text-xs font-light text-slate-500">
            {summary.totalClasses} {summary.totalClasses === 1 ? 'clase registrada' : 'clases registradas'} hoy
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Caja Arriendos (Hoy)
            </span>
            <Waves className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold tabular-nums text-blue-950">
            {formatCurrency(rentalSummary.totalRevenue)}
          </div>
          <div className="mt-1 text-xs font-light text-slate-500">
            {rentalSummary.totalRentals} {rentalSummary.totalRentals === 1 ? 'arriendo' : 'arriendos'} ({rentalSummary.activeCount} en curso)
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Nómina a Liquidar Staff
            </span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold tabular-nums text-sky-700">
            {formatCurrency(summary.totalInstructorPayout)}
          </div>
          <div className="mt-1 text-xs font-light text-slate-500">
            Liquidación neta exclusiva de clases
          </div>
        </div>

        <div className="bg-blue-950 text-white border-t-4 border-sky-400 shadow-sm p-6">
          <div className="flex items-center justify-between text-sky-300">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Ganancia Neta Total
            </span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 text-3xl font-mono font-bold tabular-nums text-white">
            {formatCurrency(summary.combinedNetProfit)}
          </div>
          <div className="mt-1 text-xs font-light text-slate-300">
            Caja bruta {formatCurrency(summary.combinedRevenue)} menos staff
          </div>
        </div>
      </section>

      {/* 2. LEADERBOARD DE INSTRUCTORES */}
      <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-sky-600" />
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Liquidación Operativa
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Leaderboard de Instructores
              </h2>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            Haz clic en una fila para desplegar el desglose
          </span>
        </div>

        <div className="border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-950 text-white text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-16">Pos.</th>
                <th className="py-3.5 px-4">Instructor / Participación</th>
                <th className="py-3.5 px-4 text-center">Clases</th>
                <th className="py-3.5 px-4">Desglose Operativo</th>
                <th className="py-3.5 px-6 text-right">Monto a Pagar Hoy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
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
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-4 px-4 text-center font-mono">
                        <span
                          className={`inline-block w-8 py-1 text-xs font-bold text-center tabular-nums ${
                            index === 0 && row.totalToTransfer > 0
                              ? 'bg-blue-950 text-white border-l-2 border-sky-400'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          #{index + 1}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-sky-600 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-semibold text-sm text-blue-950">
                            {row.instructor.name}
                          </span>
                          {index === 0 && row.totalToTransfer > 0 && (
                            <span className="px-2 py-0.5 bg-blue-950 text-sky-300 text-xs font-bold uppercase tracking-wider">
                              Líder del Día
                            </span>
                          )}
                        </div>

                        <div className="mt-2 pl-6 max-w-xs">
                          <div className="w-full h-1.5 bg-slate-100 border border-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-blue-950 transition-all duration-300"
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1 tabular-nums font-light">
                            Recaudado en caja: {formatCurrency(row.revenueGenerated)}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center tabular-nums font-semibold text-sm text-blue-950">
                        {row.classCount}
                      </td>

                      <td className="py-4 px-4 font-light text-slate-600 text-xs">
                        {row.breakdown}
                      </td>

                      <td className="py-4 px-6 text-right tabular-nums font-bold text-base text-blue-950">
                        {formatCurrency(row.totalToTransfer)}
                      </td>
                    </tr>

                    {isExpanded && row.classes.length > 0 && (
                      <tr>
                        <td colSpan={5} className="bg-slate-50 px-8 py-4 border-t border-slate-200">
                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-sky-700 mb-2">
                              Detalle de clases asignadas a {row.instructor.name}:
                            </div>
                            {row.classes.map((cls) => (
                              <div
                                key={cls.id}
                                className="px-4 py-2.5 bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="font-mono font-medium tabular-nums text-blue-950">
                                    {cls.startTime}–{cls.endTime} hrs
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {cls.studentName}
                                  </span>
                                  <span className="text-slate-500 font-light">
                                    {cls.category === 'curso'
                                      ? 'Curso Pack 8'
                                      : cls.modality === 'grupal'
                                      ? `Grupal (${cls.pax} pax)`
                                      : 'Individual'}
                                  </span>
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-blue-950">
                                  +{formatCurrency(cls.instructorPay)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-300 text-sm font-semibold text-blue-950">
                <td colSpan={2} className="py-4 px-4 uppercase tracking-wider text-xs font-bold">
                  Total Liquidación Staff
                </td>
                <td className="py-4 px-4 text-center tabular-nums font-mono">{summary.totalClasses}</td>
                <td className="py-4 px-4 text-xs font-light text-slate-500">
                  Suma computable según tarifas vigentes
                </td>
                <td className="py-4 px-6 text-right font-mono text-lg font-bold tabular-nums text-blue-950">
                  {formatCurrency(summary.totalInstructorPayout)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 3. GRÁFICOS DE DISTRIBUCIÓN DIARIA */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Medios de Pago (Hoy)
            </span>
            <BarChart2 className="w-4 h-4 text-sky-600" />
          </div>

          <div className="space-y-4 pt-1">
            {Object.entries(dailyBreakdowns.byPayment).map(([method, info]) => {
              const pct =
                summary.totalRevenue > 0
                  ? Math.round((info.amount / summary.totalRevenue) * 100)
                  : 0;
              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {method}{' '}
                      <span className="text-xs font-light text-slate-500">
                        ({info.count} {info.count === 1 ? 'operación' : 'operaciones'})
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold text-blue-950">
                      {formatCurrency(info.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 border border-slate-200 overflow-hidden">
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

        <div className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Tipo de Servicio (Hoy)
            </span>
            <BarChart2 className="w-4 h-4 text-sky-600" />
          </div>

          <div className="space-y-4 pt-1">
            {Object.entries(dailyBreakdowns.byType).map(([typeLabel, info]) => {
              const pct =
                summary.totalRevenue > 0
                  ? Math.round((info.amount / summary.totalRevenue) * 100)
                  : 0;
              return (
                <div key={typeLabel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {typeLabel}{' '}
                      <span className="text-xs font-light text-slate-500">
                        ({info.count} {info.count === 1 ? 'clase' : 'clases'})
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold text-blue-950">
                      {formatCurrency(info.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 border border-slate-200 overflow-hidden">
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

      {/* 3B. ARRIENDOS DE EQUIPAMIENTO */}
      <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Waves className="w-5 h-5 text-sky-600" />
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Equipamiento
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Métricas de Arriendos
              </h2>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-light">
            Margen neto directo de escuela (independiente de staff)
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Total Arriendos
            </div>
            <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-blue-950">
              {rentalSummary.totalRentals}
            </div>
            <div className="text-xs font-light text-slate-500 mt-0.5">
              {rentalSummary.totalUnits} {rentalSummary.totalUnits === 1 ? 'unidad' : 'unidades'} entregadas
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
              En Uso (En Agua)
            </div>
            <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-sky-700">
              {rentalSummary.activeCount}
            </div>
            <div className="text-xs font-light text-slate-500 mt-0.5">
              Equipos actualmente activos
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Devueltos
            </div>
            <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-emerald-700">
              {rentalSummary.completedCount}
            </div>
            <div className="text-xs font-light text-slate-500 mt-0.5">
              Cierre conforme registrado
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Recaudación Arriendos
            </div>
            <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-blue-950">
              {formatCurrency(rentalSummary.totalRevenue)}
            </div>
            <div className="text-xs font-light text-slate-500 mt-0.5">
              {rentalSummary.totalHours} {rentalSummary.totalHours === 1 ? 'hora' : 'horas'} contratadas
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Demanda por Tipo de Equipamiento
            </span>
            <span className="text-xs text-slate-500">
              Participación sobre total arriendos
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {item.label}{' '}
                      <span className="text-xs font-light text-slate-500">
                        ({item.count} {item.count === 1 ? 'arriendo' : 'arriendos'})
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold text-blue-950">
                      {formatCurrency(item.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 border border-slate-200 overflow-hidden">
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

      {/* 4. EVOLUCIÓN SEMANAL */}
      <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-sky-600" />
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Tendencia & Proyección
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Evolución Semanal Consolidada
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 bg-blue-950 inline-block" />
              Hoy (En Vivo)
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 bg-sky-600 inline-block" />
              Cerrados
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 bg-slate-300 inline-block" />
              Proyectados
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-7 gap-3 sm:gap-5 items-end h-64 pt-6 pb-2 px-2 border-b border-slate-200">
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
                    className={`text-xs font-mono tabular-nums font-semibold mb-2 text-center ${
                      day.isToday ? 'text-blue-950 font-bold' : 'text-slate-600'
                    }`}
                  >
                    {formatCurrency(day.revenue)}
                  </div>

                  <div className="w-full max-w-[3.75rem] h-44 bg-slate-100 border border-slate-200 flex items-end">
                    <div
                      className={`w-full transition-all duration-300 flex flex-col justify-end ${
                        day.isToday
                          ? 'bg-blue-950 border-t-2 border-sky-400'
                          : day.isProjected
                          ? 'bg-slate-300'
                          : 'bg-sky-600'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${day.dayName}: Caja ${formatCurrency(day.revenue)} | Staff ${formatCurrency(
                        day.staffPay
                      )} | Neta ${formatCurrency(day.netProfit)}`}
                    >
                      <div
                        className="w-full bg-sky-400/80 border-t border-white/20"
                        style={{ height: `${staffPercentOfBar}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 text-center">
                    <div
                      className={`text-xs font-bold uppercase tracking-wider ${
                        day.isToday ? 'text-sky-700' : 'text-blue-950'
                      }`}
                    >
                      {day.dayShort}
                    </div>
                    <div className="text-xs font-light text-slate-500 tabular-nums">
                      {day.classes} {day.classes === 1 ? 'clase' : 'clases'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
                  Facturación Semanal
                </div>
                <div className="text-xl font-mono font-bold tabular-nums text-blue-950 mt-1">
                  {formatCurrency(weeklyTotals.revenue)}
                </div>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-white border border-slate-200 text-blue-950">
                {weeklyTotals.classes} CLASES
              </span>
            </div>

            <div className="p-4 border border-slate-200 bg-slate-50">
              <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Nómina Semanal Staff
              </div>
              <div className="text-xl font-mono font-bold tabular-nums text-sky-700 mt-1">
                {formatCurrency(weeklyTotals.staffPay)}
              </div>
            </div>

            <div className="p-4 border border-slate-200 bg-blue-950 text-white">
              <div className="text-xs font-bold uppercase tracking-widest text-sky-400">
                Ganancia Neta Semanal
              </div>
              <div className="text-xl font-mono font-bold tabular-nums text-white mt-1">
                {formatCurrency(weeklyTotals.netProfit)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
