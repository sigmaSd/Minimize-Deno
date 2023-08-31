import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.184.0/testing/asserts.ts";
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
  assertEquals(output.env, ["doesntexist"]);
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
  console.log(
    "stdout:",
    D.decode(out.stdout),
  );

  return JSON.parse(D.decode(out.stdout));
}
