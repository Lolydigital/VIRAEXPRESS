import React, { useState, useEffect } from 'react';
import { Zap, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PlanConfig } from '../types';

interface PlanCardsProps {
    currentPlan: string;
    creditsUsed: number;
    creditsTotal: number;
}

export const PlanCards: React.FC<PlanCardsProps> = ({ currentPlan, creditsUsed, creditsTotal }) => {
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const { data } = await supabase
                .from('plan_config')
                .select('*')
                .order('price');

            if (data) {
                setPlans(data);
            }
        } catch (err) {
            console.error('Error loading plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const creditsRemaining = creditsTotal - creditsUsed;

    if (loading) return (
        <div className="w-full h-64 flex items-center justify-center">
            <RefreshCcw className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="bg-[#0F172A] border border-white/10 rounded-[4rem] p-10 md:p-20 space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50"></div>

            <div className="text-center space-y-6 relative z-10">
                <div className="w-24 h-24 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Zap className="w-12 h-12 text-indigo-400 fill-indigo-400/20" />
                </div>
                <h3 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                    {creditsRemaining <= 0 ? 'CRÉDITOS ESGOTADOS!' : 'Aumente seus Resultados!'}
                </h3>
                <p className="text-base md:text-xl text-gray-400 font-medium uppercase tracking-widest">
                    Escolha um plano para continuar gerando conteúdo viral
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto relative z-10">
                {plans.filter(p => !['Free', 'Enterprise'].includes(p.plan_name)).map(plan => {
                    const isPro = plan.plan_name === 'Professional';
                    return (
                        <div
                            key={plan.id}
                            className={`bg-[#1E293B]/80 backdrop-blur-xl border-2 rounded-[3rem] p-10 md:p-12 space-y-8 transition-all hover:scale-105 relative overflow-hidden ${isPro
                                ? 'border-indigo-600 shadow-[0_30px_60px_rgba(79,70,229,0.3)] ring-4 ring-indigo-500/10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            {isPro && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase px-6 py-2 rounded-b-2xl tracking-[0.2em] shadow-xl">
                                    MAIS POPULAR
                                </div>
                            )}

                            <div className="text-center space-y-2 pt-4">
                                <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic">{plan.plan_name}</h4>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-6xl font-black text-white italic tracking-tighter">R$ {isPro ? '79' : '29'}</span>
                                    <span className="text-sm text-gray-500 font-bold uppercase tracking-widest">/mês</span>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-white/5 pt-8">
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-sm md:text-base font-bold text-gray-300">
                                        <strong className="text-white">{isPro ? '100' : '30'}</strong> imagens por mês
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-sm md:text-base font-bold text-gray-300">Roteiros ilimitados</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-sm md:text-base font-bold text-gray-300">Suporte prioritário</span>
                                </div>
                                {isPro && (
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <span className="text-sm md:text-base font-bold text-gray-300">Acesso antecipado</span>
                                    </div>
                                )}
                            </div>

                            {plan.checkout_url ? (
                                <a
                                    href={plan.checkout_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`w-full py-6 rounded-2xl font-black text-sm md:text-base uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-95 ${isPro
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/40'
                                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                                        }`}
                                >
                                    ASSINAR AGORA
                                    <ExternalLink className="w-5 h-5 opacity-50" />
                                </a>
                            ) : (
                                <button
                                    disabled
                                    className="w-full py-6 rounded-2xl font-black text-sm uppercase tracking-widest bg-white/5 text-gray-500 cursor-not-allowed"
                                >
                                    EM BREVE
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
