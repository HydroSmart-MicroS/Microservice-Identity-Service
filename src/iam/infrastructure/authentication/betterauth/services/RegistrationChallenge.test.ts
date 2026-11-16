import assert from 'node:assert/strict';
import { test } from 'node:test';
import { betterAuth } from 'better-auth';
import { registrationChallenge } from './RegistrationChallenge.js';

const baseURL = 'https://example.com';
const env = {TURNSTILE_SITE_KEY:'public-test-value', TURNSTILE_SECRET_KEY:'private-test-value'};
const valid = {success:true, hostname:'example.com', action:'sign_up'};

test('local registrations can run without Turnstile, and partial configuration fails', () => {
  assert.equal(registrationChallenge(baseURL, {}).siteKey, null);
  assert.equal(registrationChallenge(baseURL, {TURNSTILE_SITE_KEY:' ', TURNSTILE_SECRET_KEY:''}).siteKey, null);
  assert.throws(() => registrationChallenge(baseURL, {TURNSTILE_SITE_KEY:'test'}), /both Turnstile keys/);
});

test('Better Auth validates Turnstile before creating an account', async t => {
  let result: unknown = valid;
  let calls = 0;
  let unavailable = false;
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    calls++;
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(options.method, 'POST');
    assert.equal((options.body as URLSearchParams).get('secret'), env.TURNSTILE_SECRET_KEY);
    assert.equal((options.body as URLSearchParams).get('response'), 'widget-token');
    if (unavailable) throw new Error('Simulated outage');
    return Response.json(result);
  });

  const challenge = registrationChallenge(baseURL, env);
  assert.equal(challenge.siteKey, env.TURNSTILE_SITE_KEY);
  const auth = betterAuth({
    baseURL, secret:'only-for-the-in-memory-test-with-no-real-credentials',
    emailAndPassword:{enabled:true},
    hooks:{before:challenge.before},
    rateLimit:{enabled:false},
  });
  const submit = (token?: string, path = '/sign-up/email') => auth.handler(new Request(baseURL + '/api/auth' + path, {
    method:'POST',
    headers:{'Content-Type':'application/json',Origin:baseURL,...(token?{'x-captcha-response':token}:{})},
    body:JSON.stringify({email:'test@example.com',name:'HydroSmart Test',password:'TestPassword-1234'}),
  }));

  assert.equal((await submit()).status, 400);
  assert.equal((await submit('a'.repeat(2049))).status, 400);
  assert.ok([400,404].includes((await submit(undefined,'/sign-up/email/')).status));
  assert.equal(calls, 0);

  for (const rejected of [
    {success:false, 'error-codes':['timeout-or-duplicate']},
    {...valid, hostname:'other.example.com'},
    {...valid, action:'other'},
  ]) {
    result = rejected;
    assert.equal((await submit('widget-token')).status, 400);
  }

  unavailable = true;
  assert.equal((await submit('widget-token')).status, 503);
  unavailable = false;
  result = valid;
  const success = await submit('widget-token');
  assert.equal(success.status, 200);
  assert.equal((await success.json()).user.email, 'test@example.com');
  assert.equal((await submit(undefined,'/sign-in/email')).status, 200);
  assert.equal(calls, 5);
});
