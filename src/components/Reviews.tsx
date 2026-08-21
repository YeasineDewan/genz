import { useState } from "react";
import { Stars } from "./Stars";
import { useUser, useProductReviews, addReview, deleteReview, reportReview, updateReview } from "@/lib/store";
import { REPORT_REASONS, type ReportReason } from "@/lib/types";
import { Trash2, Flag, X, Pencil } from "lucide-react";
import { toast } from "sonner";

export function Reviews({ productId }: { productId: string }) {
  const user = useUser();
  const reviews = useProductReviews(productId);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eRating, setERating] = useState(5);
  const [eTitle, setETitle] = useState("");
  const [eBody, setEBody] = useState("");

  const startEdit = (r: { id: string; rating: number; title: string; body: string }) => {
    setEditingId(r.id); setERating(r.rating); setETitle(r.title); setEBody(r.body);
  };
  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!eTitle.trim()) { toast.error("Add a title"); return; }
    if (!eBody.trim() || eBody.length > 1000) { toast.error("Review must be 1–1000 chars"); return; }
    updateReview(editingId, { rating: eRating, title: eTitle.trim(), body: eBody.trim() });
    setEditingId(null);
    toast.success("Review updated");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to write a review"); return; }
    if (!title.trim()) { toast.error("Add a title"); return; }
    if (!body.trim() || body.length > 1000) { toast.error("Review must be 1–1000 chars"); return; }
    if (rating < 1 || rating > 5) { toast.error("Pick a rating"); return; }
    addReview({
      productId, userId: user.id, userName: user.name,
      rating, title: title.trim(), body: body.trim(),
    });
    setTitle(""); setBody(""); setRating(5); setOpen(false);
    toast.success("Thanks for the review!");
  };

  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n, count: reviews.filter((r) => r.rating === n).length,
  }));
  const total = reviews.length;
  const avg = total === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / total;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="sticker rounded-2xl bg-white p-6">
        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          <div className="border-r-0 md:border-r-[3px] md:pr-6 border-ink/10">
            <div className="text-5xl font-display">{avg.toFixed(1)}</div>
            <Stars value={avg} size={18}/>
            <div className="text-sm text-muted-foreground mt-1">{total} review{total === 1 ? "" : "s"}</div>
            <div className="mt-4 space-y-1">
              {dist.map((d) => (
                <div key={d.n} className="flex items-center gap-2 text-xs">
                  <span className="w-6 font-bold">{d.n}★</span>
                  <div className="flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
                    <div className="h-full bg-pop-yellow" style={{ width: total ? `${(d.count / total) * 100}%` : 0 }}/>
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{d.count}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setOpen((v) => !v)} className="btn-pop w-full justify-center mt-5">
              {open ? "Cancel" : "Write a review"}
            </button>
          </div>

          <div>
            {open && (
              <form onSubmit={submit} className="border-[3px] border-ink rounded-xl p-4 mb-5 bg-pop-yellow/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold uppercase">Your rating</span>
                  <Stars value={rating} size={22} onChange={setRating}/>
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
                  placeholder="Title" className="w-full border-2 border-ink rounded-lg px-3 py-2 mb-2 bg-white"/>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000}
                  placeholder="What did you think?" className="w-full border-2 border-ink rounded-lg px-3 py-2 bg-white min-h-24"/>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">{body.length}/1000</span>
                  <button className="btn-pop">Submit review</button>
                </div>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">Be the first to review this product.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-ink/10 pb-4 last:border-0">
                    {editingId === r.id ? (
                      <form onSubmit={saveEdit} className="border-[3px] border-ink rounded-xl p-4 bg-pop-cyan/20">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold uppercase">Your rating</span>
                          <Stars value={eRating} size={22} onChange={setERating}/>
                        </div>
                        <input value={eTitle} onChange={(e) => setETitle(e.target.value)} maxLength={80}
                          placeholder="Title" className="w-full border-2 border-ink rounded-lg px-3 py-2 mb-2 bg-white"/>
                        <textarea value={eBody} onChange={(e) => setEBody(e.target.value)} maxLength={1000}
                          className="w-full border-2 border-ink rounded-lg px-3 py-2 bg-white min-h-24"/>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-muted-foreground">{eBody.length}/1000</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingId(null)} className="chip">Cancel</button>
                            <button className="btn-pop">Save changes</button>
                          </div>
                        </div>
                      </form>
                    ) : (
                    <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Stars value={r.rating} size={14}/>
                        <div className="font-bold mt-1">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          by {r.userName} · {new Date(r.at).toLocaleDateString()}
                          {r.editedAt && <span className="italic"> · edited</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setReportingId(r.id)}
                          className="text-muted-foreground hover:text-pop-orange" aria-label="Report">
                          <Flag size={14}/>
                        </button>
                        {user?.id === r.userId && (
                          <>
                            <button onClick={() => startEdit(r)}
                              className="text-muted-foreground hover:text-pop-cyan" aria-label="Edit">
                              <Pencil size={14}/>
                            </button>
                            <button onClick={() => { deleteReview(r.id); toast.success("Removed"); }}
                              className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                              <Trash2 size={14}/>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{r.body}</p>
                    </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {reportingId && (
        <ReportModal
          onClose={() => setReportingId(null)}
          onSubmit={(reason, note) => {
            reportReview(reportingId, reason, note, user?.id);
            setReportingId(null);
            toast.success("Thanks — our team will take a look.");
          }}
        />
      )}
    </section>
  );
}

function ReportModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (reason: ReportReason, note?: string) => void;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sticker rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-2xl flex items-center gap-2"><Flag size={18}/> Report review</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full border-2 border-ink"><X size={14}/></button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Why are you reporting this review?</p>
        <div className="space-y-2 mb-3">
          {REPORT_REASONS.map((r) => (
            <label key={r.value}
              className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition ${reason === r.value ? "border-ink bg-pop-yellow/40" : "border-ink/20 bg-white hover:border-ink/50"}`}>
              <input type="radio" name="reason" checked={reason === r.value}
                onChange={() => setReason(r.value)} className="mt-1"/>
              <div>
                <div className="font-bold text-sm">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.description}</div>
              </div>
            </label>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
          placeholder="Add detail (optional)"
          className="w-full border-2 border-ink rounded-lg px-3 py-2 bg-white min-h-20 text-sm"/>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="chip">Cancel</button>
          <button onClick={() => onSubmit(reason, note)} className="btn-pop"><Flag size={14}/> Submit report</button>
        </div>
      </div>
    </div>
  );
}
