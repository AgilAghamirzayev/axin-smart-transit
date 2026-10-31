"use client";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, useComboboxAnchor } from "@/components/ui/combobox";
import type { Stop } from "@/features/transit/types";

const searchable = (value:string) => value.toLocaleLowerCase('az').replaceAll('ı','i').replaceAll('ə','e').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function StopCombobox({ stops, value, onChange, id="stop", label="Dayanacaq" }: {stops:Stop[];value:string;onChange:(id:string)=>void;id?:string;label?:string}) {
  const anchor=useComboboxAnchor();
  return <div ref={anchor} className="stop-combobox">
    <Combobox items={stops} value={stops.find(stop=>stop.id===value)??null} onValueChange={(stop:Stop|null)=>onChange(stop?.id??'')}
      itemToStringLabel={(stop:Stop)=>stop.name} itemToStringValue={(stop:Stop)=>stop.id}
      isItemEqualToValue={(a:Stop,b:Stop)=>a.id===b.id} limit={80} autoHighlight
      filter={(stop:Stop,query:string)=>searchable(stop.name+' '+stop.id).includes(searchable(query))}>
      <ComboboxInput id={id} aria-label={label} placeholder="Dayanacaq yazın və seçin…" showClear className="stop-combobox-input"/>
      <ComboboxContent anchor={anchor} className="stop-combobox-popup">
        <ComboboxEmpty>Uyğun dayanacaq tapılmadı.</ComboboxEmpty>
        <ComboboxList>{(stop:Stop)=><ComboboxItem key={stop.id} value={stop} data-stop-id={stop.id}>
          <span><strong>{stop.name}</strong><small>Dayanacaq {stop.id.slice(4,13)} · {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</small></span>
        </ComboboxItem>}</ComboboxList>
        <p className="combobox-hint">Ad və ya ID ilə axtarın · ən çox 80 uyğun nəticə</p>
      </ComboboxContent>
    </Combobox>
  </div>;
}
