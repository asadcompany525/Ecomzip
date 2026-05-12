import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, BarChart2, RefreshCw, Users, CheckCircle, Eye, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface EmailLog {
  id: string;
  subject: string;
  recipients_count: number;
  sent_at: string;
  open_count: number;
  status: 'sent' | 'failed' | 'partial';
}

export default function AdminNewsletter() {
  const { brandName } = useStoreSettings();
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState(`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
  <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🛍️ Special Offer!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">From Our Store Pakistan</p>
  </div>
  <div style="padding: 24px; background: #fff;">
    <p style="font-size: 16px; color: #333;">Dear Valued Customer,</p>
    <p style="color: #555; line-height: 1.6;">We have an exciting offer just for you. Check out our latest collection of premium shoes and bags!</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://yourstore.com" style="background: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">Shop Now →</a>
    </div>
    <p style="color: #555;">Thank you for being our valued customer!</p>
  </div>
  <div style="background: #f9f9f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #888; font-size: 12px; margin: 0;">© 2025 Our Store. All rights reserved.</p>
  </div>
</div>`);
  const [sending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [preview, setPreview] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadRecipientCount();
    loadLogs();
  }, []);

  useEffect(() => {
    if (brandName) {
      setHtmlBody(prev =>
        prev.replace('From Our Store Pakistan', `From ${brandName} Pakistan`)
            .replace('© 2025 Our Store. All rights reserved.', `© 2025 ${brandName}. All rights reserved.`)
      );
    }
  }, [brandName]);

  const loadRecipientCount = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).not('email', 'is', null);
    setRecipientCount(count || 0);
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data } = await supabase.from('email_logs').select('*').order('sent_at', { ascending: false }).limit(50);
      setLogs(data || []);
    } catch {
      setLogs([]);
    }
    setLoadingLogs(false);
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: 'Enter a prompt first', description: 'e.g. "Write a sale email for Eid with 20% off"', variant: 'destructive' });
      return;
    }
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'admin-assistant',
          messages: [{
            role: 'user',
            content: `You are an expert email marketing copywriter for ${brandName || 'our store'}, a Pakistani shoes & bags e-commerce store.

Generate a professional HTML email newsletter based on this prompt: "${aiPrompt}"

Requirements:
- Use inline CSS styles only (no external CSS)
- Use the brand color #f97316 (orange) as the primary color
- Include: header with brand name, engaging body content, a clear CTA button, and a footer
- Make it mobile-friendly (max-width: 600px)
- Write in a friendly, professional tone for Pakistani customers
- Include PKR pricing if relevant

Return ONLY a JSON object with no markdown:
{
  "subject": "email subject line with emoji",
  "html": "complete HTML email body"
}`
          }]
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'AI service error');
      let reply = data?.reply || data;
      if (typeof reply === 'string') {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) reply = JSON.parse(jsonMatch[0]);
      }
      if (reply?.subject) setSubject(reply.subject);
      if (reply?.html) setHtmlBody(reply.html);
      setPreview(true);
      toast({ title: '✅ AI generated your email!', description: 'Review and edit before sending.' });
    } catch (e: any) {
      toast({ title: 'AI generation failed', description: e.message, variant: 'destructive' });
    }
    setAiGenerating(false);
  };

  const sendNewsletter = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      toast({ title: 'Subject and body are required', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null);

      if (profilesError) throw profilesError;

      const emails = (profiles || []).map((p: any) => p.email).filter((e: string) => e && e.includes('@'));

      if (emails.length === 0) {
        toast({ title: 'No recipients found', description: 'No customers with email addresses in the database.', variant: 'destructive' });
        setIsSending(false);
        return;
      }

      const trackingId = `nl_${Date.now()}`;
      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '').replace(/\/$/, '');
      const trackPixel = `<img src="${supabaseUrl}/functions/v1/track-open?id=${trackingId}" width="1" height="1" style="display:none" />`;
      const trackedHtml = htmlBody.includes('</body>')
        ? htmlBody.replace('</body>', `${trackPixel}</body>`)
        : htmlBody + trackPixel;

      let sendSuccess = false;
      let provider = 'unknown';
      let sentCount = 0;
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-assistant', {
          body: {
            type: 'send-newsletter',
            emails,
            subject,
            html: trackedHtml,
            tracking_id: trackingId,
            from_name: brandName || 'Stopy Shoes',
          },
        });
        if (fnError) throw new Error(fnError.message);
        if (fnData?.success) {
          sendSuccess = true;
          provider = fnData.provider || 'sent';
          sentCount = fnData.sent || emails.length;
        }
      } catch (e: any) {
        console.warn('[Newsletter] send failed:', e.message);
      }

      await supabase.from('email_logs').insert({
        subject,
        recipients_count: emails.length,
        status: sendSuccess ? 'sent' : 'partial',
        open_count: 0,
        tracking_id: trackingId,
        sent_at: new Date().toISOString(),
      }).catch(() => {});

      if (sendSuccess && provider !== 'dev_log') {
        toast({ title: `✅ Newsletter sent!`, description: `Delivered to ${sentCount} subscribers via ${provider}.` });
      } else if (sendSuccess && provider === 'dev_log') {
        toast({
          title: `📋 Campaign logged (${emails.length} recipients)`,
          description: `No email provider configured. Set GMAIL_USER + GMAIL_APP_PASSWORD or RESEND_API_KEY in Supabase → Project Settings → Edge Functions → Secrets.`,
        });
      } else {
        toast({
          title: `⚠️ Delivery issue`,
          description: `Campaign saved. Check Supabase secrets: GMAIL_USER, GMAIL_APP_PASSWORD, or RESEND_API_KEY.`,
        });
      }
      setSubject('');
      loadLogs();
    } catch (e: any) {
      await supabase.from('email_logs').insert({
        subject,
        recipients_count: 0,
        status: 'failed',
        open_count: 0,
        tracking_id: `err_${Date.now()}`,
        sent_at: new Date().toISOString(),
      }).catch(() => {});
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    }
    setIsSending(false);
  };

  const totalSent = logs.reduce((s, l) => s + l.recipients_count, 0);
  const totalOpened = logs.reduce((s, l) => s + l.open_count, 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl"><Mail className="h-5 w-5 text-blue-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Newsletter & Bulk Email</h1>
            <p className="text-sm text-muted-foreground">Send HTML emails to all customers · AI writing assistant included</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5"><Users className="h-3.5 w-3.5" /> {recipientCount} subscribers</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Send className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-sm text-muted-foreground">Campaigns Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalOpened}</p>
              <p className="text-sm text-muted-foreground">Total Opens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{openRate}%</p>
              <p className="text-sm text-green-600">Open Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose Email</TabsTrigger>
          <TabsTrigger value="logs">Campaign History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              {/* AI Writing Assistant */}
              <div className="border border-dashed border-primary/40 bg-primary/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">AI Writing Assistant</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="e.g. Write a sale email for Eid with 30% off all shoes..."
                    className="flex-1 bg-white"
                    onKeyDown={e => e.key === 'Enter' && generateWithAI()}
                  />
                  <Button
                    onClick={generateWithAI}
                    disabled={aiGenerating || !aiPrompt.trim()}
                    className="gap-2 shrink-0"
                  >
                    {aiGenerating
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                      : <><Sparkles className="h-4 w-4" /> AI Generate</>
                    }
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">AI will generate the Subject line AND full HTML email body based on your prompt.</p>
              </div>

              <div>
                <Label>Email Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. 🛍️ Eid Special — 20% OFF Everything!" className="mt-1" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>HTML Email Body (Full HTML/CSS supported)</Label>
                  <Button size="sm" variant="outline" onClick={() => setPreview(!preview)} className="text-xs gap-1">
                    <Eye className="h-3.5 w-3.5" /> {preview ? 'Hide Preview' : 'Live Preview'}
                  </Button>
                </div>
                <Textarea
                  value={htmlBody}
                  onChange={e => setHtmlBody(e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                  placeholder="Write your HTML email here..."
                />
              </div>

              {preview && (
                <div>
                  <Label className="mb-2 block">Email Preview (600px width)</Label>
                  <div className="border-2 border-dashed border-muted rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground border-b">
                      Subject: {subject || '(no subject)'}
                    </div>
                    <iframe
                      srcDoc={htmlBody}
                      className="w-full h-80 border-0"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t">
                <Button onClick={sendNewsletter} disabled={sending} className="gap-2">
                  <Send className={`h-4 w-4 ${sending ? 'animate-pulse' : ''}`} />
                  {sending ? `Sending to ${recipientCount}...` : `Send to All ${recipientCount} Subscribers`}
                </Button>
                <p className="text-xs text-muted-foreground">Emails queued and sent in batches to avoid rate limits.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={loadLogs} disabled={loadingLogs} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3">Subject</th>
                  <th className="text-left p-3">Recipients</th>
                  <th className="text-left p-3">Opens</th>
                  <th className="text-left p-3">Open Rate</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const rate = log.recipients_count > 0 ? Math.round((log.open_count / log.recipients_count) * 100) : 0;
                  return (
                    <tr key={log.id} className="border-b hover:bg-accent/30">
                      <td className="p-3 font-medium max-w-[200px] truncate">{log.subject}</td>
                      <td className="p-3">{log.recipients_count}</td>
                      <td className="p-3">{log.open_count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{rate}%</span>
                          <div className="h-1.5 bg-muted rounded-full w-16">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {log.status === 'sent' && <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>}
                        {log.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                        {log.status === 'partial' && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Partial</Badge>}
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(log.sent_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No campaigns sent yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
