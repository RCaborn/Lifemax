#!/usr/bin/env python3
"""Garmin autopilot: pull recent Garmin data and patch it into the Lifemax
Supabase state blob.

Runs headless (GitHub Actions cron) using a saved garth token — see
GARMIN_SETUP.md. Touches ONLY state['fitness']['days']; merge policy never
lowers a value or overwrites a manually-set wake time, so it can never clobber
something you logged by hand.

Usage:
  python garmin/sync_garmin.py [--days N] [--dry-run] [--fixture path]

  --days N     how many calendar days back to sync (default 3; idempotent)
  --dry-run    compute + print the merge, skip the Supabase write
  --fixture    read {"state": ..., "garmin": {date: {...}}} from a JSON file
               instead of calling Garmin/Supabase (credential-free testing)

Env (live mode): GARTH_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
optional LIFEMAX_USER_ID (only needed if the table ever has >1 row).

Logging policy: day-counts only — never state contents (public repo logs).
"""

import argparse
import copy
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone

TABLE = "lifemax_state"
RUN_HINT = "running"  # any activityType.typeKey containing this counts as a run


def log(msg):
    print(msg, flush=True)


def die(msg, code=1):
    print(f"ERROR: {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


# --- Time helpers ------------------------------------------------------------

def js_iso_now():
    """Exactly JS new Date().toISOString() — the app compares updatedAt strings
    lexicographically, so the format must match ('...sss' + 'Z')."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def day_keys(n_days):
    today = date.today()
    return [(today - timedelta(days=i)).isoformat() for i in range(n_days)]


# --- Garmin fetchers (each isolated: one endpoint drifting doesn't kill the rest)

def fetch_steps(garth, keys):
    """{date: total_steps} — class API first, raw endpoint as fallback."""
    start, end = min(keys), max(keys)
    try:
        rows = garth.DailySteps.list(end=date.fromisoformat(end), period=len(keys))
        return {r.calendar_date.isoformat(): int(r.total_steps or 0) for r in rows}
    except Exception:
        pass
    try:
        rows = garth.connectapi(f"/usersummary-service/stats/steps/daily/{start}/{end}")
        return {r["calendarDate"]: int(r.get("totalSteps") or 0) for r in rows or []}
    except Exception as e:
        print(f"WARN: steps fetch failed ({type(e).__name__})", file=sys.stderr)
        return {}


def fetch_wakes(garth, keys):
    """{date: "HH:MM"} — the sleep that ENDED on the morning of that date."""
    out = {}
    for k in keys:
        ms = None
        try:
            data = garth.SleepData.get(k)
            dto = getattr(data, "daily_sleep_dto", None)
            ms = getattr(dto, "sleep_end_timestamp_local", None)
        except Exception:
            pass
        if ms is None:
            try:
                raw = garth.connectapi(
                    f"/wellness-service/wellness/dailySleepData/{garth.client.username}",
                    params={"date": k, "nonSleepBufferMinutes": 60},
                )
                ms = (raw or {}).get("dailySleepDTO", {}).get("sleepEndTimestampLocal")
            except Exception as e:
                print(f"WARN: sleep fetch failed for {k} ({type(e).__name__})", file=sys.stderr)
        if ms:
            # "Local" epoch is pre-shifted to wall-clock; format as UTC to read it back.
            out[k] = datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%H:%M")
    return out


def fetch_activities(garth, keys):
    """{date: {"runs": n, "workouts": n}} from the recent activity list."""
    try:
        rows = garth.connectapi(
            "/activitylist-service/activities/search/activities",
            params={"start": 0, "limit": 100},
        ) or []
    except Exception as e:
        print(f"WARN: activities fetch failed ({type(e).__name__})", file=sys.stderr)
        return {}
    wanted = set(keys)
    out = {}
    for a in rows:
        d = str(a.get("startTimeLocal") or "")[:10]
        if d not in wanted:
            continue
        type_key = ((a.get("activityType") or {}).get("typeKey") or "").lower()
        slot = out.setdefault(d, {"runs": 0, "workouts": 0})
        slot["runs" if RUN_HINT in type_key else "workouts"] += 1
    return out


def fetch_garmin(n_days):
    try:
        import garth
    except ImportError:
        die("garth not installed — pip install -r garmin/requirements.txt")
    token = os.environ.get("GARTH_TOKEN", "").strip()
    if not token:
        die("GARTH_TOKEN is not set — run garmin/login.py and add the secret.")
    try:
        garth.client.loads(token)
    except Exception as e:
        die(f"Garmin token rejected ({type(e).__name__}) — re-run garmin/login.py and update GARTH_TOKEN.")

    keys = day_keys(n_days)
    steps = fetch_steps(garth, keys)
    wakes = fetch_wakes(garth, keys)
    acts = fetch_activities(garth, keys)
    if not steps and not wakes and not acts:
        die("All Garmin fetchers returned nothing — token or API problem.")

    by_date = {}
    for k in keys:
        entry = {
            "steps": steps.get(k),
            "wake": wakes.get(k),
            "runs": (acts.get(k) or {}).get("runs", 0),
            "workouts": (acts.get(k) or {}).get("workouts", 0),
        }
        if entry["steps"] or entry["wake"] or entry["runs"] or entry["workouts"]:
            by_date[k] = entry
    log(f"fetched {len(by_date)} garmin day(s) across steps/sleep/activities")
    return by_date


# --- Merge (pure; the bit the fixture test exercises) -------------------------

def merge_garmin_days(days, garmin_by_date):
    """Merge Garmin data into fitness.days. Never lowers a value, never
    overwrites a set wake, never touches stretch or dates Garmin has nothing
    for. Returns (new_days, stats)."""
    new_days = copy.deepcopy(days or {})
    stats = {"days_changed": 0, "fields": {"steps": 0, "wake": 0, "runs": 0, "workouts": 0}}
    for k, g in sorted(garmin_by_date.items()):
        day = dict(new_days.get(k) or {"runs": 0, "workouts": 0, "stretch": False, "steps": 0})
        changed = False
        if g.get("steps") is not None and g["steps"] > (day.get("steps") or 0):
            day["steps"] = g["steps"]; stats["fields"]["steps"] += 1; changed = True
        if g.get("wake") and not day.get("wake"):
            day["wake"] = g["wake"]; stats["fields"]["wake"] += 1; changed = True
        if (g.get("runs") or 0) > (day.get("runs") or 0):
            day["runs"] = g["runs"]; stats["fields"]["runs"] += 1; changed = True
        if (g.get("workouts") or 0) > (day.get("workouts") or 0):
            day["workouts"] = g["workouts"]; stats["fields"]["workouts"] += 1; changed = True
        if changed:
            new_days[k] = day
            stats["days_changed"] += 1
    return new_days, stats


def apply_to_blob(blob, garmin_by_date):
    if blob.get("version") != 2 or "fitness" not in blob:
        die("Unexpected state shape (want version 2 with fitness) — refusing to write.")
    new_blob = copy.deepcopy(blob)
    new_days, stats = merge_garmin_days(new_blob["fitness"].get("days") or {}, garmin_by_date)
    new_blob["fitness"]["days"] = new_days
    return new_blob, stats


# --- Supabase REST (service role; mirrors the app's optimistic concurrency) ---

def sb_env():
    url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        die("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — see GARMIN_SETUP.md.")
    return url, key


def sb_headers(key, patch=False):
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    if patch:
        h["Content-Type"] = "application/json"
        h["Prefer"] = "return=representation"
    return h


def sb_get_row(requests, url, key):
    params = {"select": "user_id,data,updated_at", "limit": "2"}
    uid = os.environ.get("LIFEMAX_USER_ID", "").strip()
    if uid:
        params["user_id"] = f"eq.{uid}"
    r = requests.get(f"{url}/rest/v1/{TABLE}", headers=sb_headers(key), params=params, timeout=30)
    if r.status_code == 401 or r.status_code == 403:
        die("Supabase rejected the service key (401/403) — check SUPABASE_SERVICE_ROLE_KEY.")
    r.raise_for_status()
    rows = r.json()
    if not rows:
        die("No lifemax_state row yet — open the app and enable cloud sync first.")
    if len(rows) > 1:
        die("Multiple sync rows found — set the LIFEMAX_USER_ID secret to pick yours.")
    return rows[0]


def sb_push(requests, url, key, garmin_by_date):
    for attempt in range(1, 4):
        row = sb_get_row(requests, url, key)
        new_blob, stats = apply_to_blob(row["data"], garmin_by_date)
        if stats["days_changed"] == 0:
            log("nothing new — state already up to date, no write")
            return
        now = js_iso_now()
        new_blob["updatedAt"] = now
        r = requests.patch(
            f"{url}/rest/v1/{TABLE}",
            headers=sb_headers(key, patch=True),
            params={"user_id": f"eq.{row['user_id']}", "updated_at": f"eq.{row['updated_at']}"},
            json={"data": new_blob, "updated_at": now},
            timeout=30,
        )
        r.raise_for_status()
        body = r.json() if r.status_code != 204 and r.text else []
        if body:
            f = stats["fields"]
            log(f"push OK (attempt {attempt}) · {stats['days_changed']} day(s) changed "
                f"(steps:{f['steps']} wake:{f['wake']} runs:{f['runs']} workouts:{f['workouts']})")
            return
        log(f"conflict on attempt {attempt} — another device pushed; re-merging")
    die("Gave up after 3 conflicting attempts.")


# --- Entrypoint ----------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--fixture")
    args = ap.parse_args()

    if args.fixture:
        with open(args.fixture) as f:
            fx = json.load(f)
        garmin_by_date = fx["garmin"]
        blob = fx["state"]
        new_blob, stats = apply_to_blob(blob, garmin_by_date)
        f = stats["fields"]
        log(f"fixture merge · {stats['days_changed']} day(s) changed "
            f"(steps:{f['steps']} wake:{f['wake']} runs:{f['runs']} workouts:{f['workouts']})")
        if args.dry_run:
            log(json.dumps(new_blob["fitness"]["days"], indent=2, sort_keys=True))
            return
        die("Fixture mode is for --dry-run only.")

    garmin_by_date = fetch_garmin(max(1, args.days))
    if not garmin_by_date:
        log("no garmin data in window — nothing to do")
        return
    if args.dry_run:
        log(f"dry run · would merge {len(garmin_by_date)} day(s): {', '.join(sorted(garmin_by_date))}")
        return

    import requests
    url, key = sb_env()
    sb_push(requests, url, key, garmin_by_date)


if __name__ == "__main__":
    main()
