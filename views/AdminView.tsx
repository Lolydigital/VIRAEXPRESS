import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, PlanConfig, SubscriptionPlan } from '../types';
import { supabase } from '../lib/supabase';
import { BarChart3, DollarSign, TrendingUp, Users, Settings, ExternalLink, Save, RefreshCcw, Trash2 } from 'lucide-react';

export const AdminView: React.FC<{ user: UserProfile }> = ({ user }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
    const [saving, setSaving] = useState(false);

    // Manual User Creation State
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserId, setNewUserId] = useState('');
    const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>('Free');

    useEffect(() => {
        if (user.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        loadAdminData();
    }, [user]);

    const loadAdminData = async () => {
        setLoading(true);
        try {
            // Load users
            const { data: usersData } = await supabase
                .from('user_credits')
                .select('*')
                .order('created_at', { ascending: false });
            setUsers(usersData || []);

            // Load plan config
            const { data: plansData } = await supabase
                .from('plan_config')
                .select('*')
                .order('plan_name');
            setPlans(plansData || []);

            // Load WhatsApp config
            const { data: configData } = await supabase
                .from('app_config')
                .select('*')
                .eq('key', 'whatsapp')
                .single();
            if (configData) {
                setWhatsappNumber(configData.value.number || '');
            }
        } catch (err) {
            console.error('Error loading admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const savePlanConfig = async (plan: PlanConfig) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('plan_config')
                .update({
                    price: plan.price,
                    image_quota: plan.image_quota,
                    checkout_url: plan.checkout_url
                })
                .eq('id', plan.id);

            if (!error) {
                setEditingPlan(null);
                await loadAdminData();
            }
        } catch (err) {
            console.error('Error saving plan:', err);
        } finally {
            setSaving(false);
        }
    };

    const saveWhatsAppConfig = async () => {
        setSaving(true);
        try {
            await supabase
                .from('app_config')
                .upsert({
                    key: 'whatsapp',
                    value: { number: whatsappNumber }
                });
        } catch (err) {
            console.error('Error saving WhatsApp:', err);
        } finally {
            setSaving(false);
        }
    };

    const calculateMetrics = () => {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === 'active').length;
        const totalImagesGenerated = users.reduce((sum, u) => sum + (u.image_credits_used || 0), 0);
        const estimatedCost = totalImagesGenerated * 0.22; // $0.22 per image
        const totalRevenue = users.reduce((sum, u) => {
            const plan = plans.find(p => p.plan_name === u.plan);
            return sum + (plan?.price || 0);
        }, 0);
        const profit = totalRevenue - estimatedCost;

        return { totalUsers, activeUsers, totalImagesGenerated, estimatedCost, totalRevenue, profit };
    };

    const createUser = async () => {
        if (!newUserEmail || !newUserId) return;
        setSaving(true);
        try {
            const planConfig = plans.find(p => p.plan_name === newUserPlan);
            const { error } = await supabase
                .from('user_credits')
                .insert({
                    user_id: newUserId,
                    plan: newUserPlan,
                    credits_total: 10, // Default script credits
                    credits_used: 0,
                    image_credits_total: planConfig?.image_quota || 4,
                    image_credits_used: 0,
                    status: 'active'
                });

            if (!error) {
                setNewUserEmail('');
                setNewUserId('');
                setShowCreateUser(false);
                await loadAdminData();
            }
        } catch (err) {
            console.error('Error creating user:', err);
        } finally {
            setSaving(false);
        }
    };

    const updateUserPlan = async (userIdToUpdate: string, newPlanName: SubscriptionPlan) => {
        setSaving(true);
        try {
            const planConfig = plans.find(p => p.plan_name === newPlanName);
            const { error } = await supabase
                .from('user_credits')
                .update({
                    plan: newPlanName,
                    image_credits_total: planConfig?.image_quota || 4
                })
                .eq('user_id', userIdToUpdate);

            if (!error) {
                await loadAdminData();
            }
        } catch (err) {
            console.error('Error updating user plan:', err);
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (userIdToDelete: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_credits')
                .delete()
                .eq('user_id', userIdToDelete);

            if (!error) {
                await loadAdminData();
            }
        } catch (err) {
            console.error('Error deleting user:', err);
        } finally {
            setSaving(false);
        }
    };

    const metrics = calculateMetrics();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <div className="w-20 h-20 border-8 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Admin Dashboard</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowCreateUser(true)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                        >
                            <Users className="w-5 h-5" /> Novo Usuário
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-bold transition-all"
                        >
                            Voltar
                        </button>
                    </div>
                </div>

                {/* Create User Section */}
                {showCreateUser && (
                    <div className="bg-[#1E293B] border border-emerald-500/30 rounded-3xl p-8 space-y-6 animate-in fade-in slide-in-from-top-4">
                        <h2 className="text-2xl font-black text-white uppercase">Cadastrar Usuário Manualmente</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">E-mail</label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white"
                                    placeholder="exemplo@email.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">User ID (Supabase Auth)</label>
                                <input
                                    type="text"
                                    value={newUserId}
                                    onChange={(e) => setNewUserId(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white"
                                    placeholder="uuid-do-usuario"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Plano</label>
                                <select
                                    value={newUserPlan}
                                    onChange={(e) => setNewUserPlan(e.target.value as SubscriptionPlan)}
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white"
                                >
                                    <option value="Free">Free</option>
                                    <option value="Basic">Basic</option>
                                    <option value="Professional">Professional</option>
                                </select>
                            </div>
                            <div className="flex items-end gap-3">
                                <button
                                    onClick={createUser}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Criar
                                </button>
                                <button
                                    onClick={() => setShowCreateUser(false)}
                                    className="py-3 px-6 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-blue-400" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Usuários</span>
                        </div>
                        <p className="text-3xl font-black text-white">{metrics.totalUsers}</p>
                        <p className="text-xs text-gray-500">{metrics.activeUsers} ativos</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <DollarSign className="w-6 h-6 text-red-400" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Gasto Google</span>
                        </div>
                        <p className="text-3xl font-black text-white">R$ {metrics.estimatedCost.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{metrics.totalImagesGenerated} imagens</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Receita</span>
                        </div>
                        <p className="text-3xl font-black text-white">R$ {metrics.totalRevenue.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Total vendas</p>
                    </div>

                    <div className="bg-[#1E293B] border border-emerald-500/30 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-emerald-400" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Lucro Líquido</span>
                        </div>
                        <p className="text-3xl font-black text-emerald-400">R$ {metrics.profit.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Receita - Custo</p>
                    </div>
                </div>

                {/* Plan Configuration */}
                <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <Settings className="w-6 h-6 text-indigo-400" />
                        <h2 className="text-2xl font-black text-white uppercase">Configuração de Planos</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <div key={plan.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 space-y-4">
                                <h3 className="text-xl font-black text-white uppercase">{plan.plan_name}</h3>

                                {editingPlan?.id === plan.id ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase">Preço (R$)</label>
                                            <input
                                                type="number"
                                                value={editingPlan.price}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                                                className="w-full mt-2 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase">Quota de Imagens</label>
                                            <input
                                                type="number"
                                                value={editingPlan.image_quota}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, image_quota: parseInt(e.target.value) })}
                                                className="w-full mt-2 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase">Link de Checkout</label>
                                            <input
                                                type="text"
                                                value={editingPlan.checkout_url}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, checkout_url: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white text-sm"
                                                placeholder="https://pay.hotmart.com/..."
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => savePlanConfig(editingPlan)}
                                                disabled={saving}
                                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                                            >
                                                {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Salvar
                                            </button>
                                            <button
                                                onClick={() => setEditingPlan(null)}
                                                className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-2xl font-black text-indigo-400">R$ {plan.price.toFixed(2)}</p>
                                        <p className="text-sm text-gray-400">{plan.image_quota} imagens</p>
                                        {plan.checkout_url && (
                                            <a
                                                href={plan.checkout_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-2"
                                            >
                                                Ver checkout <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => setEditingPlan(plan)}
                                            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-sm"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* WhatsApp Configuration */}
                <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 space-y-6">
                    <h2 className="text-2xl font-black text-white uppercase">Configuração de Suporte</h2>
                    <div className="max-w-md space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Número WhatsApp</label>
                            <input
                                type="text"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                className="w-full mt-2 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white"
                                placeholder="5511999999999"
                            />
                        </div>
                        <button
                            onClick={saveWhatsAppConfig}
                            disabled={saving}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold flex items-center gap-2"
                        >
                            {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar WhatsApp
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 space-y-6">
                    <h2 className="text-2xl font-black text-white uppercase">Usuários</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-4 px-4 text-xs font-black text-gray-400 uppercase">Email</th>
                                    <th className="text-left py-4 px-4 text-xs font-black text-gray-400 uppercase">Plano</th>
                                    <th className="text-left py-4 px-4 text-xs font-black text-gray-400 uppercase">Créditos</th>
                                    <th className="text-left py-4 px-4 text-xs font-black text-gray-400 uppercase">Uso</th>
                                    <th className="text-left py-4 px-4 text-xs font-black text-gray-400 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-4 px-4 text-sm text-white font-mono">{u.user_id}</td>
                                        <td className="py-4 px-4">
                                            <select
                                                value={u.plan}
                                                onChange={(e) => updateUserPlan(u.user_id, e.target.value as SubscriptionPlan)}
                                                className="bg-black/40 border border-white/10 rounded-lg py-1 px-2 text-xs text-white"
                                                disabled={saving}
                                            >
                                                <option value="Free">Free</option>
                                                <option value="Basic">Basic</option>
                                                <option value="Professional">Professional</option>
                                            </select>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-400">
                                            {u.image_credits_used || 0} / {u.image_credits_total || 0}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full"
                                                    style={{ width: `${((u.image_credits_used || 0) / (u.image_credits_total || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 flex items-center justify-between gap-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.status === 'active' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                                                }`}>
                                                {u.status}
                                            </span>
                                            <button
                                                onClick={() => deleteUser(u.user_id)}
                                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                                title="Excluir Usuário"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
