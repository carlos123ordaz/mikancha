import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  value: string;
  min?: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const WEEKDAY_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function formatFull(iso: string) {
  if (!iso) return '';
  const d = parseISO(iso);
  return `${WEEKDAY_LONG[d.getDay()]} ${d.getDate()} de ${MONTH_SHORT[d.getMonth()]}`;
}

export default function DatePicker({ value, min, onChange, placeholder = 'Elegir fecha' }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value ? parseISO(value) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = parseISO(value);
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const minDate = min ? stripTime(parseISO(min)) : null;
  const today = stripTime(new Date());
  const selected = value ? parseISO(value) : null;

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: { date: Date; inMonth: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      list.push({ date: new Date(year, month, -i), inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      list.push({ date: new Date(year, month, i), inMonth: true });
    }
    while (list.length < 42) {
      const last = list[list.length - 1].date;
      list.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return list;
  }, [view]);

  function pick(d: Date) {
    onChange(toISO(d));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 border rounded-xl pl-3.5 pr-3 py-3 text-left transition-all ${
          open
            ? 'border-primary-400 bg-white ring-2 ring-primary-200'
            : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
        }`}
      >
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            value ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-400 border border-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-[11px] uppercase tracking-widest font-semibold text-gray-400 leading-none mb-1">
            Fecha de reserva
          </span>
          <span
            className={`block font-heading font-black truncate capitalize ${
              value ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {value ? formatFull(value) : placeholder}
          </span>
        </span>

        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="date-popover absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl shadow-gray-900/10 border border-gray-100 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              aria-label="Mes anterior"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <p className="font-heading font-black text-gray-900 tracking-tight">
              {MONTH_NAMES[view.getMonth()]} {view.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              aria-label="Mes siguiente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="h-7 flex items-center justify-center text-[11px] font-heading font-bold text-gray-400 uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, inMonth }, i) => {
              const disabled = (minDate && stripTime(date) < minDate) === true;
              const isToday = sameDay(date, today);
              const isSelected = selected ? sameDay(date, selected) : false;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  className={`relative h-10 rounded-lg text-sm font-heading font-bold transition-all ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-[1.03]'
                      : disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : !inMonth
                      ? 'text-gray-300 hover:bg-gray-50'
                      : isToday
                      ? 'text-primary-700 ring-1 ring-primary-300 bg-primary-50/50 hover:bg-primary-100'
                      : isWeekend
                      ? 'text-primary-700 hover:bg-primary-50'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setView(new Date(today.getFullYear(), today.getMonth(), 1));
                pick(today);
              }}
              className="font-heading font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Ir a hoy
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
