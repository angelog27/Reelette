import { Layout } from "./Layout";
import { useState } from "react";
import { Send, Search, X } from "lucide-react";

interface Message {
  id: number;
  text: string;
  sender: "me" | "other";
  timestamp: Date;
}

interface Conversation {
  id: number;
  username: string;
  avatar: string;
  lastMessage: string;
  unread: number;
}

export function Messages() {
  const [conversations] = useState<Conversation[]>([
    { id: 1, username: "MovieBuff42", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop", lastMessage: "Have you seen Inception?", unread: 2 },
    { id: 2, username: "FilmCritic99", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", lastMessage: "That Nolan twist though!", unread: 0 },
    { id: 3, username: "CinemaLover", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop", lastMessage: "Let's watch something tonight", unread: 1 },
    { id: 4, username: "ReelTalk88", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop", lastMessage: "The ending was amazing!", unread: 0 },
    { id: 5, username: "PopcornKing", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", lastMessage: "What did you think?", unread: 0 },
  ]);

  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hey! Did you see The Dark Knight yet?", sender: "other", timestamp: new Date(2026, 2, 2, 14, 30) },
    { id: 2, text: "Yes! It was incredible! Heath Ledger's performance was phenomenal", sender: "me", timestamp: new Date(2026, 2, 2, 14, 32) },
    { id: 3, text: "Right?? Best villain performance ever", sender: "other", timestamp: new Date(2026, 2, 2, 14, 33) },
    { id: 4, text: "Have you seen Inception?", sender: "other", timestamp: new Date(2026, 2, 2, 15, 45) },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      const message: Message = {
        id: messages.length + 1,
        text: newMessage,
        sender: "me",
        timestamp: new Date(),
      };
      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConvData = conversations.find(c => c.id === selectedConversation);

  return (
    <Layout>
      <div className="absolute bg-[#383232] h-[750px] left-[58px] top-[238px] w-[1324px] overflow-hidden z-0 flex">
        
        {/* Conversations List - Left Panel */}
        <div className="w-[380px] bg-[#2a2424] border-r border-gray-600 flex flex-col">
          <div className="p-4 border-b border-gray-600">
            <h2 className="font-['Rock_Salt:Regular',sans-serif] text-white text-[28px] mb-4">
              Messages
            </h2>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[14px] px-4 py-2 pl-10 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 cursor-pointer transition-colors border-b border-gray-700 hover:bg-[#383232] ${
                  selectedConversation === conv.id ? 'bg-[#383232]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={conv.avatar}
                    alt={conv.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] truncate">
                        {conv.username}
                      </h3>
                      {conv.unread > 0 && (
                        <span className="bg-[#8d0000] text-white text-[12px] rounded-full w-5 h-5 flex items-center justify-center font-['Luxurious_Roman:Regular',sans-serif]">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <p className="font-['Luxurious_Roman:Regular',sans-serif] text-gray-400 text-[14px] truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Thread - Right Panel */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-[#2a2424] border-b border-gray-600 flex items-center gap-3">
                <img
                  src={selectedConvData?.avatar}
                  alt={selectedConvData?.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <h3 className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[20px]">
                  {selectedConvData?.username}
                </h3>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.sender === "me"
                          ? "bg-[#8d0000] text-white"
                          : "bg-[#2a2424] text-white"
                      }`}
                    >
                      <p className="font-['Luxurious_Roman:Regular',sans-serif] text-[15px] break-words">
                        {message.text}
                      </p>
                      <p className="font-['Luxurious_Roman:Regular',sans-serif] text-[11px] text-gray-300 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 bg-[#2a2424] border-t border-gray-600">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[15px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-[#8d0000] hover:bg-[#6d0000] text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-['Luxurious_Roman:Regular',sans-serif] text-gray-400 text-[18px]">
                Select a conversation to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
