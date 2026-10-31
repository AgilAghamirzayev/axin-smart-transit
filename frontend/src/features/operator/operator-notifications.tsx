"use client";
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import type {Dashboard,Route} from '@/features/transit/types';
export function OperatorNotifications({data,routes,onDispatch}:{data:Dashboard;routes:Route[];onDispatch:(id:string)=>void}) {
  const [enabled,setEnabled]=useState(false);const [message,setMessage]=useState('');const seen=useRef(new Set<string>());
  const high=data.transit.analytics.filter(a=>a.level==='HIGH');
  useEffect(()=>{
    const active=data.alerts.filter(a=>!a.resolvedAt);
    for(const alert of active){
      if(!seen.current.has(alert.id)&&enabled&&typeof Notification!=='undefined'&&Notification.permission==='granted') {
        const number=routes.find(r=>r.id===alert.routeId)?.number??alert.routeId;
        new Notification(`${number} xəttində yüksək sıxlıq`,{body:'Əlavə avtobus ehtiyacı var. Operator panelinə baxın.',tag:alert.id});
      }
      seen.current.add(alert.id);
    }
  },[data.alerts,enabled,routes]);
  async function subscribe(){
    if(typeof Notification==='undefined'){setMessage('Bu brauzerdə sistem bildirişləri dəstəklənmir. Panel bildirişləri aktivdir.');return;}
    const permission=await Notification.requestPermission();setEnabled(permission==='granted');
    setMessage(permission==='granted'?'Yeni anomaliyalar üçün sistem bildirişləri aktivdir.':'Panel bildirişləri aktivdir; sistem icazəsi verilmədi.');
  }
  return <section className="operator-notifications" aria-label="Operator bildirişləri"><div><strong>{routes.length} xətt variantı · {data.transit.vehicles.length} avtobus · {high.length} yüksək sıxlıqlı xətt</strong>
    <Button size="sm" variant="outline" onClick={subscribe} disabled={enabled}>{enabled?'Bildirişlər aktivdir':'Sistem bildirişlərini aç'}</Button></div>
    {message&&<p role="status">{message}</p>}
    {high.slice(0,5).map(a=><article key={a.routeId} role="status"><span><b>{routes.find(r=>r.id===a.routeId)?.number}</b> xətti: {a.activeVehicles} aktiv avtobus · {a.reporters} bildiriş · {a.gpsParticipants} GPS iştirakçısı · yüksək sıxlıq {Math.floor(a.highSeconds/60)} dəq.</span><Button size="sm" onClick={()=>onDispatch(a.routeId)}>Bu xəttə avtobus göndər</Button></article>)}
    {high.length===0&&<p>Hazırda yüksək sıxlıq siqnalı yoxdur. Davamlı 10 dəqiqəlik siqnal ayrıca anomaliya xəbərdarlığı yaradır.</p>}
  </section>;
}
