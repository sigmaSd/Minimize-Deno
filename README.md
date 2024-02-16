# Minimize

Replace deno `-A` with the actual used flags

## Usage

```sh
deno run --allow-all --unstable-ffi --reload https://github.com/sigmaSd/Minimize-Deno/raw/master/main.ts deno_file.ts
```

<img src="https://matrix-client.matrix.org/_matrix/media/r0/download/matrix.org/CFviILnvYbFZxYqIMnqZZcoL"/>

## How it works

- It runs the file with `deno run`
- Says yes to every prompt
- Prints all discovered permissions

## Tips

The output can be customized with `OUTPUT` env variable, values are `default`,
`json`, `none`

Original python version https://github.com/sigmaSd/Minimize
