import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { IReservation, ICourt } from '../types';

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  courtId: ICourt;
};

interface Props {
  apiUrl: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: string; description: string }
> = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
    description: 'Tu reserva está pendiente de aprobación por el administrador.',
  },
  approved: {
    label: 'Aprobada',
    badge: 'bg-green-100 text-green-700',
    icon: '✅',
    description: 'Tu reserva fue aprobada. Muestra el QR al llegar.',
  },
  rejected: {
    label: 'Rechazada',
    badge: 'bg-red-100 text-red-700',
    icon: '❌',
    description: 'Tu reserva fue rechazada. Contacta al encargado para más información.',
  },
  used: {
    label: 'Utilizada',
    badge: 'bg-gray-100 text-gray-600',
    icon: '✓',
    description: 'Esta reserva ya fue utilizada.',
  },
};

function QrModal({
  reservation,
  onClose,
}: {
  reservation: PopulatedReservation;
  onClose: () => void;
}) {
  const qrValue = `${window.location.origin}/reserva/${reservation.reservationCode}?token=${reservation.qrToken}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-lg"
        />
        <div className="text-4xl mb-3">🎫</div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Tu código QR</h3>
        <p className="text-sm text-gray-400 mb-5">
          Preséntalo al ingresar a la cancha
        </p>

        <div className="flex justify-center mb-5">
          <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <QRCodeSVG
              value={qrValue}
              size={200}
              fgColor="#15803d"
              level="M"
            />
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-3 mb-5">
          <p className="text-xs text-gray-400 mb-0.5">Código de reserva</p>
          <p className="font-mono font-bold text-green-700 text-lg tracking-wider">
            {reservation.reservationCode}
          </p>
        </div>

        <div className="text-sm text-gray-500 space-y-1">
          <p><strong className="text-gray-700">{reservation.courtId.name}</strong></p>
          <p>{reservation.date} · {reservation.startTime} – {reservation.endTime}</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function ReservationCard({
  reservation,
  apiUrl,
}: {
  reservation: PopulatedReservation;
  apiUrl: string;
}) {
  const [showQr, setShowQr] = useState(false);
  const cfg = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.pending;
  const court = reservation.courtId;
  const isPast = new Date(`${reservation.date}T${reservation.endTime}`) < new Date();
  const muted = reservation.status === 'rejected' || reservation.status === 'used';

  function buildWhatsappUrl() {
    // re-build whatsapp link for pending reminders
    const number = '51999999999'; // fallback — ideally read from env
    const msg = encodeURIComponent(
      `Hola! Mi reserva está pendiente de aprobación.\n\nCódigo: *${reservation.reservationCode}*\nCancha: ${court.name}\nFecha: ${reservation.date} · ${reservation.startTime}–${reservation.endTime}\n\n¿Podrían confirmarla? ¡Gracias!`
    );
    return `https://wa.me/${number}?text=${msg}`;
  }

  return (
    <>
      <div
        className={`bg-white rounded-2xl border transition-shadow ${
          muted ? 'border-gray-100 opacity-70' : 'border-gray-100 hover:shadow-md'
        }`}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{court.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">📍 {court.location}</p>
            </div>
            <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${cfg.badge}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>

          {/* Details */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center gap-1">
              📅 <span>{reservation.date}</span>
            </span>
            <span className="flex items-center gap-1">
              🕐 <span>{reservation.startTime} – {reservation.endTime}</span>
            </span>
          </div>

          {/* Code */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mb-4">
            <span className="text-xs text-gray-400">Código</span>
            <span className="font-mono text-sm font-semibold text-gray-700">
              {reservation.reservationCode}
            </span>
          </div>

          {/* Action row */}
          <div className="flex gap-2">
            {reservation.status === 'approved' && reservation.qrToken && (
              <button
                onClick={() => setShowQr(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                <span>📱</span> Ver QR
              </button>
            )}

            {reservation.status === 'pending' && (
              <a
                href={buildWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-2 rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Recordar
              </a>
            )}

            <a
              href={`/canchas/${typeof court === 'object' ? court._id : court}`}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors font-medium"
            >
              Ver cancha
            </a>
          </div>
        </div>
      </div>

      {showQr && reservation.qrToken && (
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

  if (!authenticated) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Inicia sesión</h2>
        <p className="text-gray-500 mb-8">Para ver tus reservas debes iniciar sesión con Google.</p>
        <a
          href={`${apiUrl}/api/auth/google`}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
        >
          Iniciar sesión con Google
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
            <div className="flex justify-between mb-3">
              <div className="h-5 bg-gray-100 rounded w-36" />
              <div className="h-5 bg-gray-100 rounded w-20" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-48 mb-3" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const active = reservations.filter((r) =>
    ['pending', 'approved'].includes(r.status)
  );
  const displayed = filter === 'active' ? active : reservations;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Activas ({active.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Todas ({reservations.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'active' ? 'No tienes reservas activas' : 'No tienes reservas'}
          </h3>
          <p className="text-gray-500 mb-8">
            {filter === 'active'
              ? 'Todas tus reservas anteriores han sido procesadas.'
              : 'Aún no has realizado ninguna reserva.'}
          </p>
          <a
            href="/canchas"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
          >
            Reservar una cancha
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((r) => (
            <ReservationCard key={r._id} reservation={r} apiUrl={apiUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
