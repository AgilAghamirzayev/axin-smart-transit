"use client";
import { useEffect, useRef, useState } from "react";
import { Circle, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { LocateFixed, Square } from "lucide-react";
import { acceptLocation, type LocationFix } from "./location-quality";

export function UserLocation({onLocation}:{onLocation?:(fix:LocationFix)=>void}) {
  const map = useMap();
  const controls = useRef<HTMLDivElement>(null);
  const watcher = useRef<number | null>(null);
  const best = useRef<LocationFix | null>(null);
  const generation = useRef(0);
  const [position, setPosition] = useState<LocationFix | null>(null);
  const [stale, setStale] = useState(false);
  const [status, setStatus] = useState("Mövqeyinizi xəritədə göstərin");
  const [tracking, setTracking] = useState(false);
  useEffect(() => {
    if (controls.current) {
      L.DomEvent.disableClickPropagation(controls.current);
      L.DomEvent.disableScrollPropagation(controls.current);
    }
    const timer = setInterval(() => setStale(!!best.current && Date.now()-best.current.timestamp>30000),1000);
    const sessionGeneration = generation;
    return () => { sessionGeneration.current++; clearInterval(timer); if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current); };
  }, []);
  function locate() {
    if (!navigator.geolocation) { setStatus("Brauzer mövqe xidmətini dəstəkləmir."); return; }
    if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
    const session = ++generation.current;
    best.current = null;
    setPosition(null); setStale(false);
    setTracking(true);
    setStatus("Mövqe axtarılır… Brauzerdə icazə verin.");
    let first = true;
    watcher.current = navigator.geolocation.watchPosition(result => {
      if (session !== generation.current) return;
      const {latitude:lat, longitude:lng, accuracy} = result.coords;
      const fix = {lat,lng,accuracy,timestamp:result.timestamp};
      if (!acceptLocation(best.current,fix,Date.now())) {
        setStatus(best.current ? "Daha dəqiq ölçmə gözlənilir · son dəqiqlik ±"+Math.round(best.current.accuracy)+" m" : "Aktual GPS ölçməsi gözlənilir…");
        return;
      }
      best.current = fix; setPosition(fix); setStale(false);
      setStatus("Mövqeyiniz · dəqiqlik ±" + Math.round(accuracy) + " m" + (accuracy>100?" · təxminidir, daha dəqiq siqnal gözlənilir":""));
      // Center only on demand; subsequent fixes preserve the user's pan/zoom.
      if (first) { map.setView([lat,lng],Math.max(16,map.getZoom()),{animate:false}); if(accuracy<=100)onLocation?.(fix); first = false; }
    }, error => {
      if (session !== generation.current) return;
      setStatus(error.code === 1 ? "Mövqe icazəsi verilməyib. Brauzerin sayt ayarlarından icazə verin."
        : error.code === 3 ? "GPS siqnalı gözlənilir. İzləmə davam edir."
          : "Mövqe müəyyən edilmədi. Məkan xidmətini yoxlayın; izləmə davam edir.");
      if (error.code===1) {
        if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
        watcher.current = null; best.current = null;
        setPosition(null); setTracking(false);
      }
    }, {enableHighAccuracy:true, maximumAge:0, timeout:20000});
  }
  function stop() {
    if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
    watcher.current = null;
    generation.current++; best.current = null; setStale(false);
    setTracking(false); setPosition(null); setStatus("Mövqe izlənməsi dayandırıldı");
  }
  return <>
    <div className="location-controls" ref={controls}>
      <div><button type="button" onClick={locate} aria-label="Mənim mövqeyim"><LocateFixed size={17}/>Mənim mövqeyim</button>
        {tracking && <button type="button" onClick={stop} aria-label="Mövqe izlənməsini dayandır"><Square size={13}/></button>}</div>
      <small role="status">{stale ? "Son mövqe köhnəlib · yenilənmə gözlənilir" : status}</small>
    </div>
    {position && <>
      <Circle center={[position.lat,position.lng]} radius={position.accuracy} interactive={false}
        pathOptions={{color:stale?"#7d8790":"#2878e0",fillColor:"#2878e0",fillOpacity:.09,weight:1}}/>
      <CircleMarker center={[position.lat,position.lng]} radius={8} pathOptions={{color:"white",weight:3,fillColor:stale?"#7d8790":"#2878e0",fillOpacity:1}}>
        <Popup>{stale?"Son məlum mövqeyiniz":"Siz buradasınız"} · ±{Math.round(position.accuracy)} m<br/>{new Date(position.timestamp).toLocaleTimeString("az-AZ")}</Popup>
      </CircleMarker>
    </>}
  </>;
}
