
import { GoogleGenAI, Type } from "@google/genai";
import { ViralIdea, PromptSet, Language, AspectRatio, GenerationMode, Persona, InspirationVideo } from "../types";

// LÓGICA DE SEGURANÇA:
// Em produção, o frontend chamaria uma Supabase Edge Function:
// const response = await fetch('https://SUA_URL.supabase.co/functions/v1/gemini-proxy', { ... });
// Para este protótipo funcional, usamos a env direta conforme instrução, 
// mas centralizada para fácil migração.

const getAI = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("VITE_GOOGLE_API_KEY não está definida! Verifique o arquivo .env ou as configurações do Vercel.");
    throw new Error("API Key ausente. Configure VITE_GOOGLE_API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateIdeas = async (niche: string, lang: Language): Promise<ViralIdea[]> => {
  const ai = getAI();
  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  const prompt = `Act as the Chief Strategist of "Vira Express".
Generate exactly 10 ideas for "Talking Object Ecosystems" for the niche: "${niche}".
RULES:
1. Think in Ecosystems: Objects that interact or a central iconic object from the niche.
2. Viral Dialogue: Discuss a secret, pain point, or current meme of the niche in a comic or sarcastic way.
3. OUTPUT LANGUAGE: You MUST provide the "title" and "description" in ${languageNames[lang]}. This is a hard requirement.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique ID for the idea" },
              title: { type: Type.STRING, description: `Impactful title in ${languageNames[lang]}` },
              description: { type: Type.STRING, description: `Dynamics description in ${languageNames[lang]}` },
              emoji: { type: Type.STRING, description: "Emoji representing the main object" },
            },
            required: ["id", "title", "description", "emoji"]
          }
        }
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating ideas:", error);
    return [];
  }
};

export const discoverTrends = async (niche: string, lang: Language): Promise<InspirationVideo[]> => {
  const ai = getAI();
  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  const prompt = `As a TikTok trend analyst, identify 3 viral video concepts for "Talking Objects" for the niche: "${niche}".
  Provide hook suggestions and define the protagonist object.
  CRITICAL: All generated text MUST be in ${languageNames[lang]}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING, description: `Concept title in ${languageNames[lang]}` },
              thumbnail: { type: Type.STRING, description: "Unsplash image URL related to the niche" },
              url: { type: Type.STRING, description: "TikTok search link" },
              niche: { type: Type.STRING, description: `Niche name in ${languageNames[lang]}` }
            },
            required: ["id", "title", "thumbnail", "url", "niche"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    const trends = JSON.parse(text);
    return trends.map((t: any) => ({
      ...t,
      thumbnail: t.thumbnail.startsWith('http') ? t.thumbnail : `https://images.unsplash.com/photo-1586769852044-692d6e3703a0?w=400&h=600&fit=crop`
    }));
  } catch (error) {
    console.error("Error discovering trends:", error);
    return [];
  }
};

export const generatePrompts = async (
  idea: ViralIdea,
  lang: Language,
  ratio: AspectRatio,
  mode: GenerationMode = 'viral',
  imageInput?: string,
  refinementCommand?: string,
  previousResult?: PromptSet,
  selectedPersona?: Persona
): Promise<PromptSet> => {
  const ai = getAI();
  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };
  const parts: any[] = [];
  if (imageInput) {
    parts.push({
      inlineData: { data: imageInput.split(',')[1] || imageInput, mimeType: 'image/jpeg' }
    });
  }

  const systemInstruction = `Act as a Storytelling Director and Animation Scriptwriter 2026.
MISSION: Create viral narratives for "Vira Express".

1. 🎭 PERSONALITY: ${selectedPersona ? `${selectedPersona.name}: ${selectedPersona.trait}` : 'Standard Viral 2026'}.
2. 🎭 LOGIC A-B-A: Conflict, Resolution, CTA (Call to Action).
3. 📊 VIRAL SCORE: Analyze the script and give 0-100 scores for Hook, Retention, and CTA.
4. 🌐 TECHNICAL LANGUAGE: The "imagePrompt" and "videoPrompt_Tecnico" fields MUST BE IN ENGLISH for AI tool compatibility.
5. 📝 CONTENT LANGUAGE: All user-facing text (sequencia_storytelling, roteiro_unificado, feedback, object titles) MUST BE IN ${languageNames[lang]}.

RESPONSE LANGUAGE: ${languageNames[lang]}.`;

  const PromptSetSchema = {
    type: Type.OBJECT,
    properties: {
      sequencia_storytelling: { type: Type.STRING, description: `Narrative summary in ${languageNames[lang]}` },
      objetos: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING, description: `Object title in ${languageNames[lang]}` },
            persona: { type: Type.STRING, description: `Persona role in ${languageNames[lang]}` },
            imagePrompt: { type: Type.STRING, description: "MUST BE IN ENGLISH. Pixar style prompt." },
          },
          required: ["id", "title", "persona", "imagePrompt"]
        }
      },
      roteiro_unificado: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            speaker: { type: Type.STRING },
            text: { type: Type.STRING, description: `Dialogue in ${languageNames[lang]}` },
            emotion: { type: Type.STRING, description: `Emotion in ${languageNames[lang]}` },
          },
          required: ["time", "speaker", "text", "emotion"]
        }
      },
      videoPrompt_Tecnico: { type: Type.STRING, description: "MUST BE IN ENGLISH. Detailed cinematic prompt for VEO 3." },
      watermark_instruction: { type: Type.STRING, description: `Instructions in ${languageNames[lang]}` },
      viral_score: {
        type: Type.OBJECT,
        properties: {
          total: { type: Type.NUMBER },
          hook: { type: Type.NUMBER },
          retention: { type: Type.NUMBER },
          cta: { type: Type.NUMBER },
          feedback: { type: Type.STRING, description: `Analysis feedback in ${languageNames[lang]}` },
        },
        required: ["total", "hook", "retention", "cta", "feedback"]
      }
    },
    required: ["sequencia_storytelling", "objetos", "roteiro_unificado", "videoPrompt_Tecnico", "watermark_instruction", "viral_score"]
  };

  let userPrompt = refinementCommand
    ? `ADJUSTMENT: "${refinementCommand}". PREVIOUS CONTEXT: ${JSON.stringify(previousResult)}.`
    : `Generate strategy for: ${idea.title}. Description: ${idea.description}. Mode: ${mode}. Ratio: ${ratio}. Persona: ${selectedPersona?.name || 'Default'}.`;

  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: PromptSetSchema
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const parsed = JSON.parse(text);
    return { ...parsed, contexto_original: text };
  } catch (error) {
    console.error("Error generating prompts:", error);
    throw error;
  }
};

export const generateActualImage = async (imagePrompt: string, ratio: AspectRatio): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: imagePrompt }] },
      config: { imageConfig: { aspectRatio: ratio } },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};
