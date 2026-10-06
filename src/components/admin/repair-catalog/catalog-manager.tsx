"use client";

import { useCallback, useMemo, useState } from "react";
import type { ManageBrandNode, ManageTreeResponse } from "@/lib/repairs/catalog-manage-types";
import { MANAGE, api } from "./api";
import { ModelDetail } from "./model-detail";
import { NewModelDialog } from "./new-model-dialog";
import { TreePanel } from "./tree-panel";

/** Reparationskataloget i ét billede: træ til venstre, den valgte models reparationer til højre. */
export function CatalogManager({ initialTree, initialModelId }: { initialTree: ManageTreeResponse; initialModelId: string | null }) {
  const [tree, setTree] = useState(initialTree);
  const [selectedId, setSelectedId] = useState<string | null>(initialModelId);
  const [newModel, setNewModel] = useState(false);

  const reloadTree = useCallback(async () => {
    try {
      setTree(await api<ManageTreeResponse>(`${MANAGE}/tree`));
    } catch {
      /* træet opdateres ved næste ændring; selve redigeringen er allerede gemt */
    }
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("model", id);
    window.history.replaceState(null, "", url);
  }, []);

  const selectedBrand: ManageBrandNode | null = useMemo(() => {
    for (const p of tree.parents)
      for (const b of p.brands) if (b.series.some((s) => s.models.some((m) => m.id === selectedId))) return b;
    return null;
  }, [tree, selectedId]);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
      <TreePanel tree={tree} selectedId={selectedId} onSelect={select} onNewModel={() => setNewModel(true)} />
      <div className="min-w-0">
        {selectedId ? (
          <ModelDetail key={selectedId} modelId={selectedId} brand={selectedBrand} onChanged={reloadTree} />
        ) : (
          <section className="rounded-xl border border-[#E2E5E0] bg-white px-6 py-16 text-center">
            <p className="text-[16px] font-semibold">Vælg en model</p>
            <p className="mx-auto mt-1 max-w-[52ch] text-[14px] text-[#5E6A63]">
              Find modellen i listen, eller opret en ny. Modeller markeret &quot;Ingen priser&quot; mangler aktive reparationer og vises hverken på
              hjemmesiden eller i Ny sag.
            </p>
          </section>
        )}
      </div>
      {newModel && (
        <NewModelDialog
          tree={tree}
          defaultBrandId={selectedBrand?.id ?? null}
          onClose={() => setNewModel(false)}
          onCreated={async (id) => {
            await reloadTree();
            select(id);
          }}
        />
      )}
    </div>
  );
}
