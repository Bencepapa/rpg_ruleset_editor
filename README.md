# AD&D 2e RPG Core & Ruleset Editor

Pluggable AD&D 2nd Edition RPG engine, live encounter runtime, deterministic batch combat simulator, and full-screen ruleset & translation editor. Designed to run both standalone and embedded inside an existing React/TypeScript game.

**Live GitHub Pages:** https://bencepapa.github.io/rpg_ruleset_editor/

## Features

- **AD&D 2e Rules Engine (`src/rpg-core/engine/`):** Descending AC, THAC0 attack resolution (auto-hit 20 / auto-miss 1), seeded dice expression parser (`NdM+K`), Vancian spell slots + WIS bonus slots, XP curve & multiclass splitting, `2d6` morale checks, and cross-reference validation.
- **Headless Runtime (`src/rpg-core/runtime/RpgRuntime.ts`):** Typed event bus (`attack`, `spellCast`, `moraleBreak`, `partyUpdate`, `rulesetReloaded`), live party/encounter mutation, and hot-reloading without restarting.
- **Ruleset Editor (`src/rpg-core/editor/`):**
  - Modules: Stats & Formulas, Classes & XP (with interactive Levels 1–13 XP curve), Races, Spells, Items, Monsters, Party & Live Overrides, Central Translation Workbench, and Quick Test (50-run deterministic battle simulator + dice roller).
  - Central Translation Workbench collects all translatable bundle strings in one table with source/target comparison, coverage tracking, missing-only filtering, and dynamic language addition.
  - Undo/Redo history, Zod schema validation, JSON import/export, `localStorage` draft persistence, and responsive mobile/desktop layout.

## Local Development

```bash
npm install
npm run dev
```

## Verification & Build

```bash
npm run lint
npx tsx --test src/rpg-core/engine/dice.test.ts src/rpg-core/engine/rulesEngine.test.ts src/rpg-core/editor/translationsExtractor.test.ts
npm run build
```

## Embedding Into an Existing App

Copy `src/rpg-core/` and `src/data/ruleset/default-ruleset.json` into your project (`zustand`, `zod`, and `lucide-react` required), then mount `RpgRuntime` and `StatsEditorModal`:

```tsx
import { RpgRuntime, StatsEditorModal, getDefaultRulesetBundle } from './rpg-core';

const runtime = new RpgRuntime(getDefaultRulesetBundle());

<StatsEditorModal
  isOpen={editorOpen}
  onClose={() => setEditorOpen(false)}
  liveRuntime={runtime}
/>
```

## GitHub Pages Deployment

`.github/workflows/deploy-pages.yml` builds on push to `main` using `VITE_BASE_PATH=/${{ github.event.repository.name }}/` (resolving to `/rpg_ruleset_editor/`) and deploys `dist/` via GitHub Actions. Enable **Settings → Pages → Source: GitHub Actions** in the repository settings.
