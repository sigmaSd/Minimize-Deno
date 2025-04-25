/**
# Minimize

Find all the permissions used by a Deno program

## Usage

```sh
deno run -A jsr:@sigma/minimize my-deno-program.ts
```

## How it works

- It runs the file with `deno run`
- Says yes to every prompt
- Prints all discovered permissions

## Tips

The output can be customized with `OUTPUT` env variable, values are `default`,
`json`, `none`

Original python version https://github.com/sigmaSd/Minimize


@module
*/

import { Pty } from "@sigma/pty-ffi";
import { stripAnsiCode } from "@std/fmt/colors";

function tmpDir(): string | null {
  switch (Deno.build.os) {
    case "linux": {
      const tmpDir = Deno.env.get("TMPDIR");
      if (tmpDir) return tmpDir;
      return "/tmp";
    }
    case "darwin":
      return Deno.env.get("TMPDIR") ?? null;
    case "windows":
      return Deno.env.get("TMP") ?? Deno.env.get("TEMP") ?? null;
  }
  return null;
}

function unwrap<T>(a: T | undefined | null): T {
  if (a === undefined || a === null) {
    throw new Error("unwrap on an empty value");
  }
  return a;
}

if (Deno.args.length === 0) throw new Error("no program provided");

const output = Deno.env.get("OUTPUT");

const pty = new Pty(Deno.execPath(), {
  args: ["run", ...Deno.args],
  env: { NO_COLOR: "1" },
});

const permissions: Record<Deno.PermissionName, string[]> = {
  read: [],
  write: [],
  net: [],
  env: [],
  run: [],
  ffi: [],
  sys: [],
};

function printPermissions() {
  console.warn("\nPermissions:");
  console.warn(permissions);
  console.warn();
  console.warn("Command:");
  const command = [
    "deno",
    "run",
    permissions.read.includes("<ALL>")
      ? "--allow-read"
      : permissions.read.length !== 0
      ? `--allow-read=${permissions.read}`
      : "",
    permissions.write.includes("<ALL>")
      ? "--allow-write"
      : permissions.write.length !== 0
      ? `--allow-write=${permissions.write}`
      : "",
    permissions.net.includes("<ALL>")
      ? "--allow-net"
      : permissions.net.length !== 0
      ? `--allow-net=${permissions.net}`
      : "",
    permissions.run.includes("<ALL>")
      ? "--allow-run"
      : permissions.run.length !== 0
      ? `--allow-run=${permissions.run}`
      : "",
    permissions.ffi.includes("<ALL>")
      ? "--allow-ffi"
      : permissions.ffi.length !== 0
      ? `--allow-ffi=${permissions.ffi}`
      : "",
    permissions.sys.includes("<ALL>")
      ? "--allow-sys"
      : permissions.sys.length !== 0
      ? `--allow-sys=${permissions.sys}`
      : "",
    permissions.env.includes("<ALL>")
      ? "--allow-env"
      : permissions.env.length !== 0
      ? `--allow-env=${permissions.env}`
      : "",
    ...Deno.args,
  ]
    // remove emptyness
    .filter((e) => e)
    .join(" ");
  console.warn(command);
}

Deno.addSignalListener("SIGINT", () => {
  printPermissions();
  Deno.exit();
});

pty.setPollingInterval(100);
for await (let lines of pty.readable) {
  lines = stripAnsiCode(lines);
  if (!output || output.toLowerCase() === "default") {
    await Deno.stdout.write(new TextEncoder().encode(lines));
  }

  if (lines.includes("Granted") && lines.includes("access")) {
    const line = unwrap(
      lines.split(".\r\n").find((line) =>
        line.includes("Granted") && line.includes("access")
      ),
    );
    const line_split = line.trim().split(/\s+/);
    const mark = line_split.indexOf("access");
    const permission_type = line_split[mark - 1] as Deno.PermissionName;

    let permission: string;
    if (line_split.at(mark + 2) === undefined) {
      // granted all to permission
      permission = "<ALL>";
    } else {
      // granted a specific permission
      permission = line_split[mark + 2];
    }

    // sometime the dot remain...
    if (permission.endsWith(".")) permission = permission.slice(0, -1);
    // remove quotes "permission"
    if (permission.startsWith('"')) permission = permission.slice(1, -1);

    if (!output || output === "default") {
      console.warn(permission_type, permission);
    }

    switch (permission) {
      case "<CWD>":
        permission = Deno.cwd();
        break;
      case "<TMP>":
        permission = tmpDir() || "<TMP>";
        break;
      case "<exec_path>":
        permission = Deno.execPath();
        break;
    }

    permissions[permission_type].push(permission);
  }

  if (lines.includes("Allow?")) {
    pty.write("y\n\r");
  }
}

if (output === "json") {
  console.warn(JSON.stringify(permissions));
} else {
  printPermissions();
}
