'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          router.push('/');
        }
      } catch (err) {
        // Evitar romper la UI si /api/auth/session no devuelve JSON válido (p.ej. 204 o HTML)
        console.warn('No se pudo verificar sesión actual:', err);
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales inválidas. Revisa tus datos.');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Ha ocurrido un error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
  const passwordValid = password.length >= 6;

  const onPasswordKeyEvent = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const caps = event.getModifierState && event.getModifierState('CapsLock');
    setIsCapsLockOn(caps);
  };

  return (
    <div className="w-full max-w-md md:max-w-lg">
      <div className="rounded-2xl bg-white p-8 shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">Panel de Administración</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-400">Inicia sesión para acceder a tu cuenta</p>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit} noValidate aria-describedby="form-error" aria-busy={loading}>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={email.length > 0 && !emailValid}
              aria-describedby={!emailValid && email.length > 0 ? 'email-error' : undefined}
              className={`mt-1 block w-full rounded-lg border px-4 py-3.5 text-slate-900 shadow-sm outline-none transition focus:ring-2 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 ${
                email.length > 0 && !emailValid
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!emailValid && email.length > 0 && (
              <p id="email-error" className="mt-2 text-sm text-red-600">
                Introduce un correo válido.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Contraseña
              </label>
              <a href="#" className="text-sm font-medium text-primary-700 hover:text-primary-600 dark:text-primary-400">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-invalid={password.length > 0 && !passwordValid}
                aria-describedby={`${isCapsLockOn ? 'caps-hint ' : ''}${!passwordValid && password.length > 0 ? 'password-error' : ''}`.trim() || undefined}
                onKeyUp={onPasswordKeyEvent}
                onKeyDown={onPasswordKeyEvent}
                className={`block w-full rounded-lg border px-4 py-3.5 pr-11 text-slate-900 shadow-sm outline-none transition focus:ring-2 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 ${
                  password.length > 0 && !passwordValid
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="Introduce tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 my-auto mr-2 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-slate-800"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {isCapsLockOn && (
              <p id="caps-hint" className="mt-2 text-xs text-amber-600">
                Bloq Mayús está activado.
              </p>
            )}
            {!passwordValid && password.length > 0 && (
              <p id="password-error" className="mt-2 text-sm text-red-600">
                La contraseña debe tener al menos 6 caracteres.
              </p>
            )}
          </div>

          {/* Global error */}
          {error && (
            <div id="form-error" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Remember */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-900 dark:text-slate-100">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-700" />
              Recuérdame
            </label>
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={loading || !emailValid || !passwordValid}
              aria-disabled={loading || !emailValid || !passwordValid}
              className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          © {new Date().getFullYear()} Polideportivo Victoria Hernandez. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}