
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Translation, Language, ViralIdea, AspectRatio, Persona, InspirationVideo, UserProfile } from '../types';
import { INSPIRATION_VIDEOS } from '../constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import {
  Sparkles, LogOut, Zap, RefreshCcw, Users, Tv, ListChecks,
  Clock, User, Search, Edit3, Trash2, Play, ShieldAlert, MessageCircle
} from 'lucide-react';
import { generateIdeas, discoverTrends } from '../services/geminiService';
import { AIErrorsModal } from '../components/AIErrorsModal';

interface DashboardViewProps {
  user: UserProfile;
  t: Translation;
  language: Language;
  setLanguage: (lang: Language) => void;
  onLogout: () => void;
  history: ViralIdea[];
  isHistoryLoading?: boolean;
  onDeleteHistory: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, t, language, setLanguage, onLogout, history, isHistoryLoading, onDeleteHistory }) => {
  const [method, setMethod] = useState<'list' | 'manual'>('list');
  const [selectedNiche, setSelectedNiche] = useState(t.niches[0]);
  const [customNiche, setCustomNiche] = useState('');
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [muralSearch, setMuralSearch] = useState('');
  const [muralLoading, setMuralLoading] = useState(false);
  const [trends, setTrends] = useState<InspirationVideo[]>([]);

  const navigate = useNavigate();

  const creditsLeft = user.credits_total - user.credits_used;

  useEffect(() => {
    if (method === 'list') {
      setSelectedNiche(t.niches[0]);
    }
  }, [language, t.niches]);

  const handleDiscoverTrends = async () => {
    const term = muralSearch || selectedNiche;
    if (!term) return;

    setMuralLoading(true);
    try {
      const results = await discoverTrends(term, language);
      setTrends(results);
    } catch (error) {
      console.error("Erro ao descobrir tendências:", error);
    } finally {
      setMuralLoading(false);
    }
  };

  const handleGenerate = async (isMore = false) => {
    if (creditsLeft <= 0 && user.role !== 'admin') {
      alert("Você atingiu o limite de créditos do seu plano. Faça upgrade para continuar!");
      return;
    }

    if (isMore) setLoadingMore(true);
    else {
      setLoading(true);
      setIdeas([]);
    }

    try {
      const finalNiche = method === 'list' ? selectedNiche : customNiche;
      const result = await generateIdeas(finalNiche || 'viral talking objects', language);
      if (result && Array.isArray(result)) {
        if (isMore) {
          setIdeas(prev => [...prev, ...result]);
        } else {
          setIdeas(result);
        }
      }
    } catch (error: any) {
      console.error("Erro ao gerar ideias:", error);
      setErrorMessage("Tivemos um problema ao conectar com a IA. Verifique sua chave API no Vercel.");
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const goToPrompt = (idea: ViralIdea) => {
    navigate(`/prompts/${idea.id}`, {
      state: { idea, aspectRatio, mode: 'viral', persona: selectedPersona }
    });
  };

  const restoreFromHistory = (item: ViralIdea) => {
    navigate(`/prompts/${item.id}`, {
      state: {
        idea: item,
        aspectRatio: item.aspectRatio || '9:16',
        mode: 'viral',
        persona: item.persona,
        restoredPrompts: item.savedPrompts
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-indigo-500/30 relative">
      <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-poppins text-2xl font-black text-white italic tracking-tight">
              Vira<span className="text-indigo-500">Express</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <Zap className={`w-3.5 h-3.5 ${creditsLeft > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
              {creditsLeft} {t.success}
            </span>
          </div>

          {user.role === 'admin' && (
            <Link to="/admin" className="p-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all">
              <ShieldAlert className="w-5 h-5" />
            </Link>
          )}

          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <User className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{user.email.split('@')[0]}</span>
          </div>
          <LanguageSwitcher current={language} onSelect={setLanguage} variant="minimal" />
          <button onClick={onLogout} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 pb-32">
        <div className="lg:col-span-8 space-y-12">
          {/* Seção de Personas */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> {t.personaBank}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {t.personas.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(selectedPersona?.id === p.id ? null : p)}
                  className={`p-5 rounded-[2rem] border transition-all text-left relative group overflow-hidden ${selectedPersona?.id === p.id
                    ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-600/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                >
                  <div className="text-3xl mb-3">{p.emoji}</div>
                  <h3 className={`font-black text-[10px] uppercase mb-1 ${selectedPersona?.id === p.id ? 'text-white' : 'text-indigo-400'}`}>{p.name}</h3>
                  <p className={`text-[9px] leading-tight font-medium ${selectedPersona?.id === p.id ? 'text-indigo-100' : 'text-gray-500'}`}>{p.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Seção de Geração */}
          <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-8 glass-card">
            <div className="flex gap-4">
              <button onClick={() => setMethod('list')} className={`flex-1 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${method === 'list' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-black/20 text-gray-500 border-white/5'}`}>
                <ListChecks className="w-4 h-4 mr-2 inline" /> {t.chooseNiche}
              </button>
              <button onClick={() => setMethod('manual')} className={`flex-1 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${method === 'manual' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-black/20 text-gray-500 border-white/5'}`}>
                <Edit3 className="w-4 h-4 mr-2 inline" /> {t.manualNiche}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">{t.nicheLabel}</label>
                {method === 'list' ? (
                  <select value={selectedNiche} onChange={(e) => setSelectedNiche(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {t.niches.map(n => <option key={n} value={n} className="bg-[#0F172A]">{n}</option>)}
                  </select>
                ) : (
                  <input type="text" placeholder="..." value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">{t.formatLabel}</label>
                <div className="flex gap-2">
                  {['9:16', '16:9'].map(r => (
                    <button key={r} onClick={() => setAspectRatio(r as AspectRatio)} className={`flex-1 py-4 rounded-xl border text-[10px] font-black transition-all ${aspectRatio === r ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black/20 border-white/5 text-gray-500'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => handleGenerate(false)} disabled={loading} className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-xl shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50">
              {loading ? <RefreshCcw className="w-8 h-8 animate-spin" /> : <><Zap className="w-6 h-6 fill-current" /> {t.generateButton}</>}
            </button>
          </section>

          {ideas.length > 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ideas.map((idea) => (
                  <div key={idea.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6 hover:bg-white/10 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="text-5xl p-4 bg-black/40 rounded-2xl group-hover:scale-110 transition-transform">{idea.emoji}</div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white">{idea.title}</h3>
                      <p className="text-gray-400 text-[11px] leading-relaxed font-medium">{idea.description}</p>
                    </div>
                    <button onClick={() => goToPrompt(idea)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest">
                      {t.generatePrompts}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleGenerate(true)}
                disabled={loadingMore}
                className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    Gerar Mais 10 Ideias
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                <Tv className="w-4 h-4" /> {t.muralTitle}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTrends([]);
                    handleDiscoverTrends();
                  }}
                  disabled={muralLoading || (!muralSearch && !selectedNiche)}
                  className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20"
                >
                  {muralLoading ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3" /> {t.discover || 'AI DISCOVER'}</>}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-widest">{t.muralSubtitle}</p>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder={t.searchMural || "Busque seu nicho..."}
                value={muralSearch}
                onChange={(e) => setMuralSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDiscoverTrends()}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
              />
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trends.length > 0 && trends.map((trend) => (
                  <a
                    key={trend.id}
                    href={trend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/30 hover:border-indigo-400 transition-all p-4 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 col-span-1 sm:col-span-2"
                  >
                    <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-wider animate-pulse">VIRAL AI ✨</div>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-20 bg-gray-800 rounded-xl bg-cover bg-center shrink-0 border border-white/5" style={{ backgroundImage: `url(${trend.thumbnail})` }}></div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h4 className="text-xs font-black text-white leading-tight mb-2 line-clamp-2 uppercase italic tracking-tighter">{trend.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase">{trend.niche}</span>
                          <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">TikTok Trend</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}

                {t.niches
                  .filter(n => n.toLowerCase().includes(muralSearch.toLowerCase()))
                  .map((niche, idx) => (
                    <a
                      key={idx}
                      href={`https://www.tiktok.com/search?q=${encodeURIComponent('vídeos virais objetos falantes ' + niche)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-2xl bg-[#1E293B]/40 border border-white/5 hover:border-indigo-500/50 transition-all p-5 flex flex-col items-center text-center gap-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-inner">
                        <Play className="w-5 h-5 text-indigo-400 group-hover:text-white" />
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[10px] font-black text-white group-hover:text-indigo-300 leading-tight uppercase tracking-tight">{niche}</span>
                        <span className="block text-[8px] text-gray-600 font-bold uppercase tracking-widest">TikTok Library</span>
                      </div>
                    </a>
                  ))}
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t.historyTitle}
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sincronizando Banco de Dados...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center bg-black/20 rounded-3xl border border-dashed border-white/5">
                  <Clock className="w-8 h-8 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{t.noHistory}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {history.map((item) => (
                    <div key={item.id} className="group relative bg-[#1E293B]/40 border border-white/5 rounded-2xl p-4 hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/5">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => restoreFromHistory(item)}>
                        <div className="text-3xl p-3 bg-black/40 rounded-xl group-hover:scale-110 transition-transform">{item.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white truncate uppercase italic tracking-tighter">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">Salvo</span>
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</p>
                          </div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteHistory(item.id); }} className="absolute top-2 right-2 p-2 text-gray-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 bg-white/5 rounded-lg">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Botão de Suporte Flutuante */}
      <a
        href="https://wa.me/seu-numero"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-32 md:bottom-12 right-6 md:right-12 w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-50 animate-bounce group"
      >
        <MessageCircle className="w-8 h-8" />
        <span className="absolute right-20 bg-green-600 text-white text-[10px] font-black px-4 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest shadow-xl pointer-events-none">Suporte 24h</span>
      </a>

      <AIErrorsModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        onRetry={() => {
          setErrorModalOpen(false);
          handleGenerate(loadingMore);
        }}
        errorMessage={errorMessage}
      />
    </div>
  );
};
