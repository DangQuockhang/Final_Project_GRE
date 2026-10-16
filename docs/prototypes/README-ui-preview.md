# KD DESIGN — Safe UI Preview (October 2026)

This **experimental branch** exists to view and review the proposed modern retail
interface in your running Vite development server. It does **not** replace the
React Store, API, PostgreSQL data, existing Admin Dashboard, Checkout or 3D Studio.

## What to open

- New interactive **UI prototype**: http://localhost:5173/ui-preview.html
- Original React e-commerce website: http://localhost:5173/

The prototype demonstrates Collections/Brands mega menu, filter/sort,
responsive catalog, multi-image detail gallery, sale and sold-out treatments,
and an Admin mock editor. Data in the prototype is **illustrative and ephemeral**:
it does not read or update your local PostgreSQL. The real Store is unchanged.

## Windows PowerShell setup

From the monorepo root:

```powershell
cd D:\KD-Design-Starter\KD-Design-Starter
git status
git fetch origin
git switch -c experiment/ui-preview --track origin/experiment/ui-preview
npm run dev:store
```

If the branch already exists locally, use `git switch experiment/ui-preview`
rather than `git switch -c ...`. Run `npm install` from the root if dependencies
were not installed. Ensure port 5173 is available (stop an existing Vite
terminal with Ctrl+C).

## Back to original

Stop Vite with Ctrl+C. In the same root folder:

```powershell
git switch feature/sprint-2
npm run dev:store
```

To remove the experiment branch later, after switching away from it:
`git branch -d experiment/ui-preview`. This is optional; do not force-delete
an experimental branch containing your own edits.

No `git reset --hard`, Docker volume deletion, migrations, or seed commands
are needed to preview or roll back.
