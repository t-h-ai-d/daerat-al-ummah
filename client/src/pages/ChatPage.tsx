import { useAuth } from "@/_core/hooks/useAuth";
import PlatformShell from "@/components/PlatformShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageCircleMore, Send, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

function initials(value?: string | null) {
  return (value || "أ").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const conversations = trpc.chat.conversations.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 12_000 });
  const messages = trpc.chat.messages.useQuery({ conversationId: activeConversationId ?? 0 }, { enabled: isAuthenticated && !!activeConversationId, refetchInterval: 8_000 });
  const start = trpc.chat.start.useMutation({ onSuccess: async result => { setActiveConversationId(result.conversationId); setUsername(""); await utils.chat.conversations.invalidate(); } });
  const send = trpc.chat.send.useMutation({ onSuccess: async () => { setDraft(""); await Promise.all([utils.chat.messages.invalidate(), utils.chat.conversations.invalidate()]); } });

  useEffect(() => {
    if (!activeConversationId && conversations.data?.[0]) setActiveConversationId(conversations.data[0].conversationId);
  }, [activeConversationId, conversations.data]);

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation("/auth");
  }, [isAuthenticated, loading, setLocation]);

  if (!loading && !isAuthenticated) {
    return null;
  }

  const selected = conversations.data?.find(item => item.conversationId === activeConversationId);
  return <PlatformShell><main dir="rtl" lang="ar" className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8"><div className="mb-6"><p className="text-[11px] font-bold tracking-[0.18em] text-[#9d7b27]">تواصل بوضوح وأدب</p><h1 className="mt-1 font-display text-3xl font-semibold text-[#153e33]">الرسائل الخاصة</h1><p className="mt-2 text-sm text-[#6b8578]">رسائل شخصية بين أعضاء الدائرة. استخدم @اسم_المستخدم لذكر شخص باحترام.</p></div><section className="grid min-h-[620px] overflow-hidden rounded-[24px] border border-[#dae5da] bg-white shadow-[0_16px_44px_rgba(18,62,47,0.06)] md:grid-cols-[320px_minmax(0,1fr)]"><aside className="border-l border-[#e7ede5] bg-[#fbfcf9]"><div className="border-b border-[#e7ede5] p-4"><form onSubmit={event => { event.preventDefault(); if (username.trim()) start.mutate({ username: username.trim() }); }}><label className="mb-2 block text-xs font-bold text-[#315648]">ابدأ محادثة جديدة</label><div className="flex gap-2"><Input value={username} onChange={event => setUsername(event.target.value)} placeholder="اسم المستخدم" className="h-10 rounded-xl text-right" /><Button type="submit" disabled={start.isPending} className="h-10 shrink-0 rounded-xl bg-[#0d4937] px-3 hover:bg-[#175443]"><UserPlus size={17} /></Button></div>{start.error && <p className="mt-2 text-[11px] font-semibold text-[#a34c35]">{start.error.message}</p>}</form></div><ScrollArea className="h-[510px]"><div className="p-2">{conversations.isLoading ? <div className="grid place-items-center py-10 text-[#729083]"><Loader2 className="animate-spin" /></div> : conversations.data?.length ? conversations.data.map(conversation => <button key={conversation.conversationId} onClick={() => setActiveConversationId(conversation.conversationId)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-right transition-colors ${activeConversationId === conversation.conversationId ? "bg-[#e5f0e5]" : "hover:bg-[#f0f5ef]"}`}><Avatar className="h-10 w-10"><AvatarFallback className="bg-[#e5c968] text-xs font-bold text-[#173e33]">{initials(conversation.other?.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#23483b]">{conversation.other?.name || "عضو الدائرة"}</span><span className="mt-0.5 block truncate text-xs text-[#769083]">{conversation.latest?.content || "ابدأ محادثة هادئة"}</span></span></button>) : <p className="px-5 py-10 text-center text-xs leading-5 text-[#789084]">لا توجد محادثات بعد. اكتب اسم مستخدم عضو لبدء تواصل محترم.</p>}</div></ScrollArea></aside><div className="flex min-h-0 flex-col"><header className="flex min-h-[81px] items-center gap-3 border-b border-[#e8eee7] px-5"><Avatar className="h-10 w-10"><AvatarFallback className="bg-[#e5c968] text-xs font-bold text-[#173e33]">{initials(selected?.other?.name)}</AvatarFallback></Avatar><div><h2 className="text-sm font-bold text-[#23483b]">{selected?.other?.name || "اختر محادثة"}</h2>{selected?.other?.username && <p className="mt-0.5 text-xs text-[#789083]">@{selected.other.username}</p>}</div></header><ScrollArea className="min-h-0 flex-1 bg-[#f8faf6]"><div className="space-y-3 p-5">{!activeConversationId ? <div className="grid min-h-[380px] place-items-center text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f0e5] text-[#176047]"><MessageCircleMore size={25} /></span><h3 className="mt-4 font-display text-xl font-semibold text-[#24483b]">تواصل بنية طيبة</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#789084]">اختر محادثة أو ابدأ واحدة باسم مستخدم عضو في الدائرة.</p></div></div> : messages.isLoading ? <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#5c8270]" /></div> : messages.data?.map(row => { const mine = row.message.senderId === user?.id; return <div key={row.message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-tr-sm bg-[#0d4937] text-white" : "rounded-tl-sm border border-[#dfe9dd] bg-white text-[#365b4e]"}`}><p dir="auto" className="arabic-content whitespace-pre-wrap">{row.message.content}</p><p className={`mt-1 text-[10px] ${mine ? "text-[#b9d2c3]" : "text-[#82958b]"}`}>{new Date(row.message.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</p></div></div>; })}</div></ScrollArea><Separator /><form onSubmit={event => { event.preventDefault(); if (activeConversationId && draft.trim()) send.mutate({ conversationId: activeConversationId, content: draft.trim() }); }} className="flex gap-3 p-4"><Textarea dir="auto" value={draft} onChange={event => setDraft(event.target.value)} disabled={!activeConversationId || send.isPending} placeholder="اكتب رسالة باحترام…" className="min-h-11 resize-none rounded-xl py-3 text-right" /><Button type="submit" disabled={!draft.trim() || !activeConversationId || send.isPending} className="h-11 shrink-0 rounded-xl bg-[#0d4937] px-4 hover:bg-[#175443]"><Send size={17} /><span className="hidden sm:inline">إرسال</span></Button></form></div></section></main></PlatformShell>;
}
