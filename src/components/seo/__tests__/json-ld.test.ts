import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../json-ld";

describe("serializeJsonLd", () => {
  it("cannot close the script tag", () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
  });

  it("stays valid JSON with the original value", () => {
    const value = 'A & B <tag> "quoted"';
    expect(JSON.parse(serializeJsonLd({ name: value })).name).toBe(value);
  });
});
