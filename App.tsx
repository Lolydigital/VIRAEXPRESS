
// Build: 2026-02-12 21:20
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Language, ViralIdea, UserProfile, UserRole } from './types';
import { TRANSLATIONS } from './constants';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PromptDetailView } from './views/PromptDetailView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('activeUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'PT';
  });

  const [history, setHistory] = useState<ViralIdea[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('activeUser', JSON.stringify(user));
      fetchHistoryFromSupabase(user.email);
    } else {
      localStorage.removeItem('activeUser');
      setHistory([]);
    }
  }, [user]);

  const fetchHistoryFromSupabase = async (email: string) => {
    setIsHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('history')
        .select('idea_data')
        .eq('user_id', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setHistory(data.map((row: any) => row.idea_data as ViralIdea));
      }
    } catch (err) {
      console.error("Erro histórico:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleLogin = async (email: string, password?: string) => {
    try {
      // 1. Autenticação Real no Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password || '123456', // Senha padrão se não informada
      });

      if (authError) {
        throw new Error("E-mail ou senha incorretos. Verifique seus dados de compra.");
      }

      // 2. Busca o Perfil (Plano, Créditos, Role)
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (profError || !profile) {
        throw new Error("Perfil não encontrado no banco de dados.");
      }

      if (profile.status !== 'active') {
        throw new Error("Acesso bloqueado ou cancelado.");
      }

      setUser(profile as UserProfile);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateCredits = async (used: number) => {
    if (!user) return;
    const newUsed = (user.credits_used || 0) + used;
    setUser({ ...user, credits_used: newUsed });
    await supabase.from('profiles').update({ credits_used: newUsed }).eq('id', user.id);
  };

  const saveToHistory = async (idea: ViralIdea): Promise<void> => {
    if (!user) return;
    const newEntry = { ...idea, timestamp: Date.now() };
    const newHistory = [newEntry, ...history.filter(i => i.id !== idea.id)].slice(0, 50);
    setHistory(newHistory);
    await supabase.from('history').upsert({ id: idea.id, user_id: user.email, idea_data: newEntry });
  };

  const deleteFromHistory = async (id: string) => {
    if (!user) return;
    setHistory(history.filter(i => i.id !== id));
    await supabase.from('history').delete().eq('id', id).eq('user_id', user.email);
  };

  const t = TRANSLATIONS[language];

  return (
    <HashRouter>
      <div className="min-h-screen font-inter bg-[#0F172A] text-white">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LoginView onLogin={handleLogin} language={language} setLanguage={setLanguage} t={t} />} />
          <Route path="/dashboard" element={user ? <DashboardView user={user} t={t} language={language} setLanguage={setLanguage} onLogout={handleLogout} history={history} isHistoryLoading={isHistoryLoading} onDeleteHistory={deleteFromHistory} /> : <Navigate to="/" />} />
          <Route path="/prompts/:id" element={user ? <PromptDetailView user={user} t={t} language={language} onSave={saveToHistory} onConsumeCredit={() => updateCredits(1)} /> : <Navigate to="/" />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboardView user={user} t={t} onLogout={handleLogout} /> : <Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
