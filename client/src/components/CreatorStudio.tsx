import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FileImage, FilePlus2, Globe2, ImageUp, Loader2, LockKeyhole, Palette, Trash2, Type, UserRoundX } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type StyleChoice = "default" | "serif" | "emphasis";

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export default function CreatorStudio() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const profile = trpc.social.myProfile.useQuery();
  const posts = trpc.social.myPosts.useQuery();
  const avatarInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "friends">("public");
  const [textStyle, setTextStyle] = useState<StyleChoice>("default");
  const [attachment, setAttachment] = useState<File | null>(null);
  const uploadAvatar = trpc.social.uploadAvatar.useMutation();
  const updateProfile = trpc.social.updateProfile.useMutation({ onSuccess: async () => { await utils.social.myProfile.invalidate(); toast.success("تم تحديث صورة الحساب."); } });
  const createPost = trpc.social.createPost.useMutation({
    onSuccess: async () => {
      setTitle(""); setContent(""); setAttachment(null); setTextStyle("default");
      await Promise.all([utils.social.myPosts.invalidate(), utils.social.feed.invalidate()]);
      toast.success("تم نشر المنشور.");
    },
    onError: error => toast.error(error.message),
  });
  const deletePost = trpc.social.deletePost.useMutation({
    onSuccess: async () => { await Promise.all([utils.social.myPosts.invalidate(), utils.social.feed.invalidate()]); toast.success("تم حذف المنشور."); },
    onError: error => toast.error(error.message),
  });
  const deleteAccount = trpc.auth.deleteOwnAccount.useMutation({
    onSuccess: async () => { await logout(); toast.success("تم حذف الحساب. يمكنك إنشاء حساب جديد الآن."); setLocation("/auth"); },
    onError: error => toast.error(error.message),
  });

  const setAvatar = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("اختر صورة فقط.");
    if (file.size > 6_000_000) return toast.error("حجم الصورة يجب أن يكون 6 ميغابايت أو أقل.");
    try {
      const stored = await uploadAvatar.mutateAsync({ filename: file.name, mimeType: file.type, dataBase64: await readFile(file) });
      await updateProfile.mutateAsync({ avatarUrl: stored.url });
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر رفع الصورة."); }
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return toast.error("اكتب محتوى المنشور أولاً.");
    try {
      const attachments = [] as { kind: "image" | "video" | "file"; url: string; storageKey?: string; filename?: string; mimeType?: string; sizeBytes?: number }[];
      if (attachment) {
        if (attachment.size > 50_000_000) return toast.error("حجم المرفق يجب أن يكون 50 ميغابايت أو أقل.");
        const stored = await trpcClientUpload(attachment, utils);
        attachments.push(stored);
      }
      await createPost.mutateAsync({ title: title.trim() || undefined, content: content.trim(), visibility, textStyle, attachments });
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر نشر المنشور."); }
  };

  const canDeleteLocalAccount = user?.loginMethod === "local";

  return <section className="mt-6 max-w-4xl px-4 pb-12 sm:px-6 lg:px-8" dir="rtl">
    <div className="rounded-[24px] border border-[#dce5da] bg-white p-5 shadow-[0_14px_40px_rgba(26,69,52,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.16em] text-[#a4822e]">استوديو المنشئ</p><h2 className="mt-1 font-display text-2xl font-semibold text-[#163e33]">صورتك ومنشوراتك بين يديك</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#678073]">ارفع الصورة من جهازك مباشرة، واختر عنوانًا ونمطًا واضحًا للنص، ثم حدد جمهور كل منشور.</p></div><Palette className="text-[#2d7255]" size={25} /></div>
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-[#f7faf6] p-4"><div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#dce9df]">{profile.data?.avatarUrl ? <img src={profile.data.avatarUrl} alt="صورة الحساب" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-bold text-[#4e7665]">{(profile.data?.name || "ع").slice(0, 1)}</div>}</div><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-[#244a3c]">صورة الحساب</p><p className="mt-1 text-xs text-[#71897d]">PNG أو JPG أو WebP — حد أقصى 6 ميغابايت.</p></div><input ref={avatarInput} className="hidden" type="file" accept="image/*" onChange={event => { void setAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button type="button" variant="outline" disabled={uploadAvatar.isPending || updateProfile.isPending} onClick={() => avatarInput.current?.click()} className="rounded-xl"><ImageUp size={16} />رفع صورة</Button></div>
      <form onSubmit={event => { void publish(event); }} className="mt-7 border-t border-[#e7eee6] pt-6"><div className="flex items-center gap-2 text-sm font-extrabold text-[#244a3c]"><Type size={17} />منشور جديد</div><Input value={title} onChange={event => setTitle(event.target.value)} maxLength={240} placeholder="عنوان اختياري للمنشور" className="mt-4 h-11 rounded-xl border-[#d7e3d8] text-right" /><Textarea value={content} onChange={event => setContent(event.target.value)} required maxLength={5000} placeholder="اكتب ما تريد مشاركته…" className="mt-3 min-h-32 rounded-xl border-[#d7e3d8] text-right leading-7" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-xs font-bold text-[#49685c]">نمط النص</p><div className="flex flex-wrap gap-2">{(["default", "serif", "emphasis"] as const).map(style => <button key={style} type="button" onClick={() => setTextStyle(style)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${textStyle === style ? "border-[#2b7758] bg-[#edf7ee] text-[#176047]" : "border-[#d7e3d8] text-[#678073]"}`}>{style === "default" ? "عادي" : style === "serif" ? "تقليدي" : "تأكيد"}</button>)}</div></div><div><p className="mb-2 text-xs font-bold text-[#49685c]">خصوصية المنشور</p><div className="flex gap-2"><button type="button" onClick={() => setVisibility("public")} className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold ${visibility === "public" ? "border-[#2b7758] bg-[#edf7ee] text-[#176047]" : "border-[#d7e3d8] text-[#678073]"}`}><Globe2 size={14} />عام</button><button type="button" onClick={() => setVisibility("friends")} className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold ${visibility === "friends" ? "border-[#2b7758] bg-[#edf7ee] text-[#176047]" : "border-[#d7e3d8] text-[#678073]"}`}><LockKeyhole size={14} />الأصدقاء</button></div></div></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><input ref={mediaInput} className="hidden" type="file" accept="image/*,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx" onChange={event => { setAttachment(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} /><Button type="button" variant="outline" onClick={() => mediaInput.current?.click()} className="rounded-xl"><FilePlus2 size={16} />{attachment ? attachment.name : "إضافة صورة أو فيديو أو ملف"}</Button></div><Button type="submit" disabled={createPost.isPending} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">{createPost.isPending ? <Loader2 className="animate-spin" size={16} /> : <FileImage size={16} />}نشر</Button></div>
      </form>
      <div className="mt-8 border-t border-[#e7eee6] pt-6"><h3 className="text-sm font-extrabold text-[#244a3c]">منشوراتي</h3><div className="mt-3 space-y-2">{posts.isLoading ? <p className="flex items-center gap-2 text-xs text-[#71897d]"><Loader2 className="animate-spin" size={14} />جارٍ تحميل منشوراتك…</p> : posts.data?.length ? posts.data.map(post => <div key={post.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#f8fbf7] p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#294e40]">{post.title || post.content.slice(0, 80)}</p><p className="mt-1 text-xs text-[#758d82]">{post.visibility === "friends" ? "للأصدقاء فقط" : "عام"} · {new Date(post.createdAt).toLocaleDateString("ar")}</p></div><Button size="sm" variant="outline" disabled={deletePost.isPending} onClick={() => { if (window.confirm("هل تريد حذف هذا المنشور نهائيًا؟")) deletePost.mutate({ postId: post.id }); }} className="rounded-lg border-[#e9c8c2] text-[#a24f41] hover:bg-[#fff4f2]"><Trash2 size={14} />حذف</Button></div>) : <p className="text-xs text-[#748a7f]">لا توجد منشورات لك بعد.</p>}</div></div>
      <div className="mt-8 rounded-2xl border border-[#ecd1cc] bg-[#fff8f6] p-4"><div className="flex items-start gap-3"><UserRoundX className="mt-0.5 text-[#ad574a]" size={19} /><div><h3 className="text-sm font-extrabold text-[#7e352d]">بدء حساب جديد</h3><p className="mt-1 text-xs leading-5 text-[#92635b]">{canDeleteLocalAccount ? "يحذف هذا الحساب وكل بياناته من دائرة الأمة، ثم يمكنك التسجيل مجددًا بنفس البريد واسم المستخدم." : "هذا الحساب متصل بطريقة خارجية، وليس حسابًا محليًا بالبريد واسم المستخدم وكلمة المرور؛ لذلك لا يمكن حذفه من هذه الصفحة."}</p><Button type="button" size="sm" variant="outline" disabled={!canDeleteLocalAccount || deleteAccount.isPending} onClick={() => { if (window.confirm("سيُحذف حسابك ومنشوراتك ورسائلك وبياناتك نهائيًا. هل تريد المتابعة؟")) deleteAccount.mutate(); }} className="mt-3 rounded-lg border-[#dfb1aa] text-[#9d4338] hover:bg-[#fff1ee]"><Trash2 size={14} />{canDeleteLocalAccount ? "حذف حسابي وبدء جديد" : "الحذف غير متاح لهذا الحساب"}</Button></div></div></div>
    </div>
  </section>;
}

async function trpcClientUpload(file: File, utils: ReturnType<typeof trpc.useUtils>) {
  const dataBase64 = await readFile(file);
  const result = await utils.client.social.uploadAttachment.mutate({ filename: file.name, mimeType: file.type || "application/octet-stream", dataBase64 });
  return { kind: result.kind, url: result.url, storageKey: result.key, filename: result.filename, mimeType: result.mimeType, sizeBytes: result.sizeBytes };
}
