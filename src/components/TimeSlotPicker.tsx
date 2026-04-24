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
    // Si el inicio seleccionado sigue siendo válido con la nueva duración, recalcular endTime
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

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
        <p className="text-sm text-gray-400 mt-2">Cargando disponibilidad...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <p className="text-center text-red-400 py-4 text-sm">
        No se pudo cargar la disponibilidad. Verifica tu conexión e intenta de nuevo.
      </p>
    );
  }

  if (ranges.length === 0) {
    return (
      <p className="text-center text-gray-400 py-4">
        No hay turnos configurados para esta cancha.
      </p>
    );
  }

  if (maxDuration <= 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Ya alcanzaste el límite de 3 horas de reserva para este día.
      </div>
    );
  }

  const anyAvailable = slots.some((s) => s.available);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Duration selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Duración</p>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((h) => (
            <button
              key={h}
              type="button"
              disabled={h > maxDuration}
              onClick={() => handleDurationChange(h)}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                localDuration === h
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
        {userHoursUsed > 0 && (
          <p className="text-[11px] sm:text-xs text-yellow-600 mt-1.5">
            Tienes {userHoursUsed}h reservadas para este día · Máx. restante: {maxDuration}h
          </p>
        )}
      </div>

      {/* Slot grid */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Horario de inicio <span className="text-red-500">*</span>
        </p>
        {slots.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center">
            No hay inicios posibles con una duración de {localDuration}h.
          </p>
        ) : !anyAvailable ? (
          <p className="text-sm text-gray-400 py-3 text-center">
            Todos los horarios están ocupados o fuera de rango.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => {
              const isSelected = selectedStart === slot.startTime;
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
                  className={`py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-colors leading-tight ${
                    isSelected
                      ? 'bg-green-600 text-white shadow-sm'
                      : slot.available
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                  }`}
                >
                  {slot.startTime}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[11px] sm:text-xs text-gray-400 mt-2">
          Tachados: ocupados o fuera del horario de la cancha.
        </p>
      </div>
    </div>
  );
}
