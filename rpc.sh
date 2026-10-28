#!/usr/bin/env bash
# usage: ./rpc.sh <method> [params-json]   -- queries MY node via caddy on :20059
curl -s -m 10 -H 'Content-Type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}" http://127.0.0.1:20059/rpc
