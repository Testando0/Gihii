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

    // Esta lista usa os nomes MAIS estáveis do Google em 2025
    const modelsToTry = [
      "gemini-1.5-flash-latest", // O apelido mais seguro
      "gemini-1.5-flash",        // O padrão
      "gemini-pro"               // O backup clássico
    ];

    let svgData = "";
    let lastError = "";

    for (const model of modelsToTry) {
      try {
        // Tentamos o endpoint V1 que é o mais estável para produção
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate ONLY a valid SVG code for: ${prompt}. Do not include markdown or explanations. Start directly with <svg.` }] }]
          })
        });

        const resJson = await response.json();

        if (resJson.candidates && resJson.candidates[0].content.parts[0].text) {
          svgData = resJson.candidates[0].content.parts[0].text;
          break; 
        } else if (resJson.error) {
          lastError = resJson.error.message;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!svgData) throw new Error(lastError || "Falha na comunicação com Google AI");

    // Limpeza Profunda: Remove markdown, espaços e textos extras
    let cleanSvg = svgData.replace(/```svg|```xml|```/gi, '').trim();
    const startIdx = cleanSvg.indexOf('<svg');
    const endIdx = cleanSvg.lastIndexOf('</svg>');
    
    if (startIdx === -1) throw new Error("O modelo não gerou um código SVG válido.");
    cleanSvg = cleanSvg.substring(startIdx, endIdx + 6);

    return new Response(JSON.stringify({ image: cleanSvg }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      image: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#000"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="yellow" font-family="Arial">ERRO: Verifique sua API KEY no Vercel</text></svg>`
    }), { status: 200, headers });
  }
}
