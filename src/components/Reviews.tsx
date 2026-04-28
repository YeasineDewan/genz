import { useState } from "react";
import { Stars } from "./Stars";
import { useUser, useProductReviews, addReview, deleteReview } from "@/lib/store";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function Reviews({ productId }: { productId: string }) {
  const user = useUser();
  const reviews = useProductReviews(productId);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);

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
          {/* Summary */}
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

          {/* Form + list */}
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Stars value={r.rating} size={14}/>
                        <div className="font-bold mt-1">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          by {r.userName} · {new Date(r.at).toLocaleDateString()}
                        </div>
                      </div>
                      {user?.id === r.userId && (
                        <button onClick={() => { deleteReview(r.id); toast.success("Removed"); }}
                          className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
