import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { IReservation, ICourt } from '../types';

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  courtId: ICourt;
};

interface Props {
  apiUrl: string;
}

const WHATSAPP_NUMBER =
  (import.meta.env.PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? '51913628087';

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string; description: string }
> = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-400',
    description: 'Tu reserva está pendiente de aprobación por el administrador.',
  },
  approved: {
    label: 'Aprobada',
    badge: 'bg-primary-50 text-primary-700 border border-primary-200',
    dot: 'bg-primary-500',
    description: 'Tu reserva fue aprobada. Muestra el QR al llegar.',
  },
  rejected: {
    label: 'Rechazada',
    badge: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-400',
    description: 'Tu reserva fue rechazada. Contacta al encargado para más información.',
  },
  used: {
    label: 'Utilizada',
    badge: 'bg-gray-100 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
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
  const qrValue = reservation.reservationCode;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl max-w-sm w-full text-center shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient band */}
        <div className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-600 px-6 pt-6 pb-8 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <p className="relative text-primary-100 text-[11px] font-semibold uppercase tracking-widest mb-1">
            Tu código QR
          </p>
          <h3 className="relative font-heading text-white text-2xl font-black leading-tight">
            Preséntalo al ingresar
          </h3>
        </div>

        <div className="p-6">
          <div className="flex justify-center -mt-16 mb-5">
            <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-xl">
              <QRCodeSVG
                value={qrValue}
                size={200}
                fgColor="#15803d"
                level="M"
              />
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-5">
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-0.5">
              Código de reserva
            </p>
            <p className="font-mono font-black text-primary-700 text-lg tracking-[0.2em]">
              {reservation.reservationCode}
            </p>
          </div>

          <div className="text-sm text-gray-600 space-y-1 mb-6">
            <p className="font-heading font-black text-gray-900 text-base">
              {reservation.courtId.name}
            </p>
            <p className="text-gray-500">
              {formatDate(reservation.date)} · {reservation.startTime} – {reservation.endTime}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
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
  const cfg = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.pending;
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
      <div
        className={`reveal group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden ${
          muted ? 'opacity-70' : ''
        }`}
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-lg font-black text-gray-900 leading-tight truncate">
                {court.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{court.location}</span>
              </p>
            </div>
            <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none">Fecha</p>
                <p className="text-sm font-semibold text-gray-800 truncate capitalize">
                  {formatDate(reservation.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none">Horario</p>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {reservation.startTime} – {reservation.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* Código */}
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl px-3 py-2 mb-4">
            <span className="text-[11px] text-gray-400 uppercase tracking-widest">Código</span>
            <span className="font-mono text-sm font-bold text-gray-800 tracking-[0.15em]">
              {reservation.reservationCode}
            </span>
          </div>

          {/* Status helper */}
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">{cfg.description}</p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {reservation.status === 'approved' && (
              <button
                onClick={() => setShowQr(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
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
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Recordar por WhatsApp
              </a>
            )}

            <a
              href={`/canchas/${court._id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Ver cancha
              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {showQr && (
        <QrModal reservation={reservation} onClose={() => setShowQr(false)} />
      )}
    </>
  );
}

export default function MyReservations({ apiUrl }: Props) {
  const [reservations, setReservations] = useState<PopulatedReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

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

  /* ── No autenticado ─────────────────────────────────────── */
  if (!authenticated) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 sm:p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-50 to-emerald-100 mb-6 text-4xl">
          🔒
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-black text-gray-900 mb-2">
          Inicia sesión
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto mb-7">
          Para ver tus reservas y descargar tu código QR debes iniciar sesión con Google.
        </p>
        <a
          href={`${apiUrl}/api/auth/google`}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-bold shadow-sm hover:shadow-md transition-all"
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
        <div className="h-10 w-60 bg-gray-100 rounded-xl animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-100 rounded w-36" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
                <div className="h-6 bg-gray-100 rounded-full w-24" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
              </div>
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const active = reservations.filter((r) => ['pending', 'approved'].includes(r.status));
  const displayed = filter === 'active' ? active : reservations;

  /* ── Sin reservas (completamente vacío) ─────────────────── */
  if (reservations.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 sm:p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-50 to-emerald-100 mb-6 text-4xl">
          📭
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-black text-gray-900 mb-2">
          Aún no tienes reservas
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto mb-7">
          Cuando reserves una cancha, la encontrarás aquí con su código QR y estado en tiempo real.
        </p>
        <a
          href="/canchas"
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-bold shadow-sm hover:shadow-md transition-all"
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
        <div className="inline-flex gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm w-fit">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === 'active'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Activas <span className="opacity-70">({active.length})</span>
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === 'all'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Todas <span className="opacity-70">({reservations.length})</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 font-medium">
          {displayed.length} {displayed.length === 1 ? 'reserva' : 'reservas'}
        </p>
      </div>

      {/* Empty state para filtro activo */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-50 to-emerald-100 mb-4 text-3xl">
            🎯
          </div>
          <h3 className="font-heading text-lg font-black text-gray-900 mb-1">
            No tienes reservas activas
          </h3>
          <p className="text-sm text-gray-500 mb-5">
            Todas tus reservas anteriores ya fueron procesadas.
          </p>
          <button
            onClick={() => setFilter('all')}
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
          >
            Ver historial completo →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((r) => (
            <ReservationCard key={r._id} reservation={r} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .reveal {
          animation: cardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
