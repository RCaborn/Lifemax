# Garmin Autopilot Setup

Lifemax can pull your **steps, wake-up time, runs and workouts** from Garmin
Connect automatically, every morning — no phone-app faff, no backend. A small
GitHub Action fetches from Garmin and patches the data into your existing cloud
sync, and it flows down to all your devices the next time the app pulls.

One-time setup, ~5 minutes. Requires cloud sync to already be on
(see `SUPABASE_SETUP.md`).

---

## 1. Mint your Garmin token (locally, on your own machine)

```bash
pip install garth
python garmin/login.py
```

Enter your Garmin email + password (and MFA code if you use one — this is the
only time it's ever needed). It prints a long token blob. **Copy it.**

The blob contains OAuth tokens that last about a year — treat it like a
password. Paste it straight into the GitHub secret below and don't keep it
anywhere else.

## 2. Add three repo secrets

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `GARTH_TOKEN` | the blob from step 1 |
| `SUPABASE_URL` | your Supabase project URL (same one pasted into the app) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → `service_role` key. ⚠️ This key bypasses your row security — it must only ever live here, never in the app. |

(Optional: `LIFEMAX_USER_ID` — only needed if your table ever has more than one
user's row.)

## 3. Run it once and check

**Actions** tab → **Garmin autopilot** → **Run workflow**. A green run logs
something like `push OK · 2 day(s) changed (steps:2 wake:1 runs:0 workouts:1)`.
Open Lifemax → the day's steps/wake/runs appear after the next sync pull
(happens automatically on focus/reconnect).

From then on it runs itself at **05:30 UTC daily**, covering the last 3 days
each time — so a missed run self-heals the next morning.

---

## How it merges (why it can't wreck your data)

- It touches **only** the fitness daily logs — nothing else in your state.
- **Never lowers a value**: if you logged 12,000 steps manually and Garmin says
  8,000, your 12,000 stays. Steps/runs/workouts take the max — and the app's own
  device merge applies the same max rule, so even a manual log that hadn't
  synced yet when the autopilot ran survives the next pull.
- **Never overwrites a wake time you set** — it only fills empty ones. (The one
  residual edge: a wake time set offline that hadn't pushed before the autopilot
  filled that day's wake can lose the tiebreak on the next pull — same class as
  the existing two-device caveat in SUPABASE_SETUP.md.)
- Writes use the same optimistic-concurrency guard as the app itself: if a
  device pushed in the meantime, the Action re-reads, re-merges and retries.
- If there's nothing new, it writes nothing at all.
- Logs show day-counts only — never your actual data (the repo is public;
  secrets are masked by GitHub).

## When it breaks (rare, and it tells you)

| What | How you find out | Fix |
|---|---|---|
| Token expires (~1 year) | the run fails → GitHub emails you | redo step 1, update `GARTH_TOKEN` |
| Garmin changes its (unofficial) API | run fails or a fetcher logs a WARN | fix-forward; the three fetchers are isolated so one breaking doesn't kill the rest |
| Repo idle 60+ days | GitHub pauses scheduled workflows and emails you | click "re-enable" |
| Edited offline at 05:30 exactly | same two-device caveat as normal sync (`SUPABASE_SETUP.md`) | rare; the 3-day window re-heals next run |

## Testing without credentials

```bash
python3 garmin/sync_garmin.py --dry-run --fixture garmin/fixtures/sample.json
```

Prints the merged days so you can see the max/fill-only rules in action.
