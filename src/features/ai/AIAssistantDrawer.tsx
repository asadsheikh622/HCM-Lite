import React, { useState } from 'react';
import { api } from '../../services/api';
import { IUser } from '../../types/client';
import { Sparkles, X, Send, Bot, User as UserIcon, Shield, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: IUser;
  onSelectTab?: (tab: string) => void;
  onPrefillLeave?: (data: any) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolsUsed?: string[];
  timestamp: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectTab,
  onPrefillLeave,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `Hello ${currentUser.name}! I am your enterprise HR AI Assistant for HCM Lite. I have real-time access to authorized attendance, leave quotas, payroll calculations, and organizational policies. How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const getQuickPrompts = () => {
    if (currentUser.role === 'admin') {
      return [
        'What is our total headcount across departments?',
        'Give me an attendance summary for today.',
        'Who arrived late today?',
        'Summarize our payroll cost and tax deductions.',
      ];
    }
    if (currentUser.role === 'hr') {
      return [
        'Who is on leave today?',
        'Who arrived late today?',
        'How many pending leave requests need approval?',
        'Search employees in Engineering department',
      ];
    }
    return [
      'How much leave balance do I have remaining?',
      'What are our official office hours and grace period?',
      'Explain the annualized income tax deduction formula',
      'I need 2 days casual leave next Monday for family work',
    ];
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Check if user is asking for natural language leave
      if (
        (text.toLowerCase().includes('leave') || text.toLowerCase().includes('off') || text.toLowerCase().includes('vacation')) &&
        (text.toLowerCase().includes('need') || text.toLowerCase().includes('apply') || text.toLowerCase().includes('want') || text.toLowerCase().includes('request'))
      ) {
        // Attempt smart leave extraction
        const parseRes = await api.parseSmartLeave(text);
        if (parseRes && parseRes.startDate && onPrefillLeave) {
          onPrefillLeave(parseRes);
        }
      }

      const res = await api.askAI(text);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.text,
        toolsUsed: res.toolsUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `AI Assistant Notice: ${err.message || 'Service temporarily unavailable.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl border-l border-zinc-200 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">HCM Lite Assistant</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Role: <span className="text-emerald-400 uppercase font-medium">{currentUser.role}</span> · 7 Tools Active
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FBFBFA]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-zinc-900 text-white rounded-tr-none'
                  : 'bg-white text-zinc-800 border border-zinc-200/80 shadow-xs rounded-tl-none'
              }`}
            >
              {m.sender === 'assistant' && (
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-zinc-100 text-[10px] text-zinc-400">
                  <span className="font-semibold text-zinc-600">Enterprise AI</span>
                  <span>{m.timestamp}</span>
                </div>
              )}

              <p className="whitespace-pre-wrap">{m.text}</p>

              {/* Tool Execution Tags */}
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-zinc-100 flex flex-wrap gap-1">
                  {m.toolsUsed.map((tool, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/50"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{tool}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-500 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span>Consulting database & executing authorized tools...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-zinc-100 bg-white">
        <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider block mb-1.5">
          Suggested Queries
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {getQuickPrompts().map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-[11px] text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-zinc-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about attendance, policies, leave..."
            className="flex-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="mt-1.5 text-[10px] text-zinc-400 text-center">
          AI answers are computed server-side from actual verified records.
        </p>
      </div>
    </div>
  );
};
