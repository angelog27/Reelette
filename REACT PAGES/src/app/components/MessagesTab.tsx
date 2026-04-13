import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Send, Users, MessageCircle, Search, X,
} from 'lucide-react';
import {
  getConversations, getMessages, sendMessage,
  createDM, createGroupChat, searchUsers, getUser, timeAgo,
} from '../services/api';
import type { Conversation, Message, SearchUser } from '../services/api';


// ── Helpers ──────────────────────────────────────────────────────


function getConvTitle(conv: Conversation, myUserId: string): string {
  if (conv.type === 'group') return conv.name || 'Group Chat';
  const otherId = conv.members.find(id => id !== myUserId);
  return otherId ? (conv.member_names[otherId] ?? 'Unknown') : 'Unknown';
}


// ── ConversationItem ─────────────────────────────────────────────


interface ConversationItemProps {
  conv: Conversation;
  myUserId: string;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conv, myUserId, isActive, onClick }: ConversationItemProps) {
  const title = getConvTitle(conv, myUserId);
  const isGroup = conv.type === 'group';
  const avatarSeed = encodeURIComponent(title);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
        isActive
          ? 'bg-red-600/20 border border-red-600/40'
          : 'border border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/40'
      }`}
    >
      {isGroup ? (
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
          <Users size={16} className="text-zinc-400" />
        </div>
      ) : (
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
          alt={title}
          className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
          {title}
        </p>
        <p className="text-xs text-zinc-500 truncate">
          {conv.last_message || 'No messages yet'}
        </p>
      </div>
      {isGroup && (
        <span className="text-[10px] text-zinc-600 flex-shrink-0">
          {conv.members.length}
        </span>
      )}
    </button>
  );
}


// ── MessageBubble ────────────────────────────────────────────────


interface MessageBubbleProps {
  msg: Message;
  isMine: boolean;
  showUsername: boolean;
}

function MessageBubble({ msg, isMine, showUsername }: MessageBubbleProps) {
  return (
    <div className={`flex flex-col mb-3 ${isMine ? 'items-end' : 'items-start'}`}>
      {showUsername && (
        <span className="text-xs text-zinc-500 mb-1 px-1">{msg.username}</span>
      )}
      <div
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
          isMine
            ? 'bg-gradient-to-br from-red-700 to-red-600 text-white rounded-br-sm'
            : 'bg-zinc-800 text-zinc-200 border border-zinc-700/40 rounded-bl-sm'
        }`}
      >
        {msg.text}
      </div>
      <span className="text-[10px] text-zinc-600 mt-1 px-1">{timeAgo(msg.created_at)}</span>
    </div>
  );
}


// ── NewChatModal ─────────────────────────────────────────────────


interface NewChatModalProps {
  myUserId: string;
  myUsername: string;
  onClose: () => void;
  onCreate: (convId: string) => void;
}

function NewChatModal({ myUserId, myUsername, onClose, onCreate }: NewChatModalProps) {
  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Debounced user search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const users = await searchUsers(query, myUserId);
      setResults(users.filter(u => !selected.some(s => s.user_id === u.user_id)));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected, myUserId]);

  function addUser(user: SearchUser) {
    if (tab === 'dm') {
      setSelected([user]);
    } else {
      setSelected(prev => [...prev, user]);
    }
    setQuery('');
    setResults([]);
  }

  function removeUser(userId: string) {
    setSelected(prev => prev.filter(u => u.user_id !== userId));
  }

  async function handleCreate() {
    setError('');
    if (selected.length === 0) { setError('Select at least one person.'); return; }
    if (tab === 'group' && !groupName.trim()) { setError('Enter a group name.'); return; }
    setCreating(true);
    let result;
    if (tab === 'dm') {
      result = await createDM(myUserId, myUsername, selected[0].user_id, selected[0].username);
    } else {
      result = await createGroupChat(myUserId, myUsername, selected, groupName.trim());
    }
    setCreating(false);
    if (result.success) {
      onCreate(result.conversation_id);
    } else {
      setError(result.message || 'Failed to create conversation.');
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-medium">New Conversation</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* DM / Group tabs */}
        <div className="flex gap-2 mb-5">
          {(['dm', 'group'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected([]); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {t === 'dm' ? 'Direct Message' : 'Group Chat'}
            </button>
          ))}
        </div>

        {/* Group name input */}
        {tab === 'group' && (
          <input
            type="text"
            placeholder="Group name..."
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 text-sm focus:border-red-600/60 focus:outline-none mb-3"
          />
        )}

        {/* Selected user tags */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selected.map(u => (
              <span
                key={u.user_id}
                className="flex items-center gap-1.5 bg-red-600/20 border border-red-600/40 text-red-300 text-xs px-2.5 py-1 rounded-full"
              >
                {u.username}
                <button onClick={() => removeUser(u.user_id)} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search input (hidden for DM once one user is selected) */}
        {!(tab === 'dm' && selected.length === 1) && (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by username..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder:text-zinc-500 text-sm focus:border-red-600/60 focus:outline-none"
            />
            {results.length > 0 && (
              <div className="absolute w-full top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl z-10">
                {results.map(u => (
                  <button
                    key={u.user_id}
                    onClick={() => addUser(u)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-left"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`}
                      alt={u.username}
                      className="w-7 h-7 rounded-full bg-zinc-800"
                    />
                    <span className="text-sm text-zinc-300">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || selected.length === 0}
            className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
          >
            {creating ? 'Creating…' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── MessagesTab (main) ───────────────────────────────────────────


export function MessagesTab() {
  const user = getUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.conversation_id === activeConvId) ?? null;

  // Load conversations on mount, re-poll every 30 s
  useEffect(() => {
    if (!user) return;
    loadConversations();
    const interval = setInterval(loadConversations, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load + poll messages whenever the active conversation changes
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    loadMessages(activeConvId);
    const interval = setInterval(() => loadMessages(activeConvId), 3_000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    if (!user) return;
    try {
      const convs = await getConversations(user.user_id);
      setConversations(convs);
    } finally {
      setLoadingConvs(false);
    }
  }

  async function loadMessages(convId: string) {
    const msgs = await getMessages(convId);
    setMessages(msgs);
  }

  async function handleSend() {
    if (!user || !activeConvId || !text.trim() || sending) return;
    setSending(true);
    const result = await sendMessage(activeConvId, user.user_id, user.username, text.trim());
    if (result.success) {
      setText('');
      await loadMessages(activeConvId);
      loadConversations();
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewChat(convId: string) {
    setShowNewChat(false);
    if (user) {
      getConversations(user.user_id).then(convs => {
        setConversations(convs);
        setActiveConvId(convId);
      });
    }
  }

  if (!user) {
    return (
      <div className="py-16 text-center text-zinc-500">
        Please log in to use messages.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white relative inline-block">
          Messages
          <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent" />
        </h1>
        <p className="text-zinc-500 mt-4 tracking-wide">
          Direct messages and group chats
        </p>
      </div>

      <div className="flex gap-6" style={{ height: 'calc(100vh - 14rem)' }}>
        {/* ── Left panel: conversation list ─────────────────────────── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
          <button
            onClick={() => setShowNewChat(true)}
            className="flex items-center justify-center gap-2 w-full p-3 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:border-red-600/50 hover:text-white hover:bg-zinc-800/30 transition-all text-sm"
          >
            <Plus size={15} />
            New Conversation
          </button>

          {loadingConvs ? (
            <p className="text-zinc-500 text-sm text-center py-8">Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle size={28} className="mx-auto text-zinc-700 mb-2" />
              <p className="text-zinc-500 text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.conversation_id}
                conv={conv}
                myUserId={user.user_id}
                isActive={conv.conversation_id === activeConvId}
                onClick={() => setActiveConvId(conv.conversation_id)}
              />
            ))
          )}
        </div>

        {/* ── Right panel: chat thread ──────────────────────────────── */}
        {activeConv ? (
          <div className="flex-1 flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800/50 overflow-hidden min-w-0">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/50 flex-shrink-0">
              {activeConv.type === 'group' ? (
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Users size={15} className="text-zinc-400" />
                </div>
              ) : (
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(getConvTitle(activeConv, user.user_id))}`}
                  alt=""
                  className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {getConvTitle(activeConv, user.user_id)}
                </p>
                {activeConv.type === 'group' && (
                  <p className="text-zinc-500 text-xs truncate">
                    {Object.values(activeConv.member_names).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-zinc-600 text-sm">No messages yet — say something!</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.message_id}
                    msg={msg}
                    isMine={msg.user_id === user.user_id}
                    showUsername={
                      activeConv.type === 'group' &&
                      msg.user_id !== user.user_id &&
                      (i === 0 || messages[i - 1].user_id !== msg.user_id)
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3 border-t border-zinc-800/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 text-sm focus:border-red-600/50 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="p-2.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-zinc-900/30 rounded-lg border border-zinc-800/30">
            <div className="text-center">
              <MessageCircle size={40} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <NewChatModal
          myUserId={user.user_id}
          myUsername={user.username}
          onClose={() => setShowNewChat(false)}
          onCreate={handleNewChat}
        />
      )}
    </div>
  );
}
