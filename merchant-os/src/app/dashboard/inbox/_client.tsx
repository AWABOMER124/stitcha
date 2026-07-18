'use client';
import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/lib/i18n/context';

type Message = { id: string; content: string; isFromCustomer: boolean; senderName: string | null; sentAt: string };
type Conversation = { id: string; customerName: string | null; customerPhone: string | null; channel: string; status: string; createdAt: string; updatedAt: string; messages: Message[] };

const CHANNEL_ICONS: Record<string, string> = { WEB: '🌐', WHATSAPP: '💬', MESSENGER: '📘', INSTAGRAM: '📸' };
const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-stone-100 text-stone-600',
};

export function InboxClient({ conversations: initial, merchantId }: { conversations: Conversation[]; merchantId: string }) {
  const { dict, locale } = useLocale();
  const t = dict.inboxPage;
  const dateLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
  const [conversations, setConversations] = useState(initial);
  const [selected, setSelected] = useState<Conversation | null>(initial[0] ?? null);
  const [messages, setMessages] = useState<Message[]>(initial[0]?.messages ?? []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadConversation(conv: Conversation) {
    setSelected(conv);
    try {
      const res = await fetch(`/api/inbox/${conv.id}/messages`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      else setMessages(conv.messages);
    } catch { setMessages(conv.messages); }
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    setSuggestError('');
    try {
      const res = await fetch(`/api/inbox/${selected.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        setReply('');
        if (data.deliveryError) setSuggestError(`${t.savedButFailedPrefix} ${data.deliveryError}`);
      }
    } catch {}
    setSending(false);
  }

  async function suggestReply() {
    if (!selected) return;
    setSuggesting(true);
    setSuggestError('');
    try {
      const res = await fetch(`/api/inbox/${selected.id}/suggest-reply`, { method: 'POST' });
      const data = await res.json();
      if (data.suggestion) setReply(data.suggestion);
      else setSuggestError(data.error ?? t.suggestFailed);
    } catch {
      setSuggestError(t.suggestFailed);
    }
    setSuggesting(false);
  }

  const filtered = conversations.filter(c => filter === 'ALL' || c.status === filter);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-l border-[var(--border)] flex flex-col bg-[var(--card)]">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="font-bold text-[var(--foreground)] text-lg">{t.title}</h1>
          <div className="flex gap-1 mt-3">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)] hover:bg-[var(--background)]'}`}>
                {f === 'ALL' ? t.filterAll : f === 'OPEN' ? t.filterOpen : t.filterClosed}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">{t.emptyConversations}</p>
            </div>
          )}
          {filtered.map(conv => (
            <button key={conv.id} onClick={() => loadConversation(conv)} className={`w-full text-right px-4 py-3 hover:bg-[var(--background)] transition-colors ${selected?.id === conv.id ? 'bg-[var(--background)] border-r-2 border-r-[var(--primary)]' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{CHANNEL_ICONS[conv.channel] ?? '💬'}</span>
                    <span className="font-semibold text-sm text-[var(--foreground)] truncate">{conv.customerName ?? t.unknownCustomer}</span>
                  </div>
                  {conv.messages[0] && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{conv.messages[0].content}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[conv.status] ?? 'bg-stone-100 text-stone-600'}`}>{t.statuses[conv.status as keyof typeof t.statuses] ?? conv.status}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{new Date(conv.updatedAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
            <div>
              <p className="font-bold text-[var(--foreground)]">{selected.customerName ?? t.customer}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{selected.customerPhone ?? ''} · {CHANNEL_ICONS[selected.channel]} {selected.channel}</p>
            </div>
            <button onClick={async () => {
              await fetch(`/api/inbox/${selected.id}/close`, { method: 'POST' }).catch(() => {});
              setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, status: 'CLOSED' } : c));
              setSelected(s => s ? { ...s, status: 'CLOSED' } : s);
            }} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--background)] transition-colors">
              {t.closeConversation}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isFromCustomer ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.isFromCustomer ? 'bg-[var(--primary)] text-white rounded-tl-sm' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-tr-sm'}`}>
                  {!msg.isFromCustomer && <p className="text-xs font-bold text-[var(--muted-foreground)] mb-1">{t.you}</p>}
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.isFromCustomer ? 'text-white/60' : 'text-[var(--muted-foreground)]'}`}>{new Date(msg.sentAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply */}
          {selected.status !== 'CLOSED' ? (
            <div className="border-t border-[var(--border)] bg-[var(--card)]">
              {suggestError && <p className="px-4 pt-2 text-xs text-red-600">{suggestError}</p>}
              <div className="px-4 py-3 flex gap-3">
                <button
                  onClick={suggestReply}
                  disabled={suggesting || messages.length === 0}
                  title={t.suggestReplyTitle}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--background)] disabled:opacity-50 shrink-0"
                >
                  {suggesting ? t.suggestReplyLoading : t.suggestReplyButton}
                </button>
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendReply())} placeholder={t.inputPlaceholder} className="flex-1 border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--background)] text-[var(--foreground)] outline-none focus:border-[var(--primary)]" />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm disabled:opacity-50">{t.send}</button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-[var(--border)] bg-stone-50 text-center text-sm text-[var(--muted-foreground)]">{t.conversationClosed}</div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
          <div className="text-center"><div className="text-6xl mb-3">💬</div><p>{t.selectConversation}</p></div>
        </div>
      )}
    </div>
  );
}
