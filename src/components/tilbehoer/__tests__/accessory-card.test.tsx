import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccessoryCard } from '../accessory-card';
const cart=vi.hoisted(()=>({addSku:vi.fn(),openCart:vi.fn()}));
vi.mock('@/components/cart/cart-context',()=>({useCart:()=>cart}));
beforeEach(()=>vi.clearAllMocks());
afterEach(()=>vi.useRealTimers());
const product={id:'cover',name:'Cover',slug:'cover',category:'covers',brand:'Brand',price:19900,sale_price:14900,image_url:'/cover.png',store_stock:3,online_stock:5,availability:'in_stock' as const};
it('adds exactly the actual SKU sale price, quantity and photograph while preserving the detail link',()=>{
 render(<AccessoryCard {...product}/>);fireEvent.click(screen.getByRole('button',{name:'Tilføj til kurv'}));
 expect(cart.addSku).toHaveBeenCalledWith({type:'sku_product',skuProductId:'cover',title:'Cover',price:14900,quantity:1,image:'/cover.png'});
 expect(screen.getByRole('link',{name:'Se detaljer og kompatibilitet'})).toHaveAttribute('href','/tilbehoer/covers/cover');
});
it('keeps unknown stock unavailable without inventing a link or product image',()=>{
 render(<AccessoryCard {...product} slug={null} image_url={null} availability="unknown" store_stock={null} online_stock={null}/>);
 expect(screen.queryByRole('link')).not.toBeInTheDocument();expect(screen.queryByRole('img')).not.toBeInTheDocument();
 const button=screen.getByRole('button',{name:'Lagerstatus ukendt'});expect(button).toBeDisabled();fireEvent.click(button);expect(cart.addSku).not.toHaveBeenCalled();
});

it('briefly confirms one addition, then allows another, and cancels confirmation on unmount',()=>{
 vi.useFakeTimers();
 const view=render(<AccessoryCard {...product}/>);
 fireEvent.click(screen.getByRole('button',{name:'Tilføj til kurv'}));
 const confirmation=screen.getByRole('button',{name:'Tilføjet til kurv'});
 expect(confirmation).toBeDisabled();fireEvent.click(confirmation);
 expect(cart.addSku).toHaveBeenCalledTimes(1);
 act(()=>vi.advanceTimersByTime(1800));
 const button=screen.getByRole('button',{name:'Tilføj til kurv'});expect(button).toBeEnabled();
 fireEvent.click(button);expect(cart.addSku).toHaveBeenCalledTimes(2);
 view.unmount();expect(vi.getTimerCount()).toBe(0);
});
