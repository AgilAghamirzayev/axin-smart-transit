import type {JourneyOption,JourneyPlan} from './types';
export const criteria=[{id:'FASTEST',label:'Ən sürətli'},{id:'COMFORT',label:'Az sıxlıq'},{id:'ECONOMY',label:'Qənaətli'}] as const;
export type Criterion=typeof criteria[number]['id'];
const key=(option:JourneyOption)=>option.legs.map(l=>`${l.routeId}:${l.pathIndex}:${l.from.id}:${l.to.id}`).join('/')||'walk';
export function recommendations(plans:Partial<Record<Criterion,JourneyPlan>>) {
  const entries=new Map<string,{option:JourneyOption;tags:string[]}>();
  const add=(option:JourneyOption,tag?:string)=>{
    const id=key(option),entry=entries.get(id)??{option,tags:[]};
    if(tag&&!entry.tags.includes(tag))entry.tags.push(tag);
    entries.set(id,entry);
  };
  for(const criterion of criteria){
    const winner=plans[criterion.id]?.options[0];
    if(winner)add(winner,criterion.id==='COMFORT'&&winner.legs.some(l=>l.crowdLevel==='UNKNOWN')?undefined:criterion.label);
  }
  const alternatives=criteria.flatMap(c=>plans[c.id]?.options??[]).sort((a,b)=>a.totalSeconds-b.totalSeconds);
  for(const option of alternatives){if(entries.size>=3)break;add(option);}
  return [...entries.values()].sort((a,b)=>a.option.legs.length-b.option.legs.length||a.option.totalSeconds-b.option.totalSeconds).slice(0,3);
}
