const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');
const Module = require('node:module');
const path = require('node:path');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { eq, and } = require('drizzle-orm');
const schema = require('./src/db/schema/index.ts');
const esbuild = require('esbuild');
globalThis.testContext = new AsyncLocalStorage();
async function bundle(entry) {
  const result = await esbuild.build({ entryPoints:[entry], bundle:true, write:false, platform:'node', format:'cjs', packages:'external', jsx:'automatic', plugins:[{name:'verification',setup(build){
    build.onResolve({filter:/^(server-only|next\/cache|@\/db|@\/lib\/auth)$/},({path})=>({path,namespace:'verification'}));
    build.onLoad({filter:/.*/,namespace:'verification'},({path})=>({contents:path==='@/db'?'export const db=globalThis.testDb;':path==='@/lib/auth'?'export const getCurrentUser=async()=>globalThis.testContext.getStore();export const can=(u,p)=>u.permissions.includes(p);export const isAdmin=u=>!!u.isAdmin;':path==='next/cache'?'export const revalidatePath=()=>{};':''}));
  }}]});
  const loaded=new Module(path.resolve('.verification.cjs'),module);loaded.paths=module.paths;
  loaded._compile(result.outputFiles[0].text,path.resolve('.verification.cjs'));return loaded.exports;
}
const ssl={ca:process.env.DB_SSL_CA.replace(/\\n/g,'\n'),rejectUnauthorized:true};
const admin=postgres(process.env.DATABASE_URL,{max:1,ssl,connect_timeout:12,onnotice:()=>{}});
const namespace='order_verify_'+randomUUID().replaceAll('-','');
let client,created=false;
async function main(){
  assert.match(namespace,/^order_verify_[a-f0-9]{32}$/);
  await admin.unsafe(`create schema "${namespace}"`);created=true;
  for(const table of ['organizations','users','warehouses','area_offices','product_units','products','brands','product_types','product_sell_units','outlets','outlet_types','product_prices','warehouse_stocks','stock_movements','stock_movement_items','stock_movement_counters','sales_stocks','sales_stock_items','sales_inventory','sales_stock_counters','audit_logs','orders','order_items','invoices','order_counters','order_stock_allocations','order_payments','printer_settings'])await admin.unsafe(`create table "${namespace}"."${table}" (like public."${table}" including all)`);
  await admin.unsafe(`alter table "${namespace}".organizations alter column id restart with 7000000000`);
  client=postgres(process.env.DATABASE_URL,{max:8,ssl,connect_timeout:12,connection:{search_path:namespace+',public'},onnotice:()=>{}});
  assert.equal((await client`select current_schema() as name`)[0].name,namespace);
  const db=drizzle(client,{schema});globalThis.testDb=db;
  const {organizations,users,warehouses,areaOffices,productUnits,products,productSellUnits,outlets,outletTypes,productPrices,salesInventory,warehouseStocks,orders,orderItems,invoices,orderPayments,orderStockAllocations,auditLogs}=schema;
  const insert=async(table,values)=>(await db.insert(table).values(values).returning())[0];
  const org=await insert(organizations,{name:'Company snapshot',slug:'verify',address:'Company address',phone:'08123456789'});
  const foreign=await insert(organizations,{name:'Other',slug:'other'});
  const member=(name,values={})=>insert(users,{organizationId:org.id,name,email:name+'@example.test',passwordHash:'x',...values});
  const manager=await member('manager');const middle=await member('middle',{reportsTo:manager.id});
  const sales=await member('sales',{userType:'sales',reportsTo:middle.id});const peer=await member('peer',{userType:'sales'});
  const foreignSales=await member('foreign',{organizationId:foreign.id,userType:'sales'});
  const area=await insert(areaOffices,{organizationId:org.id,name:'Area'});
  const wh=await insert(warehouses,{organizationId:org.id,name:'Warehouse',areaOfficeId:area.id});
  const wh2=await insert(warehouses,{organizationId:org.id,name:'Other warehouse',areaOfficeId:area.id});
  const foreignWh=await insert(warehouses,{organizationId:foreign.id,name:'Foreign warehouse'});
  const unit=await insert(productUnits,{organizationId:org.id,name:'PCS'});const carton=await insert(productUnits,{organizationId:org.id,name:'DUS'});
  const liter=await insert(productUnits,{organizationId:org.id,name:'Liter',allowFraction:true});
  const product=await insert(products,{organizationId:org.id,name:'Original product',code:'SKU1',baseUnitId:unit.id});
  const chemical=await insert(products,{organizationId:org.id,name:'Chemical',code:'SKU2',baseUnitId:liter.id});
  const pcs=await insert(productSellUnits,{organizationId:org.id,productId:product.id,unitId:unit.id,factor:'1'});
  const dus=await insert(productSellUnits,{organizationId:org.id,productId:product.id,unitId:carton.id,factor:'12'});
  const liquid=await insert(productSellUnits,{organizationId:org.id,productId:chemical.id,unitId:liter.id,factor:'1'});
  const type=await insert(outletTypes,{organizationId:org.id,name:'Retail'});const noPriceType=await insert(outletTypes,{organizationId:org.id,name:'No price'});
  const outlet=await insert(outlets,{organizationId:org.id,name:'Customer snapshot',address:'Address snapshot',outletTypeId:type.id});
  const noPriceOutlet=await insert(outlets,{organizationId:org.id,name:'No price',outletTypeId:noPriceType.id});
  await db.insert(productPrices).values([{organizationId:org.id,sellUnitId:pcs.id,outletTypeId:type.id,amount:'100'},
    {organizationId:org.id,sellUnitId:pcs.id,outletTypeId:type.id,amount:'90',areaId:area.id},
    {organizationId:org.id,sellUnitId:pcs.id,outletTypeId:type.id,amount:'80',warehouseId:wh.id},
    {organizationId:org.id,sellUnitId:dus.id,outletTypeId:type.id,amount:'900'},
    {organizationId:org.id,sellUnitId:liquid.id,outletTypeId:type.id,amount:'123.45'}]);
  await db.insert(salesInventory).values([{organizationId:org.id,salesId:sales.id,warehouseId:wh.id,productId:product.id,quantity:'50'},
    {organizationId:org.id,salesId:sales.id,warehouseId:wh.id,productId:chemical.id,quantity:'10.25'},
    {organizationId:org.id,salesId:sales.id,warehouseId:wh2.id,productId:product.id,quantity:'20'}]);
  const actor={...manager,organization:org,isAdmin:false,permissions:['orders','order_payments','printer_settings','sales_inventory','sales_stock']};
  const own={...actor,id:sales.id,userType:'sales'};const adminActor={...actor,isAdmin:true};
  const run=(cb,user=actor)=>globalThis.testContext.run(user,cb);
  const actions=await bundle('src/lib/actions/orders.ts');const salesActions=await bundle('src/lib/actions/sales-stock.ts');
  const read=await bundle('src/lib/order-data.ts');const print=await bundle('src/lib/print-data.ts');const printerActions=await bundle('src/lib/actions/printers.ts');
  const options=await read.orderOptions(actor);assert.deepEqual(options.sales.map(row=>row.id),[sales.id]);
  assert.deepEqual((await read.orderOptions(own)).sales.map(row=>row.id),[sales.id]);assert.equal((await read.orderOptions(adminActor)).sales.length,2);
  const request=(qty='1',sellUnitId=pcs.id,extra={})=>({requestKey:randomUUID(),salesId:sales.id,outletId:outlet.id,warehouseId:wh.id,kind:'confirmed',date:'2026-11-14',dueDate:'2026-11-21',reference:'REF',notes:'Saved terms',items:[{sellUnitId,quantity:qty}],...extra});
  const save=(data,user=actor)=>run(()=>actions.saveOrder(data),user);
  const transition=(id,action,reason='Test')=>run(()=>actions.transitionOrder({id,action,reason}));
  const balance=async(productId=product.id)=>(await db.select().from(salesInventory).where(and(eq(salesInventory.salesId,sales.id),eq(salesInventory.warehouseId,wh.id),eq(salesInventory.productId,productId))))[0];
  const sku=await run(()=>actions.loadOrderProducts({salesId:sales.id,outletId:outlet.id,warehouseId:wh.id,scope:'all',q:'SKU1',page:1,pageSize:20}));
  assert.equal(sku.rows.length,2);assert.equal(sku.rows.find(row=>row.id===pcs.id).price,'80.00');
  assert.equal(sku.rows.find(row=>row.id===pcs.id).available,'50.000000');
  const areaSku=await run(()=>actions.loadOrderProducts({salesId:sales.id,outletId:outlet.id,warehouseId:wh2.id,scope:'all',q:'SKU1',page:1,pageSize:20}));assert.equal(areaSku.rows.find(row=>row.id===pcs.id).price,'90.00');
  const original=request('3',dus.id);const first=await save(original);assert.ok(first.id,JSON.stringify(first));
  assert.equal((await balance()).quantity,'50.000000');assert.equal((await balance()).reservedQuantity,'36.000000');
  assert.equal((await save(original)).id,first.id);assert.ok((await save({...original,notes:'Tampered'})).error);
  assert.ok((await save(request('1',pcs.id,{salesId:peer.id}))).error);
  assert.ok((await save(request('1',pcs.id,{salesId:foreignSales.id}))).error);
  assert.ok((await save(request('1',pcs.id,{warehouseId:foreignWh.id}))).error);
  assert.ok((await save(request('1',pcs.id,{outletId:noPriceOutlet.id}))).error);
  assert.ok((await save(request('0.5'))).error,'integer base unit forbids fractional qty');
  const quote=await save(request('100',pcs.id,{kind:'quotation'}));assert.ok(quote.id);assert.equal((await balance()).reservedQuantity,'36.000000');assert.ok((await transition(quote.id,'confirm')).error);
  const races=await Promise.all([save(request('10')),save(request('10'))]);assert.equal(races.filter(result=>result.id).length,1);const raced=races.find(result=>result.id);
  assert.equal((await balance()).reservedQuantity,'46.000000');
  const returned=await run(()=>salesActions.saveSalesStock({requestKey:randomUUID(),type:'out',salesId:sales.id,warehouseId:wh.id,date:'2026-11-14',reference:'RETURN',items:[{productId:product.id,quantity:'5'}]}));assert.ok(returned.error);
  const allowedReturn=await run(()=>salesActions.saveSalesStock({requestKey:randomUUID(),type:'out',salesId:sales.id,warehouseId:wh.id,date:'2026-11-14',reference:'RETURN',items:[{productId:product.id,quantity:'4'}]}));assert.ok(allowedReturn.id,JSON.stringify(allowedReturn));
  assert.equal((await balance()).quantity,'46.000000');assert.equal((await balance()).reservedQuantity,'46.000000');
  assert.ok((await transition(raced.id,'cancel')).id);assert.ok((await transition(raced.id,'cancel')).id);assert.equal((await balance()).reservedQuantity,'36.000000');
  assert.equal(await print.getPrintDocument(actor,first.id,'receipt'),null);assert.equal(await print.getPrintDocument(actor,first.id,'invoice'),null);
  assert.ok((await transition(first.id,'deliver')).id);assert.ok((await transition(first.id,'deliver')).id);assert.equal((await balance()).quantity,'10.000000');assert.equal((await balance()).reservedQuantity,'0.000000');
  const invoice=(await db.select().from(invoices).where(eq(invoices.orderId,first.id)))[0];assert.equal(invoice.invoiceAmount,'2700.00');assert.equal((await db.select().from(invoices).where(eq(invoices.orderId,first.id))).length,1);
  const pay=(amount,key=randomUUID(),extra={})=>run(()=>actions.recordOrderPayment({orderId:first.id,requestKey:key,amount,method:'Tunai',reference:'Received',...extra}));
  const payKey=randomUUID();assert.ok((await pay('1000',payKey)).id);assert.ok((await pay('1000',payKey)).id);assert.ok((await pay('1001',payKey)).error);
  assert.equal(await print.getPrintDocument(actor,first.id,'receipt'),null);
  const payments=await Promise.all([pay('1700'),pay('1700')]);assert.equal(payments.filter(result=>result.id).length,1);
  assert.equal((await db.select().from(orderPayments).where(eq(orderPayments.orderId,first.id))).length,2);
  const receipt=await print.getPrintDocument(actor,first.id,'receipt');assert.ok(receipt);assert.equal(receipt.paid,'2700.00');assert.equal(receipt.outstanding,'0.00');assert.equal(receipt.items[0].unit,'DUS');
  assert.ok((await transition(first.id,'cancel')).error);
  assert.equal(await print.getPrintDocument({...actor,id:peer.id,userType:'sales'},first.id,'receipt'),null);
  assert.equal((await read.orderList({...actor,id:peer.id,userType:'sales'},{})).pagination.total,0);
  assert.equal((await read.orderList({...actor,organization:foreign},{})).pagination.total,0);
  const partial=await save(request('2.5',liquid.id));assert.ok(partial.id);assert.equal((await read.getOrder(actor,partial.id)).order.total,'308.63');assert.equal((await balance(chemical.id)).reservedQuantity,'2.500000');
  await transition(partial.id,'cancel');
  const q=await save(request('1',pcs.id,{kind:'quotation'}));assert.ok(q.id);assert.ok((await transition(q.id,'confirm')).id);assert.equal((await balance()).reservedQuantity,'1.000000');await transition(q.id,'cancel');
  const combined=request('1',pcs.id);combined.items.push({sellUnitId:dus.id,quantity:'1'});assert.ok((await save(combined)).error,'aggregate units exceed ten base units');
  const docCount=(await db.select().from(orders)).length;const before=(await balance()).reservedQuantity;
  await client.unsafe(`create function "${namespace}".reject_audit() returns trigger language plpgsql as $$ begin raise exception 'Verification rollback'; end; $$`);
  await client.unsafe(`create trigger reject_audit before insert on "${namespace}".audit_logs for each row execute function "${namespace}".reject_audit()`);
  assert.ok((await save(request('1'))).error);assert.equal((await db.select().from(orders)).length,docCount);assert.equal((await balance()).reservedQuantity,before);
  await client.unsafe(`drop trigger reject_audit on "${namespace}".audit_logs`);
  await db.update(products).set({name:'Renamed product'}).where(eq(products.id,product.id));await db.update(outlets).set({name:'Renamed customer'}).where(eq(outlets.id,outlet.id));await db.update(productPrices).set({amount:'9999'}).where(eq(productPrices.sellUnitId,dus.id));
  const immutable=await print.getPrintDocument(actor,first.id,'receipt');assert.equal(immutable.customer,'Customer snapshot');assert.equal(immutable.items[0].name,'Original product');assert.equal(immutable.items[0].price,'900.00');
  const settings=await print.getPrintSettings(org.id);assert.equal(settings.width,80);
  assert.ok((await run(()=>printerActions.savePrinterSettings({...settings,paper:'58',width:58,fontSize:10}))).ok);assert.equal((await print.getPrintSettings(org.id)).width,58);assert.equal((await print.getPrintSettings(foreign.id)).width,80);
  assert.ok((await run(()=>printerActions.savePrinterSettings({...settings,width:20,paper:'custom'}))).error);
  const component=await bundle('src/components/document-printer.tsx');
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
  for(const width of [58,80,210]){
    const html=renderToStaticMarkup(React.createElement(component.ReceiptPreview,{document:receipt,settings:{...settings,width,paper:width===210?'A4':String(width)}}));
    assert.ok(html.includes(`width:${width}mm`));assert.ok(html.includes('NOTA LUNAS'));assert.ok(html.includes('Original product'));assert.ok(html.includes('DUS'));
  }
  const delivery=await save(request('1'));assert.ok(delivery.id);assert.ok((await transition(delivery.id,'deliver')).id);
  const paymentBefore=(await db.select().from(orderPayments)).length;
  await client.unsafe(`create trigger reject_audit before insert on "${namespace}".audit_logs for each row execute function "${namespace}".reject_audit()`);
  const failPay=await run(()=>actions.recordOrderPayment({orderId:delivery.id,requestKey:randomUUID(),amount:'1',method:'Tunai',reference:''}));assert.ok(failPay.error);
  assert.equal((await db.select().from(orderPayments)).length,paymentBefore);
  assert.equal((await db.select().from(invoices).where(eq(invoices.orderId,delivery.id)))[0].paidAmount,'0.00');
  await client.unsafe(`drop trigger reject_audit on "${namespace}".audit_logs`);
  assert.ok((await run(()=>actions.recordOrderPayment({orderId:first.id,requestKey:randomUUID(),amount:'1',method:'Tunai',reference:''}),{...actor,permissions:['orders']})).error);
  assert.equal((await read.orderDetailRows(org.id,first.id,{},true)).pagination.total,2);
  console.log('PASS order hierarchy/tenant, price precedence/snapshots, SKU/base-unit conversion, reservations, concurrent oversell/payment, return guards, cancel release, delivery idempotency, invoice/receipt gates, payment ledger, audit rollback and print settings');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.end();if(created){assert.match(namespace,/^order_verify_[a-f0-9]{32}$/);await admin.unsafe(`drop schema "${namespace}" cascade`);}await admin.end();});
