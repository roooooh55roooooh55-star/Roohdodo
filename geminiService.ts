import { GoogleGenAI, Type, Modality } from "@google/genai";

// Fix: Direct initialization of the AI engine using environmental variables
const getAIInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const OFFICIAL_CATEGORIES = [
  "هجمات مرعبة",
  "رعب حقيقي",
  "رعب الحيوانات",
  "أخطر المشاهد",
  "أهوال مرعبة",
  "رعب كوميدي",
  "لحظات مرعبة",
  "صدمة"
];

/**
 * تحليل الفيديو عند الطلب فقط (Manual Trigger)
 */
export async function analyzeVideoDigital(file: File): Promise<{title: string, narration: string, category: string}> {
  try {
    const ai = getAIInstance();
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // استخدام Pro للدقة العالية في تحليل الفيديو
      contents: [
        {
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: `قم بتحليل هذا المشهد المرعب بدقة رقمية. صمم عنواناً وسرداً (Narration) في سطر واحد، واختر القسم الأنسب من القائمة: (${OFFICIAL_CATEGORIES.join(", ")}). رد بتنسيق JSON.` }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            narration: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["title", "narration", "category"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Analysis Failed:", error);
    throw error;
  }
}

/**
 * توليد الصوت الأنثوي Kore للتعليق الصوتي
 */
export async function generateHorrorTTS(text: string): Promise<string | null> {
  if (!process.env.API_KEY || !text) return null;
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `بصوت هادئ ومرعب: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    // Note: The TTS returned is raw PCM bytes; base64 for direct data URI usage in the browser.
    return base64Audio ? `data:audio/mp3;base64,${base64Audio}` : null;
  } catch (e) { return null; }
}

export async function diagnoseSystemError(context: string): Promise<string> {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `شخص حالة النظام الرقمي لـ: ${context}. الرد بأسلوب تقني مرعب.`,
    });
    return response.text || "النظام في وضع السكون..";
  } catch (e) { return "عطل في مصفوفة التشخيص."; }
}