import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, ArrowLeft, Search, X } from 'lucide-react';
import {
  getConversations, openConversation, getDirectMessages, sendDirectMessage,
  markConversationRead, searchUsers, timeAgo, getUser,
  type Conversation, type DirectMessage, type Friend,
} from '../services/api';
import { db, signInFirebase } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

function dicebear(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

interface NewDMUser { user_id: string; username: string; displayName: string; }

export function MessagesPanel({ friends }: { friends: Friend[] }) {
  const me = getUser();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newDMQuery, setNewDMQuery] = useState('');
  const [newDMResults, setNewDMResults] = useState<NewDMUser[]>([]);
  const [showNewDM, setShowNewDM] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const totalUnread = conversations.reduce((sum, c) => {
    return sum + (me ? (c.unread[me.user_id] ?? 0) : 0);
  }, 0);

  // Load conversation list whenever panel opens
  useEffect(() => {
    if (!open || !me) return;
    getConversations(me.user_id).then(setConversations);
  }, [open]);

  // Real-time messages for the active conversation
  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    if (!activeConv || !me) return;

    // Fetch initial messages immediately via REST
    getDirectMessages(activeConv.conversation_id).then(setMessages);

    // Then upgrade to real-time onSnapshot
    (async () => {
      const authed = await signInFirebase();
      if (!authed) return;
      const q = query(
        collection(db, 'conversations', activeConv.conversation_id, 'messages'),
        orderBy('sent_at', 'asc'),
        limit(50),
      );
      unsubRef.current = onSnapshot(q, snap => {
        const msgs: DirectMessage[] = snap.docs.map(d => ({
          message_id: d.id,
          ...(d.data() as Omit<DirectMessage, 'message_id'>),
          sent_at: d.data().sent_at?.toDate?.()?.toISOString?.() ?? d.data().sent_at ?? '',
        }));
        setMessages(msgs);
      });
    })();

    // Mark read
    markConversationRead(activeConv.conversation_id, me.user_id);
    setConversations(prev =>
      prev.map(c => c.conversation_id === activeConv.conversation_id
        ? { ...c, unread: { ...c.unread, [me.user_id]: 0 } }
        : c)
    );

    return () => { unsubRef.current?.(); unsubRef.current = null; };
  }, [activeConv?.conversation_id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !activeConv || !me || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    try {
      await sendDirectMessage(activeConv.conversation_id, me.user_id, text);
      // onSnapshot will update the list; also refresh conversation preview
      setConversations(prev =>
        prev.map(c => c.conversation_id === activeConv.conversation_id
          ? { ...c, last_message: text, last_sender_id: me.user_id }
          : c)
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [draft, activeConv, me, sending]);

  const handleNewDMSearch = useCallback(async (q: string) => {
    setNewDMQuery(q);
    if (!q.trim() || !me) { setNewDMResults([]); return; }
    const results = await searchUsers(q, me.user_id);
    setNewDMResults(results.slice(0, 6));
  }, [me]);

  const handleOpenDM = useCallback(async (target: NewDMUser) => {
    if (!me) return;
    setShowNewDM(false);
    setNewDMQuery('');
    setNewDMResults([]);
    const res = await openConversation(me.user_id, target.user_id, me.username, target.username);
    if (!res.success) return;
    await getConversations(me.user_id).then(setConversations);
    const conv: Conversation = {
      conversation_id: res.conversation_id,
      participants: [me.user_id, target.user_id],
      usernames: { [me.user_id]: me.username, [target.user_id]: target.username },
      last_message: '',
      last_sender_id: '',
      updated_at: new Date().toISOString(),
      unread: { [me.user_id]: 0, [target.user_id]: 0 },
    };
    setActiveConv(conv);
  }, [me]);

  if (!me) return null;

  return (
    <div className="sticky top-[76px]">
      {/* Collapsed button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-2xl hover:border-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#C0392B]" />
            <span className="text-sm font-semibold text-white">Messages</span>
          </div>
          {totalUnread > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-[#C0392B] text-white text-[10px] font-bold rounded-full">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col" style={{ height: 520 }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] shrink-0">
            {activeConv ? (
              <button
                onClick={() => setActiveConv(null)}
                className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {activeConv.usernames[activeConv.participants.find(p => p !== me.user_id) ?? '']}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#C0392B]" />
                <span className="text-sm font-semibold text-white">Messages</span>
                {totalUnread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#C0392B] text-white text-[10px] font-bold rounded-full">
                    {totalUnread}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1">
              {!activeConv && (
                <button
                  onClick={() => setShowNewDM(v => !v)}
                  title="New message"
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.07] transition-colors text-gray-400 hover:text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setActiveConv(null); setShowNewDM(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.07] transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* New DM search */}
          {!activeConv && showNewDM && (
            <div className="px-3 py-2 border-b border-[#1e1e1e] shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                <input
                  autoFocus
                  value={newDMQuery}
                  onChange={e => handleNewDMSearch(e.target.value)}
                  placeholder="Search for a user…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C0392B]/50"
                />
              </div>
              {newDMResults.length > 0 && (
                <div className="mt-1 bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                  {newDMResults.map(u => (
                    <button
                      key={u.user_id}
                      onClick={() => handleOpenDM(u)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1C1C1C] transition-colors text-left border-b border-[#2A2A2A] last:border-0"
                    >
                      <img src={dicebear(u.username)} alt={u.username} className="w-7 h-7 rounded-full bg-[#141414]" />
                      <div>
                        <p className="text-white text-xs font-medium">{u.displayName}</p>
                        <p className="text-gray-500 text-[10px]">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversation list */}
          {!activeConv && (
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                  <MessageCircle className="w-8 h-8 text-gray-700" />
                  <p className="text-gray-500 text-sm">No messages yet.</p>
                  <p className="text-gray-600 text-xs">Hit the send icon above to start a conversation.</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const otherId = conv.participants.find(p => p !== me.user_id) ?? '';
                  const otherName = conv.usernames[otherId] ?? 'Unknown';
                  const unread = conv.unread[me.user_id] ?? 0;
                  return (
                    <button
                      key={conv.conversation_id}
                      onClick={() => setActiveConv(conv)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors border-b border-[#1e1e1e] last:border-0 text-left"
                    >
                      <img src={dicebear(otherName)} alt={otherName} className="w-9 h-9 rounded-full bg-[#141414] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-sm truncate ${unread > 0 ? 'text-white font-semibold' : 'text-gray-300'}`}>
                            @{otherName}
                          </span>
                          {conv.updated_at && (
                            <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(conv.updated_at)}</span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                          {conv.last_sender_id === me.user_id ? 'You: ' : ''}{conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#C0392B] text-white text-[10px] font-bold rounded-full">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Message thread */}
          {activeConv && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-600 text-sm">Say hello!</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMine = msg.sender_id === me.user_id;
                  return (
                    <div key={msg.message_id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                          isMine
                            ? 'bg-[#C0392B] text-white rounded-br-sm'
                            : 'bg-[#1e1e1e] text-gray-200 rounded-bl-sm'
                        }`}
                      >
                        <p>{msg.text}</p>
                        {msg.sent_at && (
                          <p className={`text-[9px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-600'}`}>
                            {timeAgo(msg.sent_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 px-3 py-2.5 border-t border-[#1e1e1e] flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message…"
                  className="flex-1 bg-[#1a1a1a] border border-[#2A2A2A] rounded-full px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C0392B]/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#C0392B] hover:bg-[#E74C3C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
