import React, { useState, useMemo, useEffect } from 'react';
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
import { useSurfSchool } from '../context/SurfSchoolContext';
import {
  formatCurrency,
  buildInstructorBreakdownSummary,
  summarizeClosing,
  getPayableInstructorPay,
  buildCsv,
} from '../utils/calculations';
import { getWeekRange, getWeekdayLabels, formatIsoToDisplayDate } from '../utils/dates';

const STATUS_LABELS = {
  scheduled: 'Agendada',
  pending_instructor: 'Sin instructor',
  completed: 'Realizada',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
};

export default function Module4ClosingDashboard() {
  const {
    instructors,
    getInstructorName,
    classes,
    rentals,
    rentalRates = [],
    todayIso,
    fetchClosingRange,
    schoolBranding,
  } = useSurfSchool();
  const [expandedId, setExpandedId] = useState(null);
  const [weekRows, setWeekRows] = useState([]);
  const [weekError, setWeekError] = useState('');

  // 1. Resumen del día (todo filtrado por fecha en summarizeClosing)
  const closing = useMemo(() => summarizeClosing(classes, rentals, todayIso), [classes, rentals, todayIso]);

  const summary = useMemo(
    () => ({
      totalClasses: closing.totalClasses,
      totalRevenue: closing.classesRevenue,
      totalInstructorPayout: closing.payroll,
      netProfit: closing.classesNetProfit,
      combinedRevenue: closing.combinedRevenue,
      combinedNetProfit: closing.combinedNetProfit,
    }),
    [closing]
  );

  // 1B. Arriendos del día
  const rentalSummary = useMemo(() => {
    const dayRentals = closing.dayRentals;
    const itemColors = {
      tabla_surf: 'bg-blue-950',
      traje_surf: 'bg-sky-600',
      bodyboard: 'bg-sky-400',
      aletas: 'bg-slate-500',
    };
    const byItemMap = {};
    const ensure = (key, label) => {
      if (!byItemMap[key]) {
        byItemMap[key] = { id: key, label, count: 0, units: 0, hours: 0, amount: 0, color: itemColors[key] || 'bg-sky-600' };
      }
      return byItemMap[key];
    };
    rentalRates.forEach((rate) => ensure(rate.id, rate.label));
    dayRentals.forEach((r) => {
      const item = ensure(r.itemId || 'otro', r.itemLabel || 'Equipamiento');
      item.count += 1;
      item.units += Number(r.quantity) || 1;
      item.hours += Number(r.hours) || 1;
      item.amount += Number(r.finalTotal) || 0;
    });
    return {
      activeCount: dayRentals.filter((r) => r.status === 'active').length,
      completedCount: dayRentals.filter((r) => r.status === 'completed').length,
      totalRentals: dayRentals.length,
      totalUnits: dayRentals.reduce((acc, r) => acc + (Number(r.quantity) || 1), 0),
      totalHours: dayRentals.reduce((acc, r) => acc + (Number(r.hours) || 1), 0),
      totalRevenue: closing.rentalsRevenue,
      byItem: Object.values(byItemMap),
    };
  }, [closing, rentalRates]);

  // 2. Leaderboard: nómina por sesión dictada HOY (no-show = $0).
  //    Incluye instructores inactivos que tengan clases hoy, para que el total cuadre.
  const leaderboardSettlements = useMemo(() => {
    const payableToday = closing.dayClasses.filter((c) => c.instructorId);
    const ids = new Set([...instructors.map((i) => i.id), ...payableToday.map((c) => c.instructorId)]);
    const rows = [...ids].map((id) => {
      const inst = instructors.find((i) => i.id === id) || { id, name: `${getInstructorName(id)} (inactivo)` };
      const instClasses = payableToday.filter((c) => c.instructorId === id);
      const dictated = instClasses.filter((c) => c.status !== 'no_show' && c.status !== 'cancelled');
      return {
        instructor: inst,
        classes: instClasses,
        classCount: dictated.length,
        breakdown: buildInstructorBreakdownSummary(dictated),
        totalToTransfer: instClasses.reduce((acc, c) => acc + getPayableInstructorPay(c), 0),
        revenueGenerated: instClasses.reduce((acc, c) => acc + (Number(c.finalTotal) || 0), 0),
      };
    });
    return rows.sort((a, b) =>
      b.totalToTransfer !== a.totalToTransfer ? b.totalToTransfer - a.totalToTransfer : b.classCount - a.classCount
    );
  }, [closing, instructors, getInstructorName]);

  const maxInstructorPayout = useMemo(
    () => Math.max(...leaderboardSettlements.map((r) => r.totalToTransfer), 1),
    [leaderboardSettlements]
  );

  // 3. Semana real (lunes a domingo). En modo real viene de la RPC get_closing_range.
  const week = useMemo(() => getWeekRange(todayIso), [todayIso]);
  useEffect(() => {
    let cancelled = false;
    setWeekError('');
    fetchClosingRange(week.from, week.to)
      .then((rows) => {
        if (!cancelled) setWeekRows(rows);
      })
      .catch((err) => {
        if (!cancelled) setWeekError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // Se recalcula cuando cambian las clases/arriendos de hoy
  }, [week.from, week.to, classes, rentals]); // eslint-disable-line react-hooks/exhaustive-deps

  const weeklyData = useMemo(() => {
    return weekRows.map((r) => {
      const isToday = r.operationDate === todayIso;
      const labels = getWeekdayLabels(r.operationDate);
      // Hoy siempre se muestra con el cálculo local (en vivo)
      const src = isToday
        ? {
            totalClasses: closing.totalClasses,
            combinedRevenue: closing.combinedRevenue,
            payroll: closing.payroll,
            combinedNetProfit: closing.combinedNetProfit,
          }
        : r;
      return {
        date: r.operationDate,
        dayShort: labels.short,
        dayName: `${labels.long} ${formatIsoToDisplayDate(r.operationDate)}${isToday ? ' (HOY)' : ''}`,
        isToday,
        isProjected: r.operationDate > todayIso,
        classes: src.totalClasses,
        revenue: src.combinedRevenue,
        staffPay: src.payroll,
        netProfit: src.combinedNetProfit,
      };
    });
  }, [weekRows, todayIso, closing]);

  const maxWeeklyRevenue = useMemo(() => Math.max(...weeklyData.map((d) => d.revenue), 100000), [weeklyData]);

  // Totales de la semana: solo días ya ocurridos + hoy (lo futuro es agenda, no caja)
  const weeklyTotals = useMemo(
    () =>
      weeklyData
        .filter((d) => !d.isProjected)
        .reduce(
          (acc, d) => ({
            classes: acc.classes + d.classes,
            revenue: acc.revenue + d.revenue,
            staffPay: acc.staffPay + d.staffPay,
            netProfit: acc.netProfit + d.netProfit,
          }),
          { classes: 0, revenue: 0, staffPay: 0, netProfit: 0 }
        ),
    [weeklyData]
  );

  // 4. Desgloses del día
  const dailyBreakdowns = useMemo(() => {
    const colors = { Transferencia: 'bg-blue-950', Tarjeta: 'bg-sky-600', Efectivo: 'bg-sky-400' };
    const byPayment = {};
    Object.entries(closing.byPayment).forEach(([m, info]) => {
      byPayment[m] = { ...info, color: colors[m] || 'bg-sky-600' };
    });

    const byType = {
      Individual: { count: 0, amount: 0, color: 'bg-sky-600' },
      Grupal: { count: 0, amount: 0, color: 'bg-blue-950' },
      'Curso Pack': { count: 0, amount: 0, color: 'bg-slate-700' },
    };
    closing.dayClasses
      .filter((c) => c.status !== 'cancelled')
      .forEach((cls) => {
        const key = cls.category === 'curso' ? 'Curso Pack' : cls.modality === 'grupal' ? 'Grupal' : 'Individual';
        byType[key].count += 1;
        byType[key].amount += Number(cls.finalTotal) || 0;
      });
    return { byPayment, byType };
  }, [closing]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleExportCSV = () => {
    const headers = [
      'Tipo', 'ID', 'Fecha', 'Hora Inicio', 'Hora Término', 'Detalle', 'Estado', 'Instructor',
      'Cliente / Alumno', 'Teléfono', 'Correo', 'Contacto Emergencia', 'Teléfono Emergencia',
      'Medio de Pago', 'Subtotal', 'Descuento', 'Total Caja', 'Pago Instructor',
    ];

    const classRows = closing.dayClasses.map((cls) => [
      'Clase',
      cls.id,
      formatIsoToDisplayDate(cls.operationDate),
      cls.startTime,
      cls.endTime,
      cls.category === 'curso'
        ? `Curso sesión ${cls.sessionIndex}${cls.isPaidInPack ? ' (pack pagado)' : ''}`
        : cls.modality === 'grupal'
        ? `Grupal (${cls.pax} pax)`
        : 'Individual',
      STATUS_LABELS[cls.status] || cls.status,
      getInstructorName(cls.instructorId),
      cls.studentName,
      cls.studentPhone,
      cls.studentEmail,
      cls.emergencyContactName,
      cls.emergencyContactPhone,
      cls.isPaidInPack ? 'Pack pagado' : cls.paymentMethod,
      cls.subtotal,
      cls.discount,
      cls.finalTotal,
      getPayableInstructorPay(cls),
    ]);

    const rentalRows = closing.dayRentals.map((r) => [
      'Arriendo',
      r.id,
      formatIsoToDisplayDate(r.operationDate),
      r.checkInTime,
      r.returnedAt || r.estimatedReturnTime,
      `${r.quantity}x ${r.itemLabel} (${r.hours} h)`,
      r.status === 'completed' ? 'Devuelto' : 'En uso',
      '',
      r.customerName,
      r.customerPhone,
      r.customerEmail,
      r.emergencyContact,
      '',
      r.paymentMethod,
      r.subtotal,
      r.discount,
      r.finalTotal,
      0,
    ]);

    const csvContent = buildCsv(headers, [...classRows, ...rentalRows]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `caja_diaria_${schoolBranding?.slug || 'escuela'}_${todayIso}.csv`);
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
                                      ? `Curso · sesión ${cls.sessionIndex}`
                                      : cls.modality === 'grupal'
                                      ? `Grupal (${cls.pax} pax)`
                                      : 'Individual'}
                                  </span>
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-blue-950">
                                  +{formatCurrency(getPayableInstructorPay(cls))}{cls.status === 'no_show' ? ' (no asistió)' : ''}
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
              Medios de Pago (Hoy · Clases + Arriendos)
            </span>
            <BarChart2 className="w-4 h-4 text-sky-600" />
          </div>

          <div className="space-y-4 pt-1">
            {Object.entries(dailyBreakdowns.byPayment).map(([method, info]) => {
              const pct =
                summary.combinedRevenue > 0
                  ? Math.round((info.amount / summary.combinedRevenue) * 100)
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
              Días anteriores
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 bg-slate-300 inline-block" />
              Agendado (futuro)
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {weekError && (
            <div className="p-3 border border-rose-300 bg-rose-50 text-sm text-rose-800">{weekError}</div>
          )}
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
                  key={day.date}
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
                        className="w-full bg-sky-400 opacity-80 border-t border-white/20"
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
                  Facturación Semana (hasta hoy)
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
                Nómina Semana (hasta hoy)
              </div>
              <div className="text-xl font-mono font-bold tabular-nums text-sky-700 mt-1">
                {formatCurrency(weeklyTotals.staffPay)}
              </div>
            </div>

            <div className="p-4 border border-slate-200 bg-blue-950 text-white">
              <div className="text-xs font-bold uppercase tracking-widest text-sky-400">
                Ganancia Neta Semana (hasta hoy)
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
