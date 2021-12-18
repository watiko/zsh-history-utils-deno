# zsh-history-utils

## requirements

- [deno](https://github.com/denoland/deno)

## install

```
$ deno install -f --name zsh-history-utils --no-check --allow-read \
  --v8-flags=--noopt \
  --import-map=https://raw.githubusercontent.com/watiko/zsh-history-utils-deno/master/import_map.json \
  https://raw.githubusercontent.com/watiko/zsh-history-utils-deno/master/bin/main.ts
```

## development

- [trex](https://github.com/crewdevio/Trex)

```
$ trex run dev --help
$ trex run install
```
