
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Translation, Language, ViralIdea, PromptSet, AspectRatio, Persona, UserProfile, SubscriptionPlan } from '../types';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Copy, CheckCircle, ExternalLink, ImageIcon, RefreshCcw,
  Zap, Sparkles, Smile, Tv, Send,
  ShieldCheck, DownloadCloud, Scissors, Droplets, AtSign, Upload, Video, Trash2,
  AlertCircle, BarChart3, Info, TrendingUp, Mic
} from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { generatePrompts, generateActualImage } from '../services/geminiService';
import { AIErrorsModal } from '../components/AIErrorsModal';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { PlanCards } from '../components/PlanCards';

export const PromptDetailView: React.FC<{ user: UserProfile; t: Translation; language: Language; onSave: (idea: ViralIdea) => Promise<void>; onConsumeCredit: () => void; onConsumeImageCredit: () => void }> = ({ user, t, language, onSave, onConsumeCredit, onConsumeImageCredit }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { idea, aspectRatio, imageInput, persona, restoredPrompts } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [prompts, setPrompts] = useState<PromptSet | null>(restoredPrompts || null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [watermarkedImages, setWatermarkedImages] = useState<Record<string, string>>({});
  const [showExhaustedModal, setShowExhaustedModal] = useState(false);
  const [userHandle, setUserHandle] = useState(idea?.userHandle || '@SeuHandle');
  const [finalVideo, setFinalVideo] = useState<string | null>(idea?.finalVideoUrl || null);

  const { isListening, startListening, stopListening } = useSpeechToText((text) => {
    setRefinementText(prev => prev ? `${prev} ${text}` : text);
  });
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [copied, setCopied] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadContent = async (refinement?: string) => {
    if (!refinement && restoredPrompts) {
      setLoading(false);

      // Restore saved images if they exist (avoid regeneration)
      if (idea?.savedImages) {
        setGeneratedImages(idea.savedImages);
        console.log('DEBUG: [PromptDetail] Restored saved images from DB');
      }

      // Auto generate images for all objects that don't have saved images
      if (Array.isArray(restoredPrompts.objetos)) {
        const imageCreditsLeft = (user.image_credits_total || 0) - (user.image_credits_used || 0);
        let availableCredits = imageCreditsLeft;
        restoredPrompts.objetos.forEach((obj: any) => {
          if (!idea?.savedImages?.[obj.id]) {
            if (availableCredits > 0 || user.role === 'admin') {
              handleImageGen(obj.id, obj.imagePrompt);
              availableCredits--;
            }
          }
        });
      }
      return;
    }

    // Prevent duplicate calls
    if (loading || refining) {
      console.warn('Content generation already in progress, ignoring duplicate request');
      return;
    }

    if (refinement) setRefining(true);
    else {
      setLoading(true);
      onConsumeCredit(); // Consome crédito ao abrir uma nova estratégia
    }

    try {
      console.log(`DEBUG: [PromptDetail] Iniciando geração de estratégia para: ${idea.title}`);
      const pResult = await generatePrompts(idea, language, aspectRatio as AspectRatio, 'viral', imageInput, refinement, prompts || undefined, persona, user.plan);
      console.log(`DEBUG: [PromptDetail] Estratégia recebida com sucesso:`, pResult);
      console.log(`DEBUG: [PromptDetail] Estrutura - objetos: ${Array.isArray(pResult.objetos)}, roteiro: ${Array.isArray(pResult.roteiro_unificado)}`);
      setPrompts(pResult);

      if (Array.isArray(pResult.objetos)) {
        const imageCreditsTotal = (user.image_credits_total || 0) - (user.image_credits_used || 0);
        let availableCredits = imageCreditsTotal;

        pResult.objetos.forEach(obj => {
          if (availableCredits > 0 || user.role === 'admin') {
            handleImageGen(obj.id, obj.imagePrompt);
            availableCredits--;
          }
        });
      } else {
        console.warn(`DEBUG: [PromptDetail] Aviso: 'objetos' não é um array!`, pResult.objetos);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Erro ao gerar estrutura. Verifique sua chave Gemini no Vercel.");
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
      setRefining(false);
    }
  };

  const handleRefine = () => {
    if (refining || loading) {
      console.warn('Refinement already in progress, ignoring duplicate request');
      return;
    }
    if (refinementText.trim()) {
      loadContent(refinementText);
      setRefinementText('');
    }
  };



  const applyWatermark = (id: string, originalUrl: string) => {
    if (!originalUrl) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const padding = 30;
        const fontSize = Math.floor(img.width / 32);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const text = userHandle || '@ViraExpress';
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        const bgWidth = textWidth + 30;
        const bgHeight = fontSize + 16;
        const x = img.width - bgWidth - padding;
        const y = img.height - bgHeight - padding;
        ctx.beginPath();
        ctx.roundRect(x, y, bgWidth, bgHeight, 12);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText(text, x + 15, y + fontSize + 5);
        setWatermarkedImages(prev => ({ ...prev, [id]: canvas.toDataURL() }));
      }
    };
    img.src = originalUrl;
  };

  const handleImageGen = async (id: string, prompt: string, forceRegenerate = false) => {
    // Check if image already exists in local state
    if (!forceRegenerate && generatedImages[id]) {
      return;
    }

    const imageCreditsLeft = (user.image_credits_total || 0) - (user.image_credits_used || 0);

    const limit = user.image_credits_total || (user.plan === 'Free' ? 4 : 30);
    const used = user.image_credits_used || 0;

    if (used >= limit && user.role !== 'admin') {
      setShowExhaustedModal(true);
      return;
    }

    if ((imageCreditsLeft <= 0 || user.status !== 'active') && user.role !== 'admin') {
      setShowExhaustedModal(true);
      return;
    }

    setGeneratingImages(prev => ({ ...prev, [id]: true }));
    try {
      // 1. Tentar buscar do Cache (image_library) se não for regeneração forçada
      if (!forceRegenerate) {
        const obj = prompts?.objetos.find(o => o.id === id);
        if (obj) {
          const { data: cached } = await supabase
            .from('image_library')
            .select('image_url')
            .eq('object_name', obj.title)
            .eq('expression', obj.persona)
            .limit(1)
            .single();

          if (cached?.image_url) {
            console.log(`DEBUG: [Cache] Imagem encontrada na biblioteca para ${obj.title} (${obj.persona})`);
            setGeneratedImages(prev => ({ ...prev, [id]: cached.image_url }));
            applyWatermark(id, cached.image_url);
            return;
          }
        }
      }

      // 2. Se não houver cache, gera normalmente
      const imgUrl = await generateActualImage(prompt, aspectRatio as AspectRatio);
      setGeneratedImages(prev => ({ ...prev, [id]: imgUrl }));
      onConsumeImageCredit();
      applyWatermark(id, imgUrl);

      // 3. Salva na biblioteca para cache futuro
      const obj = prompts?.objetos.find(o => o.id === id);
      if (obj) {
        await supabase.from('image_library').insert({
          niche: idea.niche || 'Geral', // Adicionando fallback se niche não estiver no objeto
          object_name: obj.title,
          expression: obj.persona,
          image_url: imgUrl
        });
      }
    } catch (err) {
      console.error("Erro na imagem:", id, err);
    } finally {
      setGeneratingImages(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFinalVideo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => { if (!idea) navigate('/dashboard'); else loadContent(); }, [idea]);

  // Auto-apply watermark when userHandle changes
  useEffect(() => {
    if (userHandle && userHandle !== '@SeuHandle') {
      Object.keys(generatedImages).forEach(id => {
        if (generatedImages[id]) {
          applyWatermark(id, generatedImages[id]);
        }
      });
    }
  }, [userHandle]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadImage = (id: string) => {
    const url = watermarkedImages[id] || generatedImages[id];
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `ViraExpress_${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeWatermark = (id: string) => {
    setWatermarkedImages(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const saveAction = async () => {
    if (prompts && !isSaving) {
      setIsSaving(true);
      try {
        await onSave({
          ...idea,
          savedPrompts: prompts,
          savedImages: generatedImages, // Save generated images to avoid regeneration
          aspectRatio,
          persona,
          userHandle,
          finalVideoUrl: finalVideo || undefined
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } catch (err) {
        console.error("Erro ao salvar:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const flowTools = [
    { name: 'GEMINI', label: 'Roteiros com IA', icon: <Sparkles className="w-5 h-5" />, url: 'https://gemini.google.com', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
    { name: 'VEO 3', label: 'Gerar vídeo com IA', icon: <Tv className="w-5 h-5" />, url: 'https://labs.google/veo', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' },
    { name: 'CAPCUT', label: 'Editar vídeo', icon: <Scissors className="w-5 h-5" />, url: 'https://www.capcut.com', color: 'bg-gray-600/20 text-white border-white/20' },
    { name: 'REMOVE LOGO', label: 'Remover marca d\'água', icon: <Droplets className="w-5 h-5" />, url: 'https://watermarkremover.io', color: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30' }
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 border-8 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
      <h2 className="text-2xl font-black text-white italic uppercase tracking-[0.2em]">{t.loading}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] pb-80">
      <header className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur-xl border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-white/10 rounded-2xl transition-all flex items-center gap-2 group">
          <ArrowLeft className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t.back}</span>
        </button>
        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter truncate max-w-md">
          {idea.title}
        </h2>
        <div className="w-24"></div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-12 space-y-12 pb-64">
        <div className="text-center space-y-3">
          <h2 className="text-gray-500 text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] mb-4">A FILHA DO DESESPERO</h2>
          <h1 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center justify-center gap-4">
            ESTRUTURA VIRAL <CheckCircle className="w-10 h-10 text-emerald-500" />
          </h1>
          <p className="text-gray-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em]">{t.readySubtitle}</p>
        </div>


        {/* 1. SCORE VIRAL (TOP) */}
        <section className="bg-[#1E293B]/60 border border-white/10 rounded-[3rem] p-8 md:p-12 space-y-10 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">{t.viralScoreTitle || 'VIRAL SCORE'}</h3>
                <p className="text-indigo-400 font-bold uppercase tracking-widest text-[11px]">{t.viralDescription || 'Análise de potencial de viralização'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-6xl font-black text-white italic tracking-tighter">{prompts?.viral_score?.total || 0}</span>
              <span className="text-3xl font-black text-indigo-500/50 uppercase italic tracking-tighter">/100</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: t.hookScore || 'Gancho Viral', val: prompts?.viral_score?.hook || 0, color: 'from-emerald-500 to-teal-400', emoji: '🪝' },
              { label: t.retentionScore || 'Retenção', val: prompts?.viral_score?.retention || 0, color: 'from-blue-500 to-indigo-400', emoji: '⏱️' },
              { label: t.ctaScore || 'Força do CTA', val: prompts?.viral_score?.cta || 0, color: 'from-indigo-500 to-purple-400', emoji: '📢' },
              { label: t.trendScore || 'Potencial Trend', val: prompts?.viral_score?.total ? Math.min(100, prompts.viral_score.total + 5) : 95, color: 'from-pink-500 to-rose-400', emoji: '🔥' }
            ].map(s => (
              <div key={s.label} className="bg-black/40 p-6 rounded-[2.5rem] border border-white/10 space-y-4 shadow-xl">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-sm scale-125">{s.emoji}</span>
                    <span>{s.label}</span>
                  </div>
                  <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{s.val}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div
                    className={`h-full bg-gradient-to-r ${s.color} rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.4)]`}
                    style={{ width: `${s.val}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* FEEDBACK TÉCNICO VIRAL */}
          {prompts?.viral_score?.feedback && (
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Análise Estratégica de Viralização</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">Motivo do Potencial</span>
                    <p className="text-gray-300 text-sm font-medium leading-relaxed italic">"{prompts.viral_score.reason || prompts.viral_score.feedback}"</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">Público Alvo</span>
                    <p className="text-gray-300 text-sm font-bold">{prompts.viral_score.audience || 'Geral / TikTok Trends'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">Sugestão de CTA</span>
                    <p className="text-emerald-400 text-sm font-black uppercase tracking-tight">{prompts.viral_score.suggested_cta || 'Curta e Siga para mais!'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">Hashtags Sugeridas</span>
                    <div className="flex flex-wrap gap-2">
                      {(prompts.viral_score.hashtags || ['#viral', '#objetosfalantes', '#ViraExpress']).map(tag => (
                        <span key={tag} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-gray-400 font-bold">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* AJUSTES E REFINAMENTO */}
        <section className="bg-[#1E293B]/60 border border-white/10 rounded-[3rem] p-10 md:p-14 space-y-12 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sparkles className="w-8 h-8 text-indigo-400" />
              <h3 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter shrink-0">{t.refineTitle}</h3>
            </div>
            <div className="flex gap-4">
              <button onClick={() => loadContent("Deixe a expressão mais dramática e exagerada")} className="px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                + Expressão
              </button>
              <button onClick={() => loadContent("Mude o cenário para algo more inusitado")} className="px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                Mudar Cenário
              </button>
              <button onClick={() => {
                loadContent("Remova logotipos, textos e marcas visíveis da imagem. Gere uma imagem limpa e profissional.");
                // Também remove visualmente as marcas atuais
                Object.keys(generatedImages).forEach(id => removeWatermark(id));
              }} className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all">
                Remover Marcas
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-6 relative">
            <div className="flex-1 relative">
              <textarea
                placeholder={t.refinePlaceholder}
                value={refinementText}
                onChange={(e) => setRefinementText(e.target.value)}
                className="w-full min-h-[120px] px-8 py-6 bg-black/50 border border-white/10 rounded-[2rem] text-sm md:text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-white transition-all resize-none shadow-inner leading-relaxed pr-16"
              />
              <button
                onClick={() => isListening ? stopListening() : startListening(language === 'PT' ? 'pt-BR' : 'en-US')}
                className={`absolute right-6 top-6 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-gray-500 hover:text-indigo-400 hover:bg-white/5'}`}
              >
                <Mic className={`w-6 h-6 ${isListening ? 'scale-110' : ''}`} />
              </button>
            </div>
            <button
              onClick={handleRefine}
              disabled={refining || !refinementText.trim()}
              className="px-12 py-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 shrink-0"
            >
              {refining ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              <span className="text-[12px] uppercase tracking-widest">{t.adjust}</span>
            </button>
          </div>
        </section>

        {/* PERSONALIZAR MARCA DE PROTEÇÃO */}
        <section className="bg-[#1E293B]/60 border border-white/10 rounded-[2.5rem] p-8 md:p-10 space-y-8">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-indigo-300 shrink-0">{t.watermarkTitle}</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 relative group">
              <AtSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder={t.watermarkPlaceholder}
                value={userHandle}
                onChange={(e) => {
                  const val = e.target.value.startsWith('@') ? e.target.value : `@${e.target.value}`;
                  setUserHandle(val);
                }}
                className="w-full pl-14 pr-6 py-5 bg-black/50 border border-white/10 rounded-2xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-white transition-all"
              />
            </div>
            <button
              onClick={() => {
                if (Array.isArray(prompts?.objetos)) {
                  prompts.objetos.forEach(obj => {
                    if (generatedImages[obj.id]) applyWatermark(obj.id, generatedImages[obj.id]);
                  });
                }
              }}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-[12px] uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 shrink-0"
            >
              {t.applyHandle}
            </button>
          </div>
        </section>

        {/* 2. AREA DE IMAGENS (HORIZONTAL / LARGE) */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <ImageIcon className="w-8 h-8 text-indigo-400" />
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t.imagePromptTitle}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Array.isArray(prompts?.objetos) && prompts.objetos.map((obj) => (
              <div key={obj.id} className="bg-[#1E293B]/60 border border-white/10 rounded-[3rem] overflow-hidden group hover:border-indigo-500/50 transition-all flex flex-col shadow-2xl">
                <div className={`relative bg-black flex items-center justify-center overflow-hidden h-[450px] ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`}>
                  {generatingImages[obj.id] ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">{t.loading}</span>
                    </div>
                  ) : (
                    <>
                      {generatedImages[obj.id] ? (
                        <img src={watermarkedImages[obj.id] || generatedImages[obj.id]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={obj.title} />
                      ) : (
                        <div className="flex flex-col items-center gap-6 text-center px-12 opacity-60 group-hover:opacity-100 transition-opacity">
                          <ImageIcon className="w-20 h-20 text-indigo-500/30" />
                          <button
                            onClick={() => handleImageGen(obj.id, obj.imagePrompt)}
                            className="px-8 py-4 bg-indigo-600 text-white border border-indigo-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl"
                          >
                            Gerar Imagem
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => window.open(generatedImages[obj.id], '_blank')} className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-indigo-600 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AÇÕES DA IMAGEM (COPIAR E DOWNLOAD) */}
                <div className="px-8 pt-6 flex gap-3">
                  <button
                    onClick={() => handleCopy(obj.imagePrompt, `prompt-${obj.id}`)}
                    className="flex-1 bg-[#1E293B]/80 hover:bg-[#2D3B4F] border border-white/5 rounded-2xl py-5 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group/btn shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      {copied === `prompt-${obj.id}` ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">COPIAR</span>
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-widest text-white/90">PROMPT</span>
                  </button>

                  <button
                    onClick={() => downloadImage(obj.id)}
                    className="aspect-square bg-[#1E293B]/80 hover:bg-[#2D3B4F] border border-white/5 rounded-2xl p-5 flex items-center justify-center transition-all active:scale-95 text-indigo-400 hover:text-white shadow-lg"
                  >
                    <DownloadCloud className="w-8 h-8" />
                  </button>
                </div>

                <div className="p-8 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-xs">
                        {obj.cena === 'principal' ? '⭐️' : '👤'}
                      </div>
                      <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">{obj.persona}</span>
                    </div>
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-bold text-gray-500 uppercase tracking-widest">{obj.title}</span>
                  </div>

                  {Array.isArray(obj.scenes) && obj.scenes.length > 0 && (
                    <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
                      <span className="text-[14px]">🎭</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                        {t.appearsInScenes || 'APARECE NAS CENAS'}: {obj.scenes.join(', ')}
                      </span>
                    </div>
                  )}

                  <p className="text-[12px] font-medium font-mono text-gray-100 italic leading-relaxed text-left line-clamp-2">"{obj.imagePrompt}"</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2️⃣ SCRIPT */}
        <section className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-2xl shadow-indigo-600/30 shrink-0">2</div>
            <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter shrink-0">{t.scriptTitle}</h3>
            <div className="h-px flex-1 bg-white/10 hidden md:block"></div>
          </div>
          <div className="bg-[#1E293B]/40 border border-white/10 rounded-[3rem] p-8 md:p-12 space-y-10">
            <div className="space-y-8">
              {Array.isArray(prompts?.roteiro_unificado) && prompts.roteiro_unificado.map((line, idx) => (
                <div key={idx} className="flex gap-6 items-start group">
                  <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1 shadow-inner relative group-hover:scale-110 transition-transform overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-pulse"></div>
                    <span className="text-3xl relative z-10">
                      {line.speaker.includes('☕') ? '☕' :
                        line.speaker.includes('💸') ? '💸' :
                          line.speaker.includes('💊') ? '💊' :
                            line.speaker.includes('💄') ? '💄' :
                              line.speaker.toLowerCase().includes('banana') ? '🍌' :
                                line.speaker.toLowerCase().includes('boleto') ? '📄' :
                                  line.speaker.toLowerCase().includes('tesoura') ? '✂️' :
                                    line.speaker.toLowerCase().includes('barbeador') ? '🪒' : '🎬'}
                    </span>
                  </div>
                  <div className="flex-1 bg-black/40 p-6 rounded-3xl border border-white/5 relative hover:border-indigo-500/30 transition-all group/card shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="px-4 py-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full">
                        <span className="text-[10px] md:text-[11px] font-black text-indigo-400">{line.time}</span>
                      </div>
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">CENA {idx + 1}</span>
                    </div>
                    <p className="text-gray-100 text-base md:text-lg font-medium leading-relaxed italic text-left">"{line.text}"</p>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></div>
                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-indigo-500/80">{line.emotion}</span>
                      </div>
                      <button onClick={() => handleCopy(line.text, `script-${idx}`)} className="p-3 bg-white/5 rounded-2xl transition-all hover:bg-white/10 border border-white/5">
                        {copied === `script-${idx}` ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-gray-500" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3️⃣ MASTER PROMPT */}
        <section className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-2xl shadow-indigo-600/30 shrink-0">3</div>
            <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter shrink-0">{t.videoPromptTitle}</h3>
            <div className="h-px flex-1 bg-white/10 hidden md:block"></div>
          </div>
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-900 border border-white/20 rounded-[3rem] md:rounded-[4rem] p-10 md:p-20 text-center space-y-12 shadow-[0_40px_120px_rgba(79,70,229,0.4)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/20 to-transparent"></div>

            <div className="max-w-4xl mx-auto space-y-12 relative z-10">
              <div className="bg-black/60 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 shadow-2xl relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl rotate-12">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm md:text-lg font-mono text-indigo-100 leading-relaxed italic text-center selection:bg-indigo-500/50">{prompts?.videoPrompt_Tecnico}</p>
              </div>
              <button
                onClick={() => handleCopy(prompts?.videoPrompt_Tecnico || '', 'veo')}
                className="py-7 px-16 bg-white text-indigo-950 font-black rounded-[2rem] text-sm md:text-lg uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.2)] flex items-center gap-6 mx-auto active:scale-95 group/btn"
              >
                {copied === 'veo' ? <CheckCircle className="w-8 h-8 text-emerald-600" /> : <Copy className="w-8 h-8 group-hover/btn:rotate-6 transition-transform" />}
                {t.copyVideoPrompt || "COPIAR MASTER PROMPT"}
              </button>
            </div>
          </div>
        </section>

        {/* FLUXO DE MONTAGEM */}
        <section className="bg-black/20 border border-white/5 rounded-[3.5rem] p-10 md:p-16 space-y-12">
          <h3 className="text-[11px] md:text-[13px] font-black uppercase tracking-[0.5em] text-indigo-400 text-center opacity-70 italic">{t.flowTitle}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {[
              { step: '1', title: t.stepImage, desc: t.stepImageDesc, icon: <ImageIcon className="w-8 h-8" />, url: 'https://gemini.google.com' },
              { step: '2', title: t.stepVideo, desc: t.stepVideoDesc, icon: <Tv className="w-8 h-8" />, url: 'https://labs.google/veo' },
              { step: '3', title: t.stepAudio, desc: t.stepAudioDesc, icon: <Scissors className="w-8 h-8" />, url: 'https://www.capcut.com' },
              { step: '4', title: t.stepRemove, desc: t.stepRemoveDesc, icon: <Droplets className="w-8 h-8" />, url: 'https://watermarkremover.io' },
            ].map(item => (
              <a
                key={item.step}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="bg-white/5 p-8 md:p-10 rounded-[2.5rem] border border-white/5 text-center space-y-6 hover:border-indigo-500/30 transition-all flex flex-col items-center group shadow-xl cursor-pointer"
              >
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-2 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div className="space-y-2">
                  <h4 className="text-[13px] font-black uppercase text-white tracking-widest leading-none">{item.title}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* SEÇÃO DE PLANOS PROMINENTE (SÓ MOSTRA SE PRECISAR) */}
        <section id="upgrade-section">
          <PlanCards
            currentPlan={user.plan}
            creditsUsed={user.image_credits_used || 0}
            creditsTotal={user.image_credits_total || 0}
          />
        </section>

        {/* MEU VÍDEO PRONTO */}
        <section className="bg-white/5 border border-white/10 rounded-[3rem] md:rounded-[4rem] p-10 md:p-16 space-y-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="text-center md:text-left space-y-3">
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">{t.myVideoTitle}</h3>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.3em]">{t.myVideoSubtitle}</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-6 rounded-[2rem] flex items-center justify-center gap-5 text-[12px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 group"
            >
              <Upload className="w-7 h-7 group-hover:-translate-y-1 transition-transform" /> {t.uploadVideo}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />
          </div>
          {finalVideo ? (
            <div className="relative group rounded-[3rem] md:rounded-[3.5rem] overflow-hidden border border-white/10 aspect-video bg-black max-w-4xl mx-auto shadow-2xl">
              <video src={finalVideo} controls className="w-full h-full" />
              <button
                onClick={() => setFinalVideo(null)}
                className="absolute top-8 right-8 p-6 bg-red-600/80 backdrop-blur-md text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 hover:bg-red-600"
              >
                <Trash2 className="w-7 h-7" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/10 rounded-[3rem] md:rounded-[3.5rem] p-32 flex flex-col items-center justify-center text-center space-y-8 bg-black/40 group hover:border-indigo-500/50 transition-all cursor-pointer shadow-inner" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-all shadow-2xl">
                <Video className="w-10 h-10 text-gray-800 group-hover:text-white transition-all transform group-hover:rotate-12" />
              </div>
              <p className="text-gray-600 text-[12px] font-black uppercase tracking-[0.4em] italic group-hover:text-indigo-400 transition-colors">{t.noVideo}</p>
            </div>
          )}
        </section>

        {/* FLOATING FOOTER */}
        <div className="fixed bottom-0 md:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-6xl px-6 pb-8 md:pb-0 z-[100] space-y-6">
          {(user.plan === 'Free' || user.image_credits_total - user.image_credits_used < 10) && (
            <a
              href="#upgrade-section"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(37,99,235,0.4)] border border-white/10 group transition-all"
            >
              <Zap className="w-4 h-4 fill-current group-hover:scale-125 transition-transform" />
              ASSINE AGORA OS NOSSOS PLANOS
            </a>
          )}
          <div className="bg-[#1E293B]/90 backdrop-blur-3xl border border-white/20 p-4 md:p-6 rounded-[2.5rem] md:rounded-full flex gap-4 md:gap-6 shadow-[0_40px_100px_rgba(0,0,0,1)] ring-1 ring-white/10">
            <button onClick={() => navigate('/dashboard')} className="flex-1 py-5 md:py-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-black text-[10px] md:text-[13px] uppercase tracking-[0.2em] text-white transition-all active:scale-95 shadow-lg">
              {t.dashboardButton}
            </button>
            <button
              onClick={saveAction}
              disabled={isSaving}
              className={`flex-[2] py-5 md:py-6 rounded-full font-black text-[10px] md:text-[13px] uppercase tracking-[0.2em] text-white transition-all flex items-center justify-center gap-4 ${isSaved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_15px_50px_rgba(79,70,229,0.5)]'
                } disabled:opacity-70 active:scale-95 border border-white/10`}
            >
              {isSaving ? <RefreshCcw className="w-6 h-6 animate-spin" /> : isSaved ? <><CheckCircle className="w-6 h-6" /> {t.success}</> : t.saveToHistoryButton}
            </button>
          </div>
        </div>
      </main>
      {showExhaustedModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-[#1E293B] border border-white/10 rounded-[3rem] w-full max-w-md p-10 space-y-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/30">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Imagens Esgotadas!</h3>
              <p className="text-sm text-gray-400 font-medium">
                {user.plan === 'Free'
                  ? "Suas 4 imagens grátis acabaram! Quer gerar mais e dominar o TikTok?"
                  : `Você atingiu o limite de ${user.image_credits_total} imagens do seu plano ${user.plan}.`}
              </p>
            </div>
            <div className="space-y-4">
              <a
                href="https://pay.hotmart.com/YOUR_BASIC_LINK" // Placeholder
                target="_blank"
                className="block w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[2rem] text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
              >
                ASSINAR PLANO BÁSICO - R$ 29
              </a>
              <button
                onClick={() => setShowExhaustedModal(false)}
                className="w-full py-4 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
              >
                CONTINUAR SEM IMAGENS
              </button>
            </div>
          </div>
        </div>
      )}

      <AIErrorsModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        onRetry={() => {
          setErrorModalOpen(false);
          loadContent(refining ? refinementText : undefined);
        }}
        errorMessage={errorMessage}
      />

      {/* WhatsApp Support Button */}
      <WhatsAppButton />
    </div>
  );
};
