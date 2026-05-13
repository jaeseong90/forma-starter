#!/usr/bin/env bash
# FORMA YAML 스키마 필수 키 검증 훅.
# - design/screens/*.yml 저장 직후에만 실행.
# - DEMO_*.yml 은 학습용이라 스킵.
# - 실패는 경고만(stderr), 절대 blocking 금지(exit 0).
#
# Claude Code hook은 stdin으로 JSON을 받는다: {tool_name, tool_input:{file_path,...}, ...}

set -u

payload=$(cat)
# 경로 추출: tool_input.file_path 또는 tool_input.path
path=$(printf '%s' "$payload" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
[ -z "$path" ] && path=$(printf '%s' "$payload" | grep -oE '"path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')

# design/screens/ 하위 yml만 검사
case "$path" in
  */design/screens/*.yml) ;;
  *) exit 0 ;;
esac

# DEMO 는 스킵
case "$path" in
  */DEMO_*.yml) exit 0 ;;
esac

[ ! -f "$path" ] && exit 0

missing=()
grep -q '^screen:' "$path" || missing+=('screen')
grep -qE '^[[:space:]]+id:' "$path" || missing+=('screen.id')
grep -qE '^[[:space:]]+type:[[:space:]]*(list|split-detail|master-detail|split-tab)' "$path" || missing+=('screen.type(list|split-detail|master-detail|split-tab)')
grep -qE '^grids:' "$path" || missing+=('grids')
grep -qE '^sql:' "$path" || missing+=('sql')

if [ ${#missing[@]} -gt 0 ]; then
  printf '\n⚠  FORMA YAML schema warning in %s\n   missing: %s\n   schema: design/_schema_guide.yml\n\n' "$path" "${missing[*]}" >&2
fi

exit 0
