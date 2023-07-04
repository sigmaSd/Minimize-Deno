import { Pty } from "https://deno.land/x/deno_pty_ffi@0.4.0/mod.ts";

if (Deno.args.length === 0) throw new Error("no program provided");

const no_output = Deno.env.get("NO_OUTPUT");
if (no_output) Deno.env.set("NO_COLOR", "true");

const pty = await Pty.create({
  cmd: "deno",
  args: ["run", ...Deno.args],
  env: [],
});

type Permission = "read" | "write" | "net" | "env" | "run";
const permissions: Record<Permission, string[]> = {
  read: [],
  write: [],
  net: [],
  env: [],
  run: [],
};

function printPermissions() {
  console.log("\nPermissions:");
  console.log(permissions);
  console.log();
  console.log("Command:");
  console.log(
    "deno run " +
      (
        permissions.read.length !== 0 ? "--allow-read=" + permissions.read : ""
      ) + " " +
      (
        permissions.write.length !== 0
          ? "--allow-write=" + permissions.write
          : ""
      ) + " " +
      (
        permissions.net.length !== 0 ? "--allow-net=" + permissions.net : ""
      ) + " " +
      (
        permissions.run.length !== 0 ? "--allow-run=" + permissions.net : ""
      ) + " " +
      (
        permissions.env.length !== 0 ? "--allow-env=" + permissions.env : ""
      ) + " " + Deno.args.join(" "),
  );
}

Deno.addSignalListener("SIGINT", () => {
  printPermissions();
  Deno.exit();
});

while (true) {
  const line = await pty.read();
  if (!line) break;
  if (!no_output) {
    await Deno.stdout.write(new TextEncoder().encode(line));
  }

  if (line.includes("Granted") && line.includes("access")) {
    const line_split = line.split(/\s+/);
    const mark = line_split.indexOf("access");
    const permission_type = line_split[mark - 1] as Permission;
    let permission = line_split[mark + 2].slice(1, -2);

    if (no_output) console.log(permission_type, permission);

    switch (permission) {
      case "CWD":
        permission = Deno.cwd();
        break;
      case "TMP":
        permission = pty.tmpDir();
        break;
    }

    permissions[permission_type].push(permission);
  }

  if (line.includes("Allow?")) {
    await pty.write("y\n");
  }
}

printPermissions();
