import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, BarChart2, RefreshCw, Users, CheckCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface EmailLog {
  id: string;
  subject: string;
  recipients_count: number;
  sent_at: string;
  open_count: number;
  status: 'sent' | 'failed' | 'partial';
}

export default function AdminNewsletter() {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState(`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #f97316;">🛍️ Special Offer from AS Store!</h1>
  <p>Dear Valued Customer,</p>
  <p>We have an exciting offer just for you. Check out our latest collection!</p>
  <a href="https://yourstore.com" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Shop Now</a>
  <p>Thank you for being our valued customer!</p>
  <p style="color: #888; font-size: 12px;">© 2024 AS Store. All rights reserved.</p>
</div>`);
  const [sending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    loadRecipientCount();
    loadLogs();
  }, []);

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

  const sendNewsletter = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      toast({ title: 'Subject and body are required', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('email').not('email', 'is', null);
      const emails = (profiles || []).map((p: any) => p.email).filter(Boolean);

      if (emails.length === 0) {
        toast({ title: 'No recipients found', variant: 'destructive' });
        setIsSending(false);
        return;
      }

      const trackingId = `nl_${Date.now()}`;

      const { error: fnError } = await supabase.functions.invoke('send-newsletter', {
        body: {
          emails,
          subject,
          html: htmlBody.replace('</body>', `<img src="https://lhdxqwvgrbjywjiixioc.supabase.co/functions/v1/track-open?id=${trackingId}" width="1" height="1" /></body>`),
          tracking_id: trackingId,
        },
      });

      if (fnError) throw new Error(fnError.message);

      await supabase.from('email_logs').insert({
        subject,
        recipients_count: emails.length,
        status: 'sent',
        open_count: 0,
        tracking_id: trackingId,
        sent_at: new Date().toISOString(),
      });

      toast({ title: `✅ Newsletter sent to ${emails.length} subscribers!` });
      setSubject('');
      loadLogs();
    } catch (e: any) {
      const errMsg = e.message || 'Unknown error';
      await supabase.from('email_logs').insert({
        subject,
        recipients_count: 0,
        status: 'failed',
        open_count: 0,
        tracking_id: `err_${Date.now()}`,
        sent_at: new Date().toISOString(),
      }).catch(() => {});
      toast({ title: 'Failed to send', description: errMsg, variant: 'destructive' });
    }
    setIsSending(false);
  };

  const totalSent = logs.reduce((s, l) => s + l.recipients_count, 0);
  const totalOpened = logs.reduce((s, l) => s + l.open_count, 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6 text-primary" /> Pro Newsletter & Bulk Email</h1>
          <p className="text-sm text-muted-foreground mt-1">Send HTML emails to all customers with open rate tracking.</p>
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
              <div>
                <Label>Email Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. 🛍️ Eid Special — 20% OFF Everything!" className="mt-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>HTML Email Body</Label>
                  <Button size="sm" variant="outline" onClick={() => setPreview(!preview)} className="text-xs gap-1">
                    <Eye className="h-3.5 w-3.5" /> {preview ? 'Hide' : 'Preview'}
                  </Button>
                </div>
                <Textarea
                  value={htmlBody}
                  onChange={e => setHtmlBody(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                  placeholder="Write your HTML email here..."
                />
              </div>

              {preview && (
                <div>
                  <Label className="mb-2 block">Preview</Label>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={htmlBody}
                      className="w-full h-64 border-0"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={sendNewsletter} disabled={sending} className="gap-2 flex-1 sm:flex-none">
                  <Send className={`h-4 w-4 ${sending ? 'animate-pulse' : ''}`} />
                  {sending ? `Sending to ${recipientCount} subscribers...` : `Send to All (${recipientCount})`}
                </Button>
                <p className="text-xs text-muted-foreground">Emails are queued and sent in batches to avoid timeouts.</p>
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
