import { Pty } from "https://deno.land/x/deno_pty_ffi@0.17.1/mod.ts";
import { stripAnsiCode } from "https://deno.land/std@0.206.0/fmt/colors.ts";

if (Deno.args.length === 0) throw new Error("no program provided");

const output = Deno.env.get("OUTPUT");

const pty = new Pty({
  cmd: "deno",
  args: ["run", ...Deno.args],
  env: [["NO_COLOR", "true"]],
});

export type Permission = "read" | "write" | "net" | "env" | "run" | "ffi";
const permissions: Record<Permission, string[] | "all"> = {
  read: [],
  write: [],
  net: [],
  env: [],
  run: [],
  ffi: [],
};

function printPermissions() {
  console.log("\nPermissions:");
  console.log(permissions);
  console.log();
  console.log("Command:");
  const command = [
    "deno",
    "run",
    permissions.read === "all"
      ? "--allow-read"
      : permissions.read.length !== 0
      ? "--allow-read=" + permissions.read
      : "",
    permissions.write === "all"
      ? "--allow-write"
      : permissions.write.length !== 0
      ? "--allow-write=" + permissions.write
      : "",
    permissions.net === "all"
      ? "--allow-net"
      : permissions.net.length !== 0
      ? "--allow-net=" + permissions.net
      : "",
    permissions.run === "all"
      ? "--allow-run"
      : permissions.run.length !== 0
      ? "--allow-run=" + permissions.run
      : "",
    permissions.ffi === "all"
      ? "--allow-ffi"
      : permissions.ffi.length !== 0
      ? "--allow-ffi=" + permissions.ffi
      : "",
    permissions.env === "all"
      ? "--allow-env"
      : permissions.env.length !== 0
      ? "--allow-env=" + permissions.env
      : "",
    ...Deno.args,
  ]
    // remove emptyness
    .filter((e) => e)
    .join(" ");
  console.log(command);
}

Deno.addSignalListener("SIGINT", () => {
  printPermissions();
  Deno.exit();
});

while (true) {
  let lines = await pty.read();
  if (!lines) break;
  lines = stripAnsiCode(lines);
  if (!output || output === "default") {
    await Deno.stdout.write(new TextEncoder().encode(lines));
  }

  if (lines.includes("Granted") && lines.includes("access")) {
    const line = lines.split(".\r\n").find((line) =>
      line.includes("Granted") && line.includes("access")
    )!;
    const line_split = line.trim().split(/\s+/);
    const mark = line_split.indexOf("access");
    const permission_type = line_split[mark - 1] as Permission;

    let permission;
    if (line_split.at(mark + 2) === undefined) {
      // granted all to permission
      permission = "all";
    } else {
      // granted a specific permission
      permission = line_split[mark + 2];
    }

    // sometime the dot remain...
    if (permission.endsWith(".")) permission = permission.slice(0, -1);
    // remove quotes "permission"
    if (permission.startsWith('"')) permission = permission.slice(1, -1);

    if (!output || output === "default") {
      console.log(permission_type, permission);
    }

    switch (permission) {
      case "<CWD>":
        permission = Deno.cwd();
        break;
      case "<TMP>":
        permission = pty.tmpDir();
        break;
      case "<exec_path>":
        permission = Deno.execPath();
        break;
    }

    if (permission === "all") {
      permissions[permission_type] = "all";
    } else if (permissions[permission_type] !== "all") {
      (permissions[permission_type] as string[]).push(permission);
    }
  }

  if (lines.includes("Allow?")) {
    await pty.write("y\n\r");
  }
}

if (output === "json") {
  console.log(JSON.stringify(permissions));
} else {
  printPermissions();
}
