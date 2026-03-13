"use client";

import { useState, useEffect, useRef } from "react";
import { GradePicker, type Grade } from "@/components/platform/grade-picker";
import { TemplateSelect } from "@/components/platform/template-select";
import { SupplierSelect } from "@/components/platform/supplier-select";
import { PhotoUploader } from "@/components/platform/photo-uploader";
import { parseDKKToOere } from "@/lib/platform/format";

interface Location {
  id: string;
  name: string;
  type: string;
}

interface FormState {
  serial_number: string;
  imei: string;
  template_id: string | null;
  template_storage_options: string[];
  template_colors: string[];
  storage: string;
  color: string;
  grade: Grade | null;
  battery_health: string;
  condition_notes: string;
  purchase_price: string;
  supplier_id: string | null;
  vat_scheme: "brugtmoms" | "regular";
  seller_name: string;
  seller_address: string;
  generate_afregningsbilag: boolean;
  location_id: string | null;
  selling_price: string;
}

interface DeviceIntakeFormProps {
  onSuccess: (device: unknown) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </h3>
  );
}

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-700">
      {children}
      {optional && <span className="ml-1 text-xs font-normal text-stone-400">(valgfrit)</span>}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
    />
  );
}

export function DeviceIntakeForm({ onSuccess }: DeviceIntakeFormProps) {
  const [form, setForm] = useState<FormState>({
    serial_number: "",
    imei: "",
    template_id: null,
    template_storage_options: [],
    template_colors: [],
    storage: "",
    color: "",
    grade: null,
    battery_health: "",
    condition_notes: "",
    purchase_price: "",
    supplier_id: null,
    vat_scheme: "brugtmoms",
    seller_name: "",
    seller_address: "",
    generate_afregningsbilag: true,
    location_id: null,
    selling_price: "",
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successDevice, setSuccessDevice] = useState<{ id: string; barcode: string } | null>(null);
  const [devicePhotos, setDevicePhotos] = useState<string[]>([]);
  const photoUploaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/platform/locations")
      .then((r) => r.json())
      .then((data) => {
        const locs = Array.isArray(data) ? data : [];
        setLocations(locs);
        if (locs.length === 1) {
          setForm((prev) => ({ ...prev, location_id: locs[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const e = { ...prev };
        delete e[key];
        return e;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.template_id) newErrors.template_id = "Vaelg en produktskabelon";
    if (!form.grade) newErrors.grade = "Vaelg en stand";
    if (!form.purchase_price.trim()) {
      newErrors.purchase_price = "Indkobspris er paakraevet";
    } else {
      const oere = parseDKKToOere(form.purchase_price);
      if (oere === null || oere <= 0) newErrors.purchase_price = "Ugyldig pris";
    }
    if (!form.location_id) newErrors.location_id = "Vaelg en lokation";
    if (
      form.vat_scheme === "brugtmoms" &&
      form.generate_afregningsbilag &&
      form.supplier_id
    ) {
      if (!form.seller_name.trim()) newErrors.seller_name = "Saelgers navn er paakraevet";
      if (!form.seller_address.trim()) newErrors.seller_address = "Saelgers adresse er paakraevet";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const purchasePriceOere = parseDKKToOere(form.purchase_price) ?? 0;
      const sellingPriceOere = form.selling_price.trim()
        ? parseDKKToOere(form.selling_price)
        : undefined;

      const body: Record<string, unknown> = {
        template_id: form.template_id,
        grade: form.grade,
        purchase_price: purchasePriceOere,
        vat_scheme: form.vat_scheme,
        location_id: form.location_id,
      };
      if (form.serial_number.trim()) body.serial_number = form.serial_number.trim();
      if (form.imei.trim()) body.imei = form.imei.trim();
      if (form.storage) body.storage = form.storage;
      if (form.color) body.color = form.color;
      if (form.battery_health) body.battery_health = parseInt(form.battery_health, 10);
      if (form.condition_notes.trim()) body.condition_notes = form.condition_notes.trim();
      if (form.supplier_id) body.supplier_id = form.supplier_id;
      if (sellingPriceOere && sellingPriceOere > 0) body.selling_price = sellingPriceOere;
      if (form.seller_name.trim()) body.seller_name = form.seller_name.trim();
      if (form.seller_address.trim()) body.seller_address = form.seller_address.trim();

      const deviceRes = await fetch("/api/platform/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!deviceRes.ok) {
        const err = await deviceRes.json();
        const fieldErrors: Record<string, string> = {};
        if (err.issues) {
          for (const [field, msgs] of Object.entries(err.issues)) {
            fieldErrors[field] = (msgs as string[]).join(", ");
          }
        }
        setErrors(
          Object.keys(fieldErrors).length
            ? fieldErrors
            : { _form: err.error ?? "Fejl ved oprettelse" },
        );
        return;
      }

      const device = await deviceRes.json();

      if (
        form.vat_scheme === "brugtmoms" &&
        form.supplier_id &&
        form.generate_afregningsbilag &&
        form.seller_name.trim() &&
        form.seller_address.trim()
      ) {
        try {
          await fetch("/api/platform/afregningsbilag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              device_id: device.id,
              seller_name: form.seller_name.trim(),
              seller_address: form.seller_address.trim(),
            }),
          });
        } catch {
          // Non-fatal
        }
      }

      // Upload pending photos
      if (photoUploaderRef.current) {
        const hiddenInput = photoUploaderRef.current.querySelector<HTMLInputElement>(
          "[data-pending-count]",
        );
        if (hiddenInput) {
          const pending = parseInt(hiddenInput.dataset.pendingCount ?? "0", 10);
          if (pending > 0) {
            const uploader = hiddenInput as HTMLInputElement & {
              uploadPending?: (id: string) => Promise<string[]>;
            };
            if (uploader.uploadPending) {
              await uploader.uploadPending(device.id);
            }
          }
        }
      }

      setSuccessDevice({ id: device.id, barcode: device.barcode });
      onSuccess(device);
    } catch {
      setErrors({ _form: "Netvaerksfejl — proev igen" });
    } finally {
      setSubmitting(false);
    }
  }

  if (successDevice) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco text-white">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-stone-800">Enhed registreret!</h3>
        <p className="mt-1 text-sm text-stone-500">
          Stregkode:{" "}
          <span className="font-mono font-bold text-green-eco">{successDevice.barcode}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setSuccessDevice(null);
            setDevicePhotos([]);
            setForm({
              serial_number: "",
              imei: "",
              template_id: null,
              template_storage_options: [],
              template_colors: [],
              storage: "",
              color: "",
              grade: null,
              battery_health: "",
              condition_notes: "",
              purchase_price: "",
              supplier_id: null,
              vat_scheme: "brugtmoms",
              seller_name: "",
              seller_address: "",
              generate_afregningsbilag: true,
              location_id: locations[0]?.id ?? null,
              selling_price: "",
            });
          }}
          className="mt-4 rounded-xl bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Registrer ny enhed
        </button>
      </div>
    );
  }

  const showAfregningsbilag = form.vat_scheme === "brugtmoms" && !!form.supplier_id;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors._form && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {/* Identifikation */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <SectionHeading>Identifikation</SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="serial_number" optional>
              Serienummer
            </FieldLabel>
            <TextInput
              id="serial_number"
              value={form.serial_number}
              onChange={(v) => set("serial_number", v)}
              placeholder="SNXXXXXX"
            />
          </div>
          <div>
            <FieldLabel htmlFor="imei" optional>
              IMEI
            </FieldLabel>
            <TextInput
              id="imei"
              value={form.imei}
              onChange={(v) => set("imei", v)}
              placeholder="15-cifret IMEI"
            />
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel>Produktskabelon</FieldLabel>
          <TemplateSelect
            value={form.template_id}
            onChange={(id, template) => {
              setForm((prev) => ({
                ...prev,
                template_id: id,
                template_storage_options: template.storage_options ?? [],
                template_colors: template.colors ?? [],
                storage: template.storage_options?.[0] ?? "",
                color: template.colors?.[0] ?? "",
              }));
              if (errors.template_id) {
                setErrors((prev) => {
                  const e = { ...prev };
                  delete e.template_id;
                  return e;
                });
              }
            }}
          />
          {errors.template_id && (
            <p className="mt-1 text-xs text-red-500">{errors.template_id}</p>
          )}
        </div>

        {form.template_storage_options.length > 0 && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="storage">Lagerkapacitet</FieldLabel>
              <select
                id="storage"
                value={form.storage}
                onChange={(e) => set("storage", e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
              >
                {form.template_storage_options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            {form.template_colors.length > 0 && (
              <div>
                <FieldLabel htmlFor="color">Farve</FieldLabel>
                <select
                  id="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
                >
                  {form.template_colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stand & Tilstand */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <SectionHeading>Stand &amp; Tilstand</SectionHeading>

        <div>
          <FieldLabel>Karakter</FieldLabel>
          <GradePicker value={form.grade} onChange={(g) => set("grade", g)} />
          {errors.grade && <p className="mt-1 text-xs text-red-500">{errors.grade}</p>}
        </div>

        <div className="mt-5 sm:max-w-xs">
          <FieldLabel htmlFor="battery_health" optional>
            Batterihelbred (%)
          </FieldLabel>
          <TextInput
            id="battery_health"
            type="number"
            value={form.battery_health}
            onChange={(v) => set("battery_health", v)}
            placeholder="85"
            min={0}
            max={100}
          />
        </div>

        <div className="mt-5">
          <FieldLabel htmlFor="condition_notes" optional>
            Tilstandsnoter
          </FieldLabel>
          <textarea
            id="condition_notes"
            value={form.condition_notes}
            onChange={(e) => set("condition_notes", e.target.value)}
            rows={3}
            placeholder="Beskriv eventuelle skader, ridser eller mangler..."
            className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-green-eco/60 focus:outline-none focus:ring-1 focus:ring-green-eco/20 transition"
          />
        </div>
      </section>

      {/* Indkob */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <SectionHeading>Indkob</SectionHeading>

        <div className="sm:max-w-xs">
          <FieldLabel htmlFor="purchase_price">Indkobspris (DKK)</FieldLabel>
          <TextInput
            id="purchase_price"
            value={form.purchase_price}
            onChange={(v) => set("purchase_price", v)}
            placeholder="1.500"
          />
          {errors.purchase_price && (
            <p className="mt-1 text-xs text-red-500">{errors.purchase_price}</p>
          )}
        </div>

        <div className="mt-5">
          <FieldLabel optional>Leverandoer</FieldLabel>
          <SupplierSelect
            value={form.supplier_id}
            onChange={(id, isVatRegistered) => {
              setForm((prev) => ({
                ...prev,
                supplier_id: id,
                vat_scheme: isVatRegistered ? "regular" : "brugtmoms",
              }));
            }}
          />
        </div>

        <div className="mt-5">
          <FieldLabel>Momsordning</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            {(
              [
                ["brugtmoms", "Brugtmoms (margin)", "Bruges ved koeb fra privatpersoner"],
                ["regular", "Normal moms", "Bruges ved koeb fra momsregistrerede erhvervsdrivende"],
              ] as const
            ).map(([val, label, description]) => (
              <label
                key={val}
                className={[
                  "flex flex-1 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition",
                  form.vat_scheme === val
                    ? "border-green-eco bg-green-eco/5"
                    : "border-stone-200 hover:border-stone-300",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="vat_scheme"
                  value={val}
                  checked={form.vat_scheme === val}
                  onChange={() => set("vat_scheme", val)}
                  className="mt-0.5 accent-green-eco"
                />
                <div>
                  <p className="text-sm font-medium text-stone-800">{label}</p>
                  <p className="text-xs text-stone-400">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Afregningsbilag */}
      {showAfregningsbilag && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
          <SectionHeading>Afregningsbilag</SectionHeading>

          <label className="mb-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.generate_afregningsbilag}
              onChange={(e) => set("generate_afregningsbilag", e.target.checked)}
              className="h-4 w-4 accent-green-eco"
            />
            <span className="text-sm font-medium text-stone-700">
              Generer afregningsbilag automatisk
            </span>
          </label>

          {form.generate_afregningsbilag && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="seller_name">Saelgers navn</FieldLabel>
                <TextInput
                  id="seller_name"
                  value={form.seller_name}
                  onChange={(v) => set("seller_name", v)}
                  placeholder="Fulde navn"
                />
                {errors.seller_name && (
                  <p className="mt-1 text-xs text-red-500">{errors.seller_name}</p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor="seller_address">Saelgers adresse</FieldLabel>
                <TextInput
                  id="seller_address"
                  value={form.seller_address}
                  onChange={(v) => set("seller_address", v)}
                  placeholder="Vejnavn 1, 1234 By"
                />
                {errors.seller_address && (
                  <p className="mt-1 text-xs text-red-500">{errors.seller_address}</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Lokation */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <SectionHeading>Lokation</SectionHeading>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          {locations.map((loc) => (
            <label
              key={loc.id}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition",
                form.location_id === loc.id
                  ? "border-green-eco bg-green-eco/5"
                  : "border-stone-200 hover:border-stone-300",
              ].join(" ")}
            >
              <input
                type="radio"
                name="location_id"
                value={loc.id}
                checked={form.location_id === loc.id}
                onChange={() => set("location_id", loc.id)}
                className="accent-green-eco"
              />
              <div>
                <p className="text-sm font-medium text-stone-800">{loc.name}</p>
                {loc.type && <p className="text-xs capitalize text-stone-400">{loc.type}</p>}
              </div>
            </label>
          ))}
          {locations.length === 0 && (
            <p className="text-sm text-stone-400">Indlaeser lokationer...</p>
          )}
        </div>
        {errors.location_id && (
          <p className="mt-2 text-xs text-red-500">{errors.location_id}</p>
        )}
      </section>

      {/* Billeder */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <SectionHeading>Billeder</SectionHeading>
        <p className="mb-4 text-xs text-stone-400">
          Billeder uploades automatisk efter enheden er registreret.
        </p>
        <div ref={photoUploaderRef}>
          <PhotoUploader
            deviceId={null}
            existingPhotos={devicePhotos}
            onPhotosChange={setDevicePhotos}
          />
        </div>
      </section>

      {/* Pris */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <SectionHeading>Pris</SectionHeading>
        <div className="sm:max-w-xs">
          <FieldLabel htmlFor="selling_price" optional>
            Salgspris (DKK)
          </FieldLabel>
          <TextInput
            id="selling_price"
            value={form.selling_price}
            onChange={(v) => set("selling_price", v)}
            placeholder="2.499"
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-4">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-green-eco px-6 py-3 text-sm font-bold text-white shadow-md shadow-green-eco/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Registrerer...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Registrer enhed
            </>
          )}
        </button>
      </div>
    </form>
  );
}
