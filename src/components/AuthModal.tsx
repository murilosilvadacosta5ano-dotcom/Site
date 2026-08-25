import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Key, Lock, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { registerWithToken, loginWithToken } from '../lib/auth';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setToken('');
    setPassword('');
    setDisplayName('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        await registerWithToken(token, password, displayName || undefined);
      } else {
        await loginWithToken(token, password);
      }
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      let message = 'Ocorreu um erro. Tente novamente.';

      const code = err?.code || '';
      if (code.includes('email-already-in-use') || code.includes('already-exists')) {
        message = 'Este token já está em uso. Escolha outro.';
      } else if (code.includes('invalid-email')) {
        message = 'Token inválido. Use apenas letras, números, ponto, _ ou -.';
      } else if (code.includes('wrong-password') || code.includes('invalid-credential')) {
        message = 'Token ou senha incorretos.';
      } else if (code.includes('user-not-found')) {
        message = 'Conta não encontrada. Crie uma conta primeiro.';
      } else if (code.includes('weak-password')) {
        message = 'A senha precisa ter no mínimo 6 caracteres.';
      } else if (err?.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-black/5 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D0D0D] flex items-center justify-center">
                {mode === 'login' ? (
                  <LogIn className="text-white" size={18} />
                ) : (
                  <UserPlus className="text-white" size={18} />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0D0D0D]">
                  {mode === 'login' ? 'Entrar com Token' : 'Criar Conta'}
                </h2>
                <p className="text-xs text-[#6E6E80]">
                  {mode === 'login'
                    ? 'Use seu token e senha'
                    : 'Crie um token único + senha'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F7F7F8] rounded-full transition-colors text-[#6E6E80]"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6E6E80] uppercase tracking-wider">
                  Nome de exibição (opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Como quer ser chamado"
                    className="w-full bg-[#F7F7F8] border border-transparent focus:border-[#E5E5E5] focus:bg-white rounded-xl px-4 py-3 text-sm text-[#0D0D0D] outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6E6E80] uppercase tracking-wider flex items-center gap-1.5">
                <Key size={12} />
                Token (sua identidade)
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ex: meuToken123"
                required
                minLength={3}
                className="w-full bg-[#F7F7F8] border border-transparent focus:border-[#E5E5E5] focus:bg-white rounded-xl px-4 py-3 text-sm text-[#0D0D0D] outline-none transition-all font-mono"
                autoComplete="username"
              />
              <p className="text-[11px] text-[#6E6E80]">
                Use letras, números, ponto, _ ou -. Mínimo 3 caracteres.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6E6E80] uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} />
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full bg-[#F7F7F8] border border-transparent focus:border-[#E5E5E5] focus:bg-white rounded-xl px-4 py-3 text-sm text-[#0D0D0D] outline-none transition-all"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token.trim() || password.length < 6}
              className={cn(
                'w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2',
                loading || !token.trim() || password.length < 6
                  ? 'bg-[#E5E5E5] text-[#6E6E80] cursor-not-allowed'
                  : 'bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] shadow-md'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : mode === 'login' ? (
                'Entrar'
              ) : (
                'Criar Conta'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                className="text-sm text-[#6E6E80] hover:text-[#0D0D0D] transition-colors"
              >
                {mode === 'login' ? (
                  <>
                    Não tem conta?{' '}
                    <span className="font-bold text-[#0D0D0D]">Criar agora</span>
                  </>
                ) : (
                  <>
                    Já tem conta?{' '}
                    <span className="font-bold text-[#0D0D0D]">Fazer login</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
