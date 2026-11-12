# Docs: start here

Notes for picking up work on Arena Race in a new session. The game is built in short
sessions with kids, who decide what it should do. These notes carry over what earlier
sessions decided and learned, so a new session doesn't have to rediscover it.

Read them in this order:

1. [handover.md](handover.md): what the game does today, what's still open, how to run it.
2. [working-agreements.md](working-agreements.md): how we work with the kids and with git,
   how to check a change, and the traps we already fell into.
3. [decisions.md](decisions.md): every step so far, what the kids chose and why. If
   something in the code looks odd, check here first: it may be on purpose.

The rules for the code itself are in [CLAUDE.md](../CLAUDE.md). The player-facing overview
(controls, where things are, how to tweak them) is in the main [README](../README.md).

## Handing off to a new session

Start Claude Code in the repo folder (not in another folder: the session can't switch its
working directory later) and give it the next wish, for example:

> Read docs/README.md and the files it lists. The kids want: <the next feature>.

## Keeping these notes current

When a step is finished, update `handover.md` (state, numbers, open items) and add an entry
to `decisions.md`, in the same commit as the code.
