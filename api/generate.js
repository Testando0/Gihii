import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.NANO_BANANA_FLASH_API_KEY;

    if (!apiKey) {
      throw new Error('API Key não configurada no Vercel (Environment Variables).');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usando explicitamente o modelo Flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // Desabilitar filtros de segurança para permitir criatividade no SVG
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ]
    });

    const systemInstruction = `
      Você é um motor de renderização SVG (Scalable Vector Graphics).
      Sua ÚNICA função é converter o prompt do usuário em código <svg> válido.
      Regras:
      1. NÃO escreva texto explicativo, apenas o código SVG.
      2. NÃO use markdown (sem \`\`\`xml ou \`\`\`svg).
      3. O SVG deve ter viewBox="0 0 512 512".
      4. Use cores vivas e gradientes (defs/linearGradient) para ficar bonito.
      5. Desenhe algo artístico e estilizado baseando-se no prompt: "${prompt}"
    `;

    const result = await model.generateContent(systemInstruction);
    const response = await result.response;
    let svgCode = response.text();

    // Limpeza de segurança caso o modelo teime em usar markdown
    svgCode = svgCode
      .replace(/```xml/gi, '')
      .replace(/```svg/gi, '')
      .replace(/```/g, '')
      .trim();

    // Se o modelo responder algo que não parece SVG, força um erro ou SVG padrão
    if (!svgCode.startsWith('<svg')) {
       // Tenta achar onde começa o svg
       const startIndex = svgCode.indexOf('<svg');
       const endIndex = svgCode.lastIndexOf('</svg>');
       if (startIndex !== -1 && endIndex !== -1) {
           svgCode = svgCode.substring(startIndex, endIndex + 6);
       }
    }

    return new Response(JSON.stringify({ image: svgCode }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error("Erro API:", error);
    return new Response(JSON.stringify({ error: error.message || 'Erro ao gerar imagem' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
