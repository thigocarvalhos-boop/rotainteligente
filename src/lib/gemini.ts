import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function generateCampaignText(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Gere uma campanha de marketing por e-mail baseada neste prompt: "${prompt}". 
    Forneça tudo em PORTUGUÊS:
    1. Três opções de linhas de assunto cativantes.
    2. Um corpo de e-mail profissional e envolvente em formato Markdown.
    3. Um prompt de imagem detalhado (em inglês para melhor compatibilidade com o modelo de imagem) para um visual que complementaria este e-mail.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjectLines: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Três opções de linha de assunto",
          },
          body: {
            type: Type.STRING,
            description: "O corpo do e-mail em Markdown",
          },
          imagePrompt: {
            type: Type.STRING,
            description: "Um prompt detalhado para geração de imagem (em inglês)",
          },
        },
        required: ["subjectLines", "body", "imagePrompt"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateCampaignImage(prompt: string, size: "1K" | "2K" | "4K" = "1K") {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: size,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export function createChat() {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "Você é um consultor especialista em marketing por e-mail. Ajude o usuário a refinar sua campanha, sugira melhorias e responda a perguntas sobre as melhores práticas de e-mail. Responda sempre em PORTUGUÊS.",
    },
  });
}
