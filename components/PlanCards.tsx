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
    const shouldShowUpgrade = currentPlan === 'Free' || creditsRemaining <= 5;

    if (!shouldShowUpgrade || loading) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-[3rem] p-8 md:p-12 space-y-8">
            <div className="text-center space-y-3">
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
                    {creditsRemaining <= 0 ? '🚀 Créditos Esgotados!' : '⚡ Turbine sua Criação!'}
                </h3>
                <p className="text-sm md:text-base text-gray-300">
                    {creditsRemaining <= 0
                        ? 'Escolha um plano para continuar gerando conteúdo viral'
                        : 'Você está quase sem créditos. Faça upgrade agora!'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.filter(p => p.plan_name !== 'Free').map(plan => (
                    <div
                        key={plan.id}
                        className={`bg-[#1E293B] border-2 rounded-2xl p-6 space-y-6 transition-all hover:scale-105 ${plan.plan_name === 'Professional'
                                ? 'border-indigo-500 shadow-2xl shadow-indigo-500/30'
                                : 'border-white/10 hover:border-indigo-500/50'
                            }`}
                    >
                        {plan.plan_name === 'Professional' && (
                            <div className="bg-indigo-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full w-max mx-auto">
                                Mais Popular
                            </div>
                        )}

                        <div className="text-center space-y-2">
                            <h4 className="text-xl font-black text-white uppercase">{plan.plan_name}</h4>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-black text-indigo-400">R$ {plan.price.toFixed(0)}</span>
                                <span className="text-sm text-gray-500">/mês</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                                <span><strong>{plan.image_quota}</strong> imagens por mês</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                                <span>Roteiros ilimitados</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                                <span>Suporte prioritário</span>
                            </div>
                            {plan.plan_name === 'Professional' && (
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span>Acesso antecipado</span>
                                </div>
                            )}
                        </div>

                        {plan.checkout_url ? (
                            <a
                                href={plan.checkout_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${plan.plan_name === 'Professional'
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                            >
                                Assinar Agora
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        ) : (
                            <button
                                disabled
                                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-white/5 text-gray-500 cursor-not-allowed"
                            >
                                Em Breve
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
