import { useEffect, useMemo, useState } from 'react';

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

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32,
  background: '#0A0E0B', color: '#F4F5F0',
  border: '1.5px solid #0A0E0B',
  font: "700 14px/1 'Inter', sans-serif",
  cursor: 'pointer',
  display: 'grid', placeItems: 'center',
  flexShrink: 0,
};

export default function DatePicker({ value, min, onChange }: Props) {
  const [view, setView] = useState(() => {
    const base = value ? parseISO(value) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (value) {
      const d = parseISO(value);
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

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
      list.push({
        date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
        inMonth: false,
      });
    }
    return list;
  }, [view]);

  function pick(d: Date) {
    onChange(toISO(d));
  }

  return (
    <div style={{ padding: 16, background: '#FFFFFF', border: '1.5px solid #0A0E0B' }}>

      {/* Month navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          style={navBtnStyle}
          aria-label="Mes anterior"
        >←</button>
        <span style={{ font: "800 16px/1 'Archivo', system-ui", color: '#0A0E0B', letterSpacing: '-.01em' }}>
          {MONTH_NAMES[view.getMonth()]} {view.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          style={navBtnStyle}
          aria-label="Mes siguiente"
        >→</button>
      </div>

      {/* Day-of-week labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {WEEKDAYS.map((d, i) => (
          <span
            key={i}
            style={{
              font: "600 10px/1 'JetBrains Mono', monospace",
              color: 'rgba(10,14,11,.5)',
              textAlign: 'center',
              padding: '4px 0',
            }}
          >{d}</span>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map(({ date, inMonth }, i) => {
          const disabled = (minDate && stripTime(date) < minDate) === true;
          const isToday = sameDay(date, today);
          const isSel = selected ? sameDay(date, selected) : false;

          const bg = isSel ? '#0FCB46' : isToday ? '#FFE249' : 'transparent';
          const border = isSel ? '1.5px solid #0A0E0B' : '1px solid transparent';
          const shadow = isSel ? '2px 2px 0 #0A0E0B' : 'none';
          const transform = isSel ? 'translate(-1px, -1px)' : 'none';
          const color = disabled
            ? 'rgba(10,14,11,.22)'
            : !inMonth
            ? 'rgba(10,14,11,.28)'
            : '#0A0E0B';

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && pick(date)}
              style={{
                aspectRatio: '1',
                padding: 0,
                background: bg,
                border,
                color,
                font: "700 13px/1 'Inter', sans-serif",
                fontVariantNumeric: 'tabular-nums',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textDecoration: disabled ? 'line-through' : 'none',
                boxShadow: shadow,
                transform,
                transition: 'all .12s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isSel) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,203,70,.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isSel) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    isToday ? '#FFE249' : 'transparent';
                }
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend + ir a hoy */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px dashed rgba(10,14,11,.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        {[
          { swatch: '#FFE249', label: 'Hoy' },
          { swatch: '#0FCB46', label: 'Seleccionado' },
        ].map(({ swatch, label }) => (
          <span
            key={label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              font: "500 11px/1 'Inter', sans-serif",
              color: 'rgba(10,14,11,.6)',
            }}
          >
            <span style={{ width: 12, height: 12, background: swatch, border: '1px solid rgba(10,14,11,.2)', display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
        <button
          type="button"
          onClick={() => {
            setView(new Date(today.getFullYear(), today.getMonth(), 1));
            pick(today);
          }}
          style={{
            marginLeft: 'auto',
            font: "700 10px/1 'JetBrains Mono', monospace",
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: '#0FCB46',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Ir a hoy →
        </button>
      </div>

    </div>
  );
}
