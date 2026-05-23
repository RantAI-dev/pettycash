"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { sel } from "@/store/store";
import { EVENT_COLOR, EVENT_TEMPLATES, fmtDateTime, fmtRelTime } from "@/lib/format";
import type { AppState, TransactionEvent } from "@/lib/types";

export function Timeline({ events, state }: { events: TransactionEvent[]; state: AppState }) {
  const reversed = [...events].reverse();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="timeline" style={{ marginTop: 4 }}>
      {reversed.map((ev) => {
        const actor = sel.userById(state, ev.actorId);
        const color = EVENT_COLOR[ev.eventType] || "gray";
        const tpl = EVENT_TEMPLATES[ev.eventType];
        const text = tpl
          ? tpl(actor || { name: "Unknown" })
          : `${actor?.name || "User"} · ${ev.eventType}`;
        const payload = ev.payload as { note?: string; reason?: string };
        const hasDetail = !!(payload?.note || payload?.reason);
        const isExpanded = expanded.has(ev.id);
        return (
          <div key={ev.id} className={`tl-event ${color}`}>
            <div className="tl-actor">
              {actor && <Avatar user={actor} size="sm" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{text}</div>
                <div className="tl-time" title={fmtDateTime(ev.createdAt)}>
                  {fmtRelTime(ev.createdAt)}
                </div>
              </div>
              {hasDetail && (
                <button
                  className="icon-btn"
                  style={{ width: 24, height: 24 }}
                  onClick={() => toggle(ev.id)}
                  title="Lihat detail"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
            {hasDetail && isExpanded && (
              <div className="tl-detail">
                {payload.note && <div>{payload.note}</div>}
                {payload.reason && (
                  <div>
                    <span className="dim" style={{ marginRight: 6 }}>Alasan:</span>
                    {payload.reason}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
