import Link from "next/link";
export default function NotFound() { return <main id="main-content" className="page"><section className="card" style={{ textAlign: "center", marginTop: "3rem" }}><p className="eyebrow">404</p><h1>這一頁找不到</h1><p className="muted">內容可能已移動，或網址輸入不完整。</p><Link className="button" href="/">回到今日</Link></section></main>; }
