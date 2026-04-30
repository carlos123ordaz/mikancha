import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { IReservation, ICourt } from '../types';

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  courtId: ICourt;
};

interface Props {
  apiUrl: string;
}

const ITEMS_PER_PAGE = 5;

const WHATSAPP_NUMBER =
  (import.meta.env.PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? '51913628087';

type StatusKey = 'pending' | 'approved' | 'rejected' | 'used';

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; dotColor: string; badgeBg: string; badgeBorder: string; badgeText: string; description: string }
> = {
  pending: {
    label: 'Pendiente',
    dotColor: '#FFE249',
    badgeBg: 'rgba(255,226,73,.15)',
    badgeBorder: 'rgba(255,226,73,.6)',
    badgeText: '#5a4500',
    description: 'Tu reserva está pendiente de aprobación por el administrador.',
  },
  approved: {
    label: 'Aprobada',
    dotColor: '#0FCB46',
    badgeBg: 'rgba(15,203,70,.12)',
    badgeBorder: 'rgba(15,203,70,.45)',
    badgeText: '#0A4A1A',
    description: 'Tu reserva fue aprobada. Muestra el QR al llegar.',
  },
  rejected: {
    label: 'Rechazada',
    dotColor: 'rgba(255,80,80,.8)',
    badgeBg: 'rgba(255,50,50,.1)',
    badgeBorder: 'rgba(255,80,80,.4)',
    badgeText: '#7a0000',
    description: 'Tu reserva fue rechazada. Contacta al encargado para más información.',
  },
  used: {
    label: 'Utilizada',
    dotColor: 'rgba(10,14,11,.35)',
    badgeBg: 'rgba(10,14,11,.07)',
    badgeBorder: 'rgba(10,14,11,.18)',
    badgeText: 'rgba(10,14,11,.5)',
    description: 'Esta reserva ya fue utilizada.',
  },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function QrModal({
  reservation,
  onClose,
}: {
  reservation: PopulatedReservation;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]"
      style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white max-w-sm w-full text-center"
        style={{ border: '2px solid #0A0E0B', boxShadow: '6px 6px 0 #0FCB46' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top band */}
        <div className="relative px-6 pt-5 pb-5" style={{ background: '#0A0E0B' }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(0deg, rgba(15,203,70,.06) 1px, transparent 1px)', backgroundSize: '100% 60px' }}
          />
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ border: '1.5px solid rgba(244,245,240,.25)', color: 'rgba(244,245,240,.7)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <p
            className="relative m-0 mb-1.5"
            style={{ font: "600 10px/1 'JetBrains Mono', monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: '#0FCB46' }}
          >
            Tu código QR
          </p>
          <h3
            className="relative m-0"
            style={{ font: "900 22px/1.1 'Archivo', system-ui", letterSpacing: '-.02em', color: '#F4F5F0' }}
          >
            Preséntalo al ingresar
          </h3>
        </div>

        <div className="p-6">
          {/* QR code — sin overlap para evitar recorte */}
          <div className="flex justify-center mb-5">
            <div className="p-4 bg-white" style={{ border: '2px solid #0A0E0B', boxShadow: '3px 3px 0 #0FCB46' }}>
              <QRCodeSVG value={reservation.reservationCode} size={200} fgColor="#0A0E0B" level="M" />
            </div>
          </div>

          <div
            className="mb-4"
            style={{ background: 'rgba(15,203,70,.08)', border: '1.5px solid rgba(15,203,70,.3)', padding: '12px' }}
          >
            <p style={{ font: "600 9.5px/1 'JetBrains Mono', monospace", letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(10,14,11,.55)', marginBottom: '4px' }}>
              Código de reserva
            </p>
            <p style={{ font: "700 16px/1 'JetBrains Mono', monospace", letterSpacing: '.2em', color: '#0A0E0B' }}>
              {reservation.reservationCode}
            </p>
          </div>

          <div className="mb-5 text-left" style={{ borderTop: '1px dashed rgba(10,14,11,.2)', paddingTop: '14px' }}>
            <p style={{ font: "800 16px/1.2 'Archivo', system-ui", color: '#0A0E0B', marginBottom: '4px' }}>
              {reservation.courtId.name}
            </p>
            <p style={{ font: "500 13px/1.4 'Inter', sans-serif", color: 'rgba(10,14,11,.55)' }}>
              {formatDate(reservation.date)} · {reservation.startTime} – {reservation.endTime}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 qr-close-btn"
            style={{ border: '2px solid #0A0E0B', font: "700 12px/1 'Inter', sans-serif", letterSpacing: '.04em', textTransform: 'uppercase', color: '#0A0E0B', background: 'transparent', cursor: 'pointer' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: PopulatedReservation }) {
  const [showQr, setShowQr] = useState(false);
  const cfg = STATUS_CONFIG[reservation.status as StatusKey] ?? STATUS_CONFIG.pending;
  const court = reservation.courtId;
  const muted = reservation.status === 'rejected' || reservation.status === 'used';

  function buildWhatsappUrl() {
    const msg = encodeURIComponent(
      `Hola! Mi reserva está pendiente de aprobación.\n\nCódigo: *${reservation.reservationCode}*\nCancha: ${court.name}\nFecha: ${formatDate(reservation.date)} · ${reservation.startTime}–${reservation.endTime}\n\n¿Podrían confirmarla? ¡Gracias!`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }

  return (
    <>
      <div className={`reveal res-card bg-white${muted ? ' muted' : ''}`} style={{ border: '2px solid #0A0E0B' }}>
        {/* Header */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(10,14,11,.1)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className="truncate m-0 mb-1"
                style={{ font: "800 18px/1.2 'Archivo', system-ui", letterSpacing: '-.01em', color: '#0A0E0B' }}
              >
                {court.name}
              </h3>
              <p className="flex items-center gap-1.5 m-0" style={{ font: "500 12px/1 'Inter', sans-serif", color: 'rgba(10,14,11,.5)' }}>
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{court.location}</span>
              </p>
            </div>
            <span
              className="flex-shrink-0 inline-flex items-center gap-1.5"
              style={{
                padding: '5px 9px',
                background: cfg.badgeBg,
                border: `1px solid ${cfg.badgeBorder}`,
                color: cfg.badgeText,
                font: "600 10px/1 'JetBrains Mono', monospace",
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: '6px', height: '6px', background: cfg.dotColor, display: 'inline-block', flexShrink: 0 }} />
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 18px' }}>
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2" style={{ background: 'rgba(10,14,11,.04)', border: '1px solid rgba(10,14,11,.1)', padding: '10px 12px' }}>
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: '#0FCB46' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="min-w-0">
                <p className="m-0 mb-1" style={{ font: "600 9px/1 'JetBrains Mono', monospace", letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(10,14,11,.45)' }}>Fecha</p>
                <p className="m-0 truncate capitalize" style={{ font: "600 13px/1 'Inter', sans-serif", color: '#0A0E0B' }}>
                  {formatDate(reservation.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ background: 'rgba(10,14,11,.04)', border: '1px solid rgba(10,14,11,.1)', padding: '10px 12px' }}>
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: '#0FCB46' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <p className="m-0 mb-1" style={{ font: "600 9px/1 'JetBrains Mono', monospace", letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(10,14,11,.45)' }}>Horario</p>
                <p className="m-0 truncate" style={{ font: "600 13px/1 'Inter', sans-serif", color: '#0A0E0B' }}>
                  {reservation.startTime} – {reservation.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* Código */}
          <div className="flex items-center justify-between mb-3" style={{ background: 'rgba(15,203,70,.06)', border: '1px solid rgba(15,203,70,.3)', padding: '8px 12px' }}>
            <span style={{ font: "600 9px/1 'JetBrains Mono', monospace", letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(10,14,11,.5)' }}>Código</span>
            <span style={{ font: "700 13px/1 'JetBrains Mono', monospace", letterSpacing: '.15em', color: '#0A0E0B' }}>
              {reservation.reservationCode}
            </span>
          </div>

          {/* Status helper */}
          <p className="m-0 mb-3" style={{ font: "400 12px/1.5 'Inter', sans-serif", color: 'rgba(10,14,11,.55)' }}>
            {cfg.description}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2" style={{ paddingTop: '12px', borderTop: '1px dashed rgba(10,14,11,.15)' }}>
            {reservation.status === 'approved' && (
              <button
                onClick={() => setShowQr(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 action-btn-primary"
                style={{ background: '#0FCB46', border: '2px solid #0A0E0B', color: '#0A0E0B', padding: '10px 16px', font: "700 12px/1 'Inter', sans-serif", letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: '2px 2px 0 #0A0E0B', cursor: 'pointer' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
                </svg>
                Ver QR
              </button>
            )}

            {reservation.status === 'pending' && (
              <a
                href={buildWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 action-btn-wa"
                style={{ background: '#25D366', border: '2px solid #0A0E0B', color: '#0A0E0B', padding: '10px 16px', font: "700 12px/1 'Inter', sans-serif", letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: '2px 2px 0 #0A0E0B', textDecoration: 'none' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Recordar por WhatsApp
              </a>
            )}

            <a
              href={`/canchas/${court._id}`}
              className="inline-flex items-center justify-center gap-1.5 action-btn-outline"
              style={{ border: '2px solid #0A0E0B', padding: '10px 14px', font: "600 12px/1 'Inter', sans-serif", letterSpacing: '.03em', color: '#0A0E0B', textDecoration: 'none' }}
            >
              Ver cancha
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {showQr && <QrModal reservation={reservation} onClose={() => setShowQr(false)} />}
    </>
  );
}

export default function MyReservations({ apiUrl }: Props) {
  const [reservations, setReservations] = useState<PopulatedReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    fetch(`${apiUrl}/api/reservations/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setReservations(json.data);
        else {
          localStorage.removeItem('auth_token');
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  function changeFilter(f: 'active' | 'all') {
    setFilter(f);
    setPage(1);
  }

  /* ── No autenticado ─────────────────────────────────────── */
  if (!authenticated) {
    return (
      <div className="bg-white text-center" style={{ border: '2px solid #0A0E0B', padding: '64px 40px' }}>
        <div
          className="inline-flex items-center justify-center w-16 h-16 mb-6 text-3xl"
          style={{ border: '2px solid #0A0E0B', background: 'rgba(15,203,70,.1)' }}
        >
          🔒
        </div>
        <h2 className="m-0 mb-2" style={{ font: "900 28px/1 'Archivo', system-ui", letterSpacing: '-.02em', color: '#0A0E0B' }}>
          Inicia sesión
        </h2>
        <p style={{ font: "400 14px/1.55 'Inter', sans-serif", color: 'rgba(10,14,11,.6)', maxWidth: '360px', margin: '0 auto 28px' }}>
          Para ver tus reservas y descargar tu código QR debes iniciar sesión con Google.
        </p>
        <a
          href={`${apiUrl}/api/auth/google`}
          className="inline-flex items-center gap-2 action-btn-cta"
          style={{ background: '#0FCB46', border: '2px solid #0A0E0B', color: '#0A0E0B', padding: '12px 20px', font: "700 13px/1 'Inter', sans-serif", letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: '4px 4px 0 #0A0E0B', textDecoration: 'none' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          Iniciar sesión con Google
        </a>
      </div>
    );
  }

  /* ── Cargando ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <div className="h-9 w-56 animate-pulse mb-6" style={{ background: 'rgba(10,14,11,.08)' }} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white" style={{ border: '2px solid rgba(10,14,11,.1)' }}>
              <div style={{ padding: '18px', borderBottom: '1px solid rgba(10,14,11,.08)' }} className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-36 animate-pulse" style={{ background: 'rgba(10,14,11,.08)' }} />
                  <div className="h-3 w-24 animate-pulse" style={{ background: 'rgba(10,14,11,.06)' }} />
                </div>
                <div className="h-6 w-20 animate-pulse" style={{ background: 'rgba(10,14,11,.08)' }} />
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="h-12 animate-pulse" style={{ background: 'rgba(10,14,11,.06)' }} />
                  <div className="h-12 animate-pulse" style={{ background: 'rgba(10,14,11,.06)' }} />
                </div>
                <div className="h-9 animate-pulse" style={{ background: 'rgba(10,14,11,.06)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const active = reservations.filter((r) => ['pending', 'approved'].includes(r.status));
  const displayed = filter === 'active' ? active : reservations;
  const totalPages = Math.ceil(displayed.length / ITEMS_PER_PAGE);
  const paginated = displayed.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  /* ── Sin reservas (completamente vacío) ─────────────────── */
  if (reservations.length === 0) {
    return (
      <div className="bg-white text-center" style={{ border: '2px solid #0A0E0B', padding: '64px 40px' }}>
        <div
          className="inline-flex items-center justify-center w-16 h-16 mb-6 text-3xl"
          style={{ border: '2px solid #0A0E0B', background: 'rgba(15,203,70,.1)' }}
        >
          📭
        </div>
        <h2 className="m-0 mb-2" style={{ font: "900 28px/1 'Archivo', system-ui", letterSpacing: '-.02em', color: '#0A0E0B' }}>
          Aún no tienes reservas
        </h2>
        <p style={{ font: "400 14px/1.55 'Inter', sans-serif", color: 'rgba(10,14,11,.6)', maxWidth: '380px', margin: '0 auto 28px' }}>
          Cuando reserves una cancha, la encontrarás aquí con su código QR y estado en tiempo real.
        </p>
        <a
          href="/canchas"
          className="inline-flex items-center gap-2 action-btn-cta"
          style={{ background: '#0FCB46', border: '2px solid #0A0E0B', color: '#0A0E0B', padding: '12px 20px', font: "700 13px/1 'Inter', sans-serif", letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: '4px 4px 0 #0A0E0B', textDecoration: 'none' }}
        >
          Reservar una cancha
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    );
  }

  /* ── Lista de reservas ──────────────────────────────────── */
  return (
    <div>
      {/* Filtro + resumen */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="inline-flex w-fit" style={{ border: '2px solid #0A0E0B' }}>
          <button
            onClick={() => changeFilter('active')}
            style={{
              padding: '8px 16px',
              font: "600 11px/1 'Inter', sans-serif",
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all .15s ease',
              border: 'none',
              background: filter === 'active' ? '#0A0E0B' : 'transparent',
              color: filter === 'active' ? '#F4F5F0' : 'rgba(10,14,11,.55)',
            }}
          >
            Activas <span style={{ opacity: .7 }}>({active.length})</span>
          </button>
          <button
            onClick={() => changeFilter('all')}
            style={{
              padding: '8px 16px',
              font: "600 11px/1 'Inter', sans-serif",
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all .15s ease',
              border: 'none',
              borderLeft: '1.5px solid rgba(10,14,11,.2)',
              background: filter === 'all' ? '#0A0E0B' : 'transparent',
              color: filter === 'all' ? '#F4F5F0' : 'rgba(10,14,11,.55)',
            }}
          >
            Todas <span style={{ opacity: .7 }}>({reservations.length})</span>
          </button>
        </div>
        <p className="m-0" style={{ font: "600 11px/1 'JetBrains Mono', monospace", letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(10,14,11,.5)' }}>
          ▮ {displayed.length} {displayed.length === 1 ? 'reserva' : 'reservas'}
        </p>
      </div>

      {/* Empty state para filtro activo */}
      {displayed.length === 0 ? (
        <div className="bg-white text-center" style={{ border: '2px solid #0A0E0B', padding: '48px 32px' }}>
          <div
            className="inline-flex items-center justify-center w-14 h-14 mb-4 text-2xl"
            style={{ border: '2px solid #0A0E0B', background: 'rgba(15,203,70,.1)' }}
          >
            🎯
          </div>
          <h3 className="m-0 mb-1.5" style={{ font: "800 20px/1 'Archivo', system-ui", letterSpacing: '-.01em', color: '#0A0E0B' }}>
            No tienes reservas activas
          </h3>
          <p style={{ font: "400 13px/1.5 'Inter', sans-serif", color: 'rgba(10,14,11,.55)', margin: '0 0 20px' }}>
            Todas tus reservas anteriores ya fueron procesadas.
          </p>
          <button
            onClick={() => changeFilter('all')}
            style={{ font: "600 12px/1 'Inter', sans-serif", letterSpacing: '.04em', color: '#0FCB46', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            Ver historial completo →
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((r) => (
              <ReservationCard key={r._id} reservation={r} />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6" style={{ paddingTop: '20px', borderTop: '2px solid #0A0E0B' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
                style={{
                  padding: '8px 16px',
                  font: "600 11px/1 'Inter', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  border: `2px solid ${page === 1 ? 'rgba(10,14,11,.2)' : '#0A0E0B'}`,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  color: page === 1 ? 'rgba(10,14,11,.3)' : '#0A0E0B',
                  transition: 'all .15s',
                }}
              >
                ← Anterior
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: '32px',
                      height: '32px',
                      font: "600 12px/1 'JetBrains Mono', monospace",
                      border: `2px solid ${p === page ? '#0A0E0B' : 'rgba(10,14,11,.2)'}`,
                      cursor: 'pointer',
                      transition: 'all .15s',
                      background: p === page ? '#0A0E0B' : 'transparent',
                      color: p === page ? '#F4F5F0' : 'rgba(10,14,11,.5)',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="pagination-btn"
                style={{
                  padding: '8px 16px',
                  font: "600 11px/1 'Inter', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  border: `2px solid ${page === totalPages ? 'rgba(10,14,11,.2)' : '#0A0E0B'}`,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  color: page === totalPages ? 'rgba(10,14,11,.3)' : '#0A0E0B',
                  transition: 'all .15s',
                }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reveal {
          animation: cardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .res-card {
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .res-card:not(.muted):hover {
          transform: translate(-2px,-2px);
          box-shadow: 4px 4px 0 #0FCB46;
        }
        .action-btn-primary:hover {
          transform: translate(-1px,-1px);
          box-shadow: 3px 3px 0 #0A0E0B !important;
        }
        .action-btn-wa:hover {
          transform: translate(-1px,-1px);
          box-shadow: 3px 3px 0 #0A0E0B !important;
        }
        .action-btn-outline:hover {
          background: #0A0E0B !important;
          color: #F4F5F0 !important;
        }
        .action-btn-cta:hover {
          transform: translate(-2px,-2px);
          box-shadow: 6px 6px 0 #0A0E0B !important;
        }
        .pagination-btn:not(:disabled):hover {
          background: #0A0E0B !important;
          color: #F4F5F0 !important;
        }
        .qr-close-btn:hover {
          background: #0A0E0B !important;
          color: #F4F5F0 !important;
        }
      `}</style>
    </div>
  );
}
