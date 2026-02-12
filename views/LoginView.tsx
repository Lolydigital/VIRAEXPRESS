
import React, { useState } from 'react';
import { Language, Translation } from '../types';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, password?: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translation;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, language, setLanguage, t }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@') && password.length >= 4) {
      setLoading(true);
      await onLogin(email, password);
      setLoading(false);
    } else {
      alert("Por favor, preencha um e-mail válido e uma senha de no mínimo 4 caracteres.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F172A] selection:bg-indigo-500/30">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-[400px] min-h-[520px] flex flex-col p-10 items-center justify-center text-center animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="mb-8 w-full flex justify-center">
          <img 
            src="https://iili.io/fmbgwKJ.png" 
            alt="ViraExpress Logo" 
            className="w-full max-w-[320px] h-auto drop-shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-transform hover:scale-105 duration-700"
          />
        </div>

        <p className="text-gray-400 text-sm font-medium mb-10 leading-relaxed uppercase tracking-widest text-[10px] opacity-80">
          {t.loginSubtitle}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#0F172A]/50 border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-[#0F172A]/50 border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="py-2">
            <LanguageSwitcher current={language} onSelect={setLanguage} variant="minimal" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              t.loginButton
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
