import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { clearClientSessionStorage } from '../lib/authSession';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const SIGN_IN_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Timeout : ${label} (${ms / 1000}s). Vérifiez que Supabase tourne (port 54321).`));
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('m.lefranc@syndicat.fr');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        SIGN_IN_TIMEOUT_MS,
        'connexion',
      );
      if (signInError) throw signInError;
      if (!data.session?.access_token) {
        throw new Error('Connexion OK mais session absente — réessayez.');
      }

      // Hard reload : évite état React / React Query coincé après login
      window.location.assign('/');
    } catch (err) {
      clearClientSessionStorage();
      setError(err instanceof Error ? err.message : 'Échec de la connexion');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <LogIn size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Connexion Sinfoni</h1>
            <p className="text-xs text-slate-500">Session Supabase — JWT &amp; RLS</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Mot de passe</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Compte démo : <code className="text-slate-700">m.lefranc@syndicat.fr</code> /{' '}
          <code className="text-slate-700">password123</code>
        </p>

        <p className="mt-2 text-center text-xs text-slate-500">
          <Link to="/" className="text-sky-600 hover:underline">
            Continuer en mode démo (sans session)
          </Link>
        </p>
      </div>
    </div>
  );
}
