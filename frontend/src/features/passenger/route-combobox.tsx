"use client";
import {Combobox,ComboboxContent,ComboboxEmpty,ComboboxInput,ComboboxItem,ComboboxList,useComboboxAnchor} from '@/components/ui/combobox';
import type {Route} from '@/features/transit/types';
const normalize=(s:string)=>s.toLocaleLowerCase('az').replaceAll('ı','i').replaceAll('ə','e').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function RouteCombobox({routes,value,onChange}:{routes:Route[];value:string;onChange:(id:string)=>void}){
  const anchor=useComboboxAnchor();
  return <div ref={anchor} className="stop-combobox"><Combobox items={routes} value={routes.find(r=>r.id===value)??null} onValueChange={(r:Route|null)=>onChange(r?.id??'')}
    itemToStringLabel={(r:Route)=>r.number+' · '+r.name} itemToStringValue={(r:Route)=>r.id} isItemEqualToValue={(a:Route,b:Route)=>a.id===b.id}
    filter={(r:Route,q:string)=>normalize(q.toUpperCase().startsWith('AYNA-')?r.id:r.number+' '+r.name).includes(normalize(q))} limit={60} autoHighlight>
    <ComboboxInput id="route" aria-label="Marşrut" placeholder="Nömrə və ya istiqamət yazın…" showClear className="stop-combobox-input"/>
    <ComboboxContent anchor={anchor} className="stop-combobox-popup"><ComboboxEmpty>Uyğun marşrut tapılmadı.</ComboboxEmpty>
      <ComboboxList>{(r:Route)=><ComboboxItem key={r.id} value={r} data-route-id={r.id}><span><strong>{r.number} · {r.name}</strong><small>Variant {r.id.slice(-3)} · {r.stops.length} yaxın dayanacaq</small></span></ComboboxItem>}</ComboboxList>
    </ComboboxContent>
  </Combobox></div>;
}
