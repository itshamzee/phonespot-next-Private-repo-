// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ staff: { id: "o", role: "owner" } as null | Record<string, unknown> }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));

import { POST } from "../route";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function req() {
  const form = new FormData();
  form.append("image", new Blob([PNG], { type: "image/png" }), "cut.png");
  return new Request("http://x/api/admin/accessories/studio-photo", { method: "POST", body: form });
}

const fetchMock = vi.fn();
beforeEach(() => {
  state.staff = { id: "o", role: "owner" };
  process.env.OPENAI_API_KEY = "sk-test";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/admin/accessories/studio-photo", () => {
  it("401 uden staff", async () => {
    state.staff = null;
    expect((await POST(req())).status).toBe(401);
  });

  it("503 uden OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    expect((await POST(req())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sender gpt-image-1 med input_fidelity high og returnerer png", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(PNG).toString("base64") }] }), { status: 200 }),
    );
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/images/edits");
    const body = init.body as FormData;
    expect(body.get("model")).toBe("gpt-image-1");
    expect(body.get("input_fidelity")).toBe("high");
    expect(body.get("quality")).toBe("medium");
    expect(body.get("size")).toBe("1024x1024");
    expect(String(body.get("prompt"))).toContain("Keep the product identical");
  });

  it("502 når OpenAI svarer fejl", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: "nope" } }), { status: 400 }));
    expect((await POST(req())).status).toBe(502);
  });
});
