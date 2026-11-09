import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Clock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import {
  formatCurrency,
  timeToMinutes,
  addMinutesToTime,
  calculateRentalTotals,
} from '../utils/calculations';
import { compressImageFileToBase64 } from '../utils/imageUtils';
import ModuleHeader from './ui/ModuleHeader';

function getCurrentHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

/**
 * Subcomponente aislado para la Sección B (Monitor de Arriendos Activos).
 * Mantiene su propio reloj (setInterval) para no re-renderizar el formulario de la Sección A.
 */
function ActiveRentalsMonitor({
  activeRentals,
  completedRentals,
  onCompleteRental,
  onInspectPhoto,
}) {
  const [currentHHMM, setCurrentHHMM] = useState(getCurrentHHMM);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentHHMM(getCurrentHHMM());
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const currentMinutes = timeToMinutes(currentHHMM);

  return (
    <div className="space-y-12">
      {/* SECCIÓN B: PANEL DE ARRIENDOS ACTIVOS (MONITOR) */}
      <section className="ed-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-midnight-ink">
          <div>
            <span className="ed-eyebrow">Monitor en Tiempo Real</span>
            <h2 className="ed-h2 mt-1 flex items-center gap-2">
              <Clock className="w-6 h-6 text-signal-blue" />
              <span>Sección B · Arriendos en Curso (En Agua)</span>
            </h2>
          </div>
          <div className="flex items-center gap-4 ed-caption ed-num">
            <span className="ed-muted font-normal">
              Hora del sistema: <strong className="text-midnight-ink font-bold">{currentHHMM} hrs</strong>
            </span>
            <span className="ed-tag ed-tag-ink font-bold">
              Activos: {activeRentals.length}
            </span>
          </div>
        </div>

        {activeRentals.length === 0 ? (
          <div className="p-8 text-center ed-body ed-muted border border-midnight-ink">
            No hay arriendos de equipamiento activos en este momento.
          </div>
        ) : (
          <div className="overflow-x-auto border border-midnight-ink">
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Cliente / Emergencia</th>
                  <th>Teléfono</th>
                  <th>Ítem</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-center">Horas</th>
                  <th>Devolución Estimada</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeRentals.map((rental) => {
                  const returnMinutes = timeToMinutes(rental.estimatedReturnTime);
                  const isOverdue = currentMinutes > returnMinutes;

                  return (
                    <tr
                      key={rental.id}
                      className={isOverdue ? 'bg-ember-red/5' : ''}
                    >
                      <td>
                        <div className="font-bold text-midnight-ink">
                          {rental.customerName}
                        </div>
                        {rental.customerEmail && (
                          <div className="ed-caption ed-muted">
                            {rental.customerEmail}
                          </div>
                        )}
                        {rental.emergencyContact && (
                          <div className="ed-caption font-bold text-ember-red mt-1">
                            Emergencia: {rental.emergencyContact}
                          </div>
                        )}
                      </td>
                      <td className="ed-num font-bold">
                        {rental.customerPhone}
                      </td>
                      <td>
                        <span className="font-bold text-midnight-ink">
                          {rental.itemLabel}
                        </span>
                        <span className="block ed-caption ed-muted ed-num">
                          {formatCurrency(rental.unitPricePerHour)} / hr
                        </span>
                      </td>
                      <td className="text-center ed-num font-bold">
                        {rental.quantity}
                      </td>
                      <td className="text-center">
                        <span className="ed-tag font-normal ed-num">
                          {rental.hours} {rental.hours === 1 ? 'hr' : 'hrs'}
                        </span>
                      </td>
                      <td>
                        <div className="ed-caption ed-muted ed-num">
                          Salida: {rental.checkInTime} hrs
                        </div>
                        <div
                          className={`font-bold ed-num ${
                            isOverdue ? 'text-ember-red' : 'text-midnight-ink'
                          }`}
                        >
                          Entrega: {rental.estimatedReturnTime} hrs
                        </div>
                      </td>
                      <td className="text-right font-bold text-midnight-ink ed-num">
                        {formatCurrency(rental.finalTotal)}
                      </td>
                      <td className="text-center">
                        {isOverdue ? (
                          <span className="ed-tag ed-tag-alert animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            Atrasado
                          </span>
                        ) : (
                          <span className="ed-tag ed-tag-blue">
                            En Curso
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectPhoto(rental)}
                            title="Ver Carnet de Identidad"
                            className="ed-btn ed-btn-sm"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-signal-blue" />
                            Carnet
                          </button>
                          <button
                            type="button"
                            onClick={() => onCompleteRental(rental.id)}
                            className="ed-btn ed-btn-sm ed-btn-active"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-cream-paper" />
                            Devuelto
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* HISTORIAL DE ARRIENDOS COMPLETADOS */}
      {completedRentals.length > 0 && (
        <section className="ed-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-midnight-ink">
            <div>
              <span className="ed-eyebrow">Bitácora del Día</span>
              <h3 className="ed-h3 mt-1 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-signal-blue" />
                <span>Historial de Arriendos Completados Hoy ({completedRentals.length})</span>
              </h3>
            </div>
            <span className="ed-tag">
              surfops_completed_rentals
            </span>
          </div>

          <div className="overflow-x-auto border border-midnight-ink">
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Equipamiento</th>
                  <th>Horario (Salida a Devolución)</th>
                  <th className="text-right">Total Pagado</th>
                  <th className="text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {completedRentals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-bold text-midnight-ink">
                        {item.customerName}
                      </span>{' '}
                      <span className="ed-caption ed-muted ed-num font-normal">
                        ({item.customerPhone})
                      </span>
                    </td>
                    <td className="ed-num font-bold">
                      {item.quantity}x {item.itemLabel} ({item.hours}h)
                    </td>
                    <td className="ed-num">
                      {item.checkInTime} a {item.returnedAt || item.estimatedReturnTime} hrs
                    </td>
                    <td className="text-right font-bold text-midnight-ink ed-num">
                      {formatCurrency(item.finalTotal)}
                    </td>
                    <td className="text-right">
                      <span className="ed-tag">
                        Conforme
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Module5Rentals() {
  const {
    rentalRates,
    activeRentals,
    completedRentals,
    rentalsTotalRevenue,
    addRental,
    completeRental,
  } = useSurfSchool();

  // Filtrar estrictamente los items habilitados desde Configuración (Módulo 01)
  const enabledItems = useMemo(
    () => rentalRates.filter((item) => Boolean(item.enabled)),
    [rentalRates]
  );

  // Estado Columna Izquierda: Datos de Arriendo
  const [selectedItemId, setSelectedItemId] = useState(
    () => enabledItems[0]?.id || ''
  );
  const [quantity, setQuantity] = useState(1);
  const [hours, setHours] = useState(1);
  const [checkInTime, setCheckInTime] = useState(getCurrentHHMM);
  const [discount, setDiscount] = useState(0);

  // Estado Columna Derecha: Datos del Cliente + Foto de Carnet
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [idPhotoBase64, setIdPhotoBase64] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);

  // Modal de inspección de foto de carnet
  const [inspectedRental, setInspectedRental] = useState(null);

  useEffect(() => {
    if (
      enabledItems.length > 0 &&
      !enabledItems.some((item) => item.id === selectedItemId)
    ) {
      setSelectedItemId(enabledItems[0].id);
    } else if (enabledItems.length === 0) {
      setSelectedItemId('');
    }
  }, [enabledItems, selectedItemId]);

  const selectedRateItem = useMemo(
    () => enabledItems.find((item) => item.id === selectedItemId) || null,
    [enabledItems, selectedItemId]
  );

  const unitPricePerHour = Number(selectedRateItem?.pricePerHour) || 0;

  const { subtotal, discount: validDiscount, finalTotal } = useMemo(
    () => calculateRentalTotals(unitPricePerHour, quantity, hours, discount),
    [unitPricePerHour, quantity, hours, discount]
  );

  const estimatedReturnTime = useMemo(
    () => addMinutesToTime(checkInTime, (Number(hours) || 1) * 60),
    [checkInTime, hours]
  );

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    setIsCompressingPhoto(true);
    try {
      const base64 = await compressImageFileToBase64(file, 400, 0.5);
      setIdPhotoBase64(base64);
    } catch {
      setFormError('No se pudo procesar la fotografía del Carnet de Identidad.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedRateItem) {
      setFormError(
        'No hay equipamiento habilitado. Habilita al menos un ítem en el Módulo 01 (Configuración).'
      );
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Completa el Nombre Completo y el Teléfono del cliente.');
      return;
    }
    if (!idPhotoBase64) {
      setFormError(
        'Debes adjuntar la Foto del Carnet de Identidad antes de registrar el arriendo.'
      );
      return;
    }

    const created = addRental({
      itemId: selectedRateItem.id,
      quantity,
      hours,
      checkInTime,
      discount: validDiscount,
      customerName,
      customerEmail,
      customerPhone,
      emergencyContact,
      idPhotoBase64,
    });

    if (created) {
      setQuantity(1);
      setHours(1);
      setCheckInTime(getCurrentHHMM());
      setDiscount(0);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setEmergencyContact('');
      setIdPhotoBase64('');
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3500);
    }
  };

  return (
    <div className="ed-stack">
      {/* Cabecera Two-Column Feature con BauhausArt */}
      <ModuleHeader
        eyebrow="Módulo 05 · Operaciones de Equipamiento"
        title="Gestión de Arriendos y"
        accent="Devoluciones"
        description="Despacho de tablas, trajes y accesorios con garantía digital fotográfica de Carnet de Identidad para no retener documentos físicos en la recepción."
        art="rentals"
        aside={
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-end">
            <div className="ed-card p-4 text-right">
              <span className="ed-caption ed-muted block">En curso / Conformes</span>
              <span className="font-display font-bold text-heading-xs text-midnight-ink ed-num">
                {activeRentals.length} <span className="text-signal-blue font-usual text-subheading">/ {completedRentals.length}</span>
              </span>
            </div>
            <div className="ed-card-ink p-4 text-right">
              <span className="font-bold text-caption text-saffron-yellow block uppercase">Caja Arriendos Hoy</span>
              <span className="font-display font-bold text-heading-xs text-cream-paper ed-num">
                {formatCurrency(rentalsTotalRevenue)}
              </span>
            </div>
          </div>
        }
      />

      {/* Banner de confirmación */}
      {successMessage && (
        <div className="ed-notice ed-notice-blue">
          <CheckCircle2 className="w-5 h-5 text-signal-blue shrink-0" />
          <span className="font-bold">
            Arriendo registrado exitosamente e incorporado al monitor de arriendos activos.
          </span>
        </div>
      )}

      {/* SECCIÓN A: REGISTRO DE ARRIENDOS (INGRESO) */}
      <form
        onSubmit={handleSubmit}
        className="ed-card space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-midnight-ink">
          <div>
            <span className="ed-eyebrow">Despacho de Equipos</span>
            <h2 className="ed-h2 mt-1 flex items-center gap-2">
              <Shield className="w-6 h-6 text-signal-blue" />
              <span>Sección A · Registro de Arriendo Nuevo</span>
            </h2>
          </div>
          <span className="ed-tag">Garantía Digital Requerida</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* COLUMNA IZQUIERDA: 1. DATOS DE ARRIENDO */}
          <div className="lg:col-span-6 space-y-6">
            <div className="pb-3 border-b border-midnight-ink/15">
              <h3 className="ed-h3">
                1. Selección de Equipamiento y Tiempo
              </h3>
            </div>

            {enabledItems.length === 0 ? (
              <div className="ed-notice ed-notice-alert">
                <span>Todos los ítems de arriendo están deshabilitados en el Módulo 01 (Configuración).</span>
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="rental-item-select"
                    className="ed-label"
                  >
                    Tipo de Equipamiento
                  </label>
                  <select
                    id="rental-item-select"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="ed-input"
                  >
                    {enabledItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label} — {formatCurrency(item.pricePerHour)} / hora
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="rental-quantity-input"
                      className="ed-label"
                    >
                      Cantidad de Unidades
                    </label>
                    <input
                      id="rental-quantity-input"
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="ed-input ed-num"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rental-hours-select"
                      className="ed-label"
                    >
                      Horas de Arriendo (1 a 12 hrs)
                    </label>
                    <select
                      id="rental-hours-select"
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value) || 1)}
                      className="ed-input ed-num"
                    >
                      {Array.from({ length: 12 }, (_, idx) => idx + 1).map(
                        (h) => (
                          <option key={h} value={h}>
                            {h} {h === 1 ? 'Hora' : 'Horas'}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="rental-checkin-input"
                      className="ed-label"
                    >
                      Hora de Salida (Check-in)
                    </label>
                    <input
                      id="rental-checkin-input"
                      type="time"
                      required
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="ed-input ed-num"
                    />
                    <p className="ed-caption font-bold text-signal-blue ed-num mt-2">
                      Retorno previsto: {estimatedReturnTime} hrs
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="rental-discount-input"
                      className="ed-label"
                    >
                      Descuento Opcional (CLP)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-caption text-midnight-ink select-none">
                        $
                      </span>
                      <input
                        id="rental-discount-input"
                        type="number"
                        min="0"
                        step="500"
                        value={discount}
                        onChange={(e) =>
                          setDiscount(
                            e.target.value === ''
                              ? 0
                              : Math.max(0, Number(e.target.value))
                          )
                        }
                        className="ed-input pl-8 ed-num"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque Visual del Total */}
                <div className="p-6 border border-midnight-ink bg-cream-paper space-y-3">
                  <div className="flex items-center justify-between ed-caption">
                    <span className="ed-muted">
                      Subtotal ({formatCurrency(unitPricePerHour)} × {quantity} un. × {hours}h)
                    </span>
                    <span className="font-bold text-midnight-ink ed-num">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {validDiscount > 0 && (
                    <div className="flex items-center justify-between ed-caption">
                      <span className="ed-muted">Descuento aplicado</span>
                      <span className="font-bold text-signal-blue ed-num">
                        - {formatCurrency(validDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-midnight-ink flex items-center justify-between">
                    <span className="font-bold text-caption uppercase text-signal-blue tracking-[0.05em]">
                      Total a Cobrar
                    </span>
                    <span className="font-display font-bold text-heading-xs text-midnight-ink ed-num">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* COLUMNA DERECHA: 2. CLIENTE Y GARANTÍA DIGITAL */}
          <div className="lg:col-span-6 space-y-6">
            <div className="pb-3 border-b border-midnight-ink/15">
              <h3 className="ed-h3">
                2. Datos del Cliente y Respaldo Digital
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="rental-customer-name"
                  className="ed-label"
                >
                  Nombre Completo *
                </label>
                <input
                  id="rental-customer-name"
                  type="text"
                  required
                  placeholder="Ej: Lucas Méndez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="ed-input"
                />
              </div>

              <div>
                <label
                  htmlFor="rental-customer-phone"
                  className="ed-label"
                >
                  Teléfono *
                </label>
                <input
                  id="rental-customer-phone"
                  type="tel"
                  required
                  placeholder="+56 9 8765 4321"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="ed-input ed-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="rental-customer-email"
                  className="ed-label"
                >
                  Correo Electrónico
                </label>
                <input
                  id="rental-customer-email"
                  type="email"
                  placeholder="cliente@correo.cl"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="ed-input"
                />
              </div>

              <div>
                <label
                  htmlFor="rental-emergency-contact"
                  className="ed-label"
                >
                  Contacto de Emergencia
                </label>
                <input
                  id="rental-emergency-contact"
                  type="text"
                  placeholder="Nombre y Teléfono"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="ed-input"
                />
              </div>
            </div>

            {/* Foto de Carnet de Identidad */}
            <div className="p-6 border border-midnight-ink bg-cream-paper space-y-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="rental-id-photo"
                  className="font-bold text-caption text-midnight-ink flex items-center gap-2"
                >
                  <Camera className="w-5 h-5 text-signal-blue" />
                  <span>Foto del Carnet de Identidad *</span>
                </label>
                <span className="ed-tag">Compresión 400px</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label
                  htmlFor="rental-id-photo"
                  className="ed-btn ed-btn-sm"
                >
                  <Camera className="w-4 h-4 mr-1 text-signal-blue" />
                  <span>
                    {isCompressingPhoto
                      ? 'Procesando captura...'
                      : idPhotoBase64
                      ? 'Cambiar Fotografía'
                      : 'Capturar o Subir Carnet'}
                  </span>
                </label>
                <input
                  id="rental-id-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {idPhotoBase64 && (
                  <div className="flex items-center gap-4">
                    <img
                      src={idPhotoBase64}
                      alt="Vista previa Carnet"
                      className="w-20 h-12 object-cover border border-midnight-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setIdPhotoBase64('')}
                      className="ed-link text-ember-red"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              <p className="ed-caption ed-muted">
                Evita la retención física del documento del cliente cumpliendo con la normativa vigente.
              </p>
            </div>

            {formError && (
              <div className="ed-notice ed-notice-alert">
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={enabledItems.length === 0 || isCompressingPhoto}
              className="ed-btn ed-btn-block py-4 text-body"
            >
              <Shield className="w-5 h-5 mr-2 text-signal-blue" />
              <span>Registrar Arriendo ({formatCurrency(finalTotal)})</span>
            </button>
          </div>
        </div>
      </form>

      {/* SECCIÓN B: MONITOR */}
      <ActiveRentalsMonitor
        activeRentals={activeRentals}
        completedRentals={completedRentals}
        onCompleteRental={completeRental}
        onInspectPhoto={(rental) => setInspectedRental(rental)}
      />

      {/* MODAL PARA VER LA FOTO DE CARNET AMPLIADA */}
      {inspectedRental && (
        <div className="fixed inset-0 z-50 bg-midnight-ink/75 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-cream-paper border-2 border-midnight-ink p-8 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-midnight-ink">
              <div>
                <span className="ed-eyebrow">Garantía Digital</span>
                <h3 className="ed-h3 mt-1 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-signal-blue" />
                  <span>Respaldo de Carnet de Identidad</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRental(null)}
                className="p-1 cursor-pointer hover:text-signal-blue"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 ed-caption border border-midnight-ink p-4 bg-cream-paper">
              <div>
                <span className="ed-muted block">Cliente:</span>
                <strong className="text-midnight-ink">{inspectedRental.customerName}</strong>
              </div>
              <div>
                <span className="ed-muted block">Teléfono:</span>
                <strong className="text-midnight-ink ed-num">{inspectedRental.customerPhone}</strong>
              </div>
              <div>
                <span className="ed-muted block">Equipamiento:</span>
                <strong className="text-midnight-ink ed-num">{inspectedRental.quantity}x {inspectedRental.itemLabel}</strong>
              </div>
              <div>
                <span className="ed-muted block">Horario:</span>
                <strong className="text-midnight-ink ed-num">
                  {inspectedRental.checkInTime} a {inspectedRental.estimatedReturnTime} hrs
                </strong>
              </div>
            </div>

            {inspectedRental.idPhotoBase64 ? (
              <div className="border border-midnight-ink p-2 flex items-center justify-center bg-cream-paper">
                <img
                  src={inspectedRental.idPhotoBase64}
                  alt={`Carnet de ${inspectedRental.customerName}`}
                  className="max-h-80 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="p-8 text-center ed-body ed-muted border border-midnight-ink">
                Sin captura disponible.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectedRental(null)}
                className="ed-btn"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
