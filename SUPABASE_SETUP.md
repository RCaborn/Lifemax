# Cloud Sync Setup (Supabase)

Lifemax works fully offline on its own. **Cloud sync is optional** — turn it on and your
data follows you across laptop, phone, and tablet. It's free for personal use.

This is a one-time setup, ~10 minutes. You'll create a free Supabase project, run one
block of SQL, tweak one email template, then paste two values into Lifemax.

---

## 1. Create a free Supabase project

1. Go to **https://supabase.com** and sign up (free).
2. Click **New project**. Give it any name (e.g. `lifemax`), set a database password
   (save it somewhere — you won't need it for the app), pick the region closest to you.
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the table + security rules

In the Supabase dashboard, open the **SQL Editor** (left sidebar) → **New query**, paste
this in, and click **Run**:

```sql
-- One row per user holds their whole Lifemax state blob.
create table if not exists public.lifemax_state (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Lock it down: each person can only ever touch their own row.
alter table public.lifemax_state enable row level security;

create policy "own row - select" on public.lifemax_state
  for select using (auth.uid() = user_id);
create policy "own row - insert" on public.lifemax_state
  for insert with check (auth.uid() = user_id);
create policy "own row - update" on public.lifemax_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row - delete" on public.lifemax_state
  for delete using (auth.uid() = user_id);
```

You should see "Success. No rows returned."

## 3. Make sign-in send a CODE (not a link)

Lifemax signs you in with a 6-digit email code — no passwords, no clicking links on the
wrong device. Tell Supabase to put the code in the email:

1. Go to **Authentication → Emails → Templates** (some dashboards: **Auth → Email Templates**).
2. Select the **Magic Link** template.
3. Replace its body with:

   ```html
   <h2>Your Lifemax sign-in code</h2>
   <p>Enter this code in the app:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
   <p>It expires in an hour. If you didn't request it, ignore this email.</p>
   ```

4. Save.

> While you're in **Authentication → Providers → Email**, make sure **Email** is enabled
> (it is by default). You do **not** need to configure any redirect URLs — the code flow
> doesn't use them.

## 4. Grab your two keys

1. Go to **Project Settings → API**.
2. Copy the **Project URL** (looks like `https://abcd1234.supabase.co`).
3. Copy the **anon / public** key (a long `eyJ…` string).
   - This key is *meant* to be public — the security rules above are what protect your
     data, not the secrecy of this key.

## 5. Connect Lifemax

1. Open Lifemax, click **☁ Sync** in the top bar.
2. Paste the **Project URL** and **anon key**, click **Connect**.
3. Enter your email → **Send code** → type the 6-digit code from the email → **Verify**.

Done. Your data is now backed up to your account.

## 6. Add your other devices

On your phone (or any other device), open Lifemax and repeat **step 5** with the *same*
URL, key, and email. After you sign in, that device pulls your data automatically.

---

## How syncing behaves

- **It's last-write-wins.** Open Lifemax on a device and it pulls the latest; your edits
  push up a second or two after you make them, and again when you switch back to a tab.
- **Use one device at a time and you'll never lose anything.** The only lossy case is
  editing on two devices *at the same time while one is offline* — then whichever saves
  last wins. Rare for a personal tracker, but worth knowing.
- **Offline still works.** With no connection, Lifemax keeps using the local copy and
  syncs up the next time you're online.
- **Your keys live on each device**, not in the code, so nothing secret is published to
  GitHub. (If you'd rather bake them in at build time instead, set `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` as environment variables and skip step 5's paste.)

## Troubleshooting

- **"That code didn't work"** — codes expire after ~1 hour and are single-use; send a
  fresh one. Make sure you edited the Magic Link template (step 3) so the email actually
  contains a code.
- **No email arrives** — check spam. Supabase's built-in email has a low daily limit on
  the free tier; for heavy use, add a custom SMTP provider under Auth settings.
- **Nothing syncs** — open **☁ Sync**; if the dot is red, you're signed in but the table
  or policies may be missing — re-run step 2.
