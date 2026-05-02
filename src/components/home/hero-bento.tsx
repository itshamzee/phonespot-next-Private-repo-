import { FeaturedCell } from './hero-bento/featured-cell';
import { ComputerCell } from './hero-bento/computer-cell';
import { RepairCell } from './hero-bento/repair-cell';
import { SellCell } from './hero-bento/sell-cell';

export function HeroBento() {
  return (
    <section className="bg-warm-white py-6 px-6 max-md:px-4">
      <div className="max-w-[1200px] mx-auto grid grid-cols-6 grid-rows-[240px_240px] gap-3.5 max-md:grid-cols-1 max-md:grid-rows-none max-md:gap-3 max-md:auto-rows-[200px]">
        <FeaturedCell />
        <ComputerCell />
        <RepairCell />
        <SellCell />
      </div>
    </section>
  );
}
