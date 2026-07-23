"use client";

import { useEffect, useState } from "react";
import { getDatabase } from "@/lib/db/database";
import type { CloudBinding } from "@/lib/schemas/progress";

export function CloudBackup() {
  const [binding, setBinding] = useState<CloudBinding | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void getDatabase().cloudBindings.get("primary").then((value) => {
      setBinding(value ?? null);
    });
  }, []);

  async function copyRecoveryCode() {
    if (!binding) return;
    await navigator.clipboard.writeText(binding.recoveryCode);
    setMessage("復原碼已複製。請保存到密碼管理器，不要傳給其他人。");
  }

  return (
    <section className="card cloud-backup-card">
      <div className="cloud-backup-heading">
        <div>
          <h2>資料綁定與同步</h2>
          <p className="muted">
            進度以端對端加密同步；Cloudflare 只保存無法直接閱讀的密文。
          </p>
        </div>
        <span className="badge">
          {binding?.status === "active" ? "已綁定" : "需要重新綁定"}
        </span>
      </div>
      <dl className="research-card-meta">
        <div>
          <dt>同步狀態</dt>
          <dd>{binding?.status === "active" ? "正常" : "已停止"}</dd>
        </div>
        <div>
          <dt>最近同步</dt>
          <dd>
            {binding?.lastSyncedAt
              ? new Date(binding.lastSyncedAt).toLocaleString("zh-TW")
              : "等待第一次同步"}
          </dd>
        </div>
        <div>
          <dt>裝置規則</dt>
          <dd>單一使用中裝置</dd>
        </div>
      </dl>
      <button
        className="button button-secondary"
        type="button"
        disabled={!binding}
        onClick={copyRecoveryCode}
      >
        複製復原碼
      </button>
      <p className="field-hint">
        復原碼可解密你的全部學習資料。網站無法替你重設或找回。
      </p>
      {message ? <p className="notice" role="status">{message}</p> : null}
    </section>
  );
}
