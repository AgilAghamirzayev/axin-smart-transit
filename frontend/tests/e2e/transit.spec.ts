import { test, expect, type Page } from "@playwright/test";
async function selectRoute(page:Page,id:string){
  const details=page.locator('.browse-network');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
  await page.getByRole('combobox',{name:'Marşrut',exact:true}).fill(id);
  await page.locator(`[data-route-id="${id}"]`).click();
}
test('destination-first GPS resolves a nearby boarding stop and renders only journey segments',async({page,context,request})=>{
  const catalog=await (await request.get('/api/transit/network')).json();
  const route=catalog.routes.find((r:{number:string})=>r.number==='5');
  const start=route.stops[0],end=route.stops[Math.floor(route.stops.length/2)];
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({latitude:start.latitude,longitude:start.longitude,accuracy:12});
  await page.goto('/');
  await page.getByRole('combobox',{name:'Təyinat dayanacağı',exact:true}).fill(end.name);
  await page.locator(`[data-stop-id="${end.id}"]`).click();
  await page.getByRole('button',{name:'Marşrut tap',exact:true}).click();
  await expect(page.locator('.origin-summary')).toContainText(start.name);
  await expect(page.locator('.journey-option').first()).toBeVisible();
  await expect(page.locator('.journey-segment').first()).toBeAttached();
  expect(await page.locator('.leaflet-overlay-pane path.leaflet-interactive').count()).toBeLessThan(20);
  await expect(page.locator('.journey-choice').first()).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('.journey-option.chosen').evaluate(el=>el.scrollHeight<=el.clientHeight+2)).toBeTruthy();
});
test('journey planner returns arrival times and invalidates changed preferences', async ({page,request})=>{
  const network=await (await request.get('/api/transit/network')).json();
  const route=network.routes.find((r:{number:string})=>r.number==='5');
  await page.goto('/');
  await page.getByRole('button',{name:'Başlanğıcı dəyiş',exact:true}).click();
  for(const [label,stop] of [['Başlanğıc dayanacaq',route.stops[0]],['Təyinat dayanacağı',route.stops[Math.floor(route.stops.length/2)]]] as const){
    await page.getByRole('combobox',{name:label,exact:true}).fill(stop.name);
    await page.locator(`[role="option"][data-stop-id="${stop.id}"]`).click();
  }
  await page.getByRole('button',{name:'Marşrut tap',exact:true}).click();
  await expect(page.locator('.journey-option').first()).toContainText('Çatma');
  await expect(page.locator('.journey-option').first()).toContainText('Dayanacağa gəliş');
  await page.getByRole('button',{name:'Az sıxlıq',exact:true}).click();
  await expect(page.locator('.journey-choice').first()).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.journey-segment').first()).toBeAttached();
  await page.getByRole('button',{name:'Qənaətli',exact:true}).click();
  await expect(page.getByText('Az minik / az aktarma əsas götürülür.',{exact:false})).toBeVisible();

});
test('operator dispatch adds a simulated bus to M8 and records history', async ({page,request})=>{
  const network=await (await request.get('/api/transit/network')).json();
  const route=network.routes.find((r:{number:string})=>r.number==='M8');
  const before=await (await request.get('/api/transit/snapshot?routeId='+route.id)).json();
  await page.goto('/operator');
  await page.getByLabel('Şifrə',{exact:true}).fill(process.env.OPERATOR_PASSWORD??'local-demo-change-me');
  await page.getByRole('button',{name:'Panelə daxil ol'}).click();
  await page.getByRole('combobox',{name:'Marşrut',exact:true}).fill(route.id);
  await page.locator(`[data-route-id="${route.id}"]`).click();
  await expect(page.getByLabel('Ehtiyat avtobus',{exact:true})).not.toHaveValue('');
  await page.getByRole('button',{name:'Seçilmiş avtobusu xəttə təyin et',exact:true}).click();
  await expect(page.locator('.dispatch-success')).toContainText('tam trayektoriyasına təyin edildi');
  await expect.poll(async()=> (await (await request.get('/api/transit/snapshot?routeId='+route.id)).json()).vehicles.length).toBe(before.vehicles.length+1);
});
test('GPS participation requires consent and can be ended', async ({page,context})=>{
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({latitude:40.379,longitude:49.848,accuracy:12});
  await page.goto('/');
  await page.getByRole('button',{name:'Bu avtobusdayam · GPS iştirakı'}).first().click();
  const panel=page.getByRole('region',{name:'GPS ilə sərnişin iştirakı'});
  await expect(panel.getByRole('button',{name:'GPS iştirakını başlat'})).toBeDisabled();
  await panel.getByRole('checkbox').check();
  const started=page.waitForResponse(r=>r.url().endsWith('/api/presence')&&r.request().method()==='POST');
  await panel.getByRole('button',{name:'GPS iştirakını başlat'}).click();
  expect((await started).ok()).toBeTruthy();
  await panel.getByRole('button',{name:'Avtobusdan düşdüm — dayandır'}).click();
  await expect(panel.getByRole('status')).toHaveText('İzləmə dayandırıldı.');
});
test("official Azerbaijan map is default and tabs preserve transit selection", async ({page})=>{
  await page.goto('/');
  await expect(page.getByRole('tab',{name:'Azərbaycan · Open Data',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.leaflet-official-geography-pane canvas')).toBeVisible();
  await selectRoute(page,'AYNA-00010');
  await page.getByRole('tab',{name:'Küçə · OpenStreetMap',exact:true}).click();
  await expect(page.locator('.leaflet-official-geography-pane canvas')).toBeHidden();
  await expect(page.locator('#route')).not.toHaveValue('');
  await expect(page.locator('.vehicle-card')).toHaveCount(2);
  await page.getByRole('tab',{name:'Azərbaycan · Open Data',exact:true}).click();
  await expect(page.locator('.leaflet-official-geography-pane canvas')).toBeVisible();
});
test("stop search and selection share one keyboard-accessible field", async ({page})=>{
  await page.goto('/');
  await page.locator('.browse-network summary').click();
  const input=page.getByRole('combobox',{name:'Dayanacaq',exact:true});
  await expect(page.locator('#stop-search')).toHaveCount(0);
  await input.fill('hec-bir-dayanacaq-xyz');
  await expect(page.getByText('Uyğun dayanacaq tapılmadı.')).toBeVisible();
  await input.fill('28 may');
  await expect(page.getByRole('option').first()).toBeVisible();
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(page.locator('.arrivals-section h2')).toContainText('Gəlişlər');
  await expect(input).not.toHaveValue('28 may');
  await selectRoute(page,'AYNA-00010');
  await expect(input).toHaveValue('');
});
test("map supports mouse wheel, drag and opt-in location without marker CSS flights", async ({ page, context, request }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({latitude:40.379,longitude:49.848,accuracy:12});
  const network = await (await request.get("/api/transit/network")).json();
  const route = network.routes.find((r: {number:string}) => r.number === "5");
  await page.goto("/");
  await selectRoute(page,route.id);
  const map = page.locator(".leaflet-container");
  await expect(map.locator(".bus-marker").first()).toBeVisible();
  expect(await map.locator(".bus-marker").first().evaluate(el=>getComputedStyle(el).transitionDuration)).not.toContain("2.8s");
  await map.scrollIntoViewIfNeeded();
  const proxy=map.locator(".leaflet-proxy");
  const beforeZoom=await proxy.getAttribute("style");
  await map.hover({position:{x:200,y:250}});
  await page.mouse.wheel(0,-300);
  await expect.poll(()=>proxy.getAttribute("style")).not.toBe(beforeZoom);
  // Leaflet ignores drag starts during its wheel-zoom animation.
  await page.waitForTimeout(400);
  const box=(await map.boundingBox())!;
  const pane=map.locator(".leaflet-map-pane");
  const beforePan=await pane.getAttribute("style");
  await page.mouse.move(box.x+200,box.y+250);
  await page.mouse.down(); await page.mouse.move(box.x+280,box.y+290,{steps:8}); await page.mouse.up();
  await expect.poll(()=>pane.getAttribute("style")).not.toBe(beforePan);
  await page.waitForTimeout(400);
  const scaleBefore=Number((await proxy.getAttribute('style'))?.match(/scale\(([^)]*)\)/)?.[1]);
  await page.getByRole("button",{name:"Mənim mövqeyim",exact:true}).click();
  await expect(page.locator(".location-controls")).toContainText("dəqiqlik ±12 m");
  expect(Number((await proxy.getAttribute('style'))?.match(/scale\(([^)]*)\)/)?.[1])).toBeGreaterThanOrEqual(scaleBefore);
  await page.getByRole("button",{name:"Mövqe izlənməsini dayandır",exact:true}).click();
  await expect(page.locator(".location-controls")).toContainText("dayandırıldı");
});
test("location denial explains how to retry without inventing a position", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator,"geolocation",{value:{watchPosition:(_success:unknown,error:(e:{code:number})=>void)=>{setTimeout(()=>error({code:1}),0);return 1;},clearWatch:()=>{}}});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"Mənim mövqeyim",exact:true}).click();
  await expect(page.locator(".location-controls")).toContainText("Mövqe icazəsi verilməyib");
  await expect(page.getByRole("button",{name:"Mövqe izlənməsini dayandır",exact:true})).toHaveCount(0);
});
test("passenger selects a stop, sees moving vehicles and submits a persisted report", async ({ page, request }) => {
  const network = await (await request.get("/api/transit/network")).json();
  const route = network.routes.find((r: { number: string }) => r.number === "5");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Növbəti dayanacaq/ })).toBeVisible();
  await selectRoute(page,route.id);
  await page.getByRole("combobox", {name:"Dayanacaq",exact:true}).fill(route.stops[0].name);
  await page.locator(`[role="option"][data-stop-id="${route.stops[0].id}"]`).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
  await expect(page.locator(".eta").first()).not.toContainText("dayanacaq seçin");
  const first = await request.get("/api/transit/snapshot?routeId=" + route.id);
  const before = (await first.json()).vehicles[0];
  await expect.poll(async () => {
    const response = await request.get("/api/transit/snapshot?routeId=" + route.id);
    return (await response.json()).vehicles[0].latitude;
  }, { timeout: 12000 }).not.toBe(before.latitude);
  const reportedId = await page.locator(".vehicle-card .vehicle-identity strong").first().innerText();
  await page.getByRole("button", { name: /Sıxlığı bildir/ }).first().click();
  await page.getByRole("button", { name: /Yüksək/ }).click();
  await page.getByRole("button", { name: "Bildirişi göndər" }).click();
  await expect(page.getByText("Səsiniz qeydə alındı.")).toBeVisible();
  await page.getByRole("button", { name: "Hazırdır" }).click();
  await expect(page.locator(".vehicle-card").filter({ hasText: reportedId })).toContainText("Yüksək sıxlıq");
});
test("operator login is required and route analytics load", async ({ page }) => {
  await page.goto("/operator");
  await page.getByLabel("Şifrə", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Panelə daxil ol" }).click();
  await expect(page.locator(".login-card [role=alert]")).toContainText("yanlışdır");
  await page.getByLabel("Şifrə", { exact: true }).fill(process.env.OPERATOR_PASSWORD ?? "local-demo-change-me");
  await page.getByRole("button", { name: "Panelə daxil ol" }).click();
  await expect(page.getByRole("heading", { name: "Marşrutların vəziyyəti" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByLabel("Operator marşrut axtarışı").fill("125");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Çıxış" }).click();
  await expect(page.getByRole("heading", { name: "Nəqliyyata ümumi baxış" })).toBeVisible();
});
test("mobile layout fits viewport and route filters remain usable", async ({ page, request }) => {
  const network = await (await request.get("/api/transit/network")).json();
  const route = network.routes.find((r: { number: string }) => r.number === "7A");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await selectRoute(page,route.id);
  await page.getByRole("combobox", {name:"Dayanacaq",exact:true}).fill(route.stops[0].name);
  await page.locator(`[role="option"][data-stop-id="${route.stops[0].id}"]`).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
test("network failure is visible and disables submission", async ({ page }) => {
  await page.route("**/api/transit/snapshot?*", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"Test bağlantı xətası"}' }));
  await page.goto("/");
  await expect(page.locator(".connection-error")).toContainText("Test bağlantı xətası");
  await expect(page.getByText("Səsiniz qeydə alındı.")).toHaveCount(0);
});

test("official sources explain inferred associations and catalogue is not polled", async ({ page }) => {
  let catalogRequests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/transit/network")) catalogRequests++; });
  await page.goto("/");
  await expect(page.locator(".stat-card").nth(1).locator(".stat-value")).toHaveText("239");
  // Development StrictMode can abort and restart the initial effect.
  const initialRequests = catalogRequests;
  await page.getByRole("button", {name:"Mənbələr", exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("3600");
  await expect(page.getByRole("dialog")).toContainText("təsdiqi deyil");
  await page.getByRole("dialog").press("Escape");
  await page.locator('.browse-network summary').click();
  await page.getByRole('combobox',{name:'Marşrut',exact:true}).fill('125');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.waitForTimeout(3500);
  expect(catalogRequests).toBe(initialRequests);
});

test('operator cannot assign a bus to disconnected source geometry',async({page,request})=>{
  const catalog=await (await request.get('/api/transit/network')).json();
  const route=catalog.routes.find((r:{paths:unknown[]})=>r.paths.length>1);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/operator');
  await page.getByLabel('Şifrə',{exact:true}).fill(process.env.OPERATOR_PASSWORD??'local-demo-change-me');
  await page.getByRole('button',{name:'Panelə daxil ol'}).click();
  await page.getByRole('combobox',{name:'Marşrut',exact:true}).fill(route.id);
  await page.locator(`[data-route-id="${route.id}"]`).click();
  await expect(page.locator('.trajectory-summary')).toContainText('Tam və fasiləsiz trayektoriya');
  await expect(page.getByRole('button',{name:'Seçilmiş avtobusu xəttə təyin et',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
