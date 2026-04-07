import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Loader2, Volume2, Command, History, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const EXAMPLE_COMMANDS = [
  { urdu: 'Aaj ki orders dikhao', english: 'Show today\'s orders' },
  { urdu: 'Size 41 ki sales report', english: 'Sales report for size 41' },
  { urdu: 'Low stock products', english: 'Show low stock products' },
  { urdu: 'Is mahine ka revenue', english: 'This month\'s revenue' },
  { urdu: 'Top selling products', english: 'Top selling products' },
  { urdu: 'Pending orders kitni hain', english: 'How many pending orders' },
];

export default function AdminAiVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [commandHistory, setCommandHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('voice_command_history') || '[]'); } catch { return []; }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synth = window.speechSynthesis;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      synth.cancel();
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Speech recognition not supported in this browser', variant: 'destructive' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK'; // Urdu Pakistan
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setResult(null);
    };

    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript || recognitionRef.current?._lastTranscript) {
        processCommand(transcript || recognitionRef.current?._lastTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        toast({ title: 'No speech detected. Try speaking in Urdu or English.' });
      } else {
        toast({ title: `Error: ${event.error}`, variant: 'destructive' });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current._lastTranscript = transcript;
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processCommand = async (command: string) => {
    if (!command.trim()) return;
    setProcessing(true);
    setResult(null);

    try {
      // Fetch relevant data based on command keywords
      const [ordersRes, productsRes, revenueRes] = await Promise.all([
        supabase.from('orders').select('id, status, total_amount, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('products').select('id, title, stock, sold, price').order('sold', { ascending: false }).limit(20),
        supabase.from('orders').select('total_amount, created_at, status').gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = (ordersRes.data || []).filter(o => o.created_at?.startsWith(today));
      const pendingOrders = (ordersRes.data || []).filter(o => o.status === 'pending');
      const lowStock = (productsRes.data || []).filter(p => (p.stock || 0) < 5);
      const monthRevenue = (revenueRes.data || []).filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'voice-command',
          messages: [{
            role: 'user',
            content: `You are an AI admin assistant for Stopy Shoes Pakistan e-commerce store.
The admin has given this voice command (Urdu/English mixed): "${command}"

CURRENT DATA SNAPSHOT:
- Today's Orders: ${todayOrders.length} orders, Total: Rs. ${todayOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0).toLocaleString()}
- Pending Orders: ${pendingOrders.length}
- Top 5 Products by Sales: ${(productsRes.data || []).slice(0, 5).map(p => `${p.title} (${p.sold} sold)`).join(', ')}
- Low Stock Products (<5): ${lowStock.map(p => p.title).join(', ') || 'None'}
- This Month Revenue: Rs. ${monthRevenue.toLocaleString()}
- Total Active Products: ${(productsRes.data || []).length}

Analyze the command and provide a helpful response. Return JSON:
{
  "understanding": "What you understood from the command",
  "responseUrdu": "Brief response in Urdu",
  "responseEnglish": "Detailed response in English",
  "data": { ... relevant data points ... },
  "chartType": "number" | "list" | "table",
  "highlights": ["key stat 1", "key stat 2"]
}

Return ONLY valid JSON.`
          }],
        },
      });

      if (error) throw error;
      let parsed = data;
      if (typeof data === 'string') {
        const m = data.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      setResult(parsed);

      // Speak the Urdu response
      if (parsed.responseUrdu) {
        speakText(parsed.responseUrdu, 'ur-PK');
      }

      // Save to history
      const entry = { command, result: parsed, timestamp: new Date().toISOString() };
      const newHistory = [entry, ...commandHistory].slice(0, 20);
      setCommandHistory(newHistory);
      localStorage.setItem('voice_command_history', JSON.stringify(newHistory));

    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const speakText = (text: string, lang: string = 'en-US') => {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.speak(utterance);
  };

  const handleExampleCommand = (cmd: string) => {
    setTranscript(cmd);
    processCommand(cmd);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" /> AI Voice-Command Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Speak commands in Urdu or English — AI fetches live data and reads the answer back to you.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Microphone Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl border p-6 text-center space-y-4">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? 'bg-destructive text-white animate-pulse shadow-lg shadow-destructive/40'
                  : 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/30'
              }`}
            >
              {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
            </button>

            <div>
              <p className="font-semibold">{isListening ? '🎙️ Listening...' : 'Click to Speak'}</p>
              <p className="text-xs text-muted-foreground mt-1">Urdu & English supported</p>
            </div>

            {transcript && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm text-left">
                <p className="text-xs text-muted-foreground mb-1">Heard:</p>
                <p className="font-medium">{transcript}</p>
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> AI Processing...
              </div>
            )}

            {isSpeaking && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Volume2 className="h-4 w-4 animate-pulse" /> Speaking response...
              </div>
            )}

            {result && !processing && (
              <Button size="sm" variant="outline" onClick={() => speakText(result.responseUrdu || result.responseEnglish)} className="w-full gap-1">
                <Volume2 className="h-3.5 w-3.5" /> Repeat Answer
              </Button>
            )}
          </div>

          {/* Example Commands */}
          <div className="bg-card rounded-xl border p-4 space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1"><Command className="h-3.5 w-3.5" /> Example Commands</Label>
            <div className="space-y-1.5">
              {EXAMPLE_COMMANDS.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleCommand(cmd.urdu)}
                  className="w-full text-left text-xs p-2 rounded-lg hover:bg-accent transition-colors border"
                >
                  <p className="font-medium">{cmd.urdu}</p>
                  <p className="text-muted-foreground">{cmd.english}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result + History */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="bg-card rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">📊 AI Response</Label>
                <Button size="sm" variant="ghost" onClick={() => speakText(result.responseUrdu || result.responseEnglish)} className="gap-1">
                  <Volume2 className="h-3.5 w-3.5" /> Play
                </Button>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-medium" dir="rtl">{result.responseUrdu}</p>
                <p className="text-sm text-muted-foreground mt-1">{result.responseEnglish}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">AI understood: <span className="italic">{result.understanding}</span></p>
              </div>

              {result.highlights?.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {result.highlights.map((h: string, i: number) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-sm font-semibold">{h}</p>
                    </div>
                  ))}
                </div>
              )}

              {result.data && typeof result.data === 'object' && Object.keys(result.data).length > 0 && (
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Data Details</p>
                  <div className="space-y-1">
                    {Object.entries(result.data).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : !processing && (
            <div className="bg-muted/20 rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground">
              <Mic className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Speak a command or click an example</p>
              <p className="text-xs mt-1">e.g., "Aaj ki orders dikhao" or "Today's revenue"</p>
            </div>
          )}

          {/* Command History */}
          {commandHistory.length > 0 && (
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1"><History className="h-3.5 w-3.5" /> Command History</Label>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => { setCommandHistory([]); localStorage.removeItem('voice_command_history'); }}>
                  <Trash2 className="h-3 w-3" /> Clear
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {commandHistory.map((h, i) => (
                  <button key={i} onClick={() => { setTranscript(h.command); setResult(h.result); }}
                    className="w-full text-left border rounded-lg p-2.5 hover:bg-accent transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium truncate flex-1">{h.command}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{h.result?.responseEnglish}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
