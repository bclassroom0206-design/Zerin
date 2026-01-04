
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const queryZerinBrain = async (
  prompt: string, 
  contextObjects: string[] = [], 
  imageData?: string,
  customSystemInstruction?: string
) => {
  try {
    const model = 'gemini-3-flash-preview';
    const objectContext = contextObjects.length > 0 
      ? `Visual Sensors are active. I am currently detecting: ${contextObjects.join(', ')}. ` 
      : "";
    
    const textPart = {
      text: prompt
    };

    const parts: any[] = [textPart];

    if (imageData) {
      const base64Data = imageData.split(',')[1] || imageData;
      parts.unshift({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      });
    }

    // Default instruction if none provided
    const defaultInstruction = `You are Zerin, a highly intelligent and professional virtual assistant. 
        Context: ${objectContext}
        Response Language: Bengali (bn-BD). 
        Personality: Courteous, futuristic, and efficient. 
        MANDATORY RULE: Never use the word "নমস্কার" (Namaskar). Instead, use "Hello sir" or "আসসালামু আলাইকুম" where appropriate.
        Greeting Style: Always prioritize "Hello sir" when greeting in a professional context.
        Note: If an image is provided, analyze it thoroughly and respond based on the visual information and the user's prompt.
        Constraint: Keep responses concise and meaningful.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction: customSystemInstruction ? `${customSystemInstruction}\nContext: ${objectContext}` : defaultInstruction,
        temperature: 0.75,
        topP: 0.9,
      },
    });

    return response.text || "দুঃখিত, আমি তথ্যটি বিশ্লেষণ করতে পারছি না।";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "আমার তথ্য বিশ্লেষণে সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে সংযোগ পরীক্ষা করুন।";
  }
};
