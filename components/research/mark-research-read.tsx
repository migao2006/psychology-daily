"use client";
import { useState } from "react";
import { markResearchRead } from "@/lib/db/progress";
export function MarkResearchRead({ researchId }: { researchId: string }) {
  const [done, setDone] = useState(false);
  return <button className="button button-full" type="button" disabled={done} onClick={async () => { await markResearchRead(researchId); setDone(true); }}>{done ? "已儲存閱讀紀錄 ✓" : "標記為已閱讀"}</button>;
}
