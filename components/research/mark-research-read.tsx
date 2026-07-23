"use client";

import { useEffect, useState } from "react";
import { getDatabase } from "@/lib/db/database";
import { markResearchRead } from "@/lib/db/progress";

export function MarkResearchRead({ researchId }: { researchId: string }) {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getDatabase()
      .readResearch.get(researchId)
      .then((entry) => {
        if (active) setDone(Boolean(entry));
      })
      .catch(() => {
        if (active) setMessage("無法讀取本機閱讀狀態");
      });
    return () => {
      active = false;
    };
  }, [researchId]);

  async function handleClick() {
    try {
      await markResearchRead(researchId);
      setDone(true);
      setMessage("已納入本機推薦偏好");
    } catch {
      setMessage("無法儲存閱讀紀錄，請確認瀏覽器允許網站資料");
    }
  }

  return (
    <div className="mark-read-area">
      <button
        className="button button-full"
        type="button"
        disabled={done}
        onClick={handleClick}
      >
        {done ? "已儲存閱讀紀錄 ✓" : "標記為已閱讀"}
      </button>
      <p className="form-status" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
