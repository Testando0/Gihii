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

    // LISTA DEFINITIVA DE DEZEMBRO/2025
    // Testamos do mais moderno (2.0) ao mais estável (1.5-002)
    const modelVersions = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash",
      "gemini-pro"
    ];

    let finalSvg = "";
    let errorLog = "";

    for (const modelId of modelVersions) {
      try {
        // Tentamos v1beta que é o endpoint de maior compatibilidade para o Flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Output ONLY the raw SVG code for: ${prompt}. No markdown, no intro. Starts with <svg and ends with </svg>.` }] }]
          })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
          finalSvg = data.candidates[0].content.parts[0].text;
          break; // FUNCIONOU! Para o loop.
        } else if (data.error) {
          errorLog = data.error.message;
        }
      } catch (e) {
        errorLog = e.message;
        continue;
      }
    }

    if (!finalSvg) throw new Error("Nenhum modelo disponível: " + errorLog);

    // Limpeza radical de qualquer lixo de texto
    let cleanSvg = finalSvg.replace(/```svg|```xml|```/gi, '').trim();
    const startIdx = cleanSvg.indexOf('<svg');
    const endIdx = cleanSvg.lastIndexOf('</svg>');
    
    if (startIdx === -1) throw new Error("O modelo retornou texto, não imagem.");
    cleanSvg = cleanSvg.substring(startIdx, endIdx + 6);

    return new Response(JSON.stringify({ image: cleanSvg }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      image: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#000"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ff0000" font-size="14">ERRO: ${error.message}</text></svg>`
    }), { status: 200, headers });
  }
}
