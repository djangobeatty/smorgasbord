# Smorgasbord

**A browser UI for Gas Town and Beads. For people who don't want to use tmux.**

Smorgasbord is an opinionated dashboard for running Gas Town with traditional workflows. I wrote it in a couple of days because I was using Claude Code with Gas Town and kept asking it the same things - what's the status, who has mail, send the mayor a message. A dashboard made more sense.

It's Gas Town easy mode. Point and click instead of type and pray.

It's also a standalone Beads UI - if you just want a kanban board without the full Gas Town setup, it does that too.

## What it does

- **Command Centre** - See everything at a glance: workers, mail, refineries, system status
- **Work** - A kanban board for your issues (backed by beads/SQLite)
- **Crew** - Check on your AI agents, send them messages, see who has unread mail
- **Engine Room** - Start/stop witnesses, refineries, deacon, all the daemon stuff
- **Comms** - Read and send messages to your agents
- **Settings** - Configure paths and switch themes

## What it doesn't do

Smorgasbord doesn't support seances or molecules yet. I don't fully understand them myself. But the basics are here - enough to get you running traditional Gas Town workflows without living in the terminal.

## Requirements

- **Gas Town** installed and working (`gt` command in your PATH)
- **Node.js 18+**
- Must run on the **same machine** as Gas Town (it calls the CLI directly)

## Quick Start

```bash
# Clone it
git clone https://github.com/your-org/smorgasbord.git
cd smorgasbord

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local and set GT_BASE_PATH to your Gas Town directory

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Make sure the mayor daemon is running (`gt mayor start`).

## Configuration

Create `.env.local`:

```bash
# Required: path to your Gas Town root (the directory with .gt folder)
GT_BASE_PATH=/path/to/your/gastown
```

## Themes

**envs.now** - The default. Kawaii-inspired with pink gradients and chunky buttons. Fun.

**Hangover** - Clean and muted. For when you can't handle the colours.

Switch in Settings.

## Beads-Only Mode

If you just want the kanban board without full Gas Town integration, switch to "Beads Only" mode in Settings. Point it at any `.beads` directory and you've got a standalone issue tracker.

## Development

```bash
npm run dev      # Dev server
npm test         # Run tests
npm run build    # Production build
```

---

*Works for me. Maybe it'll work for you too.*
