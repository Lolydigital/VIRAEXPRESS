
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

      // 3. Reset Mensal Automático (Lazy Reset)
      let finalProfile = { ...profile };
      const now = new Date();
      const lastLogin = profile.last_login ? new Date(profile.last_login) : null;

      if (lastLogin && (now.getMonth() !== lastLogin.getMonth() || now.getFullYear() !== lastLogin.getFullYear())) {
        console.log("DEBUG: Iniciando reset mensal de créditos...");
        finalProfile.credits_used = 0;
        finalProfile.image_credits_used = 0;
        await supabase.from('profiles').update({
          credits_used: 0,
          image_credits_used: 0,
          last_login: now.getTime()
        }).eq('id', profile.id);
      } else {
        // Apenas atualiza o último login
        await supabase.from('profiles').update({ last_login: now.getTime() }).eq('id', profile.id);
      }

      // 4. Garantia de Cotas Iniciais (Especialmente para o Free Bait)
      if (profile.plan === 'Free' && (profile.image_credits_total === 0 || profile.image_credits_total === undefined)) {
        finalProfile.image_credits_total = 4;
        await supabase.from('profiles').update({ image_credits_total: 4 }).eq('id', profile.id);
      }

      setUser(finalProfile as UserProfile);
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
    // Roteiros ilimitados para o Free
    if (user.plan === 'Free') return;

    const newUsed = (user.credits_used || 0) + used;
    const updatedUser = { ...user, credits_used: newUsed };
    setUser(updatedUser);
    localStorage.setItem('activeUser', JSON.stringify(updatedUser)); // Immediate persistence
    await supabase.from('profiles').update({ credits_used: newUsed }).eq('id', user.id);
  };

  const updateImageCredits = async (used: number) => {
    if (!user) return;
    const newUsed = (user.image_credits_used || 0) + used;
    const updatedUser = { ...user, image_credits_used: newUsed };
    setUser(updatedUser);
    localStorage.setItem('activeUser', JSON.stringify(updatedUser)); // Immediate persistence
    await supabase.from('profiles').update({ image_credits_used: newUsed }).eq('id', user.id);
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
          <Route path="/prompts/:id" element={user ? <PromptDetailView user={user} t={t} language={language} onSave={saveToHistory} onConsumeCredit={() => updateCredits(1)} onConsumeImageCredit={() => updateImageCredits(1)} /> : <Navigate to="/" />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboardView user={user} t={t} onLogout={handleLogout} /> : <Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
