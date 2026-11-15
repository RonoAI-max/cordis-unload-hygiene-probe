# Roadmap — from proof of concept to developer workflow

This is a proposed, milestone-based roadmap, not a delivery schedule or a claim of existing features. Each expansion requires explicit testing and review. Technical guidance from DSH maintainers and feedback from plugin authors would help determine the supported integration path.

| Milestone | Goal | Acceptance gate |
| --- | --- | --- |
| v0.1 — demonstrated | Real DSH fixed-fixture CLI | 6 clean and 6 intentional-leak trials; correct counts and relative source positions; cleanup and restoration checks; fresh Windows VM reproduction |
| v0.2 — planned | Trusted development-plugin diagnosis | Opt-in test profile, explicit plugin selection without production settings, reviewed lifecycle/API and resource attribution, known false positives and unsupported cases, cleanup/restore tests |
| v0.3 — planned | Regression-testing workflow | Repeatable load/unload cycles, machine-readable reports with versioned schema, before/after comparison, compatibility matrix and CI-friendly result codes on supported environments |
| v0.4 — exploratory | Supported DSH integration and automatic unload warnings | Confirm supported lifecycle and UI extension APIs; opt-in unload-triggered diagnosis for trusted development plugins; in-app warning with resource count, types and source locations where attributable; verify clean unloads, duplicate suppression, instrumentation overhead and safe disable/restore; obtain developer feedback |
| v1.0 — aspirational | A useful community developer tool | Published scope, documentation, regression evidence, compatibility policy, user feedback and reviewed distribution/licensing |

## Automatic diagnosis and in-app warnings (planned, v0.4 exploratory)

- In an explicitly enabled development mode, trigger a diagnostic check when a monitored plugin finishes unloading or reloading, without requiring a separate CLI command.
- If tracked resources remain after the supported cleanup boundary, display a warning in DSH through a supported UI extension mechanism. Show the plugin identifier, residual count, resource types, and project-relative source locations when attribution is reliable; mark uncertain attribution explicitly.
- Provide a developer-facing details view and access to the corresponding diagnostic report. Keep CLI and JSON reporting available as a fallback.
- Avoid warnings on verified clean unloads; deduplicate repeated warnings, measure overhead, and allow monitoring to be disabled. Do not silently modify or automatically clean up arbitrary plugin resources.
- Acceptance requires supported lifecycle/UI APIs, tests with clean and intentionally leaking trusted plugins, safe restoration on disable, and no exposure of production settings or sensitive paths.

This is a future integration goal, not a currently implemented feature. If supported DSH hooks or UI surfaces are unavailable, retain the standalone diagnostic workflow rather than assume private interfaces are stable.

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
