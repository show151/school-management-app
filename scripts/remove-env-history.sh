#!/usr/bin/env bash
# WARNING: Rewrites git history. Coordinate with your team and back up repository.

# Option A: Using git-filter-repo (recommended)
# Install: https://github.com/newren/git-filter-repo
# Example:
# git clone --mirror <repo-url> repo.git
# cd repo.git
# git filter-repo --invert-paths --paths .env
# git push --force

# Option B: Using BFG (Java)
# Install BFG (https://rtyley.github.io/bfg-repo-cleaner/)
# Example:
# git clone --mirror <repo-url> repo.git
# java -jar bfg.jar --delete-files .env repo.git
# cd repo.git
# git reflog expire --expire=now --all && git gc --prune=now --aggressive
# git push --force

echo "See comments in this script for steps. Do NOT run without backup."
