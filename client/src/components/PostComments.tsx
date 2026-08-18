import EmojiPicker from "@/components/EmojiPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PostCommentsProps = {
  postId: number;
  commentCount: number;
};

function initials(value?: string | null) {
  return (value || "د")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

export default function PostComments({ postId, commentCount }: PostCommentsProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const comments = trpc.social.postComments.useQuery({ postId }, { enabled: expanded });
  const addComment = trpc.social.addComment.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.social.postComments.invalidate({ postId }),
        utils.social.feed.invalidate(),
        utils.social.communityFeed.invalidate(),
      ]);
      setDraft("");
      toast.success("نُشر تعليقك.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      toast.info("سجّل الدخول للمشاركة في النقاش.");
      setLocation("/auth");
      return;
    }
    if (!draft.trim()) return;
    addComment.mutate({ postId, content: draft.trim() });
  };

  return <div className="min-w-0">
    <button type="button" onClick={() => setExpanded(value => !value)} className="action-button" aria-expanded={expanded} aria-controls={`post-comments-${postId}`}>
      <MessageCircle size={17} />
      <span>{commentCount ? `${commentCount} تعليق` : "تعليق"}</span>
    </button>
    {expanded && <section id={`post-comments-${postId}`} dir="rtl" className="mt-3 rounded-2xl border border-[#e0e9df] bg-[#fafcf9] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold text-[#315447]">التعليقات</p>
        <span className="text-[11px] text-[#809488]">الأقدم أولًا</span>
      </div>
      {comments.isLoading ? <div className="flex items-center gap-2 py-3 text-xs text-[#71887c]"><Loader2 className="animate-spin" size={15} />يجري تحميل التعليقات…</div> : comments.isError ? <p className="rounded-xl bg-[#f8ece6] px-3 py-2 text-xs leading-5 text-[#9a4e36]">تعذّر عرض التعليقات الآن. حاول مرة أخرى.</p> : comments.data?.length ? <div className="space-y-3">{comments.data.map(comment => {
        const name = comment.author.name || comment.author.username || "عضو في الدائرة";
        return <article key={comment.id} className="flex gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e4efdf] text-[10px] font-extrabold text-[#176047]">{initials(name)}</span>
          <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-xs font-extrabold text-[#294d40]">{name}</p>{comment.author.username && <span className="text-[11px] text-[#82958b]">@{comment.author.username}</span>}<span className="text-[10px] text-[#a4b1a8]">{new Date(comment.createdAt).toLocaleDateString("ar")}</span></div>
            <p dir="auto" className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#4a695c]">{comment.content}</p>
          </div>
        </article>;
      })}</div> : <p className="rounded-xl border border-dashed border-[#d6e2d5] bg-white px-3 py-4 text-center text-xs leading-5 text-[#71887c]">لا توجد تعليقات بعد. ابدأ نقاشًا نافعًا بهدوء.</p>}
      <form onSubmit={submit} className="mt-4 border-t border-[#e7eee6] pt-3">
        {isAuthenticated ? <div className="flex gap-2"><Textarea dir="auto" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1800} placeholder="اكتب تعليقًا نافعًا…" className="min-h-16 resize-none rounded-xl border-[#dce6dc] text-xs leading-5" /><div className="flex shrink-0 flex-col gap-1"><EmojiPicker onSelect={emoji => setDraft(value => `${value}${value ? " " : ""}${emoji}`)} disabled={addComment.isPending} className="h-8 w-8 rounded-lg text-[#467566] hover:bg-[#e8f1e7] hover:text-[#176047]" /><Button type="submit" size="icon" disabled={!draft.trim() || addComment.isPending} className="h-8 w-8 rounded-lg bg-[#0d4937] hover:bg-[#176047]" aria-label="نشر التعليق">{addComment.isPending ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}</Button></div></div> : <button type="button" onClick={() => setLocation("/auth")} className="w-full rounded-xl border border-[#d7e5d8] bg-white px-3 py-2.5 text-xs font-bold text-[#176047] transition-colors hover:bg-[#edf4ee]">سجّل الدخول لتكتب تعليقًا</button>}
      </form>
    </section>}
  </div>;
}
