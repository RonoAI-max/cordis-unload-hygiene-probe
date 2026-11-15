# Roadmap — from proof of concept to developer workflow

This is a proposed, milestone-based roadmap, not a delivery schedule or a claim of existing features. Each expansion requires explicit testing and review. Technical guidance from DSH maintainers and feedback from plugin authors would help determine the supported integration path.

| Milestone | Goal | Acceptance gate |
| --- | --- | --- |
| v0.1 — demonstrated | Real DSH fixed-fixture CLI | 6 clean and 6 intentional-leak trials; correct counts and relative source positions; cleanup and restoration checks; fresh Windows VM reproduction |
| v0.2 — planned | Trusted development-plugin diagnosis | Opt-in test profile, explicit plugin selection without production settings, reviewed lifecycle/API and resource attribution, known false positives and unsupported cases, cleanup/restore tests |
| v0.3 — planned | Regression-testing workflow | Repeatable load/unload cycles, machine-readable reports with versioned schema, before/after comparison, compatibility matrix and CI-friendly result codes on supported environments |
| v0.4 — exploratory | Supported DSH integration | Confirm official/stable hooks and safety boundaries, design small integration and developer-facing result view, obtain feedback; avoid depending on unsupported internals where feasible |
| v1.0 — aspirational | A useful community developer tool | Published scope, documentation, regression evidence, compatibility policy, user feedback and reviewed distribution/licensing |

## Priority questions

- Which lifecycle hooks or public APIs are supported for observing plugin unload and resource ownership?
- How should a diagnostic test profile be separated from ordinary users' settings?
- Which resource types are most valuable to plugin developers? What should the tool report rather than attempt to clean up?
- How can we validate compatibility without overstating isolation or ownership guarantees?

## Support sought and intended use

| Support | Intended work |
| --- | --- |
| Token support | AI-assisted implementation, test generation and execution, independent review, documentation, and compatibility analysis |
| Technical exchange | Supported lifecycle hooks and profile APIs, reliable attribution, instrumentation limits, safe integration and distribution |
| User feedback | Real development use cases, report usability, regression workflows and prioritization |

The goal is to contribute a reproducible quality-assurance and debugging workflow to DSH plugin development. Native integration, wider distribution and marketplace participation are exploratory and conditional on validation, appropriate licensing, and feedback. No commitments to a release date or support allocation are made.
