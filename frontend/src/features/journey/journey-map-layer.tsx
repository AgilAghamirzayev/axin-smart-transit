"use client";
import {useEffect,useMemo} from 'react';
import {svg} from 'leaflet';
import {Circle,CircleMarker,Polyline,Popup,Tooltip,useMap} from 'react-leaflet';
import type {Route} from '@/features/transit/types';
import type {JourneyOption,JourneyPoint} from './types';
import {legCoordinates} from './journey-geometry';
const colors=['#1a73e8','#7352c5'];
export function JourneyMapLayer({journey,routes,origin,destination}:{journey:JourneyOption;routes:Route[];origin?:JourneyPoint|null;destination?:JourneyPoint|null}){
  const map=useMap();
  const renderer=useMemo(()=>svg(),[]);
  const lines=useMemo(()=>journey.legs.map(leg=>{const route=routes.find(r=>r.id===leg.routeId);return route?legCoordinates(route,leg):[];}),[journey,routes]);
  const walk=useMemo(()=>{
    const pairs:[JourneyPoint,JourneyPoint][]=[];
    if(!journey.legs.length)return origin&&destination?[[[origin.latitude,origin.longitude],[destination.latitude,destination.longitude]] as [number,number][]]:[];
    if(origin)pairs.push([origin,journey.legs[0].from]);
    for(let i=1;i<journey.legs.length;i++)pairs.push([journey.legs[i-1].to,journey.legs[i].from]);
    if(destination)pairs.push([journey.legs.at(-1)!.to,destination]);
    return pairs.map(pair=>pair.map(p=>[p.latitude,p.longitude] as [number,number]));
  },[origin,destination,journey]);
  useEffect(()=>{const points=[...lines.flat(),...walk.flat()];if(points.length)map.fitBounds(points,{padding:[55,55],maxZoom:16});},[map,lines,walk]);
  return <>{lines.map((points,i)=><Polyline renderer={renderer} className="journey-segment" key={i} positions={points} pathOptions={{color:colors[i%2],weight:6,opacity:.9}}><Popup>{journey.legs[i].routeNumber} · {journey.legs[i].from.name} → {journey.legs[i].to.name}</Popup></Polyline>)}
    {walk.map((points,i)=><Polyline key={'walk'+i} positions={points} pathOptions={{color:'#71808e',weight:3,dashArray:'5 8',className:'journey-walk'}}><Popup>Təxmini piyada bağlantısı · küçə üzrə piyada marşrutu deyil</Popup></Polyline>)}
    {journey.legs.flatMap((leg,i)=>[leg.from,leg.to].map((stop,j)=><CircleMarker key={`${i}-${j}`} center={[stop.latitude,stop.longitude]} radius={7} pathOptions={{color:'white',weight:3,fillColor:colors[i%2],fillOpacity:1}}><Tooltip permanent direction="top">{j?'Düşün':'Minin'} · {leg.routeNumber}</Tooltip><Popup>{stop.name}</Popup></CircleMarker>))}
  </>;
}
export function FocusLocation({point}:{point?:JourneyPoint|null}){
  const map=useMap();
  useEffect(()=>{if(point)map.setView([point.latitude,point.longitude],Math.max(map.getZoom(),16));},[point,map]);
  if(!point||point.accuracyMeters===undefined)return null;
  return <><Circle center={[point.latitude,point.longitude]} radius={point.accuracyMeters} interactive={false} pathOptions={{color:'#2878e0',weight:1,fillOpacity:.06}}/><CircleMarker center={[point.latitude,point.longitude]} radius={8} pathOptions={{color:'white',weight:3,fillColor:'#2878e0',fillOpacity:1}}><Tooltip>Mənim mövqeyim · ±{Math.round(point.accuracyMeters)} m</Tooltip></CircleMarker></>;
}
