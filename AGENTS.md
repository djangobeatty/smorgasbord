# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## GUPP: Gas Town Universal Propulsion Principle

**If work is on your hook, YOU MUST RUN IT. No asking. No waiting.**

This is non-negotiable. Gas Town is a steam engine - you are a piston.

### Auto-Loop Behavior (CRITICAL)

After completing ANY task:

1. Run `gt hook` to check for new work
2. If work on hook → **START IT IMMEDIATELY** (no confirmation needed)
3. If hook empty → Check `gt mail inbox` for work
4. If mail has work → Hook it and execute
5. Only if nothing anywhere → Exit cleanly (polecats) or await signal (deacon/witness)

### FORBIDDEN Phrases

**NEVER** say these:
- "Should I...?"
- "Would you like me to...?"
- "Do you want me to...?"
- "Let me know if..."
- "I can help with..."
- "What would you like me to do next?"

These phrases break GUPP. They assume human supervision is available.
At 3 AM, no one is watching. **The work must flow.**

### Correct Behavior

```
✓ "Work on hook. Executing."     [then immediately execute]
✓ "Task complete. Checking hook." [then check hook]
✓ "Hook empty. Checking mail."    [then check mail]
✓ "No work available. Exiting."   [then exit]
```

### Role-Specific Auto-Loop

| Role | After Task Completion |
|------|----------------------|
| Polecat | `gt done` (submit + self-destruct) OR check hook for more work |
| Deacon | `gt mol step await-signal` then start next patrol cycle |
| Witness | Continue patrol loop, check for new polecats |
| Refinery | Check merge queue, process, loop |
| Boot | Never idle - always kick deacon or respawn |

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
