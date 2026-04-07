import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminChat = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchConvos = async () => {
    const { data } = await supabase.from('chat_conversations').select('*').order('updated_at', { ascending: false });
    setConversations(data || []);
  };

  useEffect(() => { fetchConvos(); }, []);

  // Auto-refresh conversations every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchConvos, 10000);
    return () => clearInterval(interval);
  }, []);

  const selectConvo = async (convo: any) => {
    setSelected(convo);
    const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', convo.id).order('created_at');
    setMessages(data || []);
  };

  // Subscribe to realtime messages
  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel(`admin-chat-${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selected.id}` },
        (payload) => {
          const msg = payload.new;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
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
      message: msg,
    });
    await supabase.from('chat_conversations').update({ is_ai_handled: false, updated_at: new Date().toISOString() }).eq('id', selected.id);
    setReply('');
    setImageUrl('');
  };

  // Extract image from message
  const parseMessage = (text: string) => {
    const imgMatch = text.match(/\[Image: (https?:\/\/[^\]]+)\]/);
    const cleanText = text.replace(/\[Image: https?:\/\/[^\]]+\]/g, '').trim();
    return { text: cleanText, image: imgMatch?.[1] };
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)]">
      {/* Conversation list */}
      <div className="w-72 bg-card rounded-xl border overflow-y-auto shrink-0">
        <div className="p-3 border-b font-semibold text-sm flex items-center justify-between">
          Conversations
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={fetchConvos}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {conversations.map(c => (
          <button key={c.id} onClick={() => selectConvo(c)}
            className={`w-full text-left p-3 border-b hover:bg-accent transition-colors ${selected?.id === c.id ? 'bg-accent' : ''}`}>
            <p className="text-sm font-medium truncate">{c.subject || 'Chat'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{c.is_ai_handled ? 'AI' : 'Admin'}</Badge>
              {!c.is_resolved && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </button>
        ))}
        {conversations.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No conversations</p>}
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-card rounded-xl border flex flex-col">
        {selected ? (
          <>
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{selected.subject || 'Chat'}</p>
                <p className="text-xs text-muted-foreground">User ID: {selected.user_id?.slice(0, 8)}...</p>
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
              {messages.map(m => {
                const { text, image } = parseMessage(m.message);
                return (
                  <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      m.sender_type === 'admin' ? 'bg-primary text-primary-foreground' :
                      m.sender_type === 'ai' ? 'bg-secondary/20' : 'bg-muted'
                    }`}>
                      <p className="text-xs font-medium mb-1 opacity-70">{m.sender_type}</p>
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
            <div className="p-3 border-t flex gap-2">
              <label className="cursor-pointer">
                <Button variant="ghost" size="icon" className="shrink-0" asChild>
                  <span><ImageIcon className="h-4 w-4" /></span>
                </Button>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type reply..."
                onKeyDown={e => e.key === 'Enter' && sendReply()} />
              <Button onClick={sendReply} disabled={uploading}><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation</div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
