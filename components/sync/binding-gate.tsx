"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exportProgress, importProgress } from "@/lib/db/backup";
import {
  bindNewCloudBackup,
  CloudSyncConflictError,
  downloadCloudBackup,
  restoreAndBindCloudBackup,
  uploadCloudBackup,
} from "@/lib/db/cloud-backup";
import { getDatabase } from "@/lib/db/database";
import { DATA_CHANGED_EVENT } from "@/lib/db/sync-events";
import type { CloudBinding } from "@/lib/schemas/progress";

type GateState = "loading" | "setup" | "confirm-new" | "confirm-restore" | "ready" | "replaced";

export function BindingGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading");
  const [message, setMessage] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [binding, setBinding] = useState<CloudBinding | null>(null);
  const syncing = useRef(false);
  const debounceTimer = useRef<number | null>(null);

  const syncNow = useCallback(async () => {
    const db = getDatabase();
    const current = await db.cloudBindings.get("primary");
    if (!current || current.status !== "active" || syncing.current) return;
    syncing.current = true;
    try {
      const backup = await exportProgress();
      const result = await uploadCloudBackup(
        JSON.stringify(backup),
        current.recoveryCode,
        current.deviceId,
        current.revision,
      );
      const next: CloudBinding = {
        ...current,
        revision: result.revision,
        lastSyncedAt: result.updatedAt,
        updatedAt: new Date().toISOString(),
      };
      await db.cloudBindings.put(next);
      setBinding(next);
      setMessage("已同步");
    } catch (error) {
      if (
        error instanceof CloudSyncConflictError &&
        error.reason === "device_replaced"
      ) {
        const next = { ...current, status: "replaced" as const, updatedAt: new Date().toISOString() };
        await db.cloudBindings.put(next);
        setState("replaced");
      } else {
        setMessage(error instanceof Error ? error.message : "同步暫時失敗");
      }
    } finally {
      syncing.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const db = getDatabase();
      const stored = await db.cloudBindings.get("primary");
      if (!active) return;
      if (!stored) {
        setState("setup");
        return;
      }
      if (stored.status === "replaced") {
        setState("replaced");
        return;
      }
      try {
        const remote = await downloadCloudBackup(stored.recoveryCode);
        if (!stored.lastSyncedAt || remote.updatedAt > stored.lastSyncedAt) {
          await importProgress(remote.raw);
        }
        const next: CloudBinding = {
          ...stored,
          revision: remote.revision,
          status: "active",
          lastSyncedAt: remote.updatedAt,
          updatedAt: new Date().toISOString(),
        };
        await db.cloudBindings.put(next);
        if (active) {
          setBinding(next);
          setState("ready");
        }
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "無法載入雲端資料");
          setState("setup");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state !== "ready") return;
    const schedule = () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => void syncNow(), 8_000);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void syncNow();
    };
    window.addEventListener(DATA_CHANGED_EVENT, schedule);
    window.addEventListener("online", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, schedule);
      window.removeEventListener("online", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [state, syncNow]);

  async function createBinding() {
    setMessage("正在加密並建立綁定…");
    try {
      const backup = await exportProgress();
      const result = await bindNewCloudBackup(JSON.stringify(backup));
      setRecoveryCode(result.recoveryCode);
      setBinding({
        id: "primary",
        recoveryCode: result.recoveryCode,
        deviceId: result.deviceId,
        status: "active",
        revision: result.revision,
        boundAt: new Date().toISOString(),
        lastSyncedAt: result.updatedAt,
        updatedAt: new Date().toISOString(),
      });
      setConfirmation("");
      setMessage("");
      setState("confirm-new");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "建立綁定失敗");
    }
  }

  async function confirmNewBinding() {
    if (!binding || confirmation.trim() !== recoveryCode) {
      setMessage("請完整貼回畫面上的復原碼，確認你已保存。");
      return;
    }
    await getDatabase().cloudBindings.put(binding);
    setMessage("已綁定並同步");
    setState("ready");
  }

  async function prepareRestore() {
    setMessage("正在驗證復原碼…");
    try {
      const downloaded = await downloadCloudBackup(recoveryCode.trim());
      setPendingRestore(downloaded.raw);
      setMessage("");
      setState("confirm-restore");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "找不到可復原的資料");
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    setMessage("正在取代舊裝置綁定…");
    try {
      const result = await restoreAndBindCloudBackup(recoveryCode.trim());
      await importProgress(result.raw);
      const next: CloudBinding = {
        id: "primary",
        recoveryCode: result.recoveryCode,
        deviceId: result.deviceId,
        status: "active",
        revision: result.revision,
        boundAt: new Date().toISOString(),
        lastSyncedAt: result.updatedAt,
        updatedAt: new Date().toISOString(),
      };
      await getDatabase().cloudBindings.put(next);
      setBinding(next);
      setPendingRestore(null);
      setMessage("資料已復原；舊裝置已停用");
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "復原失敗");
    }
  }

  if (state === "ready") {
    return (
      <>
        <div className="sync-status" role="status" aria-live="polite">
          <span aria-hidden="true">●</span>
          {message || (binding?.lastSyncedAt ? "雲端已綁定" : "等待同步")}
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="binding-gate" id="main-content">
      <section className="card binding-card" aria-labelledby="binding-title">
        <span className="brand-mark" aria-hidden="true">心</span>
        <h1 id="binding-title">
          {state === "replaced" ? "這台裝置已停用" : "先綁定你的學習資料"}
        </h1>
        {state === "loading" ? <p>正在檢查資料綁定…</p> : null}
        {state === "setup" || state === "replaced" ? (
          <>
            <p>
              學習進度會先保存在這個瀏覽器的 IndexedDB 快取，再以端對端加密同步。
              復原碼是唯一復原方式，服務端無法讀取內容。
            </p>
            <button className="button button-full" type="button" onClick={createBinding}>
              {state === "replaced" ? "建立新的資料綁定" : "保留目前進度並建立綁定"}
            </button>
            <div className="divider" aria-hidden="true">或</div>
            <label className="form-field">
              <span>使用既有復原碼</span>
              <textarea
                rows={3}
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button className="button button-secondary button-full" type="button" onClick={prepareRestore}>
              復原並綁定這台裝置
            </button>
            <p className="notice">
              一次只允許一台裝置。復原到新裝置後，原裝置會停止同步。
            </p>
          </>
        ) : null}
        {state === "confirm-new" ? (
          <>
            <p>請將下列復原碼存到密碼管理器。遺失後無法由網站找回。</p>
            <output className="recovery-code">{recoveryCode}</output>
            <label className="form-field">
              <span>貼回復原碼以確認已保存</span>
              <textarea
                rows={3}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button className="button button-full" type="button" onClick={confirmNewBinding}>
              完成綁定
            </button>
          </>
        ) : null}
        {state === "confirm-restore" ? (
          <>
            <p>
              已找到加密資料。繼續後會匯入此瀏覽器，並讓先前綁定的裝置停止同步。
            </p>
            <button className="button button-full" type="button" onClick={confirmRestore}>
              確認復原並取代舊裝置
            </button>
            <button className="button button-secondary button-full" type="button" onClick={() => setState("setup")}>
              返回
            </button>
          </>
        ) : null}
        {message ? <p className="notice" role="status">{message}</p> : null}
      </section>
    </main>
  );
}
