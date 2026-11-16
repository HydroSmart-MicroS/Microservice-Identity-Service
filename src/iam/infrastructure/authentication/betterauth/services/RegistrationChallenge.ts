import { APIError, createAuthMiddleware } from 'better-auth/api';

export function registrationChallenge(baseURL: string, env = process.env) {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() || null;
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (Boolean(siteKey) !== Boolean(secret)) {
    throw new Error('Configure both Turnstile keys for Identity.');
  }
  const hostname = new URL(baseURL).hostname;
  const before = createAuthMiddleware(async ctx => {
    if (!secret || ctx.path !== '/sign-up/email') return;

    const token = ctx.headers?.get('x-captcha-response');
    const invalid = new APIError('BAD_REQUEST', {
      message: 'Completa la verificación de seguridad y vuelve a intentarlo.',
    });
    if (!token || token.length > 2048) throw invalid;

    let result;
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({secret, response: token}),
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Turnstile unavailable');
      result = await response.json();
      if (typeof result?.success !== 'boolean' || result['error-codes']?.includes('internal-error')) {
        throw new Error('Turnstile verification unavailable');
      }
    } catch {
      throw new APIError('SERVICE_UNAVAILABLE', {
        message: 'La verificación de seguridad no está disponible. Inténtalo de nuevo en unos segundos.',
      });
    }

    if (!result.success || result.hostname !== hostname || result.action !== 'sign_up') throw invalid;
  });

  return { siteKey, before };
}
