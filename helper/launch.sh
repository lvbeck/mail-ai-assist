#!/bin/sh
set -eu
umask 077
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
exec "$ROOT/runtime/node" "$ROOT/helper/host.mjs"
