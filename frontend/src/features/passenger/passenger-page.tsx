"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, BusFront, Clock3, MapPin, MessageSquarePlus, Radio, Route as RouteIcon, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteCombobox } from "./route-combobox";
import { StopCombobox } from "./stop-combobox";
import { JourneyPlanner } from '@/features/journey/journey-planner';
import type { JourneyPoint, JourneyOption } from '@/features/journey/types';
import {nearestStop} from '@/features/journey/journey-geometry';
import { BoardingPanel } from '@/features/presence/boarding-panel';
import { NetworkSource } from "@/features/transit/network-source";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { MapView } from "@/features/transit/map-view";
import { CrowdBadge } from "@/features/transit/crowd-badge";
import { useLiveData } from "@/features/transit/use-live-data";
import { ReportDialog } from "@/features/crowding/report-dialog";
import type { TransitSnapshot, Vehicle, NetworkCatalog } from "@/features/transit/types";

export function PassengerPage() {
  const [panelTab,setPanelTab]=useState<'journey'|'fleet'>('journey');
  const [journey,setJourney]=useState<JourneyOption|null>(null);
  const [focusLocation,setFocusLocation]=useState<JourneyPoint|null>(null);
  const [vehicleLimit, setVehicleLimit] = useState(12);
  const [routeId, setRouteId] = useState("");
  const [stopId, setStopId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [reportVehicle, setReportVehicle] = useState<Vehicle | null>(null);
  const [boardingVehicle,setBoardingVehicle]=useState<Vehicle|null>(null);
  const [journeyOrigin,setJourneyOrigin]=useState<JourneyPoint|null>(null);
  const [journeyDestination,setJourneyDestination]=useState<JourneyPoint|null>(null);
  const [pickMode,setPickMode]=useState<'origin'|'destination'|null>(null);
  const params = new URLSearchParams();
  if (routeId && !journey) params.set("routeId", routeId);
  if (stopId && !journey) params.set("stopId", stopId);
  const { data, error, updatedAt } = useLiveData<TransitSnapshot>("/transit/snapshot?" + params);
  const catalog = useLiveData<NetworkCatalog>("/transit/network", undefined, 0);
  const routes = useMemo(() => catalog.data?.routes ?? [], [catalog.data]);
  const visibleRoutes = useMemo(() => journey ? routes.filter(r=>journey.legs.some(l=>l.routeId===r.id)) : routeId ? routes.filter(r => r.id === routeId) : stopId
    ? routes.filter(r => r.stops.some(s => s.id === stopId)) : routes, [routes, routeId, stopId,journey]);
  const stops = useMemo(() => routeId ? routes.find(r => r.id === routeId)?.stops ?? [] : catalog.data?.stops ?? [], [routeId, routes, catalog.data]);
  const boardingStops=useMemo(()=>{const ids=new Set(routes.flatMap(r=>r.stops.map(s=>s.id)));return (catalog.data?.stops??[]).filter(s=>ids.has(s.id));},[routes,catalog.data]);
  const journeyVehicles=journey?data?.vehicles.filter(v=>journey.legs.some(l=>l.vehicleId===v.id)):data?.vehicles;
  function applyLocation(point:JourneyPoint){
    const nearest=nearestStop(point,boardingStops);
    setJourneyOrigin(nearest&&nearest.distance<=800?{...point,nearestStopId:nearest.stop.id,nearestStopName:nearest.stop.name,distanceMeters:Math.round(nearest.distance)}:point);
    setFocusLocation(point);setJourney(null);
  }
  const active = data?.vehicles.filter(v => !v.stale).length ?? 0;
  const nextArrival = useMemo(() => data?.vehicles.find(v => v.etaMinutes !== null), [data]);
  const stopName = stops.find(s => s.id === stopId)?.name;
  return <AppShell mode="passenger"><div className="passenger-workspace"><aside className="passenger-panel" aria-label="Səfər və avtobus axtarışı">
    <div className="explore-heading"><div><span className="eyebrow">BAKI · İCTİMAİ NƏQLİYYAT</span><h1>Hara gedək?</h1></div><span className="explore-live"><span className="status-dot"/>Canlı</span></div>
    <div className="workspace-tabs" role="tablist" aria-label="Xəritə paneli" onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'journey':event.key==='End'?'fleet':panelTab==='journey'?'fleet':'journey';setPanelTab(next);document.getElementById(next+'-tab')?.focus();}}}><button id="journey-tab" role="tab" tabIndex={panelTab==='journey'?0:-1} aria-selected={panelTab==='journey'} aria-controls="journey-panel" onClick={()=>setPanelTab('journey')}><RouteIcon size={18}/>Səfər planla</button><button id="fleet-tab" role="tab" tabIndex={panelTab==='fleet'?0:-1} aria-selected={panelTab==='fleet'} aria-controls="fleet-panel" onClick={()=>setPanelTab('fleet')}><BusFront size={18}/>Avtobuslar</button></div>
    {boardingVehicle&&<BoardingPanel key={boardingVehicle.id} vehicle={boardingVehicle} onClose={()=>setBoardingVehicle(null)}/>}
    {(error || catalog.error) && <div role="alert" className="connection-error"><WifiOff size={18} />{error ?? catalog.error} Son məlumatlar köhnəlmiş ola bilər. Yenidən qoşuluruq…</div>}
    <div id="fleet-panel" role="tabpanel" aria-labelledby="fleet-tab" hidden={panelTab!=='fleet'}><details className="browse-network" open><summary>Xətt və dayanacaq axtar</summary><div className="browse-fields">
      <div><label htmlFor="route">MARŞRUT</label><RouteCombobox routes={routes} value={routeId} onChange={id=>{setRouteId(id);setStopId('');setJourney(null);setSelectedVehicle('');}}/></div>
      <div><label htmlFor="stop">DAYANACAQ</label><StopCombobox key={routeId} stops={stops} value={stopId} onChange={id=>{setStopId(id);setJourney(null);}}/></div>
      <p>{routes.length} xətt variantı · AYNA. Dayanacaq əlaqələri yaxınlıq əsasında təxmin edilir.</p>
    </div></details>
    <section className="arrivals-section"><div className="section-heading"><div><h2>{stopName ? stopName + " · Gəlişlər" : "Yoldakı avtobuslar"}</h2><p>{stopName ? "Dayanacağa yaxın xətlər üzrə təxmini gəlişlər. Xidmət əlaqəsi rəsmi təsdiqlənməyib." : "Gəliş vaxtını görmək üçün xəritədən və ya siyahıdan dayanacaq seçin."}</p></div><Badge variant="outline">GPS + sərnişin bildirişləri</Badge></div>
      {!data && !error && <div className="empty-state">Avtobuslar yüklənir…</div>}
      {data && data.vehicles.length === 0 && <div className="empty-state">Bu dayanacaq üçün uyğun xətt hissəsi tapılmadı. Dayanacaq xəritədə saxlanılır; mənbədə xidmət əlaqəsi göstərilməyib.</div>}
      <div className="vehicle-grid">{journeyVehicles?.slice(0,vehicleLimit).map(vehicle => <Card key={vehicle.id} className={"vehicle-card " + (selectedVehicle === vehicle.id ? "highlighted" : "")}>
        <div className="vehicle-top"><button className="vehicle-identity" onClick={() => setSelectedVehicle(vehicle.id)} aria-label={vehicle.id + " xəritədə seç"}>
          <span className="vehicle-icon" style={{ color: routes.find(r => r.id === vehicle.routeId)?.color }}><BusFront size={24} /></span>
          <span><strong>{vehicle.id}</strong><small>{routes.find(r => r.id === vehicle.routeId)?.number} nömrəli xətt · hissə {vehicle.pathIndex+1}</small></span></button>
          <div className="eta">{error || vehicle.stale ? "—" : vehicle.etaMinutes ?? "—"}<small>{vehicle.etaMinutes !== null ? "dəqiqə · təxmini" : stopId ? "ETA yoxdur" : "dayanacaq seçin"}</small></div></div>
        <div className="vehicle-detail"><CrowdBadge level={vehicle.crowdLevel} /><span>{vehicle.stale ? "GPS köhnəlib" : Math.round(vehicle.speedKmh) + " km/saat"}</span></div>
        <small className="fine-print">GPS iştirakçıları: {vehicle.gpsParticipants??0} · tutum fərziyyəsi {vehicle.nominalCapacity??60}. Tam sərnişin sayı deyil.</small>
        <Button variant="outline" className="report-button" disabled={vehicle.stale} onClick={()=>{setBoardingVehicle(vehicle);document.querySelector('.passenger-panel')?.scrollTo({top:0,behavior:'smooth'});}}>Bu avtobusdayam · GPS iştirakı</Button>
        <Button variant="outline" className="report-button" disabled={vehicle.stale || !!error} onClick={() => setReportVehicle(vehicle)}><MessageSquarePlus size={15} /> Sıxlığı bildir <ArrowUpRight size={14} /></Button>
      </Card>)}</div>
      {!!journeyVehicles && journeyVehicles.length > vehicleLimit && <Button className="load-more" variant="outline" onClick={()=>setVehicleLimit(v=>v+12)}>Daha 12 avtobus göstər ({vehicleLimit} / {journeyVehicles.length})</Button>}
    </section>
    </div>
    <section id="journey-panel" role="tabpanel" aria-labelledby="journey-tab" hidden={panelTab!=='journey'}>
      <JourneyPlanner stops={catalog.data?.stops??[]} boardingStops={boardingStops} origin={journeyOrigin} destination={journeyDestination}
        onOrigin={point=>{setJourneyOrigin(point);setJourney(null);}} onDestination={point=>{setJourneyDestination(point);setJourney(null);}}
        onLocate={setFocusLocation} onPick={mode=>{setPickMode(mode);setJourney(null);}}
        onSelect={option=>{setJourney(option);setSelectedVehicle(option?.legs[0]?.vehicleId??'');}}/>
    </section>
    <div className="panel-sources"><NetworkSource catalog={catalog.data} />    <details className="network-overview"><summary>Şəbəkə göstəriciləri</summary><section className="stats-grid" aria-label="Şəbəkə göstəriciləri">
      <Stat icon={<BusFront />} label="İzlənən avtobus" value={data ? String(active).padStart(2, "0") : "—"} note="Hərəkət simulyasiya edilir" />
      <Stat icon={<RouteIcon />} label="Rəsmi marşrut nömrəsi" value={String(catalog.data?.metadata.uniqueRouteNumbers ?? 0)} note={routes.length + " xətt variantı · AYNA"} />
      <Stat icon={<MapPin />} label="Seçilmiş dayanacaq" value={stopName ?? "Seçilməyib"} note={stopId ? "Gəliş vaxtları hesablanır" : "ETA üçün dayanacaq seçin"} text />
      <Stat icon={<Clock3 />} label="Növbəti gəliş" value={nextArrival ? nextArrival.etaMinutes + " dəq." : "—"} note={nextArrival ? nextArrival.id + " · təxmini gəliş" : "Dayanacaq üzrə görünəcək"} />
    </section>
    </details>
</div>
    </aside>
      <Card className="map-card"><div className="map-card-header"><h2><span className="status-dot" /> Canlı nəqliyyat xəritəsi</h2><Badge variant="outline">{journey?journeyVehicles?.length??0:active} avtobus</Badge></div>
        <MapView routes={visibleRoutes} vehicles={journeyVehicles ?? []} stopId={journey?undefined:stopId} journey={journey} focusLocation={focusLocation} selectedVehicle={selectedVehicle}
          onUserLocation={applyLocation} pickMode={pickMode} journeyOrigin={journeyOrigin} journeyDestination={journeyDestination} onJourneyPoint={point=>{if(pickMode==='origin')applyLocation(point);else setJourneyDestination(point);setPickMode(null);setJourney(null);}}
          allStops={journey?[...new Map(journey.legs.flatMap(l=>[l.from,l.to]).map(s=>[s.id,s])).values()]:stops} onStop={journey?undefined:setStopId} onVehicle={setSelectedVehicle} />
        <div className="map-caption"><span>Dayanacaqlar yaxın miqyasda görünür. ETA simulyasiyaya əsaslanır.</span><span>{updatedAt ? "Yeniləndi " + updatedAt.toLocaleTimeString("az-AZ") : "Qoşulur…"}</span></div>
      </Card>
    {reportVehicle && <ReportDialog key={reportVehicle.id} vehicle={reportVehicle} onClose={() => setReportVehicle(null)} />}
  </div></AppShell>;
}
function Stat({ icon, label, value, note, text = false }: { icon: React.ReactNode; label: string; value: string; note: string; text?: boolean }) {
  return <Card className="stat-card"><div><span className="stat-label">{label}</span><strong className={text ? "stat-value text-value" : "stat-value"}>{value}</strong><span className="stat-note">{note}</span></div><span className="stat-icon">{icon}</span></Card>;
}
