import { useAuth } from "@/_core/hooks/useAuth";
import EmojiPicker from "@/components/EmojiPicker";
import PlatformShell from "@/components/PlatformShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ImagePlus,
  Loader2,
  MessageCircleMore,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function initials(value?: string | null) {
  return (value || "أ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}
function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("تَعَذَّرَتْ قِراءَةُ المُرْفَقِ."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [draft, setDraft] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: number;
    content: string;
    senderName?: string | null;
  } | null>(null);
  const [attachment, setAttachment] = useState<{
    url: string;
    filename: string;
    kind: "gif" | "image" | "video" | "file";
    mimeType: string;
  } | null>(null);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const conversations = trpc.chat.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 12_000,
  });
  const messages = trpc.chat.messages.useQuery(
    { conversationId: activeConversationId ?? 0 },
    {
      enabled: isAuthenticated && Boolean(activeConversationId),
      refetchInterval: 8_000,
    }
  );
  const messageSearch = trpc.chat.search.useQuery(
    { conversationId: activeConversationId ?? 0, query: messageQuery.trim() },
    {
      enabled:
        isAuthenticated &&
        Boolean(activeConversationId) &&
        messageQuery.trim().length > 0,
    }
  );
  const start = trpc.chat.start.useMutation({
    onSuccess: async result => {
      setActiveConversationId(result.conversationId);
      setUsername("");
      await utils.chat.conversations.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const createGroup = trpc.chat.createGroup.useMutation({
    onSuccess: async result => {
      setActiveConversationId(result.conversationId);
      setGroupName("");
      setGroupMembers("");
      await utils.chat.conversations.invalidate();
      toast.success("أُنشِئَتِ المجموعة.");
    },
    onError: error => toast.error(error.message),
  });
  const uploadAttachment = trpc.social.uploadAttachment.useMutation({
    onError: error => toast.error(error.message),
  });
  const send = trpc.chat.send.useMutation({
    onSuccess: async () => {
      setDraft("");
      setReplyTo(null);
      setAttachment(null);
      await Promise.all([
        utils.chat.messages.invalidate(),
        utils.chat.conversations.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const deleteMessage = trpc.chat.deleteMessage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.chat.messages.invalidate(),
        utils.chat.conversations.invalidate(),
      ]);
      toast.success("حُذِفَت رسالتك.");
    },
    onError: error => toast.error(error.message),
  });
  const deleteConversation = trpc.chat.deleteConversation.useMutation({
    onSuccess: async () => {
      setActiveConversationId(null);
      await Promise.all([
        utils.chat.messages.invalidate(),
        utils.chat.conversations.invalidate(),
      ]);
      toast.success("حُذِفَت المحادثة من قائمتك فقط.");
    },
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    if (!activeConversationId && conversations.data?.[0])
      setActiveConversationId(conversations.data[0].conversationId);
  }, [activeConversationId, conversations.data]);
  useEffect(() => {
    setMessageQuery("");
  }, [activeConversationId]);
  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation("/auth");
  }, [isAuthenticated, loading, setLocation]);
  if (!loading && !isAuthenticated) return null;
  const selected = conversations.data?.find(
    item => item.conversationId === activeConversationId
  );
  const selectAttachment = async (file?: File) => {
    if (!file) return;
    if (file.size > 1_000_000_000)
      return toast.error("يجب ألا يتجاوز المرفق 1 غيغابايت.");
    try {
      const stored = await uploadAttachment.mutateAsync({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64: await readFile(file),
      });
      if (!["gif", "image", "video", "file"].includes(stored.kind))
        throw new Error("نوع المرفق غير مدعوم.");
      setAttachment({
        url: stored.url,
        filename: stored.filename,
        kind: stored.kind as "gif" | "image" | "video" | "file",
        mimeType: file.type || "application/octet-stream",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تَعَذَّرَ رَفْعُ المُرْفَقِ."
      );
    }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeConversationId || (!draft.trim() && !attachment)) return;
    send.mutate({
      conversationId: activeConversationId,
      content: draft.trim(),
      ...(replyTo ? { replyToMessageId: replyTo.id } : {}),
      ...(attachment
        ? {
            attachmentUrl: attachment.url,
            attachmentKind: attachment.kind,
            attachmentMimeType: attachment.mimeType,
          }
        : {}),
    });
  };
  const eraseConversation = (conversationId: number) => {
    if (
      window.confirm(
        "سيُزال هذا الحوار من قائمتك فقط، ولن تُحذف رسائل الطرف الآخر. هل تتابع؟"
      )
    )
      deleteConversation.mutate({ conversationId });
  };

  return (
    <PlatformShell>
      <main
        dir="rtl"
        lang="ar"
        className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8"
      >
        <div className="mb-6">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#9d7b27]">
            تَواصَلْ بِوُضوحٍ وأَدَب
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[#153e33]">
            الرَّسائِلُ الخاصّة
          </h1>
          <p className="mt-2 text-sm text-[#6b8578]">
            رسائل شخصية بين أعضاء الدائرة. يمكنك حذف رسائلك أو إخفاء محادثة من
            قائمتك في أيّ وقت.
          </p>
        </div>
        <section className="grid min-h-[620px] overflow-hidden rounded-[24px] border border-[#dae5da] bg-white shadow-[0_16px_44px_rgba(18,62,47,0.06)] md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-l border-[#e7ede5] bg-[#fbfcf9]">
            <div className="border-b border-[#e7ede5] p-4">
              <form
                onSubmit={event => {
                  event.preventDefault();
                  if (username.trim())
                    start.mutate({ username: username.trim() });
                }}
              >
                <label className="mb-2 block text-xs font-bold text-[#315648]">
                  اِبْدَأْ مُحادَثَةً جَديدَة
                </label>
                <div className="flex gap-2">
                  <Input
                    value={username}
                    onChange={event => setUsername(event.target.value)}
                    placeholder="اِسْمُ المُسْتَخْدِم"
                    className="h-10 rounded-xl text-right"
                  />
                  <Button
                    type="submit"
                    disabled={start.isPending}
                    className="h-10 shrink-0 rounded-xl bg-[#0d4937] px-3 hover:bg-[#175443]"
                  >
                    <UserPlus size={17} />
                  </Button>
                </div>
              </form>
              <form
                className="mt-4 border-t border-[#e7eee5] pt-4"
                onSubmit={event => {
                  event.preventDefault();
                  const usernames = groupMembers
                    .split(",")
                    .map(value => value.trim())
                    .filter(Boolean);
                  createGroup.mutate({ name: groupName, usernames });
                }}
              >
                <label className="mb-2 block text-xs font-bold text-[#315648]">
                  أَنْشِئْ مَجْمُوعَةً
                </label>
                <Input
                  value={groupName}
                  onChange={event => setGroupName(event.target.value)}
                  placeholder="اِسْمُ المَجْمُوعَة"
                  className="h-10 rounded-xl text-right"
                />
                <Input
                  value={groupMembers}
                  onChange={event => setGroupMembers(event.target.value)}
                  placeholder="أسماء المستخدمين بفواصل"
                  className="mt-2 h-10 rounded-xl text-right"
                />
                <Button
                  type="submit"
                  disabled={createGroup.isPending}
                  variant="outline"
                  className="mt-2 h-10 w-full rounded-xl border-[#b9d2be] text-[#155a40]"
                >
                  {createGroup.isPending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  إِنْشَاءُ مَجْمُوعَة
                </Button>
              </form>
            </div>
            <ScrollArea className="h-[510px]">
              <div className="p-2">
                {conversations.isLoading ? (
                  <div className="grid place-items-center py-10 text-[#729083]">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : conversations.data?.length ? (
                  conversations.data.map(conversation => (
                    <div
                      key={conversation.conversationId}
                      className={`group flex items-center gap-1 rounded-xl ${activeConversationId === conversation.conversationId ? "bg-[#e5f0e5]" : "hover:bg-[#f0f5ef]"}`}
                    >
                      <button
                        onClick={() =>
                          setActiveConversationId(conversation.conversationId)
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 text-right"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#e5c968] text-xs font-bold text-[#173e33]">
                            {initials(conversation.other?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[#23483b]">
                            {conversation.other?.name || "عُضْوُ الدَّائِرَة"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[#769083]">
                            {conversation.latest?.content ||
                              (conversation.latest?.attachmentKind === "gif"
                                ? "أرْسَلَ ملفَّ GIF"
                                : "اِبْدَأْ مُحادَثَةً هادِئَة")}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          eraseConversation(conversation.conversationId)
                        }
                        disabled={deleteConversation.isPending}
                        className="ml-1 rounded-lg p-2 text-[#9a6758] opacity-70 hover:bg-[#fff0ee] hover:text-[#a04e38] group-hover:opacity-100"
                        aria-label="حَذْفُ المُحادَثَة"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-10 text-center text-xs leading-5 text-[#789084]">
                    لا توجد محادثات بعد. اكتب اسم مستخدم عضو لبدء تواصل محترم.
                  </p>
                )}
              </div>
            </ScrollArea>
          </aside>
          <div className="flex min-h-0 flex-col">
            <header className="flex min-h-[81px] items-center gap-3 border-b border-[#e8eee7] px-5">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[#e5c968] text-xs font-bold text-[#173e33]">
                  {initials(selected?.other?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[#23483b]">
                  {selected?.other?.name || "اِخْتَرْ مُحادَثَة"}
                </h2>
                {selected?.other?.username && (
                  <p className="mt-0.5 text-xs text-[#789083]">
                    @{selected.other.username}
                  </p>
                )}
              </div>
              {activeConversationId && (
                <div className="hidden min-w-[220px] items-center gap-2 rounded-xl border border-[#dce8dc] bg-[#f7faf6] px-2 md:flex">
                  <Search size={15} className="text-[#6b8578]" />
                  <Input
                    value={messageQuery}
                    onChange={event => setMessageQuery(event.target.value)}
                    placeholder="اِبْحَثْ في الرَّسائِل"
                    className="h-8 border-0 bg-transparent p-0 text-right text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              )}
              {activeConversationId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => eraseConversation(activeConversationId)}
                  disabled={deleteConversation.isPending}
                  className="rounded-xl border-[#ecd8d1] text-xs text-[#9a503d] hover:bg-[#fff4f1]"
                >
                  <Trash2 size={15} />
                  حَذْفُ المُحادَثَة
                </Button>
              )}
            </header>
            <ScrollArea className="min-h-0 flex-1 bg-[#f8faf6]">
              <div className="space-y-3 p-5">
                {messageQuery.trim() && (
                  <section className="rounded-2xl border border-[#dce8dc] bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold text-[#315648]">
                        نَتائِجُ البَحْث
                      </p>
                      <span className="text-[10px] text-[#789084]">
                        {messageSearch.isLoading
                          ? "جارٍ البحث…"
                          : `${messageSearch.data?.length ?? 0} نتيجة`}
                      </span>
                    </div>
                    {messageSearch.data?.length ? (
                      <div className="space-y-2">
                        {messageSearch.data.map(row => (
                          <button
                            type="button"
                            key={`search-${row.message.id}`}
                            onClick={() =>
                              setReplyTo({
                                id: row.message.id,
                                content: row.message.content || "مُرْفَقٌ",
                                senderName: row.senderName,
                              })
                            }
                            className="block w-full rounded-xl bg-[#f7faf6] p-2 text-right text-xs hover:bg-[#edf4eb]"
                          >
                            <span className="font-bold text-[#315648]">
                              {row.senderName || row.senderUsername || "عُضْوٌ"}
                            </span>
                            <span className="mt-1 block truncate text-[#6b8578]">
                              {row.message.content || "مُرْفَقٌ"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      !messageSearch.isLoading && (
                        <p className="text-xs text-[#789084]">لا توجد نتائج.</p>
                      )
                    )}
                  </section>
                )}
                {!activeConversationId ? (
                  <div className="grid min-h-[380px] place-items-center text-center">
                    <div>
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f0e5] text-[#176047]">
                        <MessageCircleMore size={25} />
                      </span>
                      <h3 className="mt-4 font-display text-xl font-semibold text-[#24483b]">
                        تَواصَلْ بِنِيَّةٍ طَيِّبَة
                      </h3>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-[#789084]">
                        اختر محادثة أو ابدأ واحدة باسم مستخدم عضو في الدائرة.
                      </p>
                    </div>
                  </div>
                ) : messages.isLoading ? (
                  <div className="grid place-items-center py-20">
                    <Loader2 className="animate-spin text-[#5c8270]" />
                  </div>
                ) : (
                  messages.data?.map(row => {
                    const mine = row.message.senderId === user?.id;
                    return (
                      <div
                        key={row.message.id}
                        className={`group flex ${mine ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`relative max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-tr-sm bg-[#0d4937] text-white" : "rounded-tl-sm border border-[#dfe9dd] bg-white text-[#365b4e]"}`}
                        >
                          {row.message.replyToMessageId && (
                            <div
                              className={`mb-2 rounded-lg border-r-2 px-2 py-1 text-[11px] ${mine ? "border-[#d7e8d7] bg-white/10 text-[#d5e8d9]" : "border-[#9abda5] bg-[#f1f6ef] text-[#6b8578]"}`}
                            >
                              رَدٌّ على رسالة سابقة
                            </div>
                          )}
                          {row.message.attachmentUrl &&
                            (row.message.attachmentKind === "gif" ||
                              row.message.attachmentKind === "image") && (
                              <img
                                src={row.message.attachmentUrl}
                                alt="مُرْفَقٌ في الرِّسالَةِ"
                                className="mb-2 max-h-72 w-full rounded-xl object-contain"
                              />
                            )}
                          {row.message.attachmentUrl &&
                            row.message.attachmentKind === "video" && (
                              <video
                                src={row.message.attachmentUrl}
                                controls
                                className="mb-2 max-h-72 w-full rounded-xl"
                              />
                            )}
                          {row.message.attachmentUrl &&
                            row.message.attachmentKind === "file" && (
                              <a
                                href={row.message.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mb-2 block rounded-xl bg-white/10 px-3 py-2 underline"
                              >
                                فَتْحُ المُرْفَقِ
                              </a>
                            )}
                          {row.message.content && (
                            <p
                              dir="auto"
                              className="arabic-content whitespace-pre-wrap"
                            >
                              {row.message.content}
                            </p>
                          )}
                          <div className="mt-1 flex items-center justify-between gap-4">
                            <p
                              className={`text-[10px] ${mine ? "text-[#b9d2c3]" : "text-[#82958b]"}`}
                            >
                              {new Date(
                                row.message.createdAt
                              ).toLocaleTimeString("ar", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setReplyTo({
                                  id: row.message.id,
                                  content: row.message.content || "مُرْفَقٌ",
                                  senderName: row.senderName,
                                })
                              }
                              className={`rounded p-1 ${mine ? "text-[#c4d8cd] hover:bg-white/10 hover:text-white" : "text-[#789084] hover:bg-[#edf4eb]"}`}
                              aria-label="الرَّدُّ على الرسالة"
                            >
                              ↩
                            </button>
                            {mine && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm("هل تريد حذف رسالتك؟"))
                                    deleteMessage.mutate({
                                      messageId: row.message.id,
                                    });
                                }}
                                disabled={deleteMessage.isPending}
                                className="rounded p-1 text-[#c4d8cd] hover:bg-white/10 hover:text-white"
                                aria-label="حَذْفُ رِسالَتِكَ"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            <Separator />
            <form onSubmit={submit} className="p-4">
              {replyTo && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#dce8dc] bg-[#f7faf6] px-3 py-2 text-xs text-[#476c5d]">
                  <span className="min-w-0 flex-1 truncate">
                    رَدٌّ على: {replyTo.content}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="rounded-lg p-1 text-[#8b5448] hover:bg-[#fff0ee]"
                    aria-label="إلغاء الرد"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              <input
                ref={attachmentInput}
                type="file"
                className="hidden"
                onChange={event => {
                  void selectAttachment(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              {attachment && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#dce8dc] bg-[#f7faf6] p-2">
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#e5f0e5] text-xs font-bold text-[#176047]">
                    {attachment.kind === "video"
                      ? "فيديو"
                      : attachment.kind === "image"
                        ? "صورة"
                        : "ملف"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#476c5d]">
                    {attachment.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="rounded-lg p-1 text-[#8b5448] hover:bg-[#fff0ee]"
                    aria-label="حَذْفُ المُرْفَقِ"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                  <EmojiPicker
                    onSelect={emoji =>
                      setDraft(
                        current => `${current}${current ? " " : ""}${emoji}`
                      )
                    }
                    disabled={!activeConversationId || send.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => attachmentInput.current?.click()}
                    disabled={
                      !activeConversationId ||
                      uploadAttachment.isPending ||
                      send.isPending
                    }
                    className="h-9 w-9 rounded-xl text-[#467566] hover:bg-[#e8f1e7] hover:text-[#176047]"
                    aria-label="إِرْفاقُ صُورَةٍ أو فيديو أو ملف"
                  >
                    {uploadAttachment.isPending ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <ImagePlus size={17} />
                    )}
                  </Button>
                </div>
                <Textarea
                  dir="auto"
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  disabled={!activeConversationId || send.isPending}
                  placeholder="اُكْتُبْ رِسالَةً بِاحْتِرام…"
                  className="min-h-11 resize-none rounded-xl py-3 text-right"
                />
                <Button
                  type="submit"
                  disabled={
                    (!draft.trim() && !attachment) ||
                    !activeConversationId ||
                    send.isPending
                  }
                  className="h-11 shrink-0 rounded-xl bg-[#0d4937] px-4 hover:bg-[#175443]"
                >
                  <Send size={17} />
                  <span className="hidden sm:inline">إِرْسال</span>
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </PlatformShell>
  );
}
