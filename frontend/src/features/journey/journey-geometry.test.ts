import {describe,it,expect} from 'vitest';
import {legCoordinates,nearestStop} from './journey-geometry';
import {measurePath,pointAt} from '@/features/transit/path-motion';
import type {Route} from '@/features/transit/types';
import type {JourneyLeg} from './types';
const path={closed:false,points:[{latitude:40,longitude:49},{latitude:40.001,longitude:49},{latitude:40.001,longitude:49.001},{latitude:40.002,longitude:49.001}]};
const route={paths:[path]} as Route;
const m=measurePath(path);
describe('journey geometry',()=>{
  it('clips at boarding/alighting and preserves intervening road corners',()=>{
    const start=m.distances[1]/2,end=(m.distances[2]+m.length)/2;
    const points=legCoordinates(route,{pathIndex:0,boardProgress:start,alightProgress:end} as JourneyLeg);
    expect(points).toHaveLength(4);expect(points[0]).toEqual(pointAt(m,start));expect(points.at(-1)).toEqual(pointAt(m,end));
    expect(points[1]).toEqual([40.001,49]);expect(points).not.toContainEqual([40,49]);
  });
  it('preserves reverse direction without drawing a direct shortcut',()=>{
    const points=legCoordinates(route,{pathIndex:0,boardProgress:m.length+1,alightProgress:m.cycle-1} as JourneyLeg);
    expect(points[1]).toEqual([40.001,49.001]);expect(points[2]).toEqual([40.001,49]);
  });
  it('chooses closest stop, not catalogue order',()=>{
    const near={id:'near',name:'Near',latitude:40.0001,longitude:49};
    expect(nearestStop({latitude:40,longitude:49,name:'GPS'},[{id:'far',name:'Far',latitude:41,longitude:49},near])?.stop.id).toBe('near');
    expect(nearestStop({latitude:40,longitude:49,name:'GPS'},[])).toBeUndefined();
  });
});
