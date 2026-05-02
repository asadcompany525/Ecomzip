import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ORIGIN_HOSTS = [
  "localhost", "127.0.0.1",
  "replit.dev", "replit.app", "replit.co",
  "lovable.app", "lovable.dev",
  "vercel.app", "netlify.app",
  "stopy.shop", "stopy-shoes.com",
];

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const host = u.hostname;
    return ALLOWED_ORIGIN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch { return false; }
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!originAllowed(req)) return json({ error: "Forbidden origin" }, 403);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { emails, subject, html, tracking_id } = body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return json({ error: "No recipients provided" }, 400);
  }
  if (!subject || !html) {
    return json({ error: "Missing subject or html" }, 400);
  }

  const safeEmails = emails.filter((e: any) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (safeEmails.length === 0) return json({ error: "No valid email addresses" }, 400);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const GMAIL_USER = Deno.env.get("GMAIL_USER");
  const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

  const safeSubject = String(subject).slice(0, 300);
  const safeHtml = String(html);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  if (RESEND_API_KEY) {
    const batchSize = 50;
    for (let i = 0; i < safeEmails.length; i += batchSize) {
      const batch = safeEmails.slice(i, i + batchSize);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: GMAIL_USER ? `Stopy Shoes <${GMAIL_USER}>` : "Stopy Shoes <noreply@stopy.shop>",
            to: batch,
            subject: safeSubject,
            html: safeHtml,
          }),
        });
        if (res.ok) { sent += batch.length; }
        else { failed += batch.length; errors.push(await res.text()); }
      } catch (e: any) { failed += batch.length; errors.push(e.message); }
    }
    return json({ success: true, provider: "resend", sent, failed, tracking_id });
  }

  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    const encoder = new TextEncoder();
    const dec = new TextDecoder();

    for (const email of safeEmails) {
      try {
        const rawEmail = [
          `From: Stopy Shoes <${GMAIL_USER}>`,
          `To: ${email}`,
          `Subject: ${safeSubject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          safeHtml,
        ].join("\r\n");

        const smtpConn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
        const read = async () => dec.decode((await smtpConn.read(new Uint8Array(4096))) ?? new Uint8Array());
        const write = async (s: string) => smtpConn.write(encoder.encode(s + "\r\n"));

        await read();
        await write(`EHLO stopy.edge`); await read();
        await write(`AUTH LOGIN`); await read();
        await write(btoa(GMAIL_USER)); await read();
        await write(btoa(GMAIL_APP_PASSWORD));
        const authResp = await read();
        if (!authResp.includes("235")) throw new Error("Gmail auth failed");

        await write(`MAIL FROM:<${GMAIL_USER}>`); await read();
        await write(`RCPT TO:<${email}>`); await read();
        await write(`DATA`); await read();
        await write(rawEmail + "\r\n."); await read();
        await write(`QUIT`);
        smtpConn.close();
        sent++;
      } catch (e: any) { failed++; errors.push(e.message); }
    }
    return json({ success: true, provider: "gmail_smtp", sent, failed, tracking_id });
  }

  console.log(`[NEWSLETTER-DEV] Subject: ${safeSubject} | Recipients: ${safeEmails.length} | tracking: ${tracking_id}`);
  return json({
    success: true,
    provider: "dev_log",
    sent: safeEmails.length,
    failed: 0,
    tracking_id,
    note: "No email provider configured. Configure RESEND_API_KEY or GMAIL_USER+GMAIL_APP_PASSWORD in Supabase edge function secrets.",
  });
});
