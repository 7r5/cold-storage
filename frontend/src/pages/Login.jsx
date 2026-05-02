// Login page (UI in Spanish)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch {
      // error is already exposed via context
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-10 bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm card space-y-4"
        aria-label="Formulario de inicio de sesión"
      >
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-800">Cold Chain Control</h1>
          <p className="text-sm text-slate-500 mt-1">Inicia sesión para continuar</p>
        </div>

        <div>
          <label htmlFor="username" className="block text-sm text-slate-700 mb-1">
            Usuario
          </label>
          <input
            id="username"
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-slate-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-xs text-center text-slate-400">
          Demo: <code>admin / admin</code> &middot; <code>root / root</code>
        </p>
      </form>
    </div>
  );
}
