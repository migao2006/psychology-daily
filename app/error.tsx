"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main-content" className="page"><section className="card" style={{ textAlign: "center", marginTop: "3rem" }}><h1>暫時無法顯示</h1><p className="muted">已綁定的資料不會因此被清除。請再試一次。</p><button className="button" type="button" onClick={reset}>重新載入</button></section></main>; }
