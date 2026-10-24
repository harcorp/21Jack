import { describe, expect, it } from "vitest";
import { handValue } from "./index";

describe("handValue", () => {
  it("counts ace + 6 as soft 17", () => {
    expect(handValue([{ rank: "A", suit: "S" }, { rank: "6", suit: "H" }])).toEqual({ total: 17, soft: true });
  });

  it("turns soft 17 + 10 into hard 17", () => {
    expect(
      handValue([{ rank: "A", suit: "S" }, { rank: "6", suit: "H" }, { rank: "K", suit: "D" }]),
    ).toEqual({ total: 17, soft: false });
  });
});
