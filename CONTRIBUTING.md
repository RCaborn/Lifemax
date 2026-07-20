# Contributing to Lifemax

Thanks for wanting to help! Lifemax is intentionally simple to hack on.

## Dev setup

```bash
npm install
npm run dev
```

Node 18+. That's the whole setup — no env vars, no services.

## Ground rules

- **Plain JavaScript + JSX.** No TypeScript in this codebase (keep barriers to entry low).
- **Tailwind CSS v4, CSS-first.** Theme + custom utilities live in `src/index.css` — there is no `tailwind.config.js`.
- **Local-first is non-negotiable.** No feature may require a server, an account, or send user data anywhere. Optional integrations must be opt-in and keyed by the user at runtime.
- **State discipline.** All state lives in the single blob owned by `src/lib/store.jsx`; mutations go through actions; scores/XP are derived in pure functions (`src/lib/score.js`, `src/lib/vices.js`), never stored.
- **Data compatibility.** Never break `migrate()` — old exports must import forever. If you change the state shape, add a migration and keep old fields readable.

## Making changes

1. Fork, branch, and make your change.
2. `npm run build` and `npm test` must pass (vitest covers migration, merge, scoring and the module registry — the things that must never silently break).
3. If you touched scoring/merge/migration logic, sanity-check with **Data → Load demo data**.
4. Open a PR with a clear description of what changed and why. Screenshots for UI changes are appreciated.

## Ideas & bugs

Open an issue — small, focused issues are the easiest to act on. If you're unsure whether a feature fits the project's local-first, one-person-dashboard philosophy, open a discussion first.
