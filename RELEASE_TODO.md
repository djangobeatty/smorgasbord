# Release TODO

## Cleanup & Rename for Release
- [x] Rename package.json `name` from `gt_dashboard` to `smorgasbord`
- [ ] Extract to standalone repo (not inside gt rig structure)
- [ ] Fresh git history (or squash)
- [x] Update any remaining "mission-control" or "gt_dashboard" references in code comments
- [x] Clean up legacy `~/.mission-control` references -> now `~/.smorgasbord`

## Dead Code Removed
- [x] Deleted `/api/config/` - dead API route
- [x] Deleted `src/lib/config-loader.ts` - unused
- [x] Deleted `src/lib/use-config.ts` - unused
- [x] Removed `CONFIG_PATH`, `CONFIG_DIR` from `src/types/config.ts`
- [x] Removed config exports from `src/lib/index.ts`

## Orphaned Routes Removed
- [x] Deleted `/app/convoys/` - empty folder
- [x] Deleted `/app/crew/` - replaced by /workers
- [x] Deleted `/app/polecats/` - replaced by /workers
- [x] Deleted `/app/status/` - replaced by /system
- [x] Deleted `/app/witnesses/` - replaced by /system

## Recently Fixed
- [x] `src/lib/exec-gt.ts` - Simplified to use only GT_BASE_PATH env var (no auto-detection magic)

## What Might Break Running Outside GT

### Hard Dependencies on GT CLI
These API routes call `gt` or `bd` commands and will fail if not installed:

- `/api/status` - `gt status --json`
- `/api/rigs/*` - `gt rig list/add/remove/start/stop/park/unpark`
- `/api/crew/*` - `gt crew` commands
- `/api/witness/*` - `gt witness` commands
- `/api/deacon/*` - `gt deacon` commands
- `/api/beads/*` - `bd` (beads daemon) commands
- `/api/boot/*` - `gt boot` commands
- `/api/refinery/*` - refinery commands

### File Path Dependencies
- `mayor/rigs.json` - expects this relative to GT_BASE_PATH
- `.gt/` directory - used to detect Gas Town installation
- `.beads/` directory - beads data location

### For Standalone Operation Users Need
1. Gas Town CLI installed (`gt` command in PATH)
2. `GT_BASE_PATH` set in `.env.local` pointing to GT installation (required - no auto-detection)
3. Gas Town mayor daemon running (`gt mayor start`)
