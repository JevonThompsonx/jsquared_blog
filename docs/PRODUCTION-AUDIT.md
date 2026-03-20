# Production Readiness Audit — agency-agents

**Audit date**: 2026-03-20
**Auditor**: Claude Sonnet 4.6 (OpenCode)
**Scope**: Full repository review with deep-dive on `engineering-security-engineer.md`, `engineering-senior-developer.md`, `engineering-software-architect.md`, and `engineering-threat-detection-engineer.md`
**Status**: All issues resolved. See Summary Table below.

---

## Executive Summary

The repository is largely well-structured with a consistent agent template, working CI/CD linting, multi-tool conversion scripts, and a comprehensive agent catalog. However, there are **5 issues that block clean production use**, and **4 additional quality issues** worth tracking. All issues are documented below in priority order.

---

## Critical Issues (Must Fix)

### CRIT-1: Orphaned root-level agent files — not scanned by linter or converters

**Severity**: Critical  
**Files affected**:
- `engineering-security-engineer.md` (root)
- `engineering-senior-developer.md` (root)

**What's wrong**: Two agent files exist at the repository root instead of inside their category directory (`engineering/`). The canonical copies live at:
- `engineering/engineering-security-engineer.md`
- `engineering/engineering-senior-developer.md`

The root-level files are byte-for-byte identical to the `engineering/` versions. Because `scripts/lint-agents.sh`, `scripts/convert.sh`, and `scripts/install.sh` only scan the `AGENT_DIRS` array (category subdirectories), the root files are:
- **Never linted** — the CI workflow cannot catch regressions in them
- **Never converted** — they are invisible to all tool integrations (OpenCode, Cursor, Windsurf, etc.)
- **Never installed** — `install_claude_code` and `install_copilot` also skip them

**Impact**: Anyone who edits the root-level copy instead of the `engineering/` copy will make changes that are silently ignored by the entire pipeline. This is a source-of-truth problem.

**Resolution**: Delete the two root-level duplicates. The `engineering/` copies are the authoritative source. (See CRIT-2 and HIGH-1 for the underlying content issues in the `engineering/` copies.)

---

### CRIT-2: `engineering-senior-developer.md` — broken internal file references

**Severity**: Critical  
**File**: `engineering/engineering-senior-developer.md` (and root duplicate)  
**Lines**: 39, 56, 58, 176

**What's wrong**: The agent body references three internal file paths that do not exist anywhere in the repository:

| Reference in file | Expected path | Status |
|---|---|---|
| `ai/system/component-library.md` | `agency-agents-main/ai/system/component-library.md` | **Does not exist** |
| `ai/system/premium-style-guide.md` | `agency-agents-main/ai/system/premium-style-guide.md` | **Does not exist** |
| `ai/system/advanced-tech-patterns.md` | `agency-agents-main/ai/system/advanced-tech-patterns.md` | **Does not exist** |
| `ai/agents/dev.md` | `agency-agents-main/ai/agents/dev.md` | **Does not exist** |

The final footer line reads:
> `**Instructions Reference**: Your detailed technical instructions are in `ai/agents/dev.md``

This implies the agent was extracted from a private codebase (likely a Laravel/Livewire client project) where an `ai/` directory existed. The references make no sense in the open-source agency-agents context and will cause confusion for any user who tries to follow them.

**Impact**: Users who activate this agent in Claude Code or any tool will receive a broken agent that references files it can never find. The agent silently becomes less capable at the exact moments it is most needed (premium style guidance, advanced tech patterns).

**Resolution**: Remove all broken internal path references from the agent body. Replace with:
1. The FluxUI reference: `https://fluxui.dev/docs/components/[component-name]`
2. Self-contained inline guidance for premium patterns and tech references
3. Remove the `**Instructions Reference**` footer line or replace with a note that this agent is self-contained

---

## High Priority Issues

### HIGH-1: `engineering-software-architect.md` — incomplete frontmatter and truncated agent body

**Severity**: High  
**File**: `engineering/engineering-software-architect.md`

**What's wrong**: The file is missing two frontmatter fields (`emoji` and `vibe`) that are present in all other agents in the engineering directory, and the agent body is significantly shorter (81 lines) than comparable engineering agents. Specific missing sections compared to the standard template:

| Section | Required by template? | Present? |
|---|---|---|
| `emoji` frontmatter field | Standard across all agents | **Missing** |
| `vibe` frontmatter field | Standard across all agents | **Missing** |
| `## 🔄 Learning & Memory` | Recommended | **Missing** |
| `## 🎯 Your Success Metrics` | Recommended | **Missing** |
| `## 🚀 Advanced Capabilities` | Recommended | **Missing** |
| `## 💭 Your Communication Style` | Present but minimal | Partial |

**Impact**: 
- `scripts/convert.sh` generates an `IDENTITY.md` for OpenClaw using `emoji` + `vibe`. Without them, the fallback path is used (name + description only), producing a lower-quality identity file.
- The agent is noticeably less capable than peers because it lacks success metrics, advanced capabilities, and learning/memory sections.
- Inconsistency with the template will cause future contributors to wonder whether the truncation is intentional.

**Resolution**: Add `emoji: 🏛️` and `vibe:` to frontmatter (the `🏛️` emoji is already used in README). Add the missing sections following the standard template pattern.

---

### HIGH-2: `engineering-threat-detection-engineer.md` — Splunk deploy step uses insecure `-k` flag

**Severity**: High  
**File**: `engineering/engineering-threat-detection-engineer.md`  
**Line**: 331

**What's wrong**: The CI/CD pipeline example in the "Deploy to Splunk" step uses:

```bash
curl -k -u "${{ secrets.SPLUNK_USER }}:${{ secrets.SPLUNK_PASS }}" \
  https://${{ secrets.SPLUNK_HOST }}:8089/...
```

The `-k` (insecure) flag disables SSL/TLS certificate verification. In a security-focused agent that explicitly teaches detection-as-code best practices, shipping a code example with disabled certificate verification is:
1. A direct contradiction of the agent's own "Security-First" principles
2. A bad-practice example that users will copy into real pipelines

**Impact**: Users who follow the example verbatim will deploy Splunk rules via an unverified TLS connection, creating a MITM attack surface. This is particularly damaging because the Threat Detection Engineer is positioned as a security expert.

**Resolution**: Replace `-k` with `--cacert /path/to/splunk-ca.crt` and add a comment explaining that the certificate path should point to the Splunk CA. Alternatively, use a proper Splunk SDK or action that enforces TLS.

---

## Medium Priority Issues

### MED-1: README agent count is inconsistent

**Severity**: Medium  
**File**: `README.md`  
**Lines**: 478, 789

**What's wrong**: The README reports two different agent counts in two different places:

- Line 478 (Stats section): "**144 Specialized Agents** across 12 divisions"
- Line 789 (Acknowledgments section): "**147 agents across 12 divisions**"

The actual count from the directory listing is approximately 147+ agents. The Stats section was not updated when new agents were added.

**Resolution**: Update the Stats section count to match the Acknowledgments section (or re-count from directory to get the exact current number).

---

### MED-2: README Scenario numbering is out of order

**Severity**: Medium  
**File**: `README.md`  
**Lines**: 332–393

**What's wrong**: The "Real-World Use Cases" section lists scenarios in the order: 1, 2, 3, 5, 4. Scenario 5 (Paid Media Account Takeover) appears before Scenario 4 (Full Agency Product Discovery). This appears to be a cut-and-paste error from adding Scenario 5 after the others.

**Resolution**: Renumber the scenarios to 1, 2, 3, 4, 5 in sequence, or reorder the sections so they flow naturally.

---

## Low Priority Issues

### LOW-1: `engineering-security-engineer.md` CI/CD example — `trivy-action@master` is a floating reference

**Severity**: Low  
**File**: `engineering/engineering-security-engineer.md`  
**Line**: 178

**What's wrong**: The dependency scan job uses:
```yaml
uses: aquasecurity/trivy-action@master
```

`@master` is a floating reference. GitHub Actions best practice and the project's own security posture (as defined by the Security Engineer agent) requires pinning actions to a specific version or SHA. All other actions in the same file use `@v4`.

**Resolution**: Replace `@master` with a pinned version, e.g. `aquasecurity/trivy-action@0.28.0` (or the latest stable tag at time of update).

---

### LOW-2: `engineering-threat-detection-engineer.md` — Detection rule dates are in the past

**Severity**: Low  
**File**: `engineering/engineering-threat-detection-engineer.md`  
**Lines**: 83–84, 427, 439–441

**What's wrong**: The Sigma rule example and detection catalog schema use hardcoded dates from 2025 (`date: 2025/03/15`, `modified: 2025/06/20`, `last_modified: 2025-06-20`, `review_due: 2025-09-15`). Since the current date is 2026-03-20, these examples now appear stale.

**Impact**: Minor — template dates in documentation files don't affect functionality. But stale examples reduce credibility and cause confusion about whether the agent is maintained.

**Resolution**: Update example dates to 2026 equivalents, or use relative placeholder notation like `YYYY-MM-DD` / `TODAY` to make it clear these are templates.

---

## Structural Observations (Not Issues, For Awareness)

### OBS-1: `.gitignore` excludes TODO.md

The `.gitignore` file (line 63) explicitly ignores `TODO.md`. This means a `TODO.md` file in the repository root will not be tracked in version control. This is intentional per project convention (scratch/personal notes are excluded), but worth noting for the docs folder: files inside `docs/` are NOT gitignored, so `docs/` is the correct location for tracked documentation.

### OBS-2: `strategy/` directory is not in `AGENT_DIRS`

The `strategy/` directory exists at the repo root and contains several markdown files, but is not included in the `AGENT_DIRS` array in `lint-agents.sh`, `convert.sh`, or `install.sh`. This is correct and intentional: the strategy files are playbooks and coordination docs, not agent definition files. No action needed.

### OBS-3: `engineering-software-architect.md` has no `## 🔄 Learning & Memory` section but uses a `🔄` emoji for `## 💬 Communication Style`

The heading `## 💬 Communication Style` in `engineering-software-architect.md` is labeled as `## 💬` in the actual file rather than `## 💭` as used in the standard template. This is a minor inconsistency but does not affect functionality.

---

## Summary Table

| ID | Severity | File | Issue | Status |
|---|---|---|---|---|
| CRIT-1 | Critical | `/engineering-security-engineer.md` (root), `/engineering-senior-developer.md` (root) | Orphaned root-level duplicates never processed by scripts | **Fixed** |
| CRIT-2 | Critical | `engineering/engineering-senior-developer.md` | Four broken internal path references (`ai/system/*`, `ai/agents/dev.md`) | **Fixed** |
| HIGH-1 | High | `engineering/engineering-software-architect.md` | Missing `emoji`, `vibe` frontmatter; missing Learning/Metrics/Advanced sections | **Fixed** |
| HIGH-2 | High | `engineering/engineering-threat-detection-engineer.md` | `-k` disables TLS verification in Splunk deploy example | **Fixed** |
| MED-1 | Medium | `README.md` | Agent count inconsistency (144 vs 147) | **Fixed** |
| MED-2 | Medium | `README.md` | Scenarios numbered 1, 2, 3, 5, 4 (out of order) | **Fixed** |
| LOW-1 | Low | `engineering/engineering-security-engineer.md` | `trivy-action@master` is a floating/unpinned action reference | **Fixed** |
| LOW-2 | Low | `engineering/engineering-threat-detection-engineer.md` | Example dates are from 2025 (now stale) | **Fixed** |

---

## Audit Methodology

1. Read all four target agent files in full
2. Read `README.md`, `CONTRIBUTING.md`, `scripts/lint-agents.sh`, `scripts/convert.sh`, `scripts/install.sh`
3. Read `.github/workflows/lint-agents.yml` and `.gitignore`
4. Cross-referenced all internal links and paths against the actual directory tree
5. Checked frontmatter compliance against the template in `CONTRIBUTING.md`
6. Reviewed code examples for security and best-practice issues
7. Compared agent structure completeness against sibling agents in `engineering/`
