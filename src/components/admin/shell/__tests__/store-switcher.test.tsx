import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StoreScopeProvider, useStoreScope, type AdminMe } from "../store-scope-context";
import { StoreSwitcher } from "../store-switcher";

const owner: AdminMe = { id: "o", name: "Ejer", email: "o@phonespot.dk", role: "owner", isOwner: true, ownSlug: null, scope: "alle" };
const vejle: AdminMe = { id: "v", name: "Vejle", email: "v@phonespot.dk", role: "employee", isOwner: false, ownSlug: "vejle", scope: "vejle" };
const nostore: AdminMe = { id: "n", name: "Ny", email: "n@phonespot.dk", role: "employee", isOwner: false, ownSlug: null, scope: "ingen" };

function Probe() {
  const { scope } = useStoreScope();
  return <p data-testid="scope">{scope}</p>;
}

function renderWith(me: AdminMe) {
  return render(
    <StoreScopeProvider initialMe={me}>
      <StoreSwitcher />
      <Probe />
    </StoreScopeProvider>,
  );
}

beforeEach(() => {
  document.cookie = "ps_store=; path=/; max-age=0";
});
afterEach(cleanup);

describe("StoreSwitcher", () => {
  it("owner gets Alle / Vejle / Slagelse / Webshop in that order", () => {
    renderWith(owner);
    const select = screen.getByLabelText("Vælg butik") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["alle", "vejle", "slagelse", "webshop"]);
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(["Alle butikker", "Vejle", "Slagelse", "Webshop"]);
    expect(select.value).toBe("alle");
  });

  it("owner's choice is stored in the ps_store cookie and exposed through useStoreScope", () => {
    renderWith(owner);
    fireEvent.change(screen.getByLabelText("Vælg butik"), { target: { value: "slagelse" } });
    expect(document.cookie).toContain("ps_store=slagelse");
    expect(screen.getByTestId("scope").textContent).toBe("slagelse");
    expect((screen.getByLabelText("Vælg butik") as HTMLSelectElement).value).toBe("slagelse");
  });

  it("staff see their store as a non-interactive label, with no switcher", () => {
    renderWith(vejle);
    expect(screen.getByTestId("store-label").textContent).toBe("Vejle");
    expect(screen.queryByLabelText("Vælg butik")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("staff cannot change scope through the context, and no cookie is written", () => {
    function Try() {
      const { setScope } = useStoreScope();
      return (
        <button type="button" onClick={() => setScope("alle")}>
          widen
        </button>
      );
    }
    render(
      <StoreScopeProvider initialMe={vejle}>
        <Try />
        <Probe />
      </StoreScopeProvider>,
    );
    fireEvent.click(screen.getByText("widen"));
    expect(screen.getByTestId("scope").textContent).toBe("vejle");
    expect(document.cookie).not.toContain("ps_store=alle");
  });

  it("staff without an assigned store are told so", () => {
    renderWith(nostore);
    expect(screen.getByTestId("store-label").textContent).toBe("Ingen butik tildelt");
  });

  it("renders nothing while the identity is loading", () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <StoreScopeProvider>
        <StoreSwitcher />
      </StoreScopeProvider>,
    );
    expect(container.textContent).toBe("");
    vi.unstubAllGlobals();
  });
});
