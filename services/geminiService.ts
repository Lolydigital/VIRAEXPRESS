import { GoogleGenAI, Type } from "@google/genai";
import { ViralIdea, PromptSet, Language, AspectRatio, GenerationMode, Persona, InspirationVideo, SubscriptionPlan } from "../types";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyB_AJhr0G-RrxETsOSQyFH5ZvvQXsinsXs';
  if (!apiKey) {
    throw new Error("API Key ausente no Vercel. Certifique-se de que o nome é EXATAMENTE: VITE_GOOGLE_API_KEY");
  }
  return new GoogleGenAI({ apiKey, apiVersion: 'v1' });
};

export const generateIdeas = async (niche: string, lang: Language): Promise<ViralIdea[]> => {
  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  const prompt = `Act as the Chief Strategist of "Vira Express".
Generate exactly 10 ideas for "Talking Object Ecosystems" for the niche: "${niche}".
RULES:
1. Think in Ecosystems: Objects that interact or a central iconic object from the niche.
2. Viral Dialogue: Discuss a secret, pain point, or current meme of the niche in a comic or sarcasm.
3. OUTPUT LANGUAGE: You MUST provide the "title" and "description" in ${languageNames[lang]}. This is a hard requirement.`;

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              emoji: { type: Type.STRING },
            },
            required: ["id", "title", "description", "emoji"]
          }
        }
      },
    });

    const text = result.text;
    if (!text) throw new Error("IA retornou resposta vazia");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error generating ideas:", error);
    throw error;
  }
};

export const discoverTrends = async (niche: string, lang: Language): Promise<InspirationVideo[]> => {
  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  const prompt = `As a TikTok trend analyst, identify 3 viral video concepts for "Talking Objects" for the niche: "${niche}".
  Provide hook suggestions and define the protagonist object.
  CRITICAL: All generated text MUST be in ${languageNames[lang]}.`;

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              thumbnail: { type: Type.STRING },
              url: { type: Type.STRING },
              niche: { type: Type.STRING }
            },
            required: ["id", "title", "thumbnail", "url", "niche"]
          }
        }
      }
    });

    const text = result.text;
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
  selectedPersona?: Persona,
  plan?: SubscriptionPlan
): Promise<PromptSet> => {
  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  const objectCount = plan === 'Free' ? 3 : 10;

  const systemInstruction = `Act as a Storytelling Director and Animation Scriptwriter 2026.
MISSION: Create viral narratives for "Vira Express".
1. 🎭 PERSONALITY: ${selectedPersona ? `${selectedPersona.name}: ${selectedPersona.trait}` : 'Standard Viral 2026'}.
2. 🎭 LOGIC A-B-A: Conflict, Resolution, CTA (Call to Action).
3. 📊 VIRAL SCORE: Analyze the script and give 0-100 scores for Hook, Retention, and CTA.
4. 🌐 TECHNICAL LANGUAGE: The "imagePrompt" and "videoPrompt_Tecnico" fields MUST BE IN ENGLISH.
5. 🎨 IMAGE STYLE: Pixar Animation Style, cinematic lighting, 8k, hyper-detailed textures.
6. 🎬 VIDEO PROMPT: Master Prompt for VEO 3 describing action, physics, and cinematography in English.
7. 📝 CONTENT LANGUAGE: All user-facing text (title, description, script, feedback) MUST BE IN ${languageNames[lang]}.
8. 🧩 QUANTITY: Generate EXACTLY ${objectCount} objects in the "objetos" array.`;

  const PromptSetSchema = {
    type: Type.OBJECT,
    properties: {
      sequencia_storytelling: { type: Type.STRING },
      objetos: {
        type: Type.ARRAY,
        minItems: objectCount,
        maxItems: objectCount,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            persona: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
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
            text: { type: Type.STRING },
            emotion: { type: Type.STRING },
          },
          required: ["time", "speaker", "text", "emotion"]
        }
      },
      videoPrompt_Tecnico: { type: Type.STRING },
      watermark_instruction: { type: Type.STRING },
      viral_score: {
        type: Type.OBJECT,
        properties: {
          total: { type: Type.NUMBER },
          hook: { type: Type.NUMBER },
          retention: { type: Type.NUMBER },
          cta: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
        },
        required: ["total", "hook", "retention", "cta", "feedback"]
      }
    },
    required: ["sequencia_storytelling", "objetos", "roteiro_unificado", "videoPrompt_Tecnico", "watermark_instruction", "viral_score"]
  };

  const userPrompt = refinementCommand
    ? `ADJUSTMENT: "${refinementCommand}". PREVIOUS CONTEXT: ${JSON.stringify(previousResult)}. GENERATE EXACTLY ${objectCount} OBJECTS.`
    : `Generate strategy for: ${idea.title}. Description: ${idea.description}. Persona: ${selectedPersona?.name || 'Default'}. Plan: ${plan}. GENERATE EXACTLY ${objectCount} OBJECTS.`;

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: PromptSetSchema as any,
        systemInstruction,
      },
    });

    const text = result.text;
    if (!text) throw new Error("IA retornou resposta vazia");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating prompts:", error);
    throw error;
  }
};

export const generateActualImage = async (imagePrompt: string, ratio: AspectRatio): Promise<string> => {
  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: `Generate a high quality 3D image base for: ${imagePrompt}` }] }],
    });

    const data = result.data;
    if (data) {
      return `data:image/png;base64,${data}`;
    }
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80`;
  } catch (error) {
    console.error("Image generation error:", error);
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80`;
  }
};
