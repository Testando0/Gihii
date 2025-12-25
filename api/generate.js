export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.NANO_BANANA_FLASH_API_KEY;

    if (!apiKey) throw new Error("API Key não configurada no Vercel");

    // MODELO ESTÁVEL PARA 2025: gemini-1.5-flash
    // ENDPOINT OBRIGATÓRIO: v1beta (para evitar o erro 404 da v1)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate ONLY the raw SVG code for: ${prompt}. 
            Instructions: viewBox="0 0 512 512", no markdown, no explanations. 
            The output must start with <svg and end with </svg>.`
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2000
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      // Se der erro de "not found", o erro virá aqui e será capturado pelo catch
      throw new Error(`Google API: ${data.error.message}`);
    }

    if (!data.candidates || !data.candidates[0].content) {
      throw new Error("O modelo recusou gerar a imagem. Tente outro prompt.");
    }

    let rawText = data.candidates[0].content.parts[0].text;

    // Limpeza profunda de qualquer lixo de texto que o Gemini coloque
    let svg = rawText.replace(/```svg|```xml|```/gi, '').trim();
    const startIdx = svg.indexOf('<svg');
    const endIdx = svg.lastIndexOf('</svg>');

    if (startIdx === -1) throw new Error("A IA gerou texto em vez de um desenho.");
    const finalSvg = svg.substring(startIdx, endIdx + 6);

    return new Response(JSON.stringify({ image: finalSvg }), { status: 200, headers });

  } catch (error) {
    console.error("ERRO LOG:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      image: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ff4444" font-size="16" font-family="sans-serif">Erro: ${error.message}</text></svg>`
    }), { status: 200, headers });
  }
}
