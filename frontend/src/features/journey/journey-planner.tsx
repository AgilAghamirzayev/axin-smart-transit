"use client";
import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {LocateFixed,MapPin,Route,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {StopCombobox} from '@/features/passenger/stop-combobox';
import {CrowdBadge} from '@/features/transit/crowd-badge';
import type {Stop} from '@/features/transit/types';
import type {JourneyPoint,JourneyPlan,JourneyOption} from './types';
import {nearestStop} from './journey-geometry';
import {currentLocation} from '@/features/transit/current-location';
import {api} from '@/lib/api';
const minute=(s:number)=>Math.ceil(s/60);
const time=(s:string)=>new Date(s).toLocaleTimeString('az-AZ',{hour:'2-digit',minute:'2-digit'});
import {criteria,recommendations,type Criterion} from './recommendations';
export function JourneyPlanner({stops,boardingStops,origin,destination,onOrigin,onDestination,onPick,onSelect,onLocate}:{stops:Stop[];boardingStops:Stop[];origin:JourneyPoint|null;destination:JourneyPoint|null;onOrigin:(p:JourneyPoint|null)=>void;onDestination:(p:JourneyPoint|null)=>void;onPick:(mode:'origin'|'destination')=>void;onSelect:(option:JourneyOption|null)=>void;onLocate:(p:JourneyPoint)=>void}) {
  const [results,setResults]=useState<Partial<Record<Criterion,JourneyPlan>>>({});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[locating,setLocating]=useState(false),[manual,setManual]=useState(false);
  const request=useRef(0),[signature,setSignature]=useState(''),[selected,setSelected]=useState(0);
  const inputSignature=JSON.stringify([origin,destination]);
  const latestInput=useRef(inputSignature);
  useEffect(()=>{latestInput.current=inputSignature;},[inputSignature]);
  const outdated=!!signature&&signature!==inputSignature;
  const result=results.FASTEST;
  const suggested=recommendations(results);
  const applyAutomaticLocation=useEffectEvent((fix:GeolocationPosition)=>{
    const point=locationPoint(fix);
    onOrigin(point);onLocate(point);onSelect(null);
  });
  useEffect(()=>{
    if(origin||manual||!boardingStops.length)return;
    let active=true;
    void Promise.resolve().then(async()=>{
      if(!active)return;
      setLocating(true);setError('');
      try {const fix=await currentLocation();if(active)applyAutomaticLocation(fix);}
      catch(error){if(active)setError(error instanceof Error?error.message:'Mövqe alınmadı.');}
      finally {if(active)setLocating(false);}
    });
    return ()=>{active=false;};
  },[boardingStops,origin,manual]);
  function locationPoint(fix:GeolocationPosition):JourneyPoint {
    const point:JourneyPoint={latitude:fix.coords.latitude,longitude:fix.coords.longitude,accuracyMeters:fix.coords.accuracy,name:'Mənim mövqeyim'};
    const nearest=nearestStop(point,boardingStops);
    return nearest&&nearest.distance<=800?{...point,nearestStopId:nearest.stop.id,nearestStopName:nearest.stop.name,distanceMeters:Math.round(nearest.distance)}:point;
  }
  async function locate():Promise<JourneyPoint>{
    setLocating(true);setError('');
    try {
      const fix=await currentLocation();
      const resolved=locationPoint(fix);
      onOrigin(resolved);onLocate(resolved);onSelect(null);return resolved;
    } finally {setLocating(false);}
  }
  async function plan(){
    if(!destination)return;
    const version=++request.current;setBusy(true);setError('');onSelect(null);
    try{
      const start=origin??await locate();
      const pairs=await Promise.all(criteria.map(async c=>[c.id,await api<JourneyPlan>('/journeys/plan',{method:'POST',body:JSON.stringify({fromLatitude:start.latitude,fromLongitude:start.longitude,toLatitude:destination.latitude,toLongitude:destination.longitude,fromStopId:start.id,toStopId:destination.id,preference:c.id})})] as const));
      const expected=JSON.stringify([start,destination]);
      if(version===request.current&&latestInput.current===expected){const next=Object.fromEntries(pairs);setResults(next);setSignature(expected);setSelected(0);onSelect(recommendations(next)[0]?.option??null);}
    }catch(e){if(version===request.current)setError(e instanceof Error?e.message:'Səfər tapılmadı');}
    finally{if(version===request.current)setBusy(false);}
  }
  return <Card className="journey-planner compact-planner"><div className="section-heading"><div><h2><Route size={18}/> Hara gedirsiniz?</h2><p>Yaxın dayanacaqlar arasında ən az aktarmalı yolunuzu tapaq.</p></div></div>
    <div className="destination-field"><label htmlFor="journey-destination">Getmək istədiyiniz dayanacaq</label><StopCombobox id="journey-destination" label="Təyinat dayanacağı" stops={stops} value={destination?.id??''} onChange={id=>{request.current++;onDestination(stops.find(s=>s.id===id)??null);onSelect(null);setBusy(false);}}/>
      {destination&&!destination.id&&<small>{destination.name}</small>}</div>
    <div className="origin-summary"><LocateFixed size={17}/><div><strong>{origin?.name??'Mənim mövqeyim'}</strong><small>{origin?.distanceMeters!==undefined?`Ən yaxın dayanacaq ${origin.distanceMeters} m · digər yaxın dayanacaqlar da yoxlanılır`:origin?'Seçilmiş başlanğıc':'Məkan icazəsi ilə başlanğıc avtomatik tapılır'}</small>{origin?.accuracyMeters!==undefined&&<small role="status">{origin.accuracyMeters>100?'Təxmini mövqe':'Məkan dəqiqliyi'}: ±{Math.round(origin.accuracyMeters)} m{origin.accuracyMeters>100?' · Yanlışdırsa başlanğıcı dəyişin.':''}</small>}</div></div>
    <div className="planner-actions"><Button variant="ghost" size="sm" disabled={busy||locating} onClick={()=>void locate().catch(e=>setError(e.message))}><LocateFixed size={13}/>{locating?'Mövqe axtarılır…':'Cari mövqeyim'}</Button><Button variant="ghost" size="sm" onClick={()=>{setManual(!manual);setLocating(false);}}>Başlanğıcı dəyiş</Button><Button variant="ghost" size="sm" onClick={()=>onPick('destination')}><MapPin size={13}/>Təyinatı xəritədən</Button></div>
    {manual&&<div className="manual-origin"><label htmlFor="journey-origin">Başlanğıc dayanacaq</label><StopCombobox id="journey-origin" label="Başlanğıc dayanacaq" stops={stops} value={origin?.id??''} onChange={id=>{request.current++;onOrigin(stops.find(s=>s.id===id)??null);onSelect(null);setBusy(false);}}/><Button size="sm" variant="ghost" onClick={()=>onPick('origin')}>Başlanğıcı xəritədən seç</Button></div>}
    <Button className="find-journey" onClick={plan} disabled={!destination||busy||locating}>{busy?'Yolunuz hesablanır…':'Marşrut tap'}<ArrowRight size={15}/></Button>
    {error&&<p role="alert" className="error-text">{error}</p>}
    {result&&<div className="journey-results" aria-busy={busy}>
      <p className="fine-print">{outdated?'Seçim dəyişib — yenidən hesablayın.':`Hesablandı ${time(result.generatedAt)} · ${suggested.length} variant`}</p>
      {!suggested.length&&<p className="empty-state">Uyğun birbaşa və ya bir aktarmalı səfər tapılmadı. Başlanğıcı dəyişə bilərsiniz.</p>}
      {suggested.map(({option,tags},index)=><article key={index} className={'journey-option '+(index===selected?'chosen':'')}>
        <button className="journey-choice" aria-pressed={index===selected&&!outdated} disabled={outdated} onClick={()=>{setSelected(index);onSelect(option);}}><span className="recommendation-tags">{tags.map(tag=><span key={tag}>{tag}</span>)}</span><span className="route-chain">{!option.legs.length&&<b>Piyada</b>}{option.legs.map((l,i)=><span key={i}>{i>0&&<span className="chain-arrow">→</span>}<b>{l.routeNumber}</b></span>)}</span><strong title="Piyada + gözləmə + avtobusda gediş + aktarma">{minute(option.totalSeconds)} dəq. <small>ümumi</small></strong><small>{Math.max(0,option.legs.length-1)} aktarma · {option.legs.reduce((sum,l)=>sum+l.alightProgress-l.boardProgress,0)>0?`${(option.legs.reduce((sum,l)=>sum+l.alightProgress-l.boardProgress,0)/1000).toFixed(1)} km avtobusla`: 'Piyada səfər'}</small><small className="journey-time-breakdown">{minute(option.walkingSeconds)} dəq. piyada · {minute(option.legs.reduce((sum,l)=>sum+l.waitSeconds,0))} dəq. gözləmə · {minute(option.legs.reduce((sum,l)=>sum+l.rideSeconds,0))} dəq. gediş{option.legs.length>1?` · ${option.legs.length-1} dəq. aktarma`:''}</small></button>
        {index===selected&&<div className="journey-steps"><p className="arrival-summary">Çatma {time(option.arriveAt)} · təxmini ±{minute(option.uncertaintySeconds)} dəq.</p>
          {option.legs.map((leg,i)=><div className="journey-leg" key={i}><b>{leg.routeNumber}</b><div><strong>{i?'Dəyişin: ':'Minin: '}{leg.from.name}</strong><small>Dayanacağa gəliş {time(leg.boardAt)} · {minute(leg.waitSeconds)} dəq. gözləmə</small><strong className="alight-stop">Düşün: {leg.to.name}</strong><small>{minute(leg.rideSeconds)} dəq. gediş · {((leg.alightProgress-leg.boardProgress)/1000).toFixed(1)} km · {time(leg.alightAt)}</small><CrowdBadge level={leg.crowdLevel}/></div></div>)}
          <p className="fine-print">{option.legs.length?'Sonra piyada təyinata:':'Piyada gedin:'} {destination?.name}. Ümumi piyada vaxtı {minute(option.walkingSeconds)} dəq. {!option.legs.length&&option.explanation}</p><p className="fine-print">Rəngli xətlər: avtobus · kəsik xətlər: təxmini piyada bağlantısı.</p></div>}
      </article>)}
      <details className="journey-limitations"><summary>Hesablama haqqında</summary><p>{result.limitation} Ümumi vaxt = piyada + avtobusu gözləmə + trayektoriya məsafəsi / avtobusun sürəti + hər aktarmaya 1 dəqiqə. Hissələr yuxarı yuvarlaqlaşdırıldığı üçün ekranda cəm bir neçə dəqiqə fərqlənə bilər. Gözləmə real cədvəldən deyil, simulyasiyadakı avtobusun düzgün istiqamətdəki mövqeyindən hesablanır; trafik nəzərə alınmır. Qənaətli: az minik sayı; təsdiqlənmiş tarif hesablanmır. Sıxlıq məlumatı olmayan səfərə “Az sıxlıq” etiketi verilmir. Vaxtlar simulyasiyadır; piyada keçidinin təhlükəsizliyi təsdiqlənməyib.</p></details>
    </div>}
  </Card>;
}
