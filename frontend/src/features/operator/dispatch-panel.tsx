"use client";
import {useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {ArrowRight,BusFront,CheckCircle2,AlertTriangle,MapPin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {RouteCombobox} from '@/features/passenger/route-combobox';
import {api} from '@/lib/api';
import {useLiveData} from '@/features/transit/use-live-data';
import type {Route,RouteAnalytics} from '@/features/transit/types';
const Preview=dynamic(()=>import('./dispatch-preview'),{ssr:false,loading:()=> <div className="dispatch-preview">Trayektoriya yüklənir…</div>});
interface Order {requestId:string;routeId:string;pathIndex:number;vehicleId:string;createdAt:string;operatorName:string}
interface Endpoint {label:string;latitude:number;longitude:number}
interface Options {trajectory:{id:string;assignable:boolean;reason:string;start:Endpoint|null;end:Endpoint|null;distanceKm:number;nearbyStops:number;source:string};buses:{id:string;allowedRouteId:string;capacity:number;status:string}[];allocationSource:string}
export function DispatchPanel({routes,analytics,authorization,routeId,onRoute}:{routes:Route[];analytics:RouteAnalytics[];authorization:string;routeId:string;onRoute:(id:string)=>void}) {
  const selected=routes.find(r=>r.id===routeId)??routes[0];
  const [busId,setBusId]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failure,setFailure]=useState('');
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const pending=useRef<{requestId:string;routeId:string;trajectoryId:string;reserveVehicleId:string}|null>(null);
  const history=useLiveData<Order[]>('/operator/dispatches',authorization);
  const options=useLiveData<Options>(selected?'/operator/dispatches/options?routeId='+encodeURIComponent(selected.id):'',authorization);
  const config=options.data,trajectory=config?.trajectory;
  const eligible=config?.buses.filter(b=>b.status==='READY')??[];
  const bus=eligible.find(b=>b.id===busId)??eligible[0];
  const state=analytics.find(a=>a.routeId===selected?.id);
  async function dispatch(){
    if(!selected||!trajectory?.assignable||!bus)return;
    setBusy(true);setFailure('');setMessage('');
    try{
      pending.current??={requestId,routeId:selected.id,trajectoryId:trajectory.id,reserveVehicleId:bus.id};
      const order=await api<Order>('/operator/dispatches',{method:'POST',headers:{Authorization:authorization},body:JSON.stringify(pending.current)});
      pending.current=null;
      setMessage(`${order.vehicleId} avtobusu ${selected.number} xəttinin tam trayektoriyasına təyin edildi. Başlanğıc nöqtəsindən hərəkət edir.`);setRequestId(crypto.randomUUID());setBusId('');
    }catch(e){setFailure(e instanceof Error?e.message:'Təyinat alınmadı');}finally{setBusy(false);}
  }
  return <Card className="dispatch-panel assignment-panel"><div className="section-heading"><div><h2><BusFront size={19}/> Avtobusu xəttə təyin et</h2><p>Marşrutu yoxlayın, uyğun ehtiyat avtobusu seçin və tam trayektoriyaya göndərin.</p></div><span className="planner-tag">Simulyasiya parkı</span></div>
    <div className="assignment-grid"><div className="assignment-form"><label>1. Marşrut və istiqamət</label><fieldset disabled={busy}><RouteCombobox routes={routes} value={selected?.id??''} onChange={id=>{pending.current=null;onRoute(id);setBusId('');setRequestId(crypto.randomUUID());setMessage('');setFailure('');}}/></fieldset>
      {trajectory&&<div className={'trajectory-summary '+(!trajectory.assignable?'blocked':'')}><div className="trajectory-status">{trajectory.assignable?<CheckCircle2 size={15}/>:<AlertTriangle size={15}/>}<strong>{trajectory.assignable?'Tam trayektoriya yoxlanıb':'Təyinat üçün məlumat yetərli deyil'}</strong></div>
        {trajectory.start&&trajectory.end&&<div className="trajectory-endpoints"><p><MapPin size={14}/><span><small>BAŞLANĞIC</small>{trajectory.start.label}</span></p><ArrowRight size={16}/><p><MapPin size={14}/><span><small>SON NÖQTƏ</small>{trajectory.end.label}</span></p></div>}
        <p>{trajectory.assignable?`${trajectory.distanceKm} km · ${trajectory.nearbyStops} yaxın dayanacaq · ${trajectory.source} kataloqu`:trajectory.reason}</p>
      </div>}
      <label htmlFor="reserve-bus">2. Bu xəttə uyğun ehtiyat avtobus</label><select id="reserve-bus" aria-label="Ehtiyat avtobus" disabled={busy||!trajectory?.assignable||!eligible.length} value={bus?.id??''} onChange={e=>{pending.current=null;setBusId(e.target.value);setRequestId(crypto.randomUUID());setMessage('');setFailure('');}}>
        {!eligible.length&&<option value="">Hazır ehtiyat avtobus yoxdur</option>}{eligible.map(b=><option key={b.id} value={b.id}>{b.id} · {b.capacity} yer · hazır</option>)}
      </select>
      <div className="assignment-facts"><span><b>{state?.activeVehicles??0}</b> xətdə aktiv</span><span><b>{eligible.length}</b> ehtiyat hazır</span><span><b>{state?.gpsParticipants??0}</b> GPS iştirakçısı</span></div>
      <Button disabled={busy||!!options.error||!trajectory?.assignable||!bus} onClick={dispatch}>{busy?'Təyin edilir…':'Seçilmiş avtobusu xəttə təyin et'}<ArrowRight size={15}/></Button>
      {(options.error||failure)&&<p role="alert" className="error-text">{failure||options.error}</p>}{message&&<p role="status" className="dispatch-success">{message}</p>}
    </div><div>{selected&&<Preview route={selected} valid={!!trajectory?.assignable}/>}<p className="fine-print">Xəritə mənbədəki tam xətti göstərir. Son nöqtə adları yaxın dayanacaqlardan təxmin edilir.</p></div></div>
    <details className="assignment-validation"><summary>Uyğunluq necə yoxlanılır?</summary><p>Open Data üzrə marşrut ID-si, koordinatlar və fasiləsiz tam xətt yoxlanılır. Ayrı həndəsələr birləşdirilmir; 5 km-dən böyük koordinat boşluğu olduqda göndəriş bağlanır.</p><p>{config?.allocationSource??'Avtobus bölgüsü lokal simulyasiya parkındandır.'}. Hər ehtiyat avtobus əvvəlcədən bir xəttə ayrılıb. Başqa xəttə və ya artıq təyin edilmiş avtobusa sorğu backend tərəfindən rədd edilir. Fiziki avtobus göndərilmir.</p><p>Başlanğıc nöqtəsindən çıxış · göndərişlər arasında 30 saniyə · trayektoriyada maksimum 30 avtobus.</p></details>
    <details><summary>Təyinat tarixçəsi ({history.data?.length??0})</summary>{history.error&&<p className="error-text">{history.error}</p>}{history.data?.slice(0,10).map(order=><p className="dispatch-history" key={order.requestId}><b>{routes.find(r=>r.id===order.routeId)?.number??order.routeId}</b> · {order.vehicleId} · {new Date(order.createdAt).toLocaleString('az-AZ')} · {order.operatorName}</p>)}</details>
  </Card>;
}
