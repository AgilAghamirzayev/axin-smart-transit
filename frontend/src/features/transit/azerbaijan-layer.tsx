"use client";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, Pane, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { FeatureCollection, Point, MultiPolygon, Polygon } from "geojson";

interface Geography {
  districts: FeatureCollection<Polygon | MultiPolygon, {name:string}>;
  places: FeatureCollection<Point, {name:string;kind:string}>;
}
let pending:Promise<Geography> | undefined;
function loadGeography() {
  return pending ??= fetch('/data/azerbaijan-geography-v1.json').then(response=>{
    if (!response.ok) throw new Error('Xəritə məlumatı yüklənmədi');
    return response.json() as Promise<Geography>;
  }).catch(error=>{pending=undefined;throw error;});
}
export function AzerbaijanLayer({active}:{active:boolean}) {
  const [data,setData]=useState<Geography>();
  const [error,setError]=useState(false);
  const map=useMap();
  useEffect(()=>{
    const pane=map.getPane('official-geography');
    if(pane) pane.style.display=active?'':'none';
  },[active,map]);
  const [view,setView]=useState(()=>({bounds:map.getBounds(),zoom:map.getZoom()}));
  useMapEvents({moveend:()=>setView({bounds:map.getBounds(),zoom:map.getZoom()})});
  useEffect(()=>{
    let disposed=false;
    loadGeography().then(data=>{if(!disposed)setData(data);}).catch(()=>{if(!disposed)setError(true);});
    return ()=>{disposed=true;};
  },[]);
  const places=useMemo(()=>data?.places.features.filter(f=>{
    const [lng,lat]=f.geometry.coordinates;
    return view.bounds.contains([lat,lng]) && (view.zoom>=12 || (view.zoom>=8 && f.properties.kind==='şəhər'));
  }).slice(0,100)??[],[data,view]);
  return <>
    <Pane name="official-geography" style={{zIndex:350}}>
      {data && <GeoJSON data={data.districts} style={{color:'#337861',weight:1.5,fillColor:'#9dc7a3',fillOpacity:.12}}
        onEachFeature={(feature,layer)=>{
          const label=document.createElement('span');label.textContent=feature.properties.name+' · ETSN / Open Data';
          layer.bindTooltip(label,{sticky:true});
        }}/>}
      {places.map((place,index)=><CircleMarker key={place.properties.name+index} center={[place.geometry.coordinates[1],place.geometry.coordinates[0]]}
        radius={3} pathOptions={{color:'#28644b',weight:1,fillOpacity:1}}>
        <Tooltip direction="top" permanent={view.zoom>=10}>{place.properties.name}</Tooltip>
      </CircleMarker>)}
    </Pane>
    {active && !data && <div className="geography-status" role="status">{error?'Open Data qatı yüklənmədi. Küçə tabına keçə bilərsiniz.':'Azərbaycanın coğrafi məlumatları yüklənir…'}</div>}
  </>;
}

export function CountryOverview() {
  const map=useMap();
  return <button className="country-overview" type="button" onClick={()=>map.fitBounds([[38.35,44.75],[41.95,50.9]],{padding:[25,25],animate:false})}>Azərbaycanı göstər</button>;
}
