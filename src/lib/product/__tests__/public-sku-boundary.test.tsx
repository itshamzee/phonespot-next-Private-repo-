import { Children, isValidElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
const data=vi.hoisted(()=>({
 product:{id:'accessory',title:'Cover',slug:'cover',description:null,short_description:null,images:['/cover.png'],brand:'Brand',category:'accessory',subcategory:'cover',selling_price:14900,sale_price:null,always_in_stock:true,ean:null,barcode:null,cost_price:987654,supplier_id:'PRIVATE_SUPPLIER',variants:[{name:'Farve',options:[{value:'Klar',price_override:15900,sku:'clear',image:'/clear.png'}]}],attributes:{material:'TPU'}},
 template:{id:'template',slug:'phone',display_name:'Phone',category:'iphone',brand:'Apple',images:[],storage_options:[],specifications:{},base_price_a:10000},
}));
vi.mock('@/lib/supabase/product-queries',()=>({getSkuProductBySlug:async()=>data.product,getTemplateBySlug:async()=>data.template,getAvailableDevices:async()=>[{selling_price:10000,grade:'A',battery_health:90}],getPublishedSkuProducts:async()=>[data.product],getPublishedTemplates:async()=>[],getUpgradeOptionsForTemplate:async()=>[]}));
vi.mock('@/lib/supabase/accessories',()=>({getAccessoryBySlug:async()=>null}));
vi.mock('@/lib/supabase/client',()=>({createServerClient:()=>({from:()=>{const q:Record<string,unknown>={};for(const m of ['select','eq','limit','in','neq','ilike'])q[m]=()=>q;q.then=(r:(x:unknown)=>unknown)=>Promise.resolve(r({data:[],error:null}));return q;}})}));
vi.mock('@/components/product/accessory-detail',()=>({AccessoryDetail:()=>null}));
vi.mock('@/components/product/device-detail',()=>({DeviceDetail:()=>null}));
vi.mock('@/components/trustpilot/trustpilot-reviews',()=>({TrustpilotReviews:()=>null}));
vi.mock('@/components/trustpilot/trustpilot-stars',()=>({TrustpilotStars:()=>null}));
import AccessoryPage from '@/app/tilbehoer/[category]/[slug]/page';
import RefurbishedPage from '@/app/refurbished/[slug]/page';
import GenericPage from '@/app/[collection]/[product]/page';
import { AccessoryDetail } from '@/components/product/accessory-detail';
import { DeviceDetail } from '@/components/product/device-detail';
function propsFor(node:ReactNode,target:unknown): Record<string,unknown> | undefined {
 for(const child of Children.toArray(node)) {
  if(!isValidElement<{children?:ReactNode}>(child))continue;
  if(child.type===target)return child.props;
  const nested=propsFor(child.props.children,target);if(nested)return nested;
 }
}
it.each(['accessory','refurbished','generic'])('does not serialize internal SKU fields at the %s client boundary',async kind=>{
 const page=kind==='accessory'?await AccessoryPage({params:Promise.resolve({category:'covers',slug:'cover'})}):kind==='refurbished'?await RefurbishedPage({params:Promise.resolve({slug:'phone'})}):await GenericPage({params:Promise.resolve({collection:'iphones',product:'phone'})});
 const props=propsFor(page,kind==='accessory'?AccessoryDetail:DeviceDetail);
 expect(props).toBeDefined();
 const product=kind==='accessory'?props!.product:(props!.accessories as unknown[])[0];
 expect(JSON.stringify(product)).not.toContain('987654'); expect(JSON.stringify(product)).not.toContain('PRIVATE_SUPPLIER');
 expect(product).not.toHaveProperty('cost_price');expect(product).not.toHaveProperty('supplier_id');
 expect(product).toMatchObject({id:'accessory',selling_price:14900,images:['/cover.png'],variants:data.product.variants});
});
