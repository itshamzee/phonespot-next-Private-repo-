import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AccessoryGrid } from '../accessory-grid';
vi.mock('../accessory-card', () => ({AccessoryCard: ({name}: {name:string}) => <div>{name}</div>}));
afterEach(() => vi.unstubAllGlobals());
function response(name: string) { return {ok:true,json:async () => [{id:name,name,price:10000,created_at:'2026-01-01'}]}; }
it('keeps B when the superseded A response resolves last despite abort', async () => {
 let resolveA!: (v: unknown) => void;
 vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(r => {resolveA=r;})).mockResolvedValueOnce(response('B')));
 const view=render(<AccessoryGrid search="A"/>);
 view.rerender(<AccessoryGrid search="B"/>);
 await screen.findByText('B');
 await act(async () => resolveA(response('A')));
 expect(screen.getByText('B')).toBeInTheDocument();
 expect(screen.queryByText('A')).not.toBeInTheDocument();
});
it('shows an error and lets the customer retry a rejected request', async () => {
 vi.stubGlobal('fetch',vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(response('Recovered')));
 render(<AccessoryGrid/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
 fireEvent.click(screen.getByRole('button',{name:'Prøv igen'}));
 expect(await screen.findByText('Recovered')).toBeInTheDocument();
});
