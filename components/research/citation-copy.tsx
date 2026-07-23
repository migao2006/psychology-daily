"use client";

import { useState } from "react";

export function CitationCopy({ citation }: { citation: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="button button-secondary"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(citation);
        setCopied(true);
      }}
    >
      {copied ? "已複製引用資訊" : "複製引用資訊"}
    </button>
  );
}
