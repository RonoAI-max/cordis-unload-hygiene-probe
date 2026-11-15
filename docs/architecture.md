# Architecture and boundaries

## Execution

The CLI resolves the known Windows DSH Desktop runtime and package archive using LOCALAPPDATA and APPDATA. It checks expected file and directory types and rejects unsupported path layouts. It does not cryptographically authenticate the installed distribution.

The launcher invokes the installed runtime as a child process with a constructed environment, a separate test home, and fixed fixture arguments. The worker prepares fixed profile files, resolves the installed DSH packages, loads the profile using runProfile, instruments the selected resources, and disposes the actual Cordis loader entry's fiber. It waits for the loader and validates before/after counts. The wrapper validates the worker result and returns a JSON or text report with project-relative source locations. A raw worker stack can include local paths; do not publish raw worker output.

## Files

| Path | Purpose |
| --- | --- |
| phase3-plugin/ | Fixed plugin; two fixture modes, correct cleanup or deliberate residual resources |
| fixtures/ | Controlled resource-probe unit-test helpers |
| runner/dsh-distribution.cjs | Known Windows distribution lookup |
| runner/safe-path.cjs | Path and file checks for the test home |
| runner/resource-probe.cjs | Timer/dedicated EventEmitter instrumentation |
| runner/phase3-worker.cjs | Real DSH profile lifecycle worker |
| runner/phase3.cjs | Twelve repeated trials, validation and reporting |
| runner/*-test.cjs | Regression suites for resource probe, distribution and CLI |
| scripts/diagnose.cjs | Fixed-fixture CLI |
| scripts/diagnose-core.cjs | Argument/result validation and report formatting |

The child uses a constructed environment rather than inheriting normal credentials/configuration. It is not a security sandbox or network firewall. The profile preparation is constrained to expected project files and directories. File checks are not race-proof. Runtime internals are version-sensitive. No production profile is an intended input.

## Coverage

Supported: global setInterval/clearInterval, global setTimeout/clearTimeout, dedicated EventEmitter on/addListener/off/removeListener. Source attribution uses stack matching to the exact fixture path. Tests cover normal cleanup, intentional residuals, natural timeout fire, duplicate listeners, cross-clear, unrelated resources, invalid calls and restoration. Ambiguous listener ownership is rejected rather than silently deleting an unrelated listener; a failed restoration can require terminating the isolated test process.

Not covered: arbitrary emitters, once/prependListener/removeAllListeners, imported timer APIs, timer refresh, promises, other threads, sockets, arbitrary third-party plugins, heap or general memory leaks. No universal resource ownership or memory-leak claim.

For future generalization, use supported DSH APIs where available and design explicit opt-in, narrowly scoped observation and cleanup. Do not extend this prototype to production or untrusted plugins without a new design and review.
