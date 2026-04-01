// worker.js — Cloudflare Worker proxy para el timbre
// El token de Telegram nunca sale de aquí (vive en env secrets de Cloudflare)

const ALLOWED_ORIGIN = 'https://nicodra.github.io';
const RATE_LIMIT_TTL = 60; // segundos entre avisos por IP

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

    // Rate limiting por IP usando KV
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const kvKey = `rl:${ip}`;

    if (env.RATE_LIMIT) {
      const existing = await env.RATE_LIMIT.get(kvKey);
      if (existing) {
        return new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), {
          status:  429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

      // Registrar la IP por RATE_LIMIT_TTL segundos
      if (env.RATE_LIMIT) {
        await env.RATE_LIMIT.put(kvKey, '1', { expirationTtl: RATE_LIMIT_TTL });
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
