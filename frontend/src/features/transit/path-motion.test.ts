import { describe, expect, it } from "vitest";
import { measurePath, pointAt, wrap } from "./path-motion";
const path = measurePath({closed:false,points:[{latitude:40,longitude:49},{latitude:40,longitude:49.001},{latitude:40.001,longitude:49.001}]});
describe("geographic path motion", () => {
  it("follows the corner instead of cutting across it", () => {
    const corner = path.distances[1];
    expect(pointAt(path,corner)).toEqual([40,49.001]);
    expect(pointAt(path,corner/2)[0]).toBe(40);
    expect(pointAt(path,corner+(path.length-corner)/2)[1]).toBe(49.001);
  });
  it("turns back on an open path without a closing chord", () => {
    expect(pointAt(path,path.length+20)).toEqual(pointAt(path,path.length-20));
    expect(pointAt(path,path.cycle)).toEqual([40,49]);
  });
  it("wraps forward across a cycle boundary", () => {
    expect(wrap(5-(path.cycle-5),path.cycle)).toBeCloseTo(10);
  });
  it("positions depend on metres, not map zoom or screen pixels", () => {
    const point=pointAt(path,30);
    expect(point[0]).toBe(40);
    expect(point[1]).toBeGreaterThan(49);
    expect(point[1]).toBeLessThan(49.001);
  });
});
