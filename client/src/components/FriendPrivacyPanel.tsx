import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Check, Globe2, Loader2, LockKeyhole, Search, UserRoundPlus, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function FriendPrivacyPanel() {
  const utils = trpc.useUtils();
  const profile = trpc.social.myProfile.useQuery();
  const friendships = trpc.social.friendships.useQuery();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const search = trpc.social.search.useQuery({ query: submitted || "_" }, { enabled: Boolean(submitted) });
  const request = trpc.social.requestFriendship.useMutation({
    onSuccess: async result => {
      await utils.social.friendships.invalidate();
      toast.success(result.status === "accepted" ? "أصبحتما صديقين الآن." : "تم إرسال طلب الصداقة.");
    },
    onError: error => toast.error(error.message),
  });
  const respond = trpc.social.respondToFriendship.useMutation({
    onSuccess: async result => {
      await utils.social.friendships.invalidate();
      toast.success(result.status === "accepted" ? "تم قبول طلب الصداقة." : "تم رفض الطلب.");
    },
    onError: error => toast.error(error.message),
  });
  const updatePrivacy = trpc.social.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.social.myProfile.invalidate();
      toast.success("تم تحديث خصوصية الحساب.");
    },
    onError: error => toast.error(error.message),
  });

  const links = friendships.data ?? [];
  const incoming = links.filter(link => link.direction === "incoming" && link.status === "pending");
  const outgoing = links.filter(link => link.direction === "outgoing" && link.status === "pending");
  const accepted = links.filter(link => link.status === "accepted");
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(query.trim()); };

  return <section className="mt-6 max-w-4xl px-4 pb-10 sm:px-6 lg:px-8" dir="rtl">
    <div className="rounded-[24px] border border-[#dce5da] bg-white p-5 shadow-[0_14px_40px_rgba(26,69,52,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#a4822e]">الخصوصية والعلاقات</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#163e33]">من يرى حسابك ومنشوراتك؟</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#678073]">اختر الظهور للجميع أو للأصدقاء فقط. تبقى المنشورات المقيدة متاحة للأصدقاء المقبولين فقط.</p>
        </div>
        <UsersRound className="text-[#2d7255]" size={25} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => updatePrivacy.mutate({ profileVisibility: "public" })} className={`rounded-2xl border p-4 text-right transition-colors ${profile.data?.profileVisibility === "public" ? "border-[#2b7758] bg-[#edf7ee]" : "border-[#dbe6dd] hover:border-[#9ec4aa]"}`}>
          <Globe2 className="text-[#287052]" size={20} /><p className="mt-3 text-sm font-extrabold text-[#244a3c]">عام</p><p className="mt-1 text-xs leading-5 text-[#70877c]">يمكن للأعضاء العثور على حسابك ورؤية منشوراتك العامة.</p>
        </button>
        <button type="button" onClick={() => updatePrivacy.mutate({ profileVisibility: "friends" })} className={`rounded-2xl border p-4 text-right transition-colors ${profile.data?.profileVisibility === "friends" ? "border-[#2b7758] bg-[#edf7ee]" : "border-[#dbe6dd] hover:border-[#9ec4aa]"}`}>
          <LockKeyhole className="text-[#287052]" size={20} /><p className="mt-3 text-sm font-extrabold text-[#244a3c]">الأصدقاء فقط</p><p className="mt-1 text-xs leading-5 text-[#70877c]">مناسب للمشاركة الهادئة مع دائرة موثوقة من الأصدقاء.</p>
        </button>
      </div>

      <div className="mt-7 border-t border-[#e7eee6] pt-6">
        <h3 className="text-sm font-extrabold text-[#244a3c]">إضافة صديق</h3>
        <form onSubmit={submitSearch} className="mt-3 flex gap-2">
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالاسم أو اسم المستخدم" className="h-11 rounded-xl border-[#d7e3d8] text-right" />
          <Button type="submit" className="h-11 rounded-xl bg-[#0d4937] hover:bg-[#176047]"><Search size={16} />بحث</Button>
        </form>
        {search.isFetching && <p className="mt-3 flex items-center gap-2 text-xs text-[#71897d]"><Loader2 className="animate-spin" size={14} />جارٍ البحث…</p>}
        {submitted && !search.isFetching && <div className="mt-3 space-y-2">{search.data?.people?.filter(person => person.id !== profile.data?.id).map(person => <div key={person.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbf7] px-3 py-3"><div><p className="text-sm font-bold text-[#294e40]">{person.name || person.username || "عضو"}</p>{person.username && <p className="text-xs text-[#7b9186]">@{person.username}</p>}</div><Button size="sm" disabled={request.isPending} onClick={() => request.mutate({ targetUserId: person.id })} className="rounded-lg bg-[#0d4937] text-xs hover:bg-[#176047]"><UserRoundPlus size={14} />إضافة</Button></div>) || <p className="text-xs text-[#748a7f]">لا توجد نتائج مطابقة.</p>}</div>}
      </div>

      {incoming.length > 0 && <div className="mt-7 border-t border-[#e7eee6] pt-6"><h3 className="text-sm font-extrabold text-[#244a3c]">طلبات بانتظارك</h3><div className="mt-3 space-y-2">{incoming.map(link => <div key={link.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbf7] px-3 py-3"><p className="text-sm font-bold text-[#294e40]">{link.peer?.name || link.peer?.username || "عضو"}</p><div className="flex gap-2"><Button size="sm" onClick={() => respond.mutate({ friendshipId: link.id, response: "accepted" })} className="rounded-lg bg-[#0d4937] text-xs hover:bg-[#176047]"><Check size={14} />قبول</Button><Button size="sm" variant="outline" onClick={() => respond.mutate({ friendshipId: link.id, response: "rejected" })} className="rounded-lg text-xs"><X size={14} />رفض</Button></div></div>)}</div></div>}

      <div className="mt-7 grid gap-4 border-t border-[#e7eee6] pt-6 sm:grid-cols-2"><div><h3 className="text-sm font-extrabold text-[#244a3c]">أصدقاؤك ({accepted.length})</h3><div className="mt-3 space-y-2">{accepted.length ? accepted.map(link => <p key={link.id} className="rounded-xl bg-[#f8fbf7] px-3 py-3 text-sm font-bold text-[#34584b]">{link.peer?.name || link.peer?.username || "عضو"}</p>) : <p className="text-xs leading-5 text-[#748a7f]">لا يوجد أصدقاء بعد. أرسل طلبًا لمن تثق به.</p>}</div></div><div><h3 className="text-sm font-extrabold text-[#244a3c]">طلبات أرسلتها ({outgoing.length})</h3><div className="mt-3 space-y-2">{outgoing.length ? outgoing.map(link => <p key={link.id} className="rounded-xl bg-[#f8fbf7] px-3 py-3 text-sm font-bold text-[#34584b]">{link.peer?.name || link.peer?.username || "عضو"} <span className="text-xs font-normal text-[#789084]">بانتظار القبول</span></p>) : <p className="text-xs leading-5 text-[#748a7f]">لا توجد طلبات معلقة.</p>}</div></div></div>
    </div>
  </section>;
}
