import { useState, useEffect, useRef } from 'react';
import type { IUser } from '../types';

interface Props {
  apiUrl: string;
}

export default function AuthWidget({ apiUrl }: Props) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUser(json.data);
        else localStorage.removeItem('auth_token');
      })
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function logout() {
    localStorage.removeItem('auth_token');
    fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/';
  }

  if (loading) {
    return (
      <div
        style={{
          width: 88,
          height: 32,
          background: 'rgba(244,245,240,.12)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}
      >
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <a
        href={`${apiUrl}/api/auth/google`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#0FCB46',
          color: '#0A0E0B',
          border: '2px solid rgba(244,245,240,.35)',
          padding: '8px 16px',
          font: "700 11px/1 'JetBrains Mono', monospace",
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          boxShadow: '3px 3px 0 rgba(244,245,240,.15)',
          transition: 'opacity .12s ease, transform .1s ease, box-shadow .1s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.opacity = '1';
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'translate(2px,2px)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '1px 1px 0 rgba(244,245,240,.15)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '3px 3px 0 rgba(244,245,240,.15)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path fill="currentColor" fillOpacity=".9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" fillOpacity=".9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" fillOpacity=".9" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" fillOpacity=".9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Ingresar
      </a>
    );
  }

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: open ? 'rgba(244,245,240,.08)' : 'transparent',
          border: '1px solid rgba(244,245,240,.12)',
          padding: '6px 10px',
          cursor: 'pointer',
          transition: 'background .12s ease',
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,245,240,.06)';
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            style={{ width: 28, height: 28, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              background: '#0FCB46',
              color: '#0A0E0B',
              display: 'grid',
              placeItems: 'center',
              font: "700 11px/1 'Inter', sans-serif",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <span
          style={{
            font: "600 12px/1 'Inter', sans-serif",
            color: '#F4F5F0',
            maxWidth: 90,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.name.split(' ')[0]}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(244,245,240,.5)"
          strokeWidth={2.5}
          style={{
            transition: 'transform .15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 220,
            background: '#0A0E0B',
            border: '1.5px solid rgba(244,245,240,.15)',
            borderTop: '2px solid #0FCB46',
            zIndex: 50,
            boxShadow: '6px 6px 0 rgba(15,203,70,.15)',
          }}
        >
          {/* User info */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(244,245,240,.1)',
            }}
          >
            <p
              style={{
                font: "700 13px/1 'Inter', sans-serif",
                color: '#F4F5F0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {user.name}
            </p>
            <p
              style={{
                font: "400 11px/1 'Inter', sans-serif",
                color: 'rgba(244,245,240,.45)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: '5px 0 0',
              }}
            >
              {user.email}
            </p>
          </div>

          {/* Mis reservas */}
          <a
            href="/mis-reservas"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              font: "500 12px/1 'Inter', sans-serif",
              color: 'rgba(244,245,240,.8)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(244,245,240,.08)',
              transition: 'background .1s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(244,245,240,.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: '#0FCB46',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            Mis reservas
          </a>

          {/* Cerrar sesión */}
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              font: "500 12px/1 'Inter', sans-serif",
              color: 'rgba(255,80,80,.8)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background .1s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,80,80,.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: 'rgba(255,80,80,.6)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
