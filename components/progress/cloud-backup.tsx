"use client";

import { useState } from "react";
import { exportProgress, importProgress } from "@/lib/db/backup";
import {
  createCloudBackup,
  deleteCloudBackup,
  downloadCloudBackup,
} from "@/lib/db/cloud-backup";

export function CloudBackup({ onRestored }: { onRestored: () => Promise<void> }) {
  const [recoveryCode, setRecoveryCode] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createNewBackup() {
    setBusy(true);
    setMessage("");
    try {
      const backup = await exportProgress();
      const result = await createCloudBackup(JSON.stringify(backup));
      setRecoveryCode(result.recoveryCode);
      setIssuedCode(result.recoveryCode);
      setMessage("加密雲端備份已建立。請立即保存復原碼。");
    } catch (error) {
      setMessage(errorMessage(error, "建立雲端備份失敗"));
    } finally {
      setBusy(false);
    }
  }

  async function updateBackup() {
    if (!recoveryCode.trim()) {
      setMessage("請先貼上復原碼");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const backup = await exportProgress();
      await createCloudBackup(JSON.stringify(backup), recoveryCode);
      setMessage("這組復原碼的雲端備份已更新。");
    } catch (error) {
      setMessage(errorMessage(error, "更新雲端備份失敗"));
    } finally {
      setBusy(false);
    }
  }

  async function prepareRestore() {
    if (!recoveryCode.trim()) {
      setMessage("請先貼上復原碼");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      setPendingRestore(await downloadCloudBackup(recoveryCode));
    } catch (error) {
      setMessage(errorMessage(error, "下載雲端備份失敗"));
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup() {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      await importProgress(pendingRestore);
      await onRestored();
      setPendingRestore(null);
      setMessage("雲端備份已解密並還原到這個瀏覽器。");
    } catch (error) {
      setMessage(errorMessage(error, "還原失敗"));
    } finally {
      setBusy(false);
    }
  }

  async function removeBackup() {
    setBusy(true);
    try {
      await deleteCloudBackup(recoveryCode);
      setConfirmDelete(false);
      setIssuedCode("");
      setMessage("Cloudflare 上的加密備份已刪除。");
    } catch (error) {
      setMessage(errorMessage(error, "刪除雲端備份失敗"));
    } finally {
      setBusy(false);
    }
  }

  async function copyRecoveryCode() {
    const value = issuedCode || recoveryCode;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage("復原碼已複製。");
    } catch {
      setMessage("無法自動複製，請手動選取復原碼。");
    }
  }

  return (
    <section className="card cloud-backup-card">
      <div className="cloud-backup-heading">
        <div>
          <p className="eyebrow">Encrypted cloud backup</p>
          <h2>Cloudflare 加密備份</h2>
        </div>
        <span className="badge">免登入</span>
      </div>
      <p className="muted">
        瀏覽器會先用復原碼加密資料，Cloudflare 只保存無法直接閱讀的密文。這是手動備份，不會持續同步。
      </p>

      <button
        className="button button-full"
        type="button"
        disabled={busy}
        onClick={createNewBackup}
      >
        {busy ? "處理中…" : "建立新的加密雲端備份"}
      </button>

      {issuedCode ? (
        <div className="recovery-code-panel">
          <strong>你的復原碼（備份 ID）</strong>
          <code>{issuedCode}</code>
          <button
            className="button button-secondary"
            type="button"
            onClick={copyRecoveryCode}
          >
            複製復原碼
          </button>
          <p>
            遺失復原碼就無法還原；任何拿到完整復原碼的人都能解密備份，請像密碼一樣妥善保存。
          </p>
        </div>
      ) : null}

      <div className="cloud-restore">
        <label className="form-field" htmlFor="cloud-recovery-code">
          <span>已有復原碼</span>
          <input
            id="cloud-recovery-code"
            type="text"
            value={recoveryCode}
            onChange={(event) => setRecoveryCode(event.target.value.trim())}
            placeholder="PD1.xxxxx.xxxxx"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="cloud-backup-actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={prepareRestore}
          >
            用復原碼還原
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={updateBackup}
          >
            更新這份備份
          </button>
          <button
            className="button button-text"
            type="button"
            disabled={busy || !recoveryCode}
            onClick={() => setConfirmDelete(true)}
          >
            刪除雲端備份
          </button>
        </div>
      </div>

      <p className="form-status" role="status" aria-live="polite">
        {message}
      </p>

      {pendingRestore ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-cloud-title"
          >
            <h2 id="restore-cloud-title">確認還原雲端備份</h2>
            <p>目前瀏覽器內的學習進度與研究偏好會被備份內容取代。</p>
            <div className="stack">
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={restoreBackup}
              >
                確認還原
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setPendingRestore(null)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-cloud-title"
          >
            <h2 id="delete-cloud-title">刪除加密雲端備份？</h2>
            <p>刪除後這組復原碼將無法再還原資料，本機資料不受影響。</p>
            <div className="stack">
              <button
                className="button button-danger"
                type="button"
                disabled={busy}
                onClick={removeBackup}
              >
                永久刪除雲端備份
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setConfirmDelete(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
