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

  // Cerrar dropdown al hacer click fuera
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
    return <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />;
  }

  if (!user) {
    return (
      <a
        href={`${apiUrl}/api/auth/google`}
        className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" fillOpacity=".9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" fillOpacity=".9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" fillOpacity=".9" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" fillOpacity=".9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Iniciar sesión
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 hover:bg-gray-100 rounded-xl px-2 py-1.5 transition-colors"
        aria-expanded={open}
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
          {user.name.split(' ')[0]}
        </span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <a
            href="/mis-reservas"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <span>📅</span> Mis reservas
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
