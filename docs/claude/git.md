# Git Workflow

## Branch Strategy

```
feature/* ──┐
            ├──→ develop ──→ main
bug/*    ───┘
```

- `develop` and `main` are protected — **never push directly**
- All work lives in a `feature/<name>` or `bug/<name>` branch
- `develop` → `main` is a release-only operation performed by the user

## Starting Work

```bash
git checkout develop
git pull
git checkout -b feature/<short-kebab-description>
# or
git checkout -b bug/<short-kebab-description>
```

## Commit Style

Conventional commits:
- `feat:` — new feature or behaviour
- `fix:` — bug fix
- `chore:` — tooling, deps, config (no production code change)
- `test:` — adding or updating tests
- `docs:` — documentation only
- `refactor:` — code change that is neither a fix nor a feature

Example: `feat: add BookIdentifierService abstract interface`

## After Finishing Work

```bash
git push -u origin feature/<name>
gh pr create --draft --base develop \
  --title "feat: <description>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet points>

## Test plan
- [ ] <what to verify>

🤖 Generated with Claude Code
EOF
)"
```

## Rules
- Never use `--no-verify` or `--force` on protected branches
- Delete the branch after the PR merges
- Claude opens draft PRs — the user reviews, approves, and merges
- Squash merge into `develop`; merge commit into `main`
