import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.203.0/assert/mod.ts";
import { Permission } from "../main.ts";

const D = new TextDecoder();

// This first run, triggers the Downloading message from Plug
heatUp();

Deno.test("No permissions", () => {
  const output = min("./tests/cases/no_permissions.ts");
  assert(output.read.length === 0);
});

Deno.test("smoke", () => {
  const output = min("./tests/cases/smoke.ts");
  assertEquals(output.read, ["doesntexist"]);
  // windows have env in uppercase
  assertEquals((output.env as string[]).map((s) => s.toLowerCase()), [
    "doesntexist",
  ]);
});

function heatUp() {
  new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "--unstable",
      "./main.ts",
      "./tests/cases/no_permissions.ts",
    ],
    stderr: "inherit",
    env: { "OUTPUT": "json" },
  }).outputSync();
}

function min(case_: string): Record<Permission, string[] | "all"> {
  const out = new Deno.Command("deno", {
    args: ["run", "-A", "--unstable", "./main.ts", case_],
    stderr: "inherit",
    env: { "OUTPUT": "json" },
  }).outputSync();

  return JSON.parse(D.decode(out.stdout));
}
