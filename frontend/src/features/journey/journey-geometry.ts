import type {Route,Stop} from '@/features/transit/types';
import {measurePath,pointAt} from '@/features/transit/path-motion';
import type {JourneyLeg,JourneyPoint} from './types';
export function distanceMeters(a:JourneyPoint,b:JourneyPoint){
  const r=Math.PI/180,dLat=(b.latitude-a.latitude)*r,dLon=(b.longitude-a.longitude)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function nearestStop(point:JourneyPoint,stops:Stop[]){
  return stops.map(stop=>({stop,distance:distanceMeters(point,stop)})).sort((a,b)=>a.distance-b.distance)[0];
}
/** Keep every intervening source vertex, including reverse phases and a cycle boundary. */
export function legCoordinates(route:Route,leg:JourneyLeg):[number,number][]{
  const path=route.paths[leg.pathIndex];if(!path)return [];
  const m=measurePath(path),from=leg.boardProgress,to=leg.alightProgress;
  if(!m.cycle||!Number.isFinite(from)||!Number.isFinite(to)||to<from)return [];
  const phases=[...m.distances,...(path.closed?[]:m.distances.map(d=>m.cycle-d))];
  const inner:number[]=[];
  for(let lap=Math.floor(from/m.cycle);lap<=Math.floor(to/m.cycle);lap++)
    for(const phase of phases){const value=phase+lap*m.cycle;if(value>from&&value<to)inner.push(value);}
  return [from,...[...new Set(inner)].sort((a,b)=>a-b),to].map(p=>pointAt(m,p));
}
