import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.184.0/testing/asserts.ts";
import { Permission } from "../main.ts";

const D = new TextDecoder();

// This first run, triggers the Downloading message from Plug
min("./tests/cases/no_permissions.ts");

Deno.test("smoke", () => {
  const output = min("./tests/cases/smoke.ts");
  assertEquals(output.read, ["doesntexist"]);
  assertEquals(output.env, ["doesntexist"]);
});

function min(case_: string): Record<Permission, string[] | "all"> {
  const out = new Deno.Command("deno", {
    args: ["run", "-A", "--unstable", "./main.ts", case_],
    env: { "OUTPUT": "json" },
  }).outputSync();
  assert(out.success);

  return JSON.parse(D.decode(out.stdout));
}
