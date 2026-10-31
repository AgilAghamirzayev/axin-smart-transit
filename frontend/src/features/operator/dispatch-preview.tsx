"use client";
import {useEffect} from 'react';
import {CircleMarker,MapContainer,Polyline,TileLayer,Tooltip,useMap} from 'react-leaflet';
import type {Route} from '@/features/transit/types';
function Fit({route}:{route:Route}){
  const map=useMap();
  useEffect(()=>{map.fitBounds(route.paths.flatMap(p=>p.points.map(c=>[c.latitude,c.longitude] as [number,number])),{padding:[30,30],maxZoom:15});},[map,route]);
  return null;
}
export default function DispatchPreview({route,valid}:{route:Route;valid:boolean}){
  const first=route.paths[0]?.points[0],last=route.paths.at(-1)?.points.at(-1);
  return <div className="dispatch-preview" aria-label="Təyin ediləcək tam trayektoriya"><MapContainer center={[40.4,49.85]} zoom={12} scrollWheelZoom={false} style={{height:'100%',width:'100%'}}>
    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'/>
    <Fit route={route}/>{route.paths.map((p,i)=><Polyline key={i} positions={p.points.map(c=>[c.latitude,c.longitude])} pathOptions={{color:valid?'#176653':'#a78a58',weight:4,dashArray:valid?undefined:'6 8'}}/>)}
    {first&&<CircleMarker center={[first.latitude,first.longitude]} radius={6} pathOptions={{color:'#176653',fillOpacity:1}}><Tooltip permanent>Başlanğıc</Tooltip></CircleMarker>}
    {last&&<CircleMarker center={[last.latitude,last.longitude]} radius={6} pathOptions={{color:'#7352c5',fillOpacity:1}}><Tooltip permanent>Son nöqtə</Tooltip></CircleMarker>}
  </MapContainer></div>;
}
