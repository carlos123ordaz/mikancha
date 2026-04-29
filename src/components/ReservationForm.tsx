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
  { label: 'Hoy',    offset: 0 },
  { label: 'Mañana', offset: 1 },
  { label: 'Pasado', offset: 2 },
];

const PENDING_KEY = 'pending_reservation';
const RETURN_TO_KEY = 'auth_return_to';

// ── Shared label helper ─────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      font: "600 10px/1 'JetBrains Mono', monospace",
      letterSpacing: '.12em', textTransform: 'uppercase',
      color: '#0A0E0B', marginBottom: 12,
    }}>
      <span style={{ width: 14, height: 1.5, background: '#0FCB46', display: 'inline-block', flexShrink: 0 }} />
      {children}
    </div>
  );
}

// ── Primary CTA button ──────────────────────────────────────────
function CTABtn({
  children,
  onClick,
  type = 'button',
  disabled = false,
  fullWidth = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '14px 24px',
        background: disabled ? 'rgba(15,203,70,.4)' : '#0FCB46',
        color: '#0A0E0B',
        border: `2px solid ${disabled ? 'rgba(10,14,11,.2)' : '#0A0E0B'}`,
        font: "800 14px/1 'Archivo', system-ui",
        letterSpacing: '.01em',
        textTransform: 'uppercase',
        boxShadow: disabled ? 'none' : '4px 4px 0 #0A0E0B',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform .1s ease, box-shadow .1s ease',
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translate(2px, 2px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 0 #0A0E0B';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #0A0E0B';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #0A0E0B';
        }
      }}
    >
      {children}
    </button>
  );
}

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

    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.courtId === court._id) {
        if (data.date) setDate(data.date);
        if (data.startTime) setStartTime(data.startTime);
        if (data.endTime) setEndTime(data.endTime);
        if (data.durationHours) setDurationHours(data.durationHours);
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
        if (data.step) setStep(data.step);
      }
      localStorage.removeItem(PENDING_KEY);
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }
  }, [court._id]);

  function startGoogleLogin() {
    try {
      localStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ courtId: court._id, date, startTime, endTime, durationHours, paymentMethod, step })
      );
      localStorage.setItem(RETURN_TO_KEY, window.location.pathname + window.location.search);
    } catch {
      // si localStorage falla, seguimos con el login
    }
    window.location.href = `${apiUrl}/api/auth/google`;
  }

  const price = court.pricePerHour * durationHours;

  function handleSlotSelect(start: string, end: string, duration: number) {
    setStartTime(start);
    setEndTime(end);
    setDurationHours(duration);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      startGoogleLogin();
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

  /* ════════════════════════════════════════════════════════
     SUCCESS
  ════════════════════════════════════════════════════════ */
  if (step === 'success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Status header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, background: '#0FCB46', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ font: "600 10px/1 'JetBrains Mono', monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: '#0A0E0B' }}>
            Reserva registrada
          </span>
        </div>

        <p style={{ font: "400 13px/1.6 'Inter', sans-serif", color: 'rgba(10,14,11,.65)', margin: 0 }}>
          Tu reserva está <strong style={{ color: '#0A0E0B' }}>pendiente de aprobación</strong>.
          El encargado revisará tu comprobante y te enviará confirmación por correo.
        </p>

        {/* Código */}
        <div style={{ background: '#0A0E0B', padding: '18px 20px' }}>
          <div style={{ font: "600 9px/1 'JetBrains Mono', monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(244,245,240,.5)', marginBottom: 10 }}>
            Código de reserva
          </div>
          <div style={{ font: "900 28px/1 'Archivo', system-ui", color: '#0FCB46', letterSpacing: '.05em', wordBreak: 'break-all', fontVariantNumeric: 'tabular-nums' }}>
            {reservationCode}
          </div>
          <p style={{ font: "400 11px/1.5 'Inter', sans-serif", color: 'rgba(244,245,240,.45)', marginTop: 10, marginBottom: 0 }}>
            Guarda este código — te lo pedirán en WhatsApp y al llegar a la cancha.
          </p>
        </div>

        {/* WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#25D366', color: '#FFFFFF',
            border: '2px solid #0A0E0B',
            padding: '14px 20px',
            font: "800 14px/1 'Archivo', system-ui",
            textTransform: 'uppercase',
            textDecoration: 'none',
            boxShadow: '4px 4px 0 #0A0E0B',
            transition: 'transform .1s ease, box-shadow .1s ease',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'translate(2px, 2px)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '2px 2px 0 #0A0E0B';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = '';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '4px 4px 0 #0A0E0B';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = '';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '4px 4px 0 #0A0E0B';
          }}
        >
          <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Enviar código por WhatsApp
        </a>

        <a
          href="/canchas"
          style={{ font: "500 12px/1 'Inter', sans-serif", color: 'rgba(10,14,11,.5)', textDecoration: 'none', textAlign: 'center' }}
        >
          ← Ver más canchas
        </a>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     PAYMENT
  ════════════════════════════════════════════════════════ */
  if (step === 'payment') {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setStep('schedule')}
            style={{
              font: "700 11px/1 'JetBrains Mono', monospace",
              letterSpacing: '.08em', textTransform: 'uppercase',
              color: 'rgba(10,14,11,.5)', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            ← Volver
          </button>
          <h2 style={{ margin: 0, font: "800 18px/1 'Archivo', system-ui", letterSpacing: '-.01em', color: '#0A0E0B' }}>
            Pago y comprobante
          </h2>
        </div>

        {/* Resumen */}
        <div style={{ border: '1.5px solid #0A0E0B', background: '#FFFFFF' }}>
          <div style={{ padding: '10px 16px', background: '#0A0E0B' }}>
            <span style={{ font: "600 9px/1 'JetBrains Mono', monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(244,245,240,.5)' }}>
              Resumen de reserva
            </span>
          </div>
          {[
            { label: 'Cancha',  value: court.name },
            { label: 'Fecha',   value: date },
            { label: 'Horario', value: `${startTime} – ${endTime} (${durationHours}h)` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderTop: '1px solid rgba(10,14,11,.08)' }}>
              <span style={{ font: "500 12px/1 'Inter', sans-serif", color: 'rgba(10,14,11,.55)', flexShrink: 0 }}>{label}</span>
              <span style={{ font: "600 12px/1 'Inter', sans-serif", color: '#0A0E0B', textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '2px solid #0A0E0B', background: 'rgba(15,203,70,.06)' }}>
            <span style={{ font: "800 14px/1 'Archivo', system-ui", color: '#0A0E0B' }}>Total a pagar</span>
            <span style={{ font: "900 22px/1 'Archivo', system-ui", color: '#0FCB46', fontVariantNumeric: 'tabular-nums' }}>
              S/ {price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <SectionLabel>Método de pago</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(Object.entries(PAYMENT_OPTIONS) as [PaymentMethod, typeof PAYMENT_OPTIONS[PaymentMethod]][]).map(([key, info]) => {
              const isActive = paymentMethod === key;
              return (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 16px',
                    background: isActive ? 'rgba(15,203,70,.05)' : '#FFFFFF',
                    border: `1.5px solid ${isActive ? '#0FCB46' : '#0A0E0B'}`,
                    borderLeft: `4px solid ${isActive ? '#0FCB46' : 'rgba(10,14,11,.15)'}`,
                    cursor: 'pointer',
                    transition: 'border-color .15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={key}
                    checked={isActive}
                    onChange={() => setPaymentMethod(key)}
                    style={{ marginTop: 2, accentColor: '#0FCB46' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, font: "700 14px/1 'Inter', sans-serif", color: '#0A0E0B' }}>{info.label}</p>
                    <p style={{ margin: '6px 0 0', font: "600 12px/1 'JetBrains Mono', monospace", color: '#0FCB46', letterSpacing: '.04em', wordBreak: 'break-all' }}>
                      {info.detail}
                    </p>
                    <p style={{ margin: '5px 0 0', font: "400 11px/1.4 'Inter', sans-serif", color: 'rgba(10,14,11,.5)' }}>
                      {info.hint}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Upload comprobante */}
        <div>
          <SectionLabel>Comprobante de pago</SectionLabel>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '20px 16px',
              border: `2px dashed ${proofFile ? '#0FCB46' : 'rgba(10,14,11,.3)'}`,
              background: proofFile ? 'rgba(15,203,70,.04)' : 'transparent',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color .15s ease',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            {proofFile ? (
              <>
                <div style={{ font: "700 13px/1.4 'Inter', sans-serif", color: '#0FCB46', wordBreak: 'break-all' }}>
                  ✓ {proofFile.name}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProofFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{ font: "500 11px/1 'Inter', sans-serif", color: 'rgba(255,60,60,.8)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0 }}
                >
                  Eliminar
                </button>
              </>
            ) : (
              <>
                <div style={{ font: "600 12px/1 'JetBrains Mono', monospace", color: 'rgba(10,14,11,.45)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  ▮ Subir comprobante
                </div>
                <p style={{ font: "400 12px/1.4 'Inter', sans-serif", color: 'rgba(10,14,11,.5)', margin: 0 }}>
                  JPG, PNG, WebP o PDF · Máx. 5 MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,50,50,.06)', borderLeft: '3px solid #ff4040', font: "500 12px/1.4 'Inter', sans-serif", color: '#0A0E0B' }}>
            {error}
          </div>
        )}

        {/* Login notice */}
        {!token && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,226,73,.12)', borderLeft: '3px solid #FFE249', font: "500 12px/1.4 'Inter', sans-serif", color: '#0A0E0B' }}>
            Debes{' '}
            <button
              type="button"
              onClick={startGoogleLogin}
              style={{ font: "700 12px/1 'Inter', sans-serif", textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0A0E0B' }}
            >
              iniciar sesión
            </button>{' '}
            para confirmar la reserva.
          </div>
        )}

        <CTABtn type="submit" disabled={!paymentMethod || !proofFile || submitting || !token}>
          {submitting ? 'Procesando...' : `Confirmar reserva · S/ ${price.toFixed(2)}`}
        </CTABtn>

      </form>
    );
  }

  /* ════════════════════════════════════════════════════════
     SCHEDULE
  ════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <h2 style={{ margin: 0, font: "800 18px/1 'Archivo', system-ui", letterSpacing: '-.01em', color: '#0A0E0B' }}>
        Selecciona fecha y horario
      </h2>

      {/* Fecha */}
      <div>
        <SectionLabel>Fecha</SectionLabel>

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {DATE_QUICK_OPTIONS.map(({ label, offset }) => {
            const iso = addDays(offset);
            const isActive = date === iso;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setDate(iso);
                  setStartTime('');
                  setEndTime('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  background: isActive ? '#0FCB46' : '#FFFFFF',
                  color: '#0A0E0B',
                  border: `1.5px solid ${isActive ? '#0A0E0B' : 'rgba(10,14,11,.3)'}`,
                  font: "700 12px/1 'Inter', sans-serif",
                  letterSpacing: '.01em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: isActive ? '2px 2px 0 #0A0E0B' : 'none',
                  transform: isActive ? 'translate(-1px, -1px)' : 'none',
                  transition: 'all .12s ease',
                }}
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

      {/* Horario */}
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
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '14px 16px',
          background: '#0A0E0B',
          border: '2px solid #0A0E0B',
        }}>
          <div>
            <div style={{ font: "600 9px/1 'JetBrains Mono', monospace", letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,245,240,.5)', marginBottom: 6 }}>
              Total estimado
            </div>
            <div style={{ font: "500 13px/1 'Inter', sans-serif", color: 'rgba(244,245,240,.7)' }}>
              {startTime} – {endTime}
              <span style={{ marginLeft: 8, font: "500 11px/1 'Inter', sans-serif", color: 'rgba(244,245,240,.4)' }}>
                {durationHours}h
              </span>
            </div>
          </div>
          <div style={{ font: "900 28px/1 'Archivo', system-ui", color: '#0FCB46', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            S/{price.toFixed(0)}
          </div>
        </div>
      )}

      <CTABtn onClick={() => setStep('payment')} disabled={!date || !startTime}>
        Continuar al pago →
      </CTABtn>

    </div>
  );
}
