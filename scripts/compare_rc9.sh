#!/bin/bash
# Compare key API source files between gitlab main and the published v0.2.1-rc9 tag.
# bash-3.2 compatible (no associative arrays).
cd "$(dirname "$0")/.."
mkdir -p research/rc9
BASE="https://gitlab.com/api/v4/projects/quip.network%2Fhashsigs-rs/repository/files"

fetch() { # $1=file path (src/...), $2=ref, $3=out
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$1")
  curl -sS -m 40 --http1.1 "$BASE/$enc/raw?ref=$2" -o "$3"
}

fetch "src/lib.rs"                  v0.2.1-rc9 research/rc9/lib.rs
fetch "src/verifier.rs"             v0.2.1-rc9 research/rc9/root_verifier.rs
fetch "src/shrincs/mod.rs"          v0.2.1-rc9 research/rc9/shrincs_mod.rs
fetch "src/shrincs/signer.rs"       v0.2.1-rc9 research/rc9/shrincs_signer.rs
fetch "src/shrincs/verifier.rs"     v0.2.1-rc9 research/rc9/shrincs_verifier.rs
fetch "src/shrincs/key.rs"          v0.2.1-rc9 research/rc9/shrincs_key.rs
fetch "src/profiles/selected.rs"    v0.2.1-rc9 research/rc9/profiles_selected.rs

cmp2() { # $1 label, $2 main-file, $3 rc9-file
  if [ ! -s "$3" ]; then echo "MISSING $1";
  elif diff -q "$2" "$3" >/dev/null; then echo "SAME    $1";
  else echo "DIFF    $1 ($(diff "$2" "$3" | grep -c '^[<>]') changed lines)"; fi
}

cmp2 "lib.rs"               research/src_lib.rs               research/rc9/lib.rs
cmp2 "verifier.rs (root)"   research/src_verifier.rs          research/rc9/root_verifier.rs
cmp2 "shrincs/mod.rs"       research/src_shrincs_mod.rs       research/rc9/shrincs_mod.rs
cmp2 "shrincs/signer.rs"    research/src_shrincs_signer.rs    research/rc9/shrincs_signer.rs
cmp2 "shrincs/verifier.rs"  research/src_shrincs_verifier.rs  research/rc9/shrincs_verifier.rs
cmp2 "shrincs/key.rs"       research/src_shrincs_key.rs       research/rc9/shrincs_key.rs
cmp2 "profiles/selected.rs" research/src_profiles_selected.rs research/rc9/profiles_selected.rs
