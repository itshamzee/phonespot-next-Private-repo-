import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SpotPicker } from '../SpotPicker';
import type { SpotSku } from '@/lib/spot/types';
const state=vi.hoisted(()=>({params:'',push:vi.fn(),addSku:vi.fn(),openCart:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:state.push}),useSearchParams:()=>new URLSearchParams(state.params)}));
vi.mock('@/components/cart/cart-context',()=>({useCart:()=>state}));
beforeEach(()=>{state.params='';vi.clearAllMocks();Element.prototype.scrollIntoView=vi.fn();});
function sku(id:string,variant_label:string,price:number,models=['iphone-17-pro'],sale:number|null=null):SpotSku{return {id,slug:id,title:id,subcategory:'spot-glass',selling_price:price,sale_price:sale,compatible_models:models,images:[],variant_group:'test',variant_label,variant_sort:0,is_active:true};}
const skus=[sku('glass','Normal',19900),sku('privacy','Privacy',24900,undefined,21900),sku('lens','Lens',12900),sku('case-plateau-orange','Orange',29900),sku('other','Normal',17900,['iphone-15'])];
it('does not focus the keyboard on load and exposes search results via keyboard',()=>{
 render(<SpotPicker skus={skus}/>);const input=screen.getByRole('textbox',{name:'Søg efter din enhed'});expect(input).not.toHaveFocus();
 fireEvent.change(input,{target:{value:'iPhone 17'}});fireEvent.keyDown(input,{key:'ArrowDown'});
 const model=screen.getByRole('button',{name:'iPhone 17 Pro'});expect(model).toHaveFocus();fireEvent.click(model);
 expect(state.push).toHaveBeenCalledWith('/beskyttelsesglas?model=iphone-17-pro',{scroll:false});
});
it('shows unmatched searches and lets every actually covered model be found',()=>{
 render(<SpotPicker skus={[sku('new','Normal',21900,['new-model'])]}/>);
 const input=screen.getByRole('textbox',{name:'Søg efter din enhed'});fireEvent.change(input,{target:{value:'absent'}});
 expect(screen.getByRole('status')).toHaveTextContent('Ingen modeller');
 fireEvent.change(input,{target:{value:'new-model'}});expect(screen.getByRole('button',{name:'new-model'})).toBeInTheDocument();
});
it('preserves selected glass, lens bundle unit price, plateau and the existing total',()=>{
 state.params='model=iphone-17-pro';render(<SpotPicker skus={skus}/>);
 fireEvent.click(screen.getByRole('button',{name:/Privacy/}));fireEvent.click(screen.getByRole('checkbox',{name:/Kamera/}));
 const orange=screen.getByRole('button',{name:'Orange'});fireEvent.click(orange);expect(orange).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:/Læg i kurv.*583 kr/}));
 expect(state.addSku.mock.calls.map(call=>call[0])).toEqual([
 {type:'sku_product',skuProductId:'privacy',title:'privacy',image:null,price:21900,unitPrice:24900,quantity:1,variantLabel:'Privacy',spotKind:'privacy'},
 {type:'sku_product',skuProductId:'lens',title:'lens',image:null,price:6450,unitPrice:12900,quantity:1,variantLabel:'Lens',spotKind:'lens'},
 {type:'sku_product',skuProductId:'case-plateau-orange',title:'case-plateau-orange',image:null,price:29900,quantity:1,variantLabel:'Orange',spotKind:'plateau'},
 ]);
});
it('clears every optional selection on model change and sends only the new SKU',()=>{
 state.params='model=iphone-17-pro';const view=render(<SpotPicker skus={skus}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:/Kamera/}));fireEvent.click(screen.getByRole('button',{name:'Orange'}));
 state.params='model=iphone-15';view.rerender(<SpotPicker skus={skus}/>);
 fireEvent.click(screen.getByRole('button',{name:/Læg i kurv.*179 kr/}));
 expect(state.addSku).toHaveBeenCalledTimes(1);expect(state.addSku).toHaveBeenCalledWith(expect.objectContaining({skuProductId:'other',price:17900}));
});

