#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "Usage: $0 BACKUP_ROOT [--apply] [--keep COUNT] [--min-age-days DAYS]" >&2
  echo "Only restore-attested backups are eligible. Default is a dry run." >&2
}
if [[ $# -lt 1 ]]; then usage; exit 2; fi
ROOT="$(cd -- "$1" && pwd -P)"
shift
APPLY=0 KEEP=7 MIN_AGE_DAYS=30
while (($#)); do
  case "$1" in
    --apply) APPLY=1; shift ;;
    --keep) (($# >= 2)) || { usage; exit 2; }; KEEP="$2"; shift 2 ;;
    --min-age-days) (($# >= 2)) || { usage; exit 2; }; MIN_AGE_DAYS="$2"; shift 2 ;;
    *) usage; exit 2 ;;
  esac
done
[[ "$KEEP" =~ ^[0-9]+$ && "$MIN_AGE_DAYS" =~ ^[0-9]+$ ]] || { echo "COUNT and DAYS must be non-negative integers." >&2; exit 2; }
((KEEP >= 1)) || { echo "KEEP must be at least 1." >&2; exit 2; }
NOW="$(date +%s)"
shopt -s nullglob
dirs=("$ROOT"/jso-*)
eligible=()
for dir in "${dirs[@]}"; do
  [[ -d "$dir" && ! -L "$dir" && ! -e "$dir/INCOMPLETE" ]] || continue
  safe=1
  for file in database.dump media.tar.gz MANIFEST.txt SHA256SUMS VERIFIED RESTORE_TESTED; do
    [[ -f "$dir/$file" && ! -L "$dir/$file" ]] || safe=0
  done
  ((safe)) || continue
  # Never remove unexpected files that may have been placed in a backup directory.
  while IFS= read -r entry; do
    case "$entry" in database.dump|media.tar.gz|MANIFEST.txt|SHA256SUMS|VERIFIED|RESTORE_TESTED) ;;
      *) safe=0; break ;;
    esac
  done < <(find "$dir" -mindepth 1 -maxdepth 1 -printf '%f\n')
  ((safe)) || { echo "Refusing backup with unexpected contents: $dir" >&2; continue; }
  (cd -- "$dir" && sha256sum --check --status SHA256SUMS) || { echo "Refusing due to failed checksums: $dir" >&2; continue; }
  eligible+=("$dir")
done
mapfile -t eligible < <(printf '%s\n' "${eligible[@]}" | sort -r)
for ((i=KEEP; i<${#eligible[@]}; i++)); do
  dir="${eligible[$i]}"
  stamp="${dir##*/jso-}"
  stamp="${stamp%/}"
  [[ "$stamp" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo "Refusing unexpected backup name: $dir" >&2; continue; }
  date_input="${stamp:0:4}-${stamp:4:2}-${stamp:6:2} ${stamp:9:2}:${stamp:11:2}:${stamp:13:2} UTC"
  created="$(date -u -d "$date_input" +%s 2>/dev/null)" || { echo "Cannot parse backup timestamp: $dir" >&2; continue; }
  ((created <= NOW)) || { echo "Refusing future-dated backup: $dir" >&2; continue; }
  age_days=$(( (NOW - created) / 86400 ))
  ((age_days >= MIN_AGE_DAYS)) || continue
  if ((APPLY)); then
    # Recheck markers and checksums immediately before deletion.
    [[ -f "$dir/VERIFIED" && -f "$dir/RESTORE_TESTED" && ! -e "$dir/INCOMPLETE" ]] || continue
    (cd -- "$dir" && sha256sum --check --status SHA256SUMS) || { echo "Refusing due to changed checksums: $dir" >&2; continue; }
    rm -rf -- "$dir"
    echo "Deleted eligible restore-tested backup: $dir"
  else
    echo "Would delete (restore-tested, $age_days days old): $dir"
  fi
done
if ((!APPLY)); then echo "Dry run only. Add --apply to delete listed backups."; fi
