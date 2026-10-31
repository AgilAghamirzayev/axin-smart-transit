"use client";
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {api} from '@/lib/api';
import type {Vehicle} from '@/features/transit/types';

/** Session token stays in memory. Raw coordinates are sent only after explicit consent. */
export function BoardingPanel({vehicle,onClose}:{vehicle:Vehicle;onClose:()=>void}) {
  const [consent,setConsent]=useState(false);const [active,setActive]=useState(false);const [message,setMessage]=useState('');
  const session=useRef<string|null>(null),watcher=useRef<number|null>(null),last=useRef(0),sending=useRef(false),generation=useRef(0);
  async function end(){
    generation.current++;
    if(watcher.current!==null)navigator.geolocation.clearWatch(watcher.current);watcher.current=null;
    const id=session.current;session.current=null;
    if(id)await api('/presence/'+id+'/end',{method:'POST',keepalive:true}).catch(()=>{});
  }
  useEffect(()=>{
    const token=session,watch=watcher,version=generation;
    return ()=>{
      version.current++;
      if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);
      if(token.current)void fetch('/api/presence/'+token.current+'/end',{method:'POST',keepalive:true});
    };
  },[]);
  async function start(){
    if(!consent || !navigator.geolocation){setMessage('Məkan icazəsi və razılıq tələb olunur.');return;}
    const version=++generation.current;setActive(true);setMessage('GPS təsdiqi başlayır…');
    try {
      let reporter=localStorage.getItem('transit-reporter');if(!reporter){reporter=crypto.randomUUID();localStorage.setItem('transit-reporter',reporter);}
      const result=await api<{sessionId:string}>('/presence',{method:'POST',body:JSON.stringify({reporterId:reporter,vehicleId:vehicle.id,consent:true})});
      if(version!==generation.current){await api('/presence/'+result.sessionId+'/end',{method:'POST'});return;}
      session.current=result.sessionId;last.current=0;
      watcher.current=navigator.geolocation.watchPosition(async fix=>{
        if(version!==generation.current || sending.current || Date.now()-last.current<5000)return;
        last.current=Date.now();sending.current=true;
        try {
          const answer=await api<{verified:boolean;message:string}>('/presence/'+result.sessionId+'/sample',{method:'POST',body:JSON.stringify({latitude:fix.coords.latitude,longitude:fix.coords.longitude,accuracy:fix.coords.accuracy,observedAt:new Date(fix.timestamp).toISOString()})});
          if(version===generation.current)setMessage(answer.message+(answer.verified?' · Nümunə sayına daxil oldunuz.':''));
        }catch(e){if(version===generation.current)setMessage(e instanceof Error?e.message:'GPS göndərilmədi');}
        finally{sending.current=false;}
      },error=>{
        setMessage(error.code===1?'Məkan icazəsi verilməyib.':'Aktual GPS siqnalı gözlənilir.');
        if(error.code===1){void end();setActive(false);}
      },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    }catch(e){setActive(false);setMessage(e instanceof Error?e.message:'Sessiya açıla bilmədi');}
  }
  return <div className="boarding-panel" role="region" aria-label="GPS ilə sərnişin iştirakı"><strong>Bu avtobusdayam · {vehicle.id}</strong>
    <p>Razılıqla GPS koordinatınız yalnız seçilmiş avtobusa yaxınlığı yoxlamaq üçün backend-ə göndərilir. Xam koordinatlar bazada saxlanmır. Ən azı 15 saniyə və 3 uyğun ölçmə tələb olunur.</p>
    <p>Bu, iştirak edən cihazların minimum sayıdır; bütün sərnişinlərin dəqiq sayı deyil. Simulyasiya avtobusuna fiziki yaxınlıq uyğun gəlməyə bilər.</p>
    {!active&&<label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> GPS məlumatımı bu məqsədlə paylaşmağa razıyam.</label>}
    {message&&<p role="status">{message}</p>}<div className="planner-actions">{!active?<Button disabled={!consent} onClick={start}>GPS iştirakını başlat</Button>:<Button onClick={async()=>{await end();setActive(false);setMessage('İzləmə dayandırıldı.');}}>Avtobusdan düşdüm — dayandır</Button>}
      <Button variant="outline" onClick={async()=>{await end();onClose();}}>Bağla</Button></div>
  </div>;
}
