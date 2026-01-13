# Release TODO

## Cleanup & Rename for Release
- [ ] Rename package.json `name` from `gt_dashboard` to `smorgasbord`
- [ ] Extract to standalone repo (not inside gt rig structure)
- [ ] Fresh git history (or squash)
- [ ] Update any remaining "mission-control" or "gt_dashboard" references in code comments
- [ ] Clean up legacy `~/.mission-control` references in:
  - `src/types/config.ts` (CONFIG_PATH, CONFIG_DIR exports)
  - `src/lib/config-loader.ts` (getConfigPath, getConfigDir)

## Clean Up Old Abandoned Files
- [ ] Audit for orphaned/abandoned route folders and components
- [ ] Check for stale component files that are no longer imported
- [ ] Review and remove any unused API routes
- [ ] Standardize file naming conventions across codebase

## Recently Fixed
- [x] `src/lib/exec-gt.ts` - Simplified to use only GT_BASE_PATH env var (no auto-detection magic). Returns null if not configured, APIs return helpful error.

## Fixed
- [x] `/api/rigs/route.ts` - was using duplicate `getGtBasePath()` with wrong env var (`GT_TOWN_ROOT`), now uses `getResolvedGtRoot()` from exec-gt.ts

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

### Graceful Degradation Ideas
- [ ] Show helpful error when gt CLI not found
- [ ] Show setup wizard if GT_BASE_PATH not configured
- [ ] Disable features that require gt when not available
- [ ] Better error messages when gt commands fail
