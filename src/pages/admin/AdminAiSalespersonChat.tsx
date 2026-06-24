import { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, RefreshCw, Search, ChevronDown, ChevronUp, AlertCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Msg {
  role: 'user' | 'ai' | 'admin';
  content: string;
  ts: number;
  isEscalation?: boolean;
}

interface Session {
  session_id: string;
  session_type: string;
  product_id?: string;
  product_name?: string;
  user_id?: string;
  messages: Msg[];
  updated_at: string;
}

const AdminAiSalespersonChat = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_history' as any)
        .select('*')
        .eq('session_type', 'ai_salesperson')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === '42P01') {
          toast({ title: 'chat_history table not found', description: 'Please apply the DB migration from supabase/migrations/', variant: 'destructive' });
        }
        setSessions([]);
      } else {
        setSessions((data || []) as Session[]);
      }
    } catch {
      setSessions([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => {
        scrollRefs.current[expanded]?.scrollTo(0, scrollRefs.current[expanded]!.scrollHeight);
      }, 100);
    }
  }, [expanded]);

  const sendAdminReply = async (sessionId: string) => {
    const text = replyText[sessionId]?.trim();
    if (!text) return;
    setReplying(sessionId);

    const session = sessions.find(s => s.session_id === sessionId);
    if (!session) { setReplying(null); return; }

    const adminMsg: Msg = { role: 'admin', content: text, ts: Date.now() };
    const updatedMsgs = [...(session.messages || []), adminMsg];

    try {
      const { error } = await supabase
        .from('chat_history' as any)
        .update({ messages: updatedMsgs as any, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(s =>
        s.session_id === sessionId ? { ...s, messages: updatedMsgs } : s
      ));
      setReplyText(prev => ({ ...prev, [sessionId]: '' }));
      toast({ title: '✅ Reply sent' });
    } catch {
      toast({ title: 'Failed to send reply', variant: 'destructive' });
    }
    setReplying(null);
  };

  const hasEscalation = (msgs: Msg[]) => msgs.some(m => m.isEscalation);
  const hasUnansweredEscalation = (msgs: Msg[]) => {
    const last = msgs[msgs.length - 1];
    return last?.isEscalation && last?.role !== 'admin';
  };

  const filtered = sessions.filter(s =>
    !search || (s.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
    s.session_id.includes(search)
  );

  const escalated = filtered.filter(s => hasUnansweredEscalation(s.messages || []));
  const regular = filtered.filter(s => !hasUnansweredEscalation(s.messages || []));

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" /> AI Salesperson Chats
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Product-level AI chat conversations with customers</p>
        </div>
        <div className="flex gap-2">
          {escalated.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" /> {escalated.length} Need Reply
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name..." className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading conversations...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No AI salesperson conversations yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Customers will see the AI chat button on product detail pages.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalated.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-4 w-4" /> Needs Your Reply ({escalated.length})
              </h2>
              {escalated.map(s => <SessionCard key={s.session_id} s={s} expanded={expanded} setExpanded={setExpanded} replyText={replyText} setReplyText={setReplyText} sendAdminReply={sendAdminReply} replying={replying} scrollRefs={scrollRefs} urgent />)}
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {escalated.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2 mt-4">All Conversations ({regular.length})</h2>}
              {regular.map(s => <SessionCard key={s.session_id} s={s} expanded={expanded} setExpanded={setExpanded} replyText={replyText} setReplyText={setReplyText} sendAdminReply={sendAdminReply} replying={replying} scrollRefs={scrollRefs} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SessionCard = ({ s, expanded, setExpanded, replyText, setReplyText, sendAdminReply, replying, scrollRefs, urgent }: any) => {
  const msgs: Msg[] = s.messages || [];
  const lastMsg = msgs[msgs.length - 1];
  const isOpen = expanded === s.session_id;
  const userMsgs = msgs.filter(m => m.role === 'user').length;

  return (
    <div className={`border rounded-xl overflow-hidden ${urgent ? 'border-destructive/40 bg-destructive/5' : ''}`}>
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded(isOpen ? null : s.session_id)}
      >
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0">
          <Package className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{s.product_name || 'Unknown Product'}</p>
            {urgent && <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Needs Reply</Badge>}
            {msgs.some(m => m.isEscalation) && !urgent && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Escalated</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {lastMsg?.content?.slice(0, 80) || 'No messages'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-muted-foreground">{userMsgs} messages</p>
          <p className="text-[10px] text-muted-foreground">{new Date(s.updated_at).toLocaleDateString()}</p>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {isOpen && (
        <div className="border-t">
          <div
            ref={el => { scrollRefs.current[s.session_id] = el; }}
            className="p-3 space-y-2.5 max-h-64 overflow-y-auto bg-muted/20"
          >
            {msgs.map((m: Msg, i: number) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${m.role === 'admin' ? 'bg-blue-500' : 'bg-gradient-to-br from-purple-500 to-indigo-500'}`}>
                    {m.role === 'admin' ? <User className="h-3 w-3 text-white" /> : <Bot className="h-3 w-3 text-white" />}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' :
                  m.role === 'admin' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                  'bg-card border'
                }`}>
                  {m.role === 'admin' && <p className="text-[10px] font-bold text-blue-500 mb-0.5">You (Admin)</p>}
                  {m.isEscalation && <div className="flex items-center gap-1 text-amber-600 text-[10px] mb-0.5"><AlertCircle className="h-3 w-3" /> Escalation</div>}
                  <p className="whitespace-pre-wrap text-xs">{m.content}</p>
                </div>
                {m.role === 'user' && (
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2">
            <Input
              value={replyText[s.session_id] || ''}
              onChange={e => setReplyText((prev: any) => ({ ...prev, [s.session_id]: e.target.value }))}
              onKeyDown={(e: any) => e.key === 'Enter' && sendAdminReply(s.session_id)}
              placeholder="Reply to customer..."
              className="flex-1 h-9 text-sm"
              disabled={replying === s.session_id}
            />
            <Button size="sm" className="h-9 bg-purple-600 hover:bg-purple-700" onClick={() => sendAdminReply(s.session_id)} disabled={replying === s.session_id || !replyText[s.session_id]?.trim()}>
              <Send className="h-3.5 w-3.5 mr-1" /> Reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAiSalespersonChat;
