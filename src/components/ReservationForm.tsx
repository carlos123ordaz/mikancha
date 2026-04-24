import { useState, useEffect, useRef } from 'react';
import type { ICourt } from '../types';
import TimeSlotPicker from './TimeSlotPicker';
import DatePicker from './DatePicker';

type Step = 'schedule' | 'payment' | 'success';
type PaymentMethod = 'yape' | 'transfer';

interface Props {
  court: ICourt;
  apiUrl: string;
}

const PAYMENT_OPTIONS: Record<PaymentMethod, { label: string; detail: string; hint: string }> = {
  yape: {
    label: 'Yape',
    detail: 'Yape al: 913 628 087',
    hint: 'Realiza el pago y sube la captura de pantalla del Yape.',
  },
  transfer: {
    label: 'Transferencia bancaria',
    detail: 'BCP Cta. Cte. 123-456789-0-12',
    hint: 'Realiza la transferencia y sube el comprobante.',
  },
};

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toISO(d);
};
const today = toISO(new Date());

const DATE_QUICK_OPTIONS = [
  { label: 'Hoy', offset: 0 },
  { label: 'Mañana', offset: 1 },
  { label: 'Pasado', offset: 2 },
];

export default function ReservationForm({ court, apiUrl }: Props) {
  const [step, setStep] = useState<Step>('schedule');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationHours, setDurationHours] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reservationCode, setReservationCode] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setToken(localStorage.getItem('auth_token'));
  }, []);

  const price = court.pricePerHour * durationHours;

  function handleSlotSelect(start: string, end: string, duration: number) {
    setStartTime(start);
    setEndTime(end);
    setDurationHours(duration);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      window.location.href = `${apiUrl}/api/auth/google`;
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('courtId', court._id);
      formData.append('date', date);
      formData.append('startTime', startTime);
      formData.append('endTime', endTime);
      formData.append('durationHours', String(durationHours));
      formData.append('paymentMethod', paymentMethod);
      if (proofFile) formData.append('proof', proofFile);

      const res = await fetch(`${apiUrl}/api/reservations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setReservationCode(json.data.reservation.reservationCode);
      setWhatsappUrl(json.data.whatsappUrl);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la reserva');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── SUCCESS ── */
  if (step === 'success') {
    return (
      <div className="text-center">
        <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎉</div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">¡Reserva registrada!</h2>
        <p className="text-gray-500 text-xs sm:text-sm mb-5 sm:mb-6">
          Tu reserva está <strong>pendiente de aprobación</strong>. El encargado revisará
          tu comprobante y te enviará confirmación por correo.
        </p>

        <div className="bg-green-50 rounded-2xl p-4 sm:p-6 mb-5 sm:mb-6">
          <p className="text-[11px] sm:text-xs text-gray-400 mb-1 uppercase tracking-wide">Código de reserva</p>
          <p className="text-2xl sm:text-3xl font-mono font-bold text-green-700 tracking-widest break-all">
            {reservationCode}
          </p>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-2">
            Guarda este código — te lo pedirán en WhatsApp y al llegar a la cancha.
          </p>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 sm:gap-3 w-full bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#16a94e] text-white px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-colors mb-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Enviar código por WhatsApp
        </a>

        <a href="/canchas" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Ver más canchas
        </a>
      </div>
    );
  }

  /* ── PAYMENT ── */
  if (step === 'payment') {
    return (
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-5 sm:mb-6">
          <button
            type="button"
            onClick={() => setStep('schedule')}
            className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
          >
            ← Volver
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pago y comprobante</h2>
        </div>

        {/* Resumen */}
        <div className="bg-gray-50 rounded-xl p-3.5 sm:p-4 mb-5 sm:mb-6 text-xs sm:text-sm space-y-1.5">
          <div className="flex justify-between gap-3">
            <span className="text-gray-500 shrink-0">Cancha</span>
            <span className="font-medium text-right truncate">{court.name}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-500 shrink-0">Fecha</span>
            <span className="font-medium">{date}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-500 shrink-0">Horario</span>
            <span className="font-medium">
              {startTime} – {endTime} ({durationHours}h)
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
            <span className="font-bold">Total a pagar</span>
            <span className="font-bold text-green-600 text-sm sm:text-base">S/ {price.toFixed(2)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
          <p className="text-sm font-medium text-gray-700">
            Método de pago <span className="text-red-500">*</span>
          </p>
          {(Object.entries(PAYMENT_OPTIONS) as [PaymentMethod, (typeof PAYMENT_OPTIONS)[PaymentMethod]][]).map(
            ([key, info]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === key
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={key}
                  checked={paymentMethod === key}
                  onChange={() => setPaymentMethod(key)}
                  className="mt-0.5 accent-green-600"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{info.label}</p>
                  <p className="text-xs sm:text-sm font-mono text-green-700 mt-0.5 break-all">{info.detail}</p>
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-1">{info.hint}</p>
                </div>
              </label>
            )
          )}
        </div>

        {/* Upload comprobante */}
        <div className="mb-5 sm:mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Comprobante de pago <span className="text-red-500">*</span>
          </p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-colors ${
              proofFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            {proofFile ? (
              <>
                <div className="text-2xl mb-1">✅</div>
                <p className="text-xs sm:text-sm font-semibold text-green-700 break-all">{proofFile.name}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProofFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-red-500 mt-1 hover:underline"
                >
                  Eliminar
                </button>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-3xl mb-2">📎</div>
                <p className="text-xs sm:text-sm text-gray-500">Haz clic para seleccionar el comprobante</p>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-1">JPG, PNG, WebP o PDF · Máx. 5 MB</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm mb-4">
            {error}
          </div>
        )}

        {!token && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm mb-4">
            Debes{' '}
            <a href={`${apiUrl}/api/auth/google`} className="font-bold underline">
              iniciar sesión
            </a>{' '}
            para confirmar la reserva.
          </div>
        )}

        <button
          type="submit"
          disabled={!paymentMethod || !proofFile || submitting || !token}
          className="w-full bg-green-600 text-white py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Procesando reserva...' : `Confirmar reserva · S/ ${price.toFixed(2)}`}
        </button>
      </form>
    );
  }

  /* ── SCHEDULE ── */
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-5 sm:mb-6">Selecciona fecha y horario</h2>

      {/* Date picker */}
      <div className="mb-5 sm:mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Fecha <span className="text-red-500">*</span>
        </label>

        <div className="flex gap-1.5 mb-2.5">
          {DATE_QUICK_OPTIONS.map(({ label, offset }) => {
            const iso = addDays(offset);
            const active = date === iso;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setDate(iso);
                  setStartTime('');
                  setEndTime('');
                }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-heading font-bold tracking-tight transition-all ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/30'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <DatePicker
          value={date}
          min={today}
          onChange={(iso) => {
            setDate(iso);
            setStartTime('');
            setEndTime('');
          }}
        />
      </div>

      {/* Time slot picker */}
      {date && (
        <TimeSlotPicker
          court={court}
          date={date}
          selectedStart={startTime}
          durationHours={durationHours}
          onSelect={handleSlotSelect}
          apiUrl={apiUrl}
        />
      )}

      {/* Price preview */}
      {startTime && (
        <div className="mt-5 sm:mt-6 bg-green-50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {startTime} – {endTime}
            </p>
            <p className="text-xs text-gray-400">{durationHours} hora{durationHours > 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-green-700 whitespace-nowrap">S/ {price.toFixed(2)}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setStep('payment')}
        disabled={!date || !startTime}
        className="mt-5 sm:mt-6 w-full bg-green-600 text-white py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continuar al pago →
      </button>
    </div>
  );
}
