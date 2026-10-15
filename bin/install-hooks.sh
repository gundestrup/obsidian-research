#!/bin/bash
# Drop-in hook enabler — hooks live in bin/hooks/ as TRACKED files and
# git is pointed at them via core.hooksPath. Run once after cloning.
#
# No copying means the installed hooks can never drift from the
# committed ones. core.hooksPath makes git ignore .git/hooks/ entirely.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$REPO_ROOT" config core.hooksPath bin/hooks

echo "✅ Git hooks enabled (core.hooksPath=bin/hooks):"
echo "   pre-commit:  eslint + markdownlint on staged files, no-debugger check"
echo "   pre-push:    npm run release + audit + main.js sync (mirrors CI)"
echo ""
echo "   Skip with: git commit --no-verify  /  git push --no-verify"
