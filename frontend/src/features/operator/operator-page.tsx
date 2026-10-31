"use client";
import { useState } from "react";
import { Activity, AlertTriangle, ArrowRight, BusFront, CheckCheck, Clock3, LockKeyhole, LogOut, ShieldCheck, Users } from "lucide-react";
import { NetworkSource } from "@/features/transit/network-source";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MapView } from "@/features/transit/map-view";
import { CrowdBadge } from "@/features/transit/crowd-badge";
import { useLiveData } from "@/features/transit/use-live-data";
import { api } from "@/lib/api";
import type { Dashboard, NetworkCatalog } from "@/features/transit/types";
import { DispatchPanel } from './dispatch-panel';
import { OperatorNotifications } from './operator-notifications';

export function OperatorPage() {
  const [routeFilter, setRouteFilter] = useState("");
  const [mapRoute, setMapRoute] = useState("");
  const [dispatchRoute,setDispatchRoute]=useState('');
  const [tableLimit, setTableLimit] = useState(20);
  const catalog = useLiveData<NetworkCatalog>("/transit/network", undefined, 0);
  const routes = catalog.data?.routes ?? [];
  const [authorization, setAuthorization] = useState("");
  const [username, setUsername] = useState("operator");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pendingAlert, setPendingAlert] = useState("");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const { data, error } = useLiveData<Dashboard>(authorization ? "/operator/snapshot" : null, authorization);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setLoginError("");
    try {
      const auth = "Basic " + btoa(String.fromCharCode(...new TextEncoder().encode(username + ":" + password)));
      await api("/operator/snapshot", { headers: { Authorization: auth } });
      setAuthorization(auth); setPassword("");
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Giriş mümkün olmadı"); }
    finally { setBusy(false); }
  }
  async function acknowledge(id: string) {
    setPendingAlert(id); setActionError("");
    try { await api("/operator/alerts/" + id + "/acknowledge", { method: "POST", headers: { Authorization: authorization } });
      setAcknowledged(previous => [...previous, id]);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Əməliyyat alınmadı"); }
    finally { setPendingAlert(""); }
  }
  const filteredAnalytics = data?.transit.analytics.filter(a => {
    const route = routes.find(r=>r.id===a.routeId);
    return route && (route.number.toLowerCase().includes(routeFilter.toLowerCase()) || route.name.toLocaleLowerCase("az").includes(routeFilter.toLocaleLowerCase("az")));
  }) ?? [];
  const activeAlerts = data?.alerts.filter(a => !a.resolvedAt) ?? [];
  return <AppShell mode="operator">
    <section className="page-heading"><div><div className="eyebrow">MƏLUMATDAN DÜZGÜN QƏRARA</div><h1>Şəhərin ritmi, nəzarətinizdə<span>.</span></h1><p>Bütün marşrutlar, sərnişin bildirişləri və avtomatik tövsiyələr bir yerdə.</p></div>
      {authorization && <Button variant="outline" onClick={() => setAuthorization("")}><LogOut size={15} /> Çıxış</Button>}</section>
    {!authorization ? <Card className="login-card"><div className="login-icon"><LockKeyhole size={30} /></div><Badge variant="outline">OPERATOR GİRİŞİ</Badge><h2>Nəqliyyata ümumi baxış</h2><p>Analitika və əməliyyat tövsiyələri üçün daxil olun.</p>
      <form onSubmit={login}><Label htmlFor="username">İstifadəçi adı</Label><Input id="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required />
        <Label htmlFor="password">Şifrə</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        {loginError && <p role="alert" className="error-text">{loginError}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Yoxlanılır…" : "Panelə daxil ol"}<ArrowRight size={16} /></Button>
      </form><small><ShieldCheck size={14} /> Giriş məlumatları yalnız bu səhifənin yaddaşında saxlanılır.</small>
    </Card> : <>
      <NetworkSource catalog={catalog.data} />
      {catalog.error && <div className="connection-error" role="alert">Marşrut kataloqu: {catalog.error} · Yenidən qoşulmağa çalışılır.</div>}
      {error && <div className="connection-error" role="alert">{error} · Paneldəki məlumatlar köhnəlmiş ola bilər.</div>}
      {(!data || !catalog.data) && <div className="empty-state">Operator məlumatları yüklənir…</div>}
      {data && catalog.data && <>
        <OperatorNotifications data={data} routes={routes} onDispatch={id=>{setDispatchRoute(id);document.querySelector('.dispatch-panel')?.scrollIntoView({behavior:'smooth',block:'center'});}}/>
        <DispatchPanel key={dispatchRoute} routes={routes} analytics={data.transit.analytics} authorization={authorization} routeId={dispatchRoute} onRoute={setDispatchRoute}/>
        <section className="operator-metrics">
          <Metric icon={<BusFront />} label="Aktiv avtobus" value={data.transit.vehicles.filter(v => !v.stale).length} detail="Son 60 saniyədə GPS" />
          <Metric icon={<Users />} label="Aktual bildirişlər" value={data.transit.analytics.reduce((sum, a) => sum + a.reporters, 0)} detail="Xətt üzrə unikal iştirakçılar" />
          <Metric icon={<Activity />} label="Yüksək sıxlıqlı xətt" value={data.transit.analytics.filter(a => a.level === "HIGH").length} detail="GPS ilə təsdiqlənmiş" />
          <Metric icon={<AlertTriangle />} label="Aktiv xəbərdarlıq" value={activeAlerts.length} detail="Əlavə avtobus tövsiyəsi" />
        </section>
        <section className="operator-grid"><Card className="operator-routes"><div className="section-heading"><div><h2>Marşrutların vəziyyəti</h2><p>{routes.length} rəsmi xətt variantı · Son {data.transit.reportFreshnessSeconds/60} dəqiqənin bildirişləri</p></div><Badge variant="outline">CANLI</Badge></div>
          <Input aria-label="Operator marşrut axtarışı" placeholder="Marşrut nömrəsini axtar…" value={routeFilter} onChange={e=>{setRouteFilter(e.target.value);setTableLimit(20);}} className="mb-4" />
          <div className="table-scroll"><table><thead><tr><th>Marşrut</th><th>Sıxlıq</th><th>Avtobus</th><th>Bildiriş</th><th>Yüksək sıxlıq müddəti</th></tr></thead><tbody>
            {filteredAnalytics.slice(0,tableLimit).map(a => {
              const route = routes.find(r => r.id === a.routeId)!;
              const percentage = Math.min(100, a.highSeconds / data.transit.anomalyDurationSeconds * 100);
              return <tr key={a.routeId}><td><div className="table-route"><span className="route-number" style={{ background: route.color }}>{route.number}</span><strong>{route.name}<small className="table-secondary">Variant {route.id.slice(-3)}</small></strong></div></td>
                <td><CrowdBadge level={a.level} /></td><td>{a.activeVehicles} / {a.totalVehicles}</td><td>{a.reporters}<small className="table-secondary">{a.highReports} yüksək · {a.gpsParticipants??0} GPS iştirakçısı</small></td>
                <td><div className="duration-cell"><span>{Math.floor(a.highSeconds / 60)} dəq. {a.highSeconds % 60} san.</span><Progress value={percentage} /><small>Hədd: {data.transit.anomalyDurationSeconds / 60} dəqiqə</small></div></td></tr>;
            })}</tbody></table></div>
          {filteredAnalytics.length===0 && <p className="empty-state">Uyğun marşrut tapılmadı.</p>}
          {filteredAnalytics.length>tableLimit && <Button variant="outline" className="load-more" onClick={()=>setTableLimit(v=>v+20)}>Daha 20 xətt göstər ({tableLimit} / {filteredAnalytics.length})</Button>}
          <div className="rule-note"><ShieldCheck size={17} /><p>Ən azı {data.transit.minimumReporters} unikal bildiriş və ≥{Math.round(data.transit.highRatioThreshold * 100)}% HIGH, yaxud bir avtobusda nominal tutumun ≥80%-i qədər GPS iştirakçısı. Siqnal {data.transit.anomalyDurationSeconds / 60} dəqiqə davam etdikdə anomaliya yaranır. GPS sayı tam sərnişin sayı deyil; köhnə ölçmələr hesablanmır.</p></div>
        </Card></section>
        <section className="operator-bottom"><Card className="map-card"><div className="map-card-header"><h2>Şəbəkənin canlı görünüşü</h2><select aria-label="Operator xəritə marşrutu" className="operator-map-select" value={mapRoute} onChange={e=>setMapRoute(e.target.value)}><option value="">Bütün şəbəkə</option>{routes.map(r=><option key={r.id} value={r.id}>{r.number} · variant {r.id.slice(-3)}</option>)}</select></div><MapView routes={mapRoute?routes.filter(r=>r.id===mapRoute):routes} vehicles={mapRoute?data.transit.vehicles.filter(v=>v.routeId===mapRoute):data.transit.vehicles} /></Card>
          <Card className="alerts-panel"><div className="section-heading"><div><h2>Əməliyyat tövsiyələri</h2><p>Avtomatik anomaliya aşkarlanması</p></div><span className="alert-count">{activeAlerts.length}</span></div>
            {actionError && <p className="error-text" role="alert">{actionError}</p>}
            {data.alerts.length === 0 && <div className="no-alerts"><ShieldCheck size={40} /><h3>Hazırda xəbərdarlıq yoxdur</h3><p>Yüksək sıxlıq tələb olunan müddət davam etdikdə tövsiyə burada görünəcək.</p></div>}
            <div className="alerts-list">{data.alerts.map(alert => <article key={alert.id} className={"alert-item " + (alert.resolvedAt ? "resolved" : "")}>
              <div className="alert-top"><Badge variant="outline">{routes.find(r=>r.id===alert.routeId)?.number ?? alert.routeId}</Badge><span>{alert.resolvedAt ? "Aradan qalxıb" : "Yüksək sıxlıq"}</span></div>
              <h3>{alert.resolvedAt ? "Sıxlıq epizodu tamamlandı" : "Əlavə avtobus ehtiyatı ayrılmalıdır"}</h3>
              <p>Yüksək sıxlıq {new Date(alert.startedAt).toLocaleTimeString("az-AZ")} tarixindən izlənib.</p>
              <div className="alert-bottom"><span><Clock3 size={12} />{new Date(alert.triggeredAt).toLocaleTimeString("az-AZ")}</span>
                {alert.acknowledgedAt || acknowledged.includes(alert.id) ? <span className="acknowledged"><CheckCheck size={14} /> Baxılıb</span> :
                  <Button size="sm" variant="outline" disabled={!!error || pendingAlert === alert.id} onClick={() => acknowledge(alert.id)}>Baxıldı kimi qeyd et</Button>}</div>
            </article>)}</div>
          </Card></section>
      </>}
    </>}
  </AppShell>;
}
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <Card className="stat-card"><div><span className="stat-label">{label}</span><strong className="stat-value">{String(value).padStart(2, "0")}</strong><span className="stat-note">{detail}</span></div><span className="stat-icon">{icon}</span></Card>;
}
