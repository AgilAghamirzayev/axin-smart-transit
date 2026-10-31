import Link from "next/link";
import { ArrowUpRight, BusFront, LayoutDashboard, MapPinned, Radio, Route, Sparkles } from "lucide-react";
export function AppShell({ mode, children }: { mode: "passenger" | "operator"; children: React.ReactNode }) {
  return <div className={"app-shell app-shell--"+mode}>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-symbol"><Route size={25} /></span><span className="brand-word">axın<span className="brand-period">.</span><small>SMART TRANSIT</small></span></Link>
      <p className="nav-label">İŞ SAHƏSİ</p>
      <nav aria-label="Əsas naviqasiya">
        <Link href="/" className={"nav-item " + (mode === "passenger" ? "active" : "")}><MapPinned size={19} /> <span className="nav-text">Xəritə</span> <span className="nav-arrow">↗</span></Link>
        <Link href="/operator" className={"nav-item " + (mode === "operator" ? "active" : "")}><LayoutDashboard size={19} /> <span className="nav-text">Operator</span></Link>
      </nav>
      <div className="sidebar-note"><span className="note-icon"><Sparkles size={20} /></span><h3>Bir şəhər.<br />Daha rahat hərəkət.</h3><p>Sizin bildirişiniz, hər kəs üçün daha yaxşı səfər.</p><div className="note-bus"><BusFront size={55} strokeWidth={1} /><span>→</span></div></div>
      <div className="sidebar-bottom"><Radio size={16} /><span>Digital Challenge<br /><strong>Azerbaijan 2026</strong></span><ArrowUpRight size={15} /></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="breadcrumb">İş sahəsi <span>/</span> <strong>{mode === "passenger" ? "Canlı xəritə" : "Operator paneli"}</strong></div>
      <span className="city-tag"><span className="status-dot" /> Bakı, Azərbaycan</span></header>
      <main>{children}</main><footer className="app-footer"><span>AXIN · Ağıllı şəhərin hərəkət ritmi</span><span>Digital Challenge Azerbaijan · Yarımfinal 2026</span></footer>
    </div>
  </div>;
}
