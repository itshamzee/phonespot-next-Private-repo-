import Link from "next/link";
import type { TilbehoerDevice } from "@/lib/tilbehoer-config";

interface DeviceChipsProps {
  category: string;
  devices: TilbehoerDevice[];
  activeDevice?: string;
}

export function DeviceChips({ category, devices, activeDevice }: DeviceChipsProps) {
  if (devices.length === 0) return null;

  const appleDevices = devices.filter((d) => d.brand === "apple");
  const samsungDevices = devices.filter((d) => d.brand === "samsung");

  return (
    <div className="mb-6 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pb-2">
        <Link
          href={`/tilbehoer/${category}`}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !activeDevice
              ? "bg-charcoal text-white"
              : "bg-cream text-charcoal hover:bg-sand"
          }`}
        >
          Alle
        </Link>

        {appleDevices.length > 0 && (
          <>
            <span className="flex items-center px-1 text-xs text-gray">Apple</span>
            {appleDevices.map((device) => (
              <Link
                key={device.slug}
                href={`/tilbehoer/${category}/${device.slug}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeDevice === device.slug
                    ? "bg-charcoal text-white"
                    : "bg-cream text-charcoal hover:bg-sand"
                }`}
              >
                {device.label}
              </Link>
            ))}
          </>
        )}

        {samsungDevices.length > 0 && (
          <>
            <span className="flex items-center px-1 text-xs text-gray">Samsung</span>
            {samsungDevices.map((device) => (
              <Link
                key={device.slug}
                href={`/tilbehoer/${category}/${device.slug}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeDevice === device.slug
                    ? "bg-charcoal text-white"
                    : "bg-cream text-charcoal hover:bg-sand"
                }`}
              >
                {device.label}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
