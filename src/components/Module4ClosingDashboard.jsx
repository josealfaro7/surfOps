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
  const { instructors, dailyClasses } = useSurfSchool();
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

    return {
      totalClasses,
      totalRevenue,
      totalInstructorPayout,
      netProfit,
    };
  }, [dailyClasses]);

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
          revenue: summary.totalRevenue,
          staffPay: summary.totalInstructorPayout,
          netProfit: summary.netProfit,
        };
      }
      return {
        ...d,
        netProfit: d.revenue - d.staffPay,
      };
    });
  }, [summary]);

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
      Transferencia: { count: 0, amount: 0, color: 'bg-blue-950' },
      Tarjeta: { count: 0, amount: 0, color: 'bg-sky-500' },
      Efectivo: { count: 0, amount: 0, color: 'bg-pink-600' },
    };

    const byType = {
      Individual: { count: 0, amount: 0, color: 'bg-sky-500' },
      Grupal: { count: 0, amount: 0, color: 'bg-blue-950' },
      'Curso Pack 8': { count: 0, amount: 0, color: 'bg-pink-600' },
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

  // Exportación estructurada de DailyClasses a archivo CSV (caja_diaria_poisson.csv)
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Cabecera con Botón de Exportar Caja (CSV) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-300">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-600">
            <span className="w-2 h-2 bg-pink-600 inline-block" />
            Módulo 04 · Liquidación y Reportes
          </span>
          <h1 className="text-2xl font-bold text-blue-950 mt-1">
            Cierre Diario, Leaderboard de Instructores y Métricas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Estado de resultados del día, tabla de liquidación por instructor y evolución semanal de ingresos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="h-11 px-5 rounded-none border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold transition self-start md:self-auto cursor-pointer shrink-0"
        >
          ⬇ Exportar Caja (CSV)
        </button>
      </div>

      {/* 1. RESUMEN EJECUTIVO DEL DÍA */}
      <section className="grid grid-cols-1 md:grid-cols-3 border border-slate-300 bg-white divide-y md:divide-y-0 md:divide-x divide-slate-300 rounded-none">
        <div className="p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Caja Total Escuela
            </span>
            <Wallet className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-3xl font-mono font-bold text-blue-950">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            {summary.totalClasses} clases registradas hoy
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total a Repartir (Staff)
            </span>
            <Users className="w-4 h-4 text-pink-600" />
          </div>
          <div className="mt-2 text-3xl font-mono font-bold text-sky-600">
            {formatCurrency(summary.totalInstructorPayout)}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Nómina acumulada de instructores
          </div>
        </div>

        <div className="p-6 bg-blue-950 text-white border-b-4 border-b-pink-600">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Ganancia Neta Escuela
            </span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-3xl font-mono font-bold text-white">
            {formatCurrency(summary.netProfit)}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-300">
            Ingresos brutos menos nómina de instructores
          </div>
        </div>
      </section>

      {/* 2. LEADERBOARD DE INSTRUCTORES (TABLA DE LIQUIDACIÓN CORPORATIVA CON ZEBRA STRIPING) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-950">
              Leaderboard de Instructores · Liquidación Diaria
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Haz clic en una fila para desplegar el detalle de clases
          </span>
        </div>

        <div className="border border-slate-300 bg-white rounded-none overflow-x-auto">
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
            <tbody className="divide-y divide-slate-200 text-sm">
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
                      className="even:bg-slate-50/80 hover:bg-sky-50/60 cursor-pointer transition"
                    >
                      {/* Ranking */}
                      <td className="py-4 px-4 text-center font-mono">
                        <span
                          className={`inline-block w-8 py-1 text-xs font-bold text-center rounded-none ${
                            index === 0 && row.totalToTransfer > 0
                              ? 'bg-blue-950 text-white border-b-2 border-pink-600'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          #{index + 1}
                        </span>
                      </td>

                      {/* Instructor y barra plana */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-sky-600 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-semibold text-base text-blue-950">
                            {row.instructor.name}
                          </span>
                          {index === 0 && row.totalToTransfer > 0 && (
                            <span className="px-2 py-0.5 bg-pink-600 text-white text-[10px] font-semibold uppercase tracking-wider rounded-none">
                              Líder Día
                            </span>
                          )}
                        </div>

                        <div className="mt-2 pl-6 max-w-xs">
                          <div className="w-full h-1.5 bg-slate-200 rounded-none overflow-hidden">
                            <div
                              className={`h-full ${
                                index === 0 ? 'bg-blue-950' : 'bg-sky-500'
                              }`}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Recaudación en caja: {formatCurrency(row.revenueGenerated)}
                          </div>
                        </div>
                      </td>

                      {/* Cantidad de Clases */}
                      <td className="py-4 px-4 text-center font-mono font-semibold text-base text-blue-950">
                        {row.classCount}
                      </td>

                      {/* Desglose */}
                      <td className="py-4 px-4 font-medium text-slate-700">
                        {row.breakdown}
                      </td>

                      {/* Monto a Pagar Destacado en Negrita y Azul Oscuro */}
                      <td className="py-4 px-6 text-right font-mono font-bold text-lg text-blue-950">
                        {formatCurrency(row.totalToTransfer)}
                      </td>
                    </tr>

                    {/* Sub-tabla de trazabilidad de clases */}
                    {isExpanded && row.classes.length > 0 && (
                      <tr>
                        <td colSpan={5} className="bg-slate-100 px-8 py-4 border-t border-slate-300">
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                              Detalle de sesiones dictadas por {row.instructor.name}:
                            </div>
                            {row.classes.map((cls) => (
                              <div
                                key={cls.id}
                                className="px-4 py-2.5 bg-white border border-slate-300 rounded-none flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="font-mono font-semibold text-blue-950">
                                    {cls.startTime}–{cls.endTime}
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {cls.studentName}
                                  </span>
                                  <span className="text-slate-500">
                                    {cls.category === 'curso'
                                      ? 'Curso (Pack 8)'
                                      : cls.modality === 'grupal'
                                      ? `Grupal [${cls.pax} pax]`
                                      : 'Individual (1 pax)'}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-blue-950">
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
              <tr className="bg-slate-100 border-t-2 border-slate-300 text-sm font-bold text-blue-950">
                <td colSpan={2} className="py-4 px-4 uppercase tracking-wider">
                  Total Liquidación Staff
                </td>
                <td className="py-4 px-4 text-center font-mono">{summary.totalClasses}</td>
                <td className="py-4 px-4 text-xs font-medium text-slate-500">
                  Suma exacta según tarifas vigentes en SchoolConfig
                </td>
                <td className="py-4 px-6 text-right font-mono text-xl font-bold text-blue-950">
                  {formatCurrency(summary.totalInstructorPayout)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 3. GRÁFICOS DE DISTRIBUCIÓN DIARIA (MEDIOS DE PAGO Y MODALIDADES) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Medio de Pago */}
        <div className="border border-slate-300 bg-white rounded-none">
          <div className="px-5 py-3.5 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Distribución por Medio de Pago (Hoy)
            </span>
            <BarChart2 className="w-4 h-4 text-sky-400" />
          </div>

          <div className="p-5 space-y-4">
            {Object.entries(dailyBreakdowns.byPayment).map(([method, info]) => {
              const pct =
                summary.totalRevenue > 0
                  ? Math.round((info.amount / summary.totalRevenue) * 100)
                  : 0;
              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">
                      {method}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({info.count} {info.count === 1 ? 'operación' : 'operaciones'})
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-blue-950">
                      {formatCurrency(info.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 border border-slate-300 rounded-none overflow-hidden">
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

        {/* Distribución por Modalidad / Categoría */}
        <div className="border border-slate-300 bg-white rounded-none">
          <div className="px-5 py-3.5 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Distribución por Tipo de Clase (Hoy)
            </span>
            <BarChart2 className="w-4 h-4 text-sky-400" />
          </div>

          <div className="p-5 space-y-4">
            {Object.entries(dailyBreakdowns.byType).map(([typeLabel, info]) => {
              const pct =
                summary.totalRevenue > 0
                  ? Math.round((info.amount / summary.totalRevenue) * 100)
                  : 0;
              return (
                <div key={typeLabel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">
                      {typeLabel}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({info.count} {info.count === 1 ? 'clase' : 'clases'})
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-blue-950">
                      {formatCurrency(info.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 border border-slate-300 rounded-none overflow-hidden">
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

      {/* 4. GRÁFICO DE EVOLUCIÓN SEMANAL (LUNES A DOMINGO) */}
      <section className="border border-slate-300 bg-white rounded-none">
        <div className="px-6 py-4 bg-blue-950 text-white border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Rendimiento Semanal de la Escuela (Lunes a Domingo)
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-950 border border-pink-500 inline-block" />
              Hoy (En Vivo)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-sky-500 inline-block" />
              Días Cerrados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-slate-300 inline-block" />
              Proyección
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
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
                    className={`text-[11px] sm:text-xs font-mono font-semibold mb-2 text-center ${
                      day.isToday ? 'text-blue-950 font-bold' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(day.revenue)}
                  </div>

                  <div className="w-full max-w-[3.75rem] h-44 bg-slate-100 border border-slate-300 flex items-end rounded-none">
                    <div
                      className={`w-full transition-all duration-300 flex flex-col justify-end rounded-none ${
                        day.isToday
                          ? 'bg-blue-950 border-t-4 border-t-pink-600'
                          : day.isProjected
                          ? 'bg-slate-300'
                          : 'bg-sky-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${day.dayName}: Caja ${formatCurrency(day.revenue)} | Staff ${formatCurrency(
                        day.staffPay
                      )} | Neta ${formatCurrency(day.netProfit)}`}
                    >
                      <div
                        className="w-full bg-pink-600/85 border-t border-white/20"
                        style={{ height: `${staffPercentOfBar}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 text-center">
                    <div
                      className={`text-xs font-mono font-bold ${
                        day.isToday ? 'text-pink-600' : 'text-blue-950'
                      }`}
                    >
                      {day.dayShort}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {day.classes} {day.classes === 1 ? 'clase' : 'clases'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totales Acumulados de la Semana */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-300 bg-slate-50 rounded-none flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Facturación Semanal
                </div>
                <div className="text-xl font-mono font-bold text-blue-950 mt-0.5">
                  {formatCurrency(weeklyTotals.revenue)}
                </div>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-white border border-slate-300 text-blue-950">
                {weeklyTotals.classes} CLASES
              </span>
            </div>

            <div className="p-4 border border-slate-300 bg-slate-50 rounded-none">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Nómina Semanal Staff
              </div>
              <div className="text-xl font-mono font-bold text-sky-600 mt-0.5">
                {formatCurrency(weeklyTotals.staffPay)}
              </div>
            </div>

            <div className="p-4 border border-blue-950 bg-blue-950 border-b-2 border-b-pink-600 text-white rounded-none">
              <div className="text-xs font-semibold uppercase text-sky-400">
                Ganancia Neta Semanal
              </div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">
                {formatCurrency(weeklyTotals.netProfit)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
