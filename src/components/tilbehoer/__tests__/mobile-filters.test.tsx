import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TilbehoerMobileFilters } from '../tilbehoer-mobile-filters';
const push=vi.hoisted(() => vi.fn());
it('offers an optional device filter for ordinary glass products',()=>{
 render(<TilbehoerMobileFilters open onClose={()=>{}} activeCategory="beskyttelsesglas" productCount={2}/>);
 expect(screen.getByRole('button',{name:'iPhone 17 Pro'})).toBeInTheDocument();
});
vi.mock('next/navigation',()=>({useRouter:()=>({push}),usePathname:()=>'/tilbehoer/covers',useSearchParams:()=>new URLSearchParams('brand=apple&model=iPhone+17&search=case&pris=0-9999&side=3')}));
it('focuses, traps Tab, closes on Escape and restores focus/body scroll',()=>{
 const close=vi.fn(); const trigger=document.createElement('button'); document.body.appendChild(trigger); trigger.focus();
 const view=render(<TilbehoerMobileFilters open onClose={close} activeCategory="covers" productCount={3}/>);
 const dialog=screen.getByRole('dialog'); expect(dialog).toContainElement(document.activeElement as HTMLElement);
 expect(document.body.style.overflow).toBe('hidden');
 const last=screen.getByRole('button',{name:'Vis 3 produkter'}); last.focus(); fireEvent.keyDown(document,{key:'Tab'});
 expect(screen.getByRole('button',{name:'Luk filter'})).toHaveFocus();
 fireEvent.keyDown(document,{key:'Escape'}); expect(close).toHaveBeenCalled();
 view.rerender(<TilbehoerMobileFilters open={false} onClose={close} activeCategory="covers" productCount={3}/>);
 expect(trigger).toHaveFocus(); expect(document.body.style.overflow).toBe(''); trigger.remove();
});
it('resets URL filters together with pagination',()=>{
 render(<TilbehoerMobileFilters open onClose={()=>{}} activeCategory="covers" productCount={3}/>);
 fireEvent.click(screen.getByRole('button',{name:'Nulstil alle'})); expect(push).toHaveBeenCalledWith('/tilbehoer/covers',{scroll:false});
});

it('makes the page background inert and restores its original attributes',()=>{
 const header=document.createElement('header'); header.textContent='Navigation'; document.body.appendChild(header);
 const view=render(<TilbehoerMobileFilters open onClose={()=>{}} activeCategory="covers" productCount={1}/>);
 expect(header).toHaveAttribute('inert'); expect(header).toHaveAttribute('aria-hidden','true');
 view.unmount(); expect(header).not.toHaveAttribute('inert'); expect(header).not.toHaveAttribute('aria-hidden'); header.remove();
});
