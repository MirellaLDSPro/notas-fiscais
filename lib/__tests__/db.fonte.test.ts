import { describe, it, expect } from "vitest";
import type { Fonte } from "@/lib/db";

describe("Fonte", () => {
  it("inclui BUSCA", () => {
    const f: Fonte = "BUSCA";
    expect(f).toBe("BUSCA");
  });
});
