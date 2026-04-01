// worker.js — Cloudflare Worker proxy para el timbre
// El token de Telegram nunca sale de aquí (vive en env secrets de Cloudflare)

// Reemplazá con tu dominio real de GitHub Pages, ej: https://nicoXXX.github.io
const ALLOWED_ORIGIN = 'https://TU-USUARIO.github.io';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age':       '86400',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;

      const telegramRes = await fetch(telegramUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.CHAT_ID,
          text:    '🚨 ¡Nico, hay alguien en la puerta! (Escaneado desde el QR)',
        }),
      });

      if (!telegramRes.ok) {
        return new Response(JSON.stringify({ ok: false }), {
          status:  502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status:  200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch {
      return new Response(JSON.stringify({ ok: false }), {
        status:  500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
