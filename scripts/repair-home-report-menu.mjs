import { readFileSync, writeFileSync } from "node:fs";

const path = "/home/ubuntu/ummah-circle/client/src/pages/Home.tsx";
let source = readFileSync(path, "utf8");

source = source.replace(
  'const [showFeedLoading, setShowFeedLoading] = useState(true);',
  'const [showFeedLoading, setShowFeedLoading] = useState(true);\n  const [reportPost, setReportPost] = useState<FeedPost | null>(null);\n  const [reportCategory, setReportCategory] = useState<"scam" | "lie" | "brainrot" | "haram imagery">("scam");\n  const [reportDetails, setReportDetails] = useState("");\n  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);\n  const [editedContent, setEditedContent] = useState("");'
);

source = source.replace(
  '  const deletePost = trpc.social.deletePost.useMutation({ onSuccess: async () => { await Promise.all([utils.social.feed.invalidate(), utils.social.myPosts.invalidate()]); toast.success("تم حذف منشورك."); }, onError: error => toast.error(error.message) });',
  '  const deletePost = trpc.social.deletePost.useMutation({ onSuccess: async () => { await Promise.all([utils.social.feed.invalidate(), utils.social.myPosts.invalidate()]); toast.success("تم حذف منشورك."); }, onError: error => toast.error(error.message) });\n  const updatePost = trpc.social.updatePost.useMutation({ onError: error => toast.error(error.message) });\n  const submitReport = trpc.social.submitReport.useMutation({ onSuccess: () => { setReportPost(null); setReportDetails(""); setReportCategory("scam"); toast.success("أُرسل البلاغ إلى مالك المنصة. شكرًا لحرصك."); }, onError: error => toast.error(error.message) });'
);

const oldHandlers = `  const reportByEmail = (post: FeedPost) => {
    const postAuthor = post.author.username ? \`@\${post.author.username}\` : (post.author.name || "غير معروف");
    const body = \`السلام عليكم،\\n\\nأرغب في الإبلاغ عن منشور في دائرة الأمة.\\n\\nمعرّف المنشور: \${post.id}\\nصاحب المنشور: \${postAuthor}\\nتاريخ النشر: \${new Date(post.createdAt).toLocaleString("ar")}\\n\\nالتصنيف (اختر واحدًا): احتيال / كذب / محتوى مُفسد للعقل / صور محرّمة\\nالتفاصيل أو الرابط إن وُجد:\\n\\n\`;
    window.location.href = \`mailto:\${ownerReportEmail}?subject=\${encodeURIComponent(\`بلاغ عن منشور #\${post.id} في دائرة الأمة\`)}&body=\${encodeURIComponent(body)}\`;
  };
  const submitComment = () => { if (selectedPostId && comment.trim()) addComment.mutate({ postId: selectedPostId, content: comment.trim() }); };
  const deleteOwnPost = (postId: number) => { if (window.confirm("هل تريد حذف منشورك نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.")) deletePost.mutate({ postId }); };`;

const newHandlers = `  const openReport = (post: FeedPost) => {
    if (!ensureSignedIn()) return;
    setReportPost(post);
    setReportCategory("scam");
    setReportDetails("");
  };
  const sendReport = () => {
    if (!reportPost) return;
    submitReport.mutate({ postId: reportPost.id, category: reportCategory, ...(reportDetails.trim() ? { details: reportDetails.trim() } : {}) });
  };
  const submitComment = () => { if (selectedPostId && comment.trim()) addComment.mutate({ postId: selectedPostId, content: comment.trim() }); };
  const deleteOwnPost = (postId: number) => { if (window.confirm("هل تريد حذف منشورك نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.")) deletePost.mutate({ postId }); };
  const openEdit = (post: FeedPost) => { setEditingPost(post); setEditedContent(post.content); };
  const saveEdit = () => {
    if (!editingPost || !editedContent.trim()) return toast.error("اكتب محتوى المنشور أولًا.");
    updatePost.mutate({ postId: editingPost.id, content: editedContent.trim() }, { onSuccess: async () => { await Promise.all([utils.social.feed.invalidate(), utils.social.myPosts.invalidate()]); setEditingPost(null); toast.success("تم تحديث منشورك."); } });
  };
  const setPostVisibility = (postId: number, visibility: "public" | "friends") => {
    updatePost.mutate({ postId, visibility }, { onSuccess: async () => { await Promise.all([utils.social.feed.invalidate(), utils.social.myPosts.invalidate()]); toast.success(visibility === "public" ? "أصبح المنشور ظاهرًا للعامة." : "أصبح المنشور للأصدقاء فقط."); } });
  };`;

if (!source.includes(oldHandlers)) throw new Error("Could not find the existing mailto report handler.");
source = source.replace(oldHandlers, newHandlers);
source = source.replace('DropdownMenuContent dir="rtl" align="end"', 'DropdownMenuContent align="end"');
source = source.replace(
  'onReport={() => reportByEmail(post)} onDelete={() => deleteOwnPost(post.id)} />',
  'onReport={() => openReport(post)} onDelete={() => deleteOwnPost(post.id)} onEdit={() => openEdit(post)} onSetVisibility={visibility => setPostVisibility(post.id, visibility)} />'
);

const reportDialog = `<Dialog open={!!reportPost} onOpenChange={open => { if (!open) setReportPost(null); }}><DialogContent dir="rtl" className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-[#f8ece6] text-[#a14f36]"><Flag size={21} /></span><DialogTitle className="font-display text-2xl tracking-[-0.035em] text-[#174035]">الإبلاغ عن منشور</DialogTitle><DialogDescription className="pt-1 leading-6 text-[#688075]">يُسجَّل البلاغ ويُرسل من خادم دائرة الأمة إلى مالك المنصة. لا يُفتح بريدك الشخصي.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-2">{([ ["scam", "احتيال"], ["lie", "كذب"], ["brainrot", "محتوى مُفسد للعقل"], ["haram imagery", "صور محرَّمة"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setReportCategory(value)} className={\`rounded-xl border px-3 py-2 text-right text-xs font-bold transition-colors \${reportCategory === value ? "border-[#b6794d] bg-[#fbf0e9] text-[#914a31]" : "border-[#dce6dc] bg-white text-[#547468] hover:border-[#bdcfbf]"}\`}>{label}</button>)}</div><Textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} placeholder="أضف تفاصيل مختصرة إن وُجدت (اختياري)…" className="min-h-28 rounded-xl border-[#dce6dc]" maxLength={2000} /><DialogFooter><Button variant="outline" onClick={() => setReportPost(null)} className="rounded-xl">إلغاء</Button><Button onClick={sendReport} disabled={submitReport.isPending} className="rounded-xl bg-[#a14f36] hover:bg-[#8d422c]">{submitReport.isPending ? <Loader2 className="animate-spin" size={16} /> : <Flag size={16} />}إرسال البلاغ</Button></DialogFooter></DialogContent></Dialog>`;
const editDialog = `<Dialog open={!!editingPost} onOpenChange={open => { if (!open) setEditingPost(null); }}><DialogContent dir="rtl" className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><DialogTitle className="font-display text-2xl tracking-[-0.035em] text-[#174035]">تحرير المنشور</DialogTitle><DialogDescription className="pt-1 leading-6 text-[#688075]">عدّل كلامك مع الحفاظ على قواعد الدائرة.</DialogDescription></DialogHeader><Textarea value={editedContent} onChange={event => setEditedContent(event.target.value)} className="min-h-36 rounded-xl border-[#dce6dc]" maxLength={5000} /><DialogFooter><Button variant="outline" onClick={() => setEditingPost(null)} className="rounded-xl">إلغاء</Button><Button onClick={saveEdit} disabled={updatePost.isPending || !editedContent.trim()} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">حفظ التعديل</Button></DialogFooter></DialogContent></Dialog>`;
const marker = '<Dialog open={commentOpen} onOpenChange={setCommentOpen}>';
if (!source.includes(marker)) throw new Error("Could not find comment dialog marker.");
source = source.replace(marker, `${reportDialog}${editDialog}${marker}`);

writeFileSync(path, source);
