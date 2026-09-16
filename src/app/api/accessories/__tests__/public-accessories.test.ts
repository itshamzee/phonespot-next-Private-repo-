import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
const state = vi.hoisted(() => ({ stockError: false, selections: [] as string[], stocks: [] as unknown[] }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (table: string) => {
 const rows = table === 'sku_products' ? [
 { id:'physical',title:'Cover',slug:'cover',subcategory:'cover',selling_price:14900,cost_price:9123,images:[],always_in_stock:false },
 { id:'order',title:'Order',slug:'order',subcategory:'cover',selling_price:10000,cost_price:8123,images:[],always_in_stock:true },
 { id:'zero',title:'Zero',slug:'zero',subcategory:'cover',selling_price:10000,images:[],always_in_stock:false },
 { id:'warehouse',title:'Warehouse',slug:'warehouse',subcategory:'cover',selling_price:10000,images:[],always_in_stock:false },
 ] : state.stocks;
 const q: Record<string, unknown> = {};
 for (const method of ['eq','neq','order','in','gt','limit','ilike','or']) q[method] = () => q;
 q.select = (s: string) => { state.selections.push(s); return q; };
 q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({data: table === 'sku_stock' && state.stockError ? null : rows,error:table === 'sku_stock' && state.stockError ? {message:'failed'} : null}));
 return q;
} }) }));
beforeEach(() => { state.stockError=false; state.selections=[]; state.stocks=[
 {product_id:'physical',quantity:3,location:{type:'store'}},
 {product_id:'physical',quantity:5,location:{type:'warehouse'}},
 {product_id:'warehouse',quantity:4,location:{type:'warehouse'}},
]; });
it('publishes only public fields and counts each stock unit once', async () => {
 const rows = await (await GET(new NextRequest('https://example.com/api/accessories'))).json();
 expect(JSON.stringify(rows)).not.toContain('cost_price');
 expect(state.selections.join(',')).not.toContain('cost_price');
 expect(rows[0]).toMatchObject({store_stock:3,online_stock:5,availability:'in_stock'});
 expect(rows[1]).toMatchObject({store_stock:0,online_stock:0,availability:'orderable'});
 expect(rows[2]).toMatchObject({store_stock:0,online_stock:0,availability:'out_of_stock'});
});
it('inStore includes only positive physical store stock', async () => {
 const rows = await (await GET(new NextRequest('https://example.com/api/accessories?inStore=true'))).json();
 expect(rows.map((p: {id:string}) => p.id)).toEqual(['physical']);
});
it('stock failure is unknown and never confirms physical stock', async () => {
 state.stockError=true;
 const rows = await (await GET(new NextRequest('https://example.com/api/accessories'))).json();
 expect(rows[0]).toMatchObject({store_stock:null,online_stock:null,availability:'unknown'});
 expect(rows[1].availability).toBe('orderable');
 const response = await GET(new NextRequest('https://example.com/api/accessories?inStore=true'));
 expect(response.status).toBe(503);
});
