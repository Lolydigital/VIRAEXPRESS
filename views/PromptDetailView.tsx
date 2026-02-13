
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Translation, Language, ViralIdea, PromptSet, AspectRatio, Persona } from '../types';
import {
  ArrowLeft, Copy, CheckCircle, ExternalLink, ImageIcon, RefreshCcw,
  Zap, Sparkles, Smile, Tv, Send,
  ShieldCheck, DownloadCloud, Scissors, Droplets, AtSign, Upload, Video, Trash2,
  AlertCircle, BarChart3, Info
} from 'lucide-react';
import { generatePrompts, generateActualImage } from '../services/geminiService';

export const PromptDetailView: React.FC<{ t: Translation; language: Language; onSave: (idea: ViralIdea) => Promise<void>; onConsumeCredit: () => void }> = ({ t, language, onSave, onConsumeCredit }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { idea, aspectRatio, imageInput, persona, restoredPrompts } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [prompts, setPrompts] = useState<PromptSet | null>(restoredPrompts || null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [watermarkedImages, setWatermarkedImages] = useState<Record<string, string>>({});
  const [userHandle, setUserHandle] = useState(idea?.userHandle || '@SeuHandle');
  const [finalVideo, setFinalVideo] = useState<string | null>(idea?.finalVideoUrl || null);

  const [copied, setCopied] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadContent = async (refinement?: string) => {
    if (!refinement && restoredPrompts) {
      setLoading(false);
      restoredPrompts.objetos.forEach(async (obj: any) => {
        handleImageGen(obj.id, obj.imagePrompt);
      });
      return;
    }

    if (refinement) setRefining(true);
    else {
      setLoading(true);
      onConsumeCredit(); // Consome crédito ao abrir uma nova estratégia
    }

    try {
      const pResult = await generatePrompts(idea, language, aspectRatio as AspectRatio, 'viral', imageInput, refinement, prompts || undefined, persona);
      setPrompts(pResult);

      pResult.objetos.forEach(async (obj) => {
        handleImageGen(obj.id, obj.imagePrompt);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefining(false);
    }
  };

  const handleRefine = () => {
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

  const handleImageGen = async (id: string, prompt: string) => {
    setGeneratingImages(prev => ({ ...prev, [id]: true }));
    try {
      const imgUrl = await generateActualImage(prompt, aspectRatio as AspectRatio);
      setGeneratedImages(prev => ({ ...prev, [id]: imgUrl }));
      applyWatermark(id, imgUrl);
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

  const saveAction = async () => {
    if (prompts && !isSaving) {
      setIsSaving(true);
      try {
        await onSave({
          ...idea,
          savedPrompts: prompts,
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
    { name: 'GEMINI', icon: <Sparkles className="w-5 h-5" />, url: 'https://gemini.google.com', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
    { name: 'VEO 3', icon: <Tv className="w-5 h-5" />, url: 'https://labs.google/veo', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' },
    { name: 'CAPCUT', icon: <Scissors className="w-5 h-5" />, url: 'https://www.capcut.com', color: 'bg-gray-600/20 text-white border-white/20' },
    { name: 'REMOVE LOGO', icon: <Droplets className="w-5 h-5" />, url: 'https://watermarkremover.io', color: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30' }
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

      <main className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-12 space-y-12 pb-48">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{t.strategyReady}</h1>
          <p className="text-gray-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em]">{t.readySubtitle}</p>
        </div>

        {/* TERMÔMETRO DE VIRALIZAÇÃO */}
        {prompts?.viral_score && (
          <section className="bg-gradient-to-br from-[#1E293B]/80 to-[#0F172A]/80 border border-white/10 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>

            <div className="relative z-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg md:text-xl font-black text-white italic uppercase tracking-tighter">{t.viralScoreTitle}</h3>
                    <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Análise de IA Nível 2026</p>
                  </div>
                </div>
                <div className="text-5xl md:text-6xl font-black text-white italic tracking-tighter text-right">
                  {prompts.viral_score.total}<span className="text-indigo-500 text-2xl md:text-3xl">/100</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {[
                  { label: t.hookLabel, value: prompts.viral_score.hook, color: 'from-indigo-500 to-indigo-300' },
                  { label: t.retentionLabel, value: prompts.viral_score.retention, color: 'from-purple-500 to-purple-300' },
                  { label: t.ctaLabel, value: prompts.viral_score.cta, color: 'from-cyan-500 to-cyan-300' },
                ].map((stat, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end px-1">
                      <span className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">{stat.label}</span>
                      <span className="text-base md:text-lg font-black text-white italic leading-none">{stat.value}%</span>
                    </div>
                    <div className="h-2.5 md:h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-1000 ease-out`}
                        style={{ width: `${stat.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl md:rounded-[2rem] p-5 md:p-6 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Info className="w-4 h-4" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{t.feedbackLabel}</span>
                </div>
                <p className="text-xs md:text-sm text-gray-300 font-medium leading-relaxed italic text-left">
                  "{prompts.viral_score.feedback}"
                </p>
              </div>
            </div>
          </section>
        )}

        {/* PERSONALIZAR MARCA DE PROTEÇÃO */}
        <section className="bg-[#1E293B]/60 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-300 shrink-0">{t.watermarkTitle}</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder={t.watermarkPlaceholder}
                value={userHandle}
                onChange={(e) => {
                  const val = e.target.value.startsWith('@') ? e.target.value : `@${e.target.value}`;
                  setUserHandle(val);
                }}
                className="w-full pl-11 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-white"
              />
            </div>
            <button
              onClick={() => {
                prompts?.objetos.forEach(obj => {
                  if (generatedImages[obj.id]) applyWatermark(obj.id, generatedImages[obj.id]);
                });
              }}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 shrink-0"
            >
              {t.applyHandle}
            </button>
          </div>
        </section>

        {/* 1️⃣ IMAGE PROMPTS */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-indigo-600/20 shrink-0">1</div>
            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter shrink-0">{t.imagePromptTitle}</h3>
            <div className="h-px flex-1 bg-white/10 hidden md:block"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {prompts?.objetos.map((obj) => (
              <div key={obj.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-indigo-500/30 transition-all flex flex-col">
                <div className="p-6 border-b border-white/10 bg-black/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></div>
                      <span className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest">{obj.persona}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadImage(obj.id)} className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-emerald-400 transition-all">
                        <DownloadCloud className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleCopy(obj.imagePrompt, obj.id)} className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                        {copied === obj.id ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5 group-hover:border-indigo-500/20 transition-all">
                    <p className="text-[10px] font-medium font-mono text-gray-400 line-clamp-2 italic leading-relaxed text-left">{obj.imagePrompt}</p>
                  </div>
                </div>
                <div className={`relative bg-black flex items-center justify-center overflow-hidden flex-1 ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`}>
                  {generatingImages[obj.id] ? (
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCcw className="w-12 h-12 text-indigo-500 animate-spin" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">{t.loading}</span>
                    </div>
                  ) : (
                    <>
                      {generatedImages[obj.id] ? (
                        <img src={watermarkedImages[obj.id] || generatedImages[obj.id]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={obj.title} />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-center px-10">
                          <ImageIcon className="w-16 h-16 text-gray-800" />
                          <button onClick={() => handleImageGen(obj.id, obj.imagePrompt)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Retry Generation</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2️⃣ SCRIPT */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-indigo-600/20 shrink-0">2</div>
            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter shrink-0">{t.scriptTitle}</h3>
            <div className="h-px flex-1 bg-white/10 hidden md:block"></div>
          </div>
          <div className="bg-[#1E293B]/60 border border-white/10 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 space-y-6">
            <div className="space-y-4">
              {prompts?.roteiro_unificado.map((line, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-4 items-start group">
                  <div className="flex-1 w-full bg-black/40 p-5 rounded-2xl border border-white/5 relative hover:border-indigo-500/30 transition-all group/card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full">
                        <span className="text-[9px] font-black text-indigo-400">{line.time}</span>
                      </div>
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">SCENE {idx + 1}</span>
                    </div>
                    <p className="text-gray-200 text-sm md:text-base font-medium leading-relaxed italic text-left">"{line.text}"</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smile className="w-4 h-4 text-indigo-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{line.emotion}</span>
                      </div>
                      <button onClick={() => handleCopy(line.text, `script-${idx}`)} className="p-2 bg-white/5 rounded-xl transition-all hover:bg-white/10">
                        {copied === `script-${idx}` ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3️⃣ MASTER PROMPT */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-indigo-600/20 shrink-0">3</div>
            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter shrink-0">{t.videoPromptTitle}</h3>
            <div className="h-px flex-1 bg-white/10 hidden md:block"></div>
          </div>
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 border border-white/20 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 text-center space-y-10 shadow-[0_30px_100px_rgba(79,70,229,0.3)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="max-w-3xl mx-auto space-y-8 relative z-10">
              <div className="bg-black/50 backdrop-blur-2xl p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-inner">
                <p className="text-xs md:text-sm font-mono text-indigo-100 leading-relaxed italic text-center">{prompts?.videoPrompt_Tecnico}</p>
              </div>
              <button
                onClick={() => handleCopy(prompts?.videoPrompt_Tecnico || '', 'veo')}
                className="py-6 px-12 bg-white text-indigo-950 font-black rounded-3xl text-sm md:text-base uppercase tracking-widest hover:scale-105 transition-all shadow-2xl flex items-center gap-4 mx-auto active:scale-95 group"
              >
                {copied === 'veo' ? <CheckCircle className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                {t.copyVideoPrompt || "COPIAR MASTER PROMPT (VEO 3)"}
              </button>
            </div>
          </div>
        </section>

        {/* REFINAR ESTRATÉGIA */}
        <section className="bg-[#1E293B]/60 border border-indigo-500/20 rounded-[2.5rem] p-6 md:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{t.refineTitle}</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder={t.refinePlaceholder}
              value={refinementText}
              onChange={(e) => setRefinementText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refinementText.trim()}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 shrink-0"
            >
              {refining ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span className="text-[10px] uppercase tracking-widest">{t.adjust}</span>
            </button>
          </div>
        </section>

        {/* FLUXO DE MONTAGEM */}
        <section className="bg-[#1E293B]/40 border border-white/10 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 space-y-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 text-center opacity-80">{t.flowTitle}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { step: '1', title: t.stepImage, desc: t.stepImageDesc, icon: <ImageIcon className="w-6 h-6" /> },
              { step: '2', title: t.stepVideo, desc: t.stepVideoDesc, icon: <Tv className="w-6 h-6" /> },
              { step: '3', title: t.stepAudio, desc: t.stepAudioDesc, icon: <Scissors className="w-6 h-6" /> },
              { step: '4', title: t.stepRemove, desc: t.stepRemoveDesc, icon: <Droplets className="w-6 h-6" /> },
            ].map(item => (
              <div key={item.step} className="bg-black/30 p-6 md:p-8 rounded-[2rem] border border-white/5 text-center space-y-4 hover:border-indigo-500/30 transition-all flex flex-col items-center">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20 mb-2">
                  {item.icon}
                </div>
                <h4 className="text-[11px] font-black uppercase text-white tracking-widest leading-none">{item.title}</h4>
                <p className="text-[9px] text-gray-500 font-bold uppercase leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MEU VÍDEO PRONTO */}
        <section className="bg-white/5 border border-white/10 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-2">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{t.myVideoTitle}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{t.myVideoSubtitle}</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 group"
            >
              <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform" /> {t.uploadVideo}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />
          </div>
          {finalVideo ? (
            <div className="relative group rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border border-white/10 aspect-video bg-black max-w-3xl mx-auto shadow-2xl">
              <video src={finalVideo} controls className="w-full h-full" />
              <button
                onClick={() => setFinalVideo(null)}
                className="absolute top-6 right-6 p-5 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/10 rounded-[2.5rem] md:rounded-[3rem] p-24 flex flex-col items-center justify-center text-center space-y-6 bg-black/20 group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-indigo-600/10 transition-all">
                <Video className="w-10 h-10 text-gray-800 group-hover:text-indigo-500 transition-all" />
              </div>
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">{t.noVideo}</p>
            </div>
          )}
        </section>

        {/* FLOATING FOOTER */}
        <div className="fixed bottom-0 md:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 pb-6 md:pb-0 z-[100] space-y-6">
          <div className="flex justify-center items-center gap-3">
            {flowTools.map(tool => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noreferrer"
                className={`w-12 h-12 md:w-16 md:h-16 ${tool.color} backdrop-blur-3xl border border-white/20 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center hover:scale-110 transition-all group shadow-2xl`}
                title={tool.name}
              >
                <div className="scale-75 md:scale-100">{tool.icon}</div>
              </a>
            ))}
          </div>
          <div className="bg-[#1E293B]/80 backdrop-blur-3xl border border-white/10 p-3 md:p-4 rounded-3xl md:rounded-full flex gap-3 md:gap-4 shadow-[0_25px_80px_rgba(0,0,0,1)]">
            <button onClick={() => navigate('/dashboard')} className="flex-1 py-4 md:py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-black text-[9px] md:text-[11px] uppercase tracking-widest text-white transition-all active:scale-95">
              {t.dashboardButton}
            </button>
            <button
              onClick={saveAction}
              disabled={isSaving}
              className={`flex-[2] py-4 md:py-5 rounded-full font-black text-[9px] md:text-[11px] uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 ${isSaved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_10px_40px_rgba(79,70,229,0.5)]'
                } disabled:opacity-70 active:scale-95`}
            >
              {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : isSaved ? `✅ ${t.success}` : t.saveToHistoryButton}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
