"use client";
import { useState, useTransition } from "react";
import { saveFeedbackAction } from "./actions";

export function SectionFeedback(props: { token: string; conceptId: string; sectionId: string | null; rating: number | null; comment: string | null; label?: string }) {
  const [rating, setRating] = useState(props.rating ?? 0);
  const [comment, setComment] = useState(props.comment ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const save = (r = rating) =>
    start(async () => {
      await saveFeedbackAction(props.token, { conceptId: props.conceptId, sectionId: props.sectionId, rating: r || undefined, comment: comment || undefined });
      setSaved(true);
    });
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
      <span className="muted" style={{ fontSize: 13 }}>{props.label ?? "Your rating"}</span>
      <span className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} stars`} className={n <= rating ? "on" : ""} onClick={() => { setRating(n); save(n); }}>★</button>
        ))}
      </span>
      <input style={{ flex: 1, minWidth: 200 }} placeholder="What would you change?" value={comment} onChange={(e) => { setComment(e.target.value); setSaved(false); }} onBlur={() => comment !== (props.comment ?? "") && save()} />
      <span className="muted" style={{ fontSize: 12 }}>{pending ? "Saving…" : saved ? "Saved" : ""}</span>
    </div>
  );
}
