import { describe,expect,it } from "vitest";
import {acceptLocation,type LocationFix} from "./location-quality";
const previous:LocationFix={lat:40.38,lng:49.84,accuracy:8,timestamp:100000};
describe('location quality',()=>{
  it('accepts a newer more precise fix',()=>expect(acceptLocation(previous,{...previous,accuracy:5,timestamp:101000},101000)).toBe(true));
  it('rejects stale and out-of-order fixes',()=>{
    expect(acceptLocation(null,previous,120000)).toBe(false);
    expect(acceptLocation(previous,{...previous,timestamp:99999},101000)).toBe(false);
  });
  it('does not jump from fresh GPS to coarse network positioning',()=>expect(acceptLocation(previous,{...previous,accuracy:2000,timestamp:101000},101000)).toBe(false));
  it('does not freeze an old fix while the person moves',()=>expect(acceptLocation(previous,{...previous,accuracy:2000,timestamp:112000},112000)).toBe(true));
  it('rejects invalid coordinates and accuracy',()=>{
    expect(acceptLocation(null,{...previous,accuracy:NaN},100000)).toBe(false);
    expect(acceptLocation(null,{...previous,lat:100},100000)).toBe(false);
  });
});
