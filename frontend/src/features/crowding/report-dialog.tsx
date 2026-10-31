"use client";
import { useState } from "react";
import { CheckCircle2, Users, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { CrowdLevel, Vehicle } from "@/features/transit/types";

export function ReportDialog({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const [level, setLevel] = useState<CrowdLevel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  async function submit() {
    if (!level || !vehicle) return;
    setBusy(true); setError("");
    try {
      let reporterId = localStorage.getItem("transit-reporter");
      if (!reporterId) { reporterId = crypto.randomUUID(); localStorage.setItem("transit-reporter", reporterId); }
      await api("/reports", { method: "POST", body: JSON.stringify({ requestId, reporterId, vehicleId: vehicle.id, level }) });
      setDone(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Bildiriş göndərilmədi"); }
    finally { setBusy(false); }
  }
  return <Dialog open={!!vehicle} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="report-dialog">
      <DialogHeader><DialogTitle>{done ? "Təşəkkür edirik!" : "Avtobusda sıxlıq necədir?"}</DialogTitle>
        <DialogDescription>{done ? "Bildirişiniz saxlanıldı və analitikaya daxil edilir." : vehicle?.id + " · Səfər təcrübəniz daha yaxşı nəqliyyata kömək edir."}</DialogDescription>
      </DialogHeader>
      {done ? <div className="report-success"><CheckCircle2 size={48} /><p>Səsiniz qeydə alındı.</p><Button onClick={onClose}>Hazırdır</Button></div>
        : <><div className="crowd-options" role="group" aria-label="Sıxlıq səviyyəsi">
          {([{ value: "LOW", label: "Aşağı", description: "Boş oturacaqlar var" },
            { value: "MEDIUM", label: "Orta", description: "Ayaqüstə yer var" },
            { value: "HIGH", label: "Yüksək", description: "Avtobus doludur" }] as const).map(option =>
            <button key={option.value} type="button" aria-pressed={level === option.value}
              className={"crowd-option " + (level === option.value ? "selected " : "") + option.value.toLowerCase()}
              onClick={() => setLevel(option.value)} disabled={busy}>
              <Users size={25} /><strong>{option.label}</strong><small>{option.description}</small>
            </button>)}
        </div><p className="fine-print">Yalnız olduğunuz avtobus barədə bildirin. Şəxsi məlumat tələb olunmur.</p>
        {error && <p role="alert" className="error-text">{error}</p>}
        <Button className="w-full h-11" onClick={submit} disabled={!level || busy}>
          {busy && <LoaderCircle className="animate-spin" />} {busy ? "Göndərilir…" : "Bildirişi göndər"}
        </Button></>}
    </DialogContent>
  </Dialog>;
}
