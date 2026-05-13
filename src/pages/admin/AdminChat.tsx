import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Image as ImageIcon, RefreshCw, Eye, Bot } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ensureAdminSession } from '@/lib/adminSession';

const AdminChat = () => {
  const { user, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, string>>({});
  const [filterStaffId, setFilterStaffId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  const fetchConvos = async () => {
    try { await ensureAdminSession(); } catch {}
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) console.error('Chat fetch error:', error.message);
    setConversations(data || []);
  };

  const fetchStaffList = async () => {
    if (!isAdmin) return;
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'moderator');
    if (!roles?.length) return;
    const userIds = roles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    setStaffList(profiles || []);
  };

  useEffect(() => { fetchConvos(); fetchStaffList(); }, [isAdmin]);

  useEffect(() => {
    const interval = setInterval(fetchConvos, 10000);
    return () => clearInterval(interval);
  }, []);

  const selectConvo = async (convo: any) => {
    setSelected(convo);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .order('created_at');
    const msgs = data || [];
    setMessages(msgs);

    const senderIds = [...new Set(msgs.filter((m: any) => m.sender_id).map((m: any) => m.sender_id))];
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', senderIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { map[p.user_id] = p.full_name || 'Staff'; });
      setSenderProfiles(map);
    }
  };

  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel(`admin-chat-${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selected.id}` },
        (payload) => {
          const msg = payload.new;
          setMessages(prev => {
            if (prev.some((m: any) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `admin/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('chat').upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from('chat').getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const sendReply = async () => {
    if ((!reply.trim() && !imageUrl) || !selected) return;
    const msg = imageUrl ? `${reply.trim()}\n[Image: ${imageUrl}]` : reply.trim();
    await supabase.from('chat_messages').insert({
      conversation_id: selected.id,
      sender_type: 'admin',
      sender_id: user?.id || null,
      message: msg,
    });
    await supabase.from('chat_conversations').update({ is_ai_handled: false, updated_at: new Date().toISOString() }).eq('id', selected.id);
    setSelected((s: any) => ({ ...s, is_ai_handled: false }));
    setReply('');
    setImageUrl('');
  };

  const parseMessage = (text: string) => {
    const imgMatch = text.match(/\[Image: (https?:\/\/[^\]]+)\]/);
    const cleanText = text.replace(/\[Image: https?:\/\/[^\]]+\]/g, '').trim();
    return { text: cleanText, image: imgMatch?.[1] };
  };

  const filteredConversations = filterStaffId ? conversations : conversations;

  const getAiMsgCount = (convoId: string) => {
    if (selected?.id !== convoId) return 0;
    return messages.filter((m: any) => m.sender_type === 'ai').length;
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-160px)]">
      {isAdmin && staffList.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Eye className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-700">Chat Watch:</span>
          <button
            onClick={() => setFilterStaffId(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filterStaffId ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
          >All</button>
          {staffList.map(s => (
            <button
              key={s.user_id}
              onClick={() => setFilterStaffId(filterStaffId === s.user_id ? null : s.user_id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterStaffId === s.user_id ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
            >{s.full_name || s.email}</button>
          ))}
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-72 bg-card rounded-xl border overflow-y-auto shrink-0">
          <div className="p-3 border-b font-semibold text-sm flex items-center justify-between">
            Conversations
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={fetchConvos}><RefreshCw className="h-3 w-3" /></Button>
          </div>
          {filteredConversations.map(c => (
            <button key={c.id} onClick={() => selectConvo(c)}
              className={`w-full text-left p-3 border-b hover:bg-accent transition-colors ${selected?.id === c.id ? 'bg-accent' : ''}`}>
              <p className="text-sm font-medium truncate">{c.subject || 'Chat'}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {c.is_ai_handled
                  ? <Badge variant="outline" className="text-xs text-purple-600 border-purple-300 bg-purple-50 gap-1"><Bot className="h-2.5 w-2.5" />AI Active</Badge>
                  : <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">Staff</Badge>
                }
                {!c.is_resolved && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No conversations</p>}
        </div>

        <div className="flex-1 bg-card rounded-xl border flex flex-col min-h-0">
          {selected ? (
            <>
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{selected.subject || 'Chat'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">User: {selected.user_id?.slice(0, 8)}...</p>
                    {selected.is_ai_handled
                      ? <Badge className="text-[10px] h-4 bg-purple-100 text-purple-700 border-purple-200 gap-0.5"><Bot className="h-2.5 w-2.5" />AI Handling</Badge>
                      : <Badge variant="outline" className="text-[10px] h-4 text-blue-700 border-blue-200">Staff Mode</Badge>
                    }
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={selected.is_resolved ? 'secondary' : 'outline'} onClick={async () => {
                    await supabase.from('chat_conversations').update({ is_resolved: !selected.is_resolved }).eq('id', selected.id);
                    toast({ title: selected.is_resolved ? 'Reopened' : 'Resolved' });
                    setSelected((s: any) => ({ ...s, is_resolved: !s.is_resolved }));
                    fetchConvos();
                  }}>{selected.is_resolved ? 'Reopen' : 'Mark Resolved'}</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages
                  .filter((m: any) => !filterStaffId || m.sender_type !== 'admin' || m.sender_id === filterStaffId || m.sender_type === 'user')
                  .map((m: any) => {
                    const { text, image } = parseMessage(m.message);
                    const isAi = m.sender_type === 'ai';
                    const isAdmin = m.sender_type === 'admin';
                    const isUser = m.sender_type === 'user';
                    const senderName = isAi ? 'AI Salesperson' :
                      (m.sender_id && senderProfiles[m.sender_id] ? senderProfiles[m.sender_id] : m.sender_type);
                    return (
                      <div key={m.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                        {isAi && (
                          <div className="mr-2 h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 self-end">
                            <Bot className="h-4 w-4 text-purple-600" />
                          </div>
                        )}
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isAdmin ? 'bg-primary text-primary-foreground' :
                          isAi ? 'bg-purple-50 border border-purple-200 text-purple-900' :
                          'bg-muted'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-xs font-medium opacity-70">{senderName}</p>
                            {isAi && (
                              <span className="inline-flex items-center gap-0.5 bg-purple-200 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                <Bot className="h-2 w-2" />AI
                              </span>
                            )}
                          </div>
                          {image && <img src={image} alt="" className="max-w-[200px] rounded-lg mb-2" />}
                          {text && <p className="text-sm whitespace-pre-wrap">{text}</p>}
                          <p className="text-[10px] opacity-50 mt-1">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {imageUrl && (
                <div className="px-3">
                  <div className="relative inline-block">
                    <img src={imageUrl} alt="" className="h-16 rounded-lg border" />
                    <button onClick={() => setImageUrl('')}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                  </div>
                </div>
              )}
              <div className="p-3 border-t space-y-2">
                {selected.is_ai_handled && (
                  <p className="text-xs text-purple-600 flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    AI is handling this conversation. Type a reply to take over.
                  </p>
                )}
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <Button variant="ghost" size="icon" className="shrink-0" asChild>
                      <span><ImageIcon className="h-4 w-4" /></span>
                    </Button>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type reply (overrides AI for this chat)..."
                    onKeyDown={e => e.key === 'Enter' && sendReply()} />
                  <Button onClick={sendReply} disabled={uploading}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
