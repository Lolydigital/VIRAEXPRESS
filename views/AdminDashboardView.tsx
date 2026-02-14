
import React, { useState, useEffect } from 'react';
import { UserProfile, Translation, SubscriptionPlan } from '../types';
import {
  Users, TrendingUp, DollarSign, Settings, Search,
  UserX, ShieldCheck, CreditCard, ArrowLeft,
  Trash2, Mail, Phone, Plus, X, Lock, RefreshCcw,
  CheckCircle2, AlertCircle, Database, Cpu, Zap, Copy, ExternalLink, Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AdminDashboardViewProps {
  user: UserProfile;
  t: Translation;
  onLogout: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ user, t, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('123456');
  const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>('Basic');
  const [isCreating, setIsCreating] = useState(false);
  const [planConfigs, setPlanConfigs] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [systemStatus, setSystemStatus] = useState({
    database: 'checking',
    ai: 'checking',
    env: 'checking'
  });

  useEffect(() => {
    fetchUsers();
    checkSystem();
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const { data } = await supabase.from('plan_config').select('*').order('price', { ascending: true });
    if (data) setPlanConfigs(data);
  };

  const checkSystem = async () => {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    const dbOk = !error;
    const envOk = !!(import.meta as any).env?.VITE_SUPABASE_URL;
    const aiOk = !!(import.meta as any).env?.VITE_GOOGLE_API_KEY;

    setSystemStatus({
      database: dbOk ? 'ok' : 'error',
      ai: aiOk ? 'ok' : 'error',
      env: envOk ? 'ok' : 'error'
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setUsers(data as UserProfile[]);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.includes('@')) return alert("E-mail inválido");
    setIsCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail.toLowerCase(),
        password: newUserPass,
      });
      if (authError && authError.message !== "User already registered") throw authError;
      const userId = authData.user?.id || crypto.randomUUID();
      const quota = planConfigs.find(p => p.plan_name === newUserPlan)?.image_quota || 0;
      const { error: profileError } = await supabase.from('profiles').upsert([{
        id: userId, email: newUserEmail.toLowerCase(), plan: newUserPlan, status: 'active',
        credits_total: newUserPlan === 'Professional' ? 9999 : 50, credits_used: 0,
        image_credits_total: quota, image_credits_used: 0, role: 'user'
      }], { onConflict: 'email' });
      if (profileError) throw profileError;
      alert(`✅ ALUNO ATIVADO!\n\nEmail: ${newUserEmail}\nSenha: ${newUserPass}`);
      setIsModalOpen(false);
      setNewUserEmail('');
      fetchUsers();
    } catch (err: any) {
      alert(`ERRO: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Excluir acesso deste aluno permanentemente?")) return;
    try {
      await supabase.from('profiles').delete().eq('id', id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) { alert("Erro ao excluir."); }
  };

  const envVars = [
    { key: 'VITE_GOOGLE_API_KEY', value: 'Sua chave do Gemini', desc: 'Pegue no Google AI Studio (OBRIGATÓRIO PREFIXO VITE_)' },
    { key: 'VITE_SUPABASE_URL', value: (import.meta as any).env?.VITE_SUPABASE_URL || 'Pendente', desc: 'URL do seu Supabase' },
    { key: 'VITE_SUPABASE_ANON_KEY', value: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'Pendente', desc: 'Chave Anon do Supabase' }
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] pb-20 relative selection:bg-indigo-500/30">
      <header className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur-xl border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">ADMIN PAINEL</h2>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Controle ViraExpress v3.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
            <Plus className="w-4 h-4" /> NOVO ALUNO
          </button>
          <button onClick={onLogout} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"><UserX className="w-6 h-6" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 mt-12 space-y-12">
        {/* Gerenciamento de Planos e Preços */}
        <section className="bg-[#1E293B]/60 border border-white/10 rounded-[3rem] p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Planos e Preços</h3>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Configure preços e cotas de imagem</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planConfigs.map((config) => (
              <div key={config.id} className="bg-black/40 border border-white/5 p-8 rounded-[2.5rem] space-y-6 group hover:border-indigo-500/30 transition-all">
                <div className="flex justify-between items-start">
                  <span className="px-4 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {config.plan_name}
                  </span>
                  <button onClick={() => setEditingPlan(config)} className="text-gray-500 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-white italic tracking-tighter">R$ {config.price}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{config.image_quota} IMAGENS/MÊS</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[8px] font-black text-gray-600 uppercase mb-2">Checkout Link</p>
                  <p className="text-[10px] font-mono text-indigo-400 truncate">{config.checkout_url}</p>
                </div>
              </div>
            ))}
          </div>

          {editingPlan && (
            <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Preço (R$)</label>
                  <input type="number" value={editingPlan.price} onChange={e => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Cota Imagens</label>
                  <input type="number" value={editingPlan.image_quota} onChange={e => setEditingPlan({ ...editingPlan, image_quota: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl" />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Link Checkout</label>
                  <input type="text" value={editingPlan.checkout_url} onChange={e => setEditingPlan({ ...editingPlan, checkout_url: e.target.value })} className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    await supabase.from('plan_config').update(editingPlan).eq('id', editingPlan.id);
                    setEditingPlan(null);
                    fetchConfigs();
                  }}
                  className="bg-emerald-600 px-8 py-3 rounded-xl text-[10px] font-black uppercase"
                >
                  Salvar Alterações
                </button>
                <button onClick={() => setEditingPlan(null)} className="text-gray-500 uppercase text-[10px] font-black">Cancelar</button>
              </div>
            </div>
          )}
        </section>

        {/* Status e Lista de Alunos (Mantido e Melhorado) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#1E293B]/60 border border-white/10 p-6 rounded-[2rem] flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white/5 ${systemStatus.database === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}><Database className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase">Banco de Dados</p>
              <p className="text-xs font-bold text-white uppercase">{systemStatus.database === 'ok' ? 'Conectado' : 'Erro'}</p>
            </div>
          </div>
          {/* ... Resto dos cards ... */}
        </section>

        <section className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden glass-card">
          <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black/20">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-indigo-400" /> LISTA DE ALUNOS ATIVOS
            </h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Pesquisar e-mail..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-80 transition-all" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/5">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Dados do Aluno</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Plano</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Créditos</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="p-20 text-center"><RefreshCcw className="w-10 h-10 animate-spin mx-auto text-indigo-500" /></td></tr>
                ) : users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-xs uppercase">{u.email[0]}</div>
                        <div><p className="text-sm font-bold text-white">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.plan === 'Professional' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-indigo-500/10 text-indigo-500'}`}>{u.plan}</span>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-bold text-gray-400">{u.credits_used}/{u.credits_total}</span>
                    </td>
                    <td className="p-6 text-right">
                      <button onClick={() => handleDeleteUser(u.id)} className="p-3 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal Novo Aluno (Mesmo anterior) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-[#1E293B] border border-white/10 rounded-[3rem] w-full max-w-md p-10 space-y-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Ativar Aluno</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm" placeholder="E-mail do aluno" />
              <input type="text" required value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm" placeholder="Senha" />
              <div className="grid grid-cols-2 gap-3">
                {['Basic', 'Professional'].map(p => (
                  <button key={p} type="button" onClick={() => setNewUserPlan(p as SubscriptionPlan)} className={`py-4 rounded-2xl border text-[10px] font-black uppercase ${newUserPlan === p ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/10'}`}>PLANO {p}</button>
                ))}
              </div>
              <button disabled={isCreating} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl">
                {isCreating ? <RefreshCcw className="w-5 h-5 animate-spin mx-auto" /> : 'LIBERAR ACESSO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
