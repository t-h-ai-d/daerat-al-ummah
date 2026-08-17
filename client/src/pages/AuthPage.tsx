import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type Mode = "login" | "register";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const register = trpc.auth.register.useMutation();
  const login = trpc.auth.login.useMutation();
  const busy = register.isPending || login.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const user = mode === "register"
        ? await register.mutateAsync({ name, username, email, password })
        : await login.mutateAsync({ identifier, password });
      utils.auth.me.setData(undefined, user);
      await utils.auth.me.invalidate();
      setLocation("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذّر إكمال العملية. حاول مرة أخرى.");
    }
  }

  return (
    <main dir="rtl" lang="ar" className="min-h-screen bg-[#f5f5ef] px-4 py-8 text-[#16352d] sm:grid sm:place-items-center sm:p-8">
      <section className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-[#d9e3d8] bg-[#fcfdf9] shadow-[0_24px_70px_rgba(12,57,43,0.12)]">
        <div className="relative overflow-hidden bg-[#0d3b31] px-7 pb-7 pt-8 text-[#f8f7ed]"><div className="geometric-orb" aria-hidden="true" /><div className="relative"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d6b454] text-[#123b31]"><UserRound size={21} /></span><p className="mt-5 text-[10px] font-bold tracking-[0.18em] text-[#e7c669]">دائرة الأمة</p><h1 className="mt-2 font-display text-3xl font-semibold">ادخل إلى دائرتك</h1><p className="mt-2 text-sm leading-6 text-[#cbdcd3]">حسابك ملكك: بريد إلكتروني، اسم مستخدم، وكلمة مرور فقط.</p></div></div>
        <div className="p-6 sm:p-7"><div className="mb-6 grid grid-cols-2 rounded-xl bg-[#eef3ec] p-1"><button onClick={() => { setMode("register"); setError(""); }} className={`rounded-lg py-2 text-sm font-bold ${mode === "register" ? "bg-white text-[#0d4937] shadow-sm" : "text-[#6f877a]"}`}>حساب جديد</button><button onClick={() => { setMode("login"); setError(""); }} className={`rounded-lg py-2 text-sm font-bold ${mode === "login" ? "bg-white text-[#0d4937] shadow-sm" : "text-[#6f877a]"}`}>تسجيل الدخول</button></div>
          <form onSubmit={submit} className="space-y-4">{mode === "register" && <><div className="space-y-2"><Label htmlFor="name">الاسم</Label><Input id="name" value={name} onChange={event => setName(event.target.value)} required placeholder="اسمك الذي يظهر في الدائرة" /></div><div className="space-y-2"><Label htmlFor="username">اسم المستخدم</Label><Input id="username" value={username} onChange={event => setUsername(event.target.value)} required placeholder="مثال: ummah_member" /></div></>}<div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><div className="relative"><Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-[#789083]" size={16} /><Input id="email" type={mode === "login" ? "text" : "email"} value={mode === "login" ? identifier : email} onChange={event => mode === "login" ? setIdentifier(event.target.value) : setEmail(event.target.value)} required placeholder={mode === "login" ? "البريد الإلكتروني أو اسم المستخدم" : "name@example.com"} className="pr-10" /></div></div><div className="space-y-2"><Label htmlFor="password">كلمة المرور</Label><div className="relative"><LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 text-[#789083]" size={16} /><Input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={mode === "register" ? 10 : 1} placeholder={mode === "register" ? "10 أحرف على الأقل" : "كلمة المرور"} className="pr-10" /></div></div>{error && <p className="rounded-xl bg-[#fbebe7] px-3 py-2.5 text-xs font-semibold text-[#9c422d]">{error}</p>}<Button disabled={busy} type="submit" className="mt-2 h-11 w-full rounded-xl bg-[#0d4937] font-bold hover:bg-[#175443]">{busy ? "جارٍ المعالجة…" : mode === "register" ? "إنشاء الحساب" : "دخول"}<ArrowRight className="mr-2" size={17} /></Button></form>
          <p className="mt-5 text-center text-[11px] leading-5 text-[#72887c]">بإنشاء الحساب، توافق على قواعد الدائرة: لا احتيال، لا كذب، لا محتوى مُشتّت، واحترام الناس والدين.</p>
        </div>
      </section>
    </main>
  );
}
