import { useState, useEffect, useMemo } from 'react';
import type { ICourt, TimeSlot } from '../types';

interface StartSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: 'taken' | 'past' | 'out-of-range';
}

interface Props {
  court: ICourt;
  date: string;
  selectedStart: string;
  durationHours: number;
  onSelect: (startTime: string, endTime: string, duration: number) => void;
  apiUrl: string;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function todayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeStartSlots(
  ranges: TimeSlot[],
  taken: TimeSlot[],
  duration: number,
  date: string
): StartSlot[] {
  const isToday = date === todayIsoLocal();
  const nowMins = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -Infinity;

  const result: StartSlot[] = [];
  const seen = new Set<string>();

  for (const range of ranges) {
    const rStart = toMinutes(range.startTime);
    const rEnd = toMinutes(range.endTime);
    if (rEnd <= rStart) continue;

    for (let t = rStart; t + duration * 60 <= rEnd; t += 60) {
      const startTime = fromMinutes(t);
      if (seen.has(startTime)) continue;
      seen.add(startTime);

      const endTime = fromMinutes(t + duration * 60);
      const conflict = taken.some((tk) => tk.startTime < endTime && tk.endTime > startTime);
      const past = t <= nowMins;

      result.push({
        startTime,
        endTime,
        available: !conflict && !past,
        reason: conflict ? 'taken' : past ? 'past' : undefined,
      });
    }
  }

  return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ── Sub-label helper ────────────────────────────────────────────
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        font: "600 10px/1 'JetBrains Mono', monospace",
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: '#0A0E0B',
        marginBottom: 12,
      }}
    >
      <span style={{ width: 14, height: 1.5, background: '#0FCB46', display: 'inline-block', flexShrink: 0 }} />
      {children}
    </div>
  );
}

export default function TimeSlotPicker({
  court,
  date,
  selectedStart,
  durationHours,
  onSelect,
  apiUrl,
}: Props) {
  const [ranges, setRanges] = useState<TimeSlot[]>([]);
  const [taken, setTaken] = useState<TimeSlot[]>([]);
  const [userHoursUsed, setUserHoursUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [localDuration, setLocalDuration] = useState(durationHours);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setFetchError(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${apiUrl}/api/courts/${court._id}/availability?date=${date}`, { headers })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setRanges(json.data.ranges ?? []);
          setTaken(json.data.taken ?? []);
          setUserHoursUsed(json.data.userHoursUsed ?? 0);
        } else {
          setFetchError(true);
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [date, court._id, apiUrl]);

  const maxDuration = Math.max(0, 3 - userHoursUsed);

  const slots = useMemo(
    () => computeStartSlots(ranges, taken, localDuration, date),
    [ranges, taken, localDuration, date]
  );

  function handleSlotClick(slot: StartSlot) {
    if (!slot.available) return;
    onSelect(slot.startTime, slot.endTime, localDuration);
  }

  function handleDurationChange(h: number) {
    setLocalDuration(h);
    if (selectedStart) {
      const newEnd = fromMinutes(toMinutes(selectedStart) + h * 60);
      const stillValid = computeStartSlots(ranges, taken, h, date).some(
        (s) => s.startTime === selectedStart && s.available
      );
      if (stillValid) {
        onSelect(selectedStart, newEnd, h);
      } else {
        onSelect('', '', h);
      }
    } else {
      onSelect('', '', h);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div
          style={{
            display: 'inline-block',
            width: 24, height: 24,
            border: '2.5px solid rgba(10,14,11,.1)',
            borderTopColor: '#0FCB46',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <p style={{ font: "500 12px/1 'Inter', sans-serif", color: 'rgba(10,14,11,.5)', marginTop: 10 }}>
          Cargando disponibilidad...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Fetch error ── */
  if (fetchError) {
    return (
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255,50,50,.06)',
        borderLeft: '3px solid #ff4040',
        font: "500 13px/1.4 'Inter', sans-serif",
        color: '#0A0E0B',
      }}>
        No se pudo cargar la disponibilidad. Verifica tu conexión e intenta de nuevo.
      </div>
    );
  }

  /* ── No slots configured ── */
  if (ranges.length === 0) {
    return (
      <div style={{ padding: '14px 0', font: "400 13px/1 'Inter', sans-serif", color: 'rgba(10,14,11,.5)' }}>
        No hay turnos configurados para esta cancha.
      </div>
    );
  }

  /* ── Limit reached ── */
  if (maxDuration <= 0) {
    return (
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255,226,73,.15)',
        borderLeft: '3px solid #FFE249',
        font: "500 13px/1.4 'Inter', sans-serif",
        color: '#0A0E0B',
      }}>
        Ya alcanzaste el límite de 3 horas de reserva para este día.
      </div>
    );
  }

  const anyAvailable = slots.some((s) => s.available);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Duration selector */}
      <div>
        <SubLabel>Duración</SubLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {([1, 2, 3] as const).map((h) => {
            const isActive = localDuration === h;
            const isDisabled = h > maxDuration;
            return (
              <button
                key={h}
                type="button"
                disabled={isDisabled}
                onClick={() => handleDurationChange(h)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: isActive ? '#0A0E0B' : '#FFFFFF',
                  color: isActive ? '#F4F5F0' : '#0A0E0B',
                  border: `1.5px solid ${isActive ? '#0A0E0B' : '#0A0E0B'}`,
                  font: "700 14px/1 'Inter', sans-serif",
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.35 : 1,
                  transition: 'all .12s ease',
                }}
              >
                {h}h
              </button>
            );
          })}
        </div>
        {userHoursUsed > 0 && (
          <p style={{
            font: "500 11px/1.4 'Inter', sans-serif",
            color: 'rgba(10,14,11,.5)',
            marginTop: 8,
          }}>
            Tienes {userHoursUsed}h reservadas para este día · Máx. restante: {maxDuration}h
          </p>
        )}
      </div>

      {/* Slot grid */}
      <div>
        <SubLabel>Horario de inicio</SubLabel>
        {slots.length === 0 ? (
          <p style={{ font: "400 13px/1 'Inter', sans-serif", color: 'rgba(10,14,11,.5)', padding: '8px 0' }}>
            No hay inicios posibles con una duración de {localDuration}h.
          </p>
        ) : !anyAvailable ? (
          <p style={{ font: "400 13px/1 'Inter', sans-serif", color: 'rgba(10,14,11,.5)', padding: '8px 0' }}>
            Todos los horarios están ocupados o fuera de rango.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {slots.map((slot) => {
              const isSel = selectedStart === slot.startTime;
              const isAvail = slot.available;

              const bg = slot.available
                ? isSel ? '#0FCB46' : '#FFFFFF'
                : 'rgba(10,14,11,.06)';
              const border = isAvail
                ? isSel ? '1.5px solid #0A0E0B' : '1.5px solid #0A0E0B'
                : '1px solid rgba(10,14,11,.12)';
              const color = isAvail ? '#0A0E0B' : 'rgba(10,14,11,.35)';
              const shadow = isSel ? '3px 3px 0 #0A0E0B' : 'none';
              const tf = isSel ? 'translate(-1px, -1px)' : 'none';

              return (
                <button
                  key={slot.startTime}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => handleSlotClick(slot)}
                  title={
                    slot.reason === 'taken'
                      ? 'Ocupado'
                      : slot.reason === 'past'
                      ? 'Horario pasado'
                      : `${slot.startTime}–${slot.endTime}`
                  }
                  style={{
                    padding: '12px 6px',
                    background: bg,
                    border,
                    color,
                    font: "700 14px/1 'Inter', sans-serif",
                    fontVariantNumeric: 'tabular-nums',
                    textDecoration: !isAvail ? 'line-through' : 'none',
                    cursor: !isAvail ? 'not-allowed' : 'pointer',
                    boxShadow: shadow,
                    transform: tf,
                    transition: 'all .12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (isAvail && !isSel) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,203,70,.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isAvail && !isSel) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
                    }
                  }}
                >
                  {slot.startTime}
                </button>
              );
            })}
          </div>
        )}
        <p style={{
          font: "500 11px/1 'Inter', sans-serif",
          color: 'rgba(10,14,11,.45)',
          marginTop: 8,
        }}>
          Tachados: ocupados o fuera del horario de la cancha.
        </p>
      </div>

    </div>
  );
}
