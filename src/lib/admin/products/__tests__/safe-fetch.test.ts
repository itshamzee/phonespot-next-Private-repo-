import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "../safe-fetch";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "0.0.0.0", "100.64.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1",
  ])("afviser %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "104.18.32.7", "172.32.0.1", "2606:4700::1111"])("tillader %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it("afviser alt der ikke er en IP", () => {
    expect(isPrivateAddress("localhost")).toBe(true);
  });
});
