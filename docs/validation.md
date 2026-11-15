# Validation record

## Verified baseline (2026-11-15)

This project started with a fixed-fixture test package containing 18 files (17 SHA-256 entries plus its manifest). The exact ZIP was transferred read-only into a fresh Windows VM and matched its original SHA-256:

`9D099CCD3D4D609B75F0D15D56EE291E93E5A9795C8AFA47445457CF09295E4F`

The package and manifest are historical evidence, not the hash of this expanded publication candidate. The executable source files are retained byte-for-byte; the documentation, examples and manifest are prepared for publication separately.

### Environment and limits

- Windows 11 Enterprise Evaluation 25H2, build 26200.9974; VirtualBox 7.2.22, 4 virtual CPUs and 8 GiB RAM.
- Node.js v24.18.0 x64; DSH Desktop 0.31.3 installed and initialized independently of the host profile.
- No host DSH settings, accounts, provider keys, shared folders, or Guest Additions were copied/used for the guest test.
- Same physical host, fresh OS and profile; not independent third-party hardware validation.

| Test | Result |
| --- | --- |
| Distribution resolver | PASS (exit 0) |
| Resource probe unit tests | PASS (exit 0) |
| CLI regression suite (six real DSH outputs and failure controls) | PASS (exit 0) |
| Help | PASS (exit 0) |
| Real profile repeated trials | 12/12 PASS (exit 0) |
| Good demo | PASS (exit 0) |
| Leak demo | PASS (expected exit 2) |
| Both demo | PASS (expected exit 2) |
| Demonstration JSON checks | PASS |

### Repeated trial interpretation

| Mode | Trials | Before disposal per trial | After disposal per trial | Verified |
| --- | ---: | ---: | ---: | --- |
| Good | 6 | 3 | 0 | All passed |
| Leak | 6 | 3 | 3 | All passed; 18 residuals total |

Locations in the fixture: interval `phase3-plugin/index.js:9:20`, timeout `phase3-plugin/index.js:10:19`, listener `phase3-plugin/index.js:11:11`. The worker asserts the real lifecycle, counts, cleanup and instrumentation restoration. The JSON CLI validator checks source positions, expected resource instances, cleanup and restore flags, return codes and sanitized project-relative names. After completed controlled trials, tracked residuals are recovered. These are deterministic controlled tests, not evidence of a population-wide accuracy rate.

## Reproduction

Use the documented compatible DSH installation and run from a clean checkout. See [README](../README.md). The four regression commands must exit 0; the intentionally leaking CLI demo must exit 2. Raw internal worker output or unexpected error stacks may include local paths—share only reviewed, normalized reports. Do not test a production profile or arbitrary plugin.

## Current publication candidate

The original tested source files are preserved. Documentation and examples are separate from prior VM validation. Any separately packaged or modified candidate must be checked against its own manifest before distribution. Changes to functionality require a new validation run.

## Publication-candidate recheck (2026-11-16)

On the development host, the separate publication candidate was tested after the documentation rewrite, with unchanged executable source files. All four documented regression commands exited 0. Repeated trial results: good 6/6, 0 residuals; leak 6/6, 18 residuals before cleanup; all completed and passed. Individual CLI JSON demos returned the expected good=0, leak=2, both=2; the text both demo returned 2. The files in [examples/](../examples/) contain these actual, normalized CLI outputs from the host, not manually invented results. They are sanitized and inspected for obvious private path/account strings. The original VM baseline remains a separate test run; this expanded documentation candidate was not run in the VM.

## Manifest verification

The manifest covers the explicitly selected publication files except MANIFEST.txt itself, and uses SHA-256 of the exact file bytes. From a normal PowerShell session in the repository root:

```powershell
Get-Content -LiteralPath MANIFEST.txt | ForEach-Object {
  if ($_ -notmatch '^([0-9a-f]{64})  (.+)$') { throw 'Invalid manifest entry' }
  $expected = $Matches[1]
  $file = $Matches[2]
  if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $expected) {
    throw "Hash mismatch: $file"
  }
}
'All listed hashes match'
```

Use only the known repository manifest from a trusted checkout. This checks listed bytes; it is not a signature, origin authentication, or a proof that no extra files exist. The repository uses a Git attribute to preserve the tested source bytes across checkout.
