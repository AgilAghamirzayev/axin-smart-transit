"use client";
import { useState } from "react";
import { Database, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { NetworkCatalog } from "./types";
export function NetworkSource({ catalog }: { catalog?: NetworkCatalog }) {
  const [open,setOpen]=useState(false);
  return <>
    <div className="source-banner"><Database size={19} /><div><strong>Rəsmi xəritə. Simulyasiya edilmiş hərəkət.</strong>
      <p>AYNA marşrutları + BakuBus dayanacaqları · Dayanacaq uyğunluğu məsafə əsasında təxmin edilir.</p></div>
      <Button variant="ghost" onClick={()=>setOpen(true)}><Info size={15}/> Mənbələr</Button></div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="source-dialog">
      <DialogHeader><DialogTitle>Məlumatın mənbəyi və dəqiqliyi</DialogTitle>
        <DialogDescription>Rəsmi statik məlumatlarla canlı simulyasiyanı bir-birindən ayırırıq.</DialogDescription></DialogHeader>
      {catalog ? <><div className="source-counts"><span><b>{catalog.metadata.uniqueRouteNumbers}</b> marşrut nömrəsi</span><span><b>{catalog.metadata.routeCount}</b> xətt variantı</span><span><b>{catalog.stops.length}</b> dayanacaq qeydi</span></div>
        {catalog.metadata.sources.map(source=><article key={source.url} className="source-entry"><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={13}/></a>
          <small>Resurs yenilənib: {source.resourceUpdatedAt.slice(0,10)} · {source.license === "License not specified" ? "Lisenziya göstərilməyib" : source.license}</small></article>)}
        <p><b>Hesablanan uyğunluq:</b> dayanacaq xəttdən {catalog.metadata.associationThresholdMeters} metrədək məsafədədirsə namizəd kimi göstərilir. Bu, avtobusun həmin dayanacağa xidmət etdiyinin təsdiqi deyil; yolun tərəfi və rəsmi dayanacaq ardıcıllığı mənbədə yoxdur.</p>
        <p><b>GPS və ETA:</b> avtobuslar yaradılmışdır. Açıq xətt hissəsinin sonuna çatdıqda eyni hissədə geri hərəkət edirlər. Bu hərəkət rəsmi istiqamət və cədvəl deyil. ETA yalnız bu simulyasiyanın proqnozudur.</p>
        <p><b>Xəritə:</b> ayrı xətt hissələri birləşdirilmir. Həndəsə {catalog.metadata.simplificationToleranceMeters} metr tolerantlıqla sadələşdirilib. Uyğunluğu olmayan dayanacaqlar da axtarışda saxlanılır.</p>
        <small>Snapshot: {catalog.metadata.version}</small></>:<p>Mənbə məlumatı yüklənir…</p>}
    </DialogContent></Dialog>
  </>;
}
