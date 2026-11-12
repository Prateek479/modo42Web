// POST /api/signup — receives the waitlist and coach-interest forms.
// Cloudflare Pages Function. Needs a D1 binding named DB (see README.md → Connect the forms).
// Optional env vars for a coach-signup email via Resend: RESEND_API_KEY, NOTIFY_EMAIL, NOTIFY_FROM.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FOCUS_OPTIONS = ['HYROX', 'Strength and conditioning', 'Running and endurance', 'Hybrid training', 'Other'];
const MAX_BODY_BYTES = 8 * 1024;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export async function onRequestPost({ request, env, waitUntil }) {
  // Only accept submissions from this site.
  const origin = request.headers.get('Origin');
  if (origin) {
    let sameHost = false;
    try {
      sameHost = new URL(origin).host === new URL(request.url).host;
    } catch {}
    if (!sameHost) return json(403, { ok: false, error: 'forbidden' });
  }
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'too_large' });
  }

  let data;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' });
    data = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }
  if (!data || typeof data !== 'object') return json(400, { ok: false, error: 'invalid_json' });

  // Honeypot: pretend success so bots don't retry.
  if (str(data.company, 200)) return json(200, { ok: true });

  const email = str(data.email, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return json(422, { ok: false, error: 'invalid_email' });
  const page = str(data.page, 200) || null;

  if (!env.DB) return json(503, { ok: false, error: 'not_configured' });

  try {
    if (data.source === 'waitlist') {
      // Duplicates are ignored, and the response is the same, so the form can't be used to check who signed up.
      await env.DB.prepare('INSERT INTO waitlist (email, page) VALUES (?1, ?2) ON CONFLICT(email) DO NOTHING')
        .bind(email, page)
        .run();
      return json(200, { ok: true });
    }

    if (data.source === 'coach') {
      const name = str(data.name, 120);
      const focus = str(data.focus, 60);
      const experience = str(data.experience, 1000) || null;
      if (!name) return json(422, { ok: false, error: 'invalid_name' });
      if (!FOCUS_OPTIONS.includes(focus)) return json(422, { ok: false, error: 'invalid_focus' });
      if (data.consent !== 'yes') return json(422, { ok: false, error: 'consent_required' });

      const now = new Date().toISOString();
      // A repeat submission updates the details rather than creating a second row.
      await env.DB.prepare(
        `INSERT INTO coach_interest (email, name, focus, experience, consent_at, page, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?5)
         ON CONFLICT(email) DO UPDATE SET
           name = excluded.name, focus = excluded.focus, experience = excluded.experience,
           consent_at = excluded.consent_at, page = excluded.page, updated_at = excluded.updated_at`
      )
        .bind(email, name, focus, experience, now, page)
        .run();

      waitUntil(notifyCoachSignup(env, { name, email, focus, experience }));
      return json(200, { ok: true });
    }
  } catch (err) {
    console.error('signup insert failed', err);
    return json(500, { ok: false, error: 'server_error' });
  }

  return json(400, { ok: false, error: 'unknown_source' });
}

async function notifyCoachSignup(env, coach) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL || !env.NOTIFY_FROM) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.NOTIFY_FROM,
        to: env.NOTIFY_EMAIL.split(',').map((s) => s.trim()),
        subject: `New coach interest: ${coach.name}`,
        text: [
          `Name: ${coach.name}`,
          `Email: ${coach.email}`,
          `Focus: ${coach.focus}`,
          '',
          'Experience and qualifications:',
          coach.experience || '(none given)',
        ].join('\n'),
      }),
    });
    if (!res.ok) console.error('coach notification failed', res.status, await res.text());
  } catch (err) {
    console.error('coach notification failed', err);
  }
}
