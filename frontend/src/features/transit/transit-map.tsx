"use client";
import { useEffect, useId, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Route, Stop, Vehicle } from "./types";
import { crowdLabels } from "./crowd-badge";
import { MovingVehicle } from "./moving-vehicle";
import { UserLocation } from "./user-location";
import { AzerbaijanLayer, CountryOverview } from "./azerbaijan-layer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JourneyPoint,JourneyOption } from '@/features/journey/types';
import {JourneyMapLayer,FocusLocation} from '@/features/journey/journey-map-layer';

function JourneyPicker({mode,onPoint}:{mode?:string|null;onPoint?:(point:JourneyPoint)=>void}) {
  useMapEvents({click:event=>{if(mode)onPoint?.({latitude:event.latlng.lat,longitude:event.latlng.lng,name:'Xəritə nöqtəsi · '+event.latlng.lat.toFixed(4)+', '+event.latlng.lng.toFixed(4)});}});
  return null;
}

function FitRoute({ routes, selectedStop }: { routes: Route[]; selectedStop?: Stop }) {
  const map=useMap();
  const key=routes.map(r=>r.id).join(",");
  useEffect(()=>{
    if(selectedStop && routes.length!==1) { map.setView([selectedStop.latitude,selectedStop.longitude],16); return; }
    const points=routes.flatMap(r=>r.paths.flatMap(p=>p.points.map(s=>[s.latitude,s.longitude] as [number,number])));
    if(points.length) map.fitBounds(points,{padding:[40,40],maxZoom:15});
    // Only selection changes bounds, never live GPS refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key,selectedStop?.id,map]);
  return null;
}
function VisibleStops({ stops, selected, detailed, onStop }: { stops: Stop[]; selected?: string; detailed: boolean; onStop?: (id:string)=>void }) {
  const map=useMap();
  const [view,setView]=useState(()=>({bounds:map.getBounds(),zoom:map.getZoom()}));
  useMapEvents({moveend:()=>setView({bounds:map.getBounds(),zoom:map.getZoom()}),zoomend:()=>setView({bounds:map.getBounds(),zoom:map.getZoom()})});
  const visible=stops.filter(s=>s.id===selected || ((detailed || (view?.zoom??0)>=14) && view?.bounds.contains([s.latitude,s.longitude]))).slice(0,500);
  return <>{visible.map(stop=><CircleMarker key={stop.id} center={[stop.latitude,stop.longitude]} radius={stop.id===selected?9:4}
    pathOptions={{color:stop.id===selected?"#173d32":"#ffffff",weight:2,fillColor:"#547c66",fillOpacity:1}}
    eventHandlers={{click:()=>onStop?.(stop.id)}}><Popup><b>{stop.name}</b><br/>BakuBus · rəsmi dayanacaq nöqtəsi</Popup></CircleMarker>)}</>;
}
function busIcon(color:string,stale:boolean,selected:boolean) {
  return L.divIcon({className:"bus-marker",iconSize:[38,38],iconAnchor:[19,19],
    html:'<div style="background:'+(stale?"#84918e":color)+';box-shadow:0 0 0 '+(selected?6:3)+'px white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M9 3v8M7 19v2M17 19v2M8 15h1M15 15h1"/></svg></div>'});
}
export default function TransitMap({routes,vehicles,allStops,stopId,selectedVehicle,onStop,onVehicle,pickMode,onJourneyPoint,journeyOrigin,journeyDestination,journey,focusLocation,onUserLocation}:{
  routes:Route[];vehicles:Vehicle[];allStops?:Stop[];stopId?:string;selectedVehicle?:string;
  onStop?:(id:string)=>void;onVehicle?:(id:string)=>void;
  pickMode?:string|null;onJourneyPoint?:(point:JourneyPoint)=>void;journeyOrigin?:JourneyPoint|null;journeyDestination?:JourneyPoint|null;
  journey?:JourneyOption|null;focusLocation?:JourneyPoint|null;
  onUserLocation?:(point:JourneyPoint)=>void;
}) {
  const [tileError,setTileError]=useState(false);
  const [mapStyle,setMapStyle]=useState<string>("azerbaijan");
  const mapPanelId=useId();
  const stops=useMemo(()=>allStops??[...new Map(routes.flatMap(r=>r.stops).map(s=>[s.id,s])).values()],[routes,allStops]);
  const routeById=useMemo(()=>new Map(routes.map(r=>[r.id,r])),[routes]);
  const detailed=routes.length<=3;
  return <div className="map-with-tabs">
    <Tabs value={mapStyle} onValueChange={value=>setMapStyle(String(value))} className="map-style-tabs">
      <TabsList aria-label="Xəritə görünüşü"><TabsTrigger id={mapPanelId+'-azerbaijan'} aria-controls={mapPanelId} value="azerbaijan">Azərbaycan · Open Data</TabsTrigger><TabsTrigger id={mapPanelId+'-street'} aria-controls={mapPanelId} value="street">Küçə · OpenStreetMap</TabsTrigger></TabsList>
    </Tabs>
    <div className="map-source-note">{mapStyle==='azerbaijan'?<><a href="https://opendata.az/@azerbaycan-respublikasinin-ekologiya-ve-tebii-servetler-nazirliyi/azerbaycanin-rayonlari" target="_blank" rel="noreferrer">ETSN / Open Data</a> · rayonlar və yaşayış məntəqələri · CC BY · küçə fonu: OSM</>:<>OpenStreetMap küçə xəritəsi · AYNA marşrutları hər iki görünüşdə saxlanılır</>}</div>
    <div className="map-frame" role="tabpanel" id={mapPanelId} aria-labelledby={mapPanelId+'-'+mapStyle}>
    <MapContainer center={[40.39,49.85]} zoom={12} scrollWheelZoom dragging doubleClickZoom touchZoom keyboard preferCanvas className="transit-map">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        eventHandlers={{tileerror:()=>setTileError(true)}}/>
      {!journey&&<FitRoute routes={routes} selectedStop={stops.find(s=>s.id===stopId)}/>}
      <FocusLocation point={focusLocation}/>
      {journey&&<JourneyMapLayer journey={journey} routes={routes} origin={journeyOrigin} destination={journeyDestination}/>}
      <UserLocation onLocation={fix=>onUserLocation?.({latitude:fix.lat,longitude:fix.lng,name:'Mənim mövqeyim'})}/>
      <JourneyPicker mode={pickMode} onPoint={onJourneyPoint}/>
      {[journeyOrigin,journeyDestination].map((point,index)=>point&&<CircleMarker key={'journey-'+index} center={[point.latitude,point.longitude]} radius={9}
        pathOptions={{color:'white',weight:3,fillColor:index?'#e08332':'#267bd0',fillOpacity:1}}><Popup>{index?'Təyinat':'Başlanğıc'} · {point.name}</Popup></CircleMarker>)}
      <AzerbaijanLayer active={mapStyle==='azerbaijan'}/>
      <CountryOverview/>
      {!journey&&routes.flatMap(route=>route.paths.map((path,index)=><Polyline key={route.id+"-"+index}
        positions={path.points.map(p=>[p.latitude,p.longitude] as [number,number])}
        pathOptions={{color:route.color,weight:detailed?4:1.5,opacity:detailed?.85:.35}}>
        <Popup>{route.number} · {route.name}<br/>AYNA trayektoriyası · hissə {index+1}</Popup>
      </Polyline>))}
      {!journey&&<VisibleStops stops={stops} selected={stopId} detailed={detailed} onStop={pickMode?undefined:onStop}/>}
      {vehicles.map(vehicle=>{
        const route=routeById.get(vehicle.routeId);
        const popup=<Popup><b>{route?.number} · {vehicle.id}</b><br/>{vehicle.stale?"GPS köhnəlib":crowdLabels[vehicle.crowdLevel]}<br/>
          {vehicle.etaMinutes===null?"ETA üçün uyğun dayanacaq seçin":vehicle.etaMinutes+" dəq. · simulyasiya"}<br/>Xətt hissəsi {vehicle.pathIndex+1} · {vehicle.source==="SIMULATED"?"GPS simulyasiyası":"GPS"}</Popup>;
        return <MovingVehicle key={vehicle.id} vehicle={vehicle} route={route}
          icon={detailed || selectedVehicle===vehicle.id ? busIcon(route?.color??"#6757df",vehicle.stale,vehicle.id===selectedVehicle) : undefined}
          onClick={()=>onVehicle?.(vehicle.id)}>{popup}</MovingVehicle>;
      })}
    </MapContainer>
    <div className="map-label"><span className="status-dot"/> {journey?'Seçilmiş səfər':'AYNA'} <span>•</span> {journey?(journey.legs.map(l=>l.routeNumber).join(' → ')||'Piyada'):'Rəsmi marşrut xətləri'}</div>
    {pickMode&&<div className="map-pick-banner">{pickMode==='origin'?'Başlanğıcı':'Təyinatı'} xəritəyə klikləyərək seçin</div>}
    {tileError&&<div className="map-tile-error">Xəritə fonu yüklənmədi. Marşrut və GPS nöqtələri işləyir.</div>}
    <div className="map-legend"><span className="legend-line"/> Marşrut <span className="legend-stop"/> Dayanacaq <span className="legend-bus"/> Simulyasiya</div>
    </div>
  </div>;
}
