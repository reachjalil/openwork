# Hosted Kitchen Web evidence canary

This is a disposable hosted Kitchen Web evidence canary dated 2026-08-11.

No product behavior changes.

## Web evidence checklist

- [x] Synchronized base: `517c272b50e57630bf29c5931e311993e1933d22`.
- [ ] Daytona cook completes for the exact committed candidate.
- [x] Focused source checks confirm this README, the required canary text, the synchronized base, and this Web evidence checklist; `git diff --check` is clean.
- [ ] Exact checkpoint records the candidate commit SHA and content hash before acceptance proof.
- [ ] Deterministic signed-in Den Web journey runs in real Chrome using `evals/specs/connectors-quick-add.slow.test.ts` against the exact candidate.
- [ ] Proof binds to the deterministic fact label `connectors-smart-bar`: the Connectors page opens with one smart search-or-paste bar and no duplicate standalone action.
- [ ] Private screenshot evidence is ingested into the Evidence gallery, retaining the ambient tape, every screenshot take and frame, HTML roll, Vitest receipt, assertion result, and exact hashes.
- [ ] Hosted canary resources and temporary delivery artifacts are cleaned up after evidence retention is confirmed.
- [ ] Fork draft handoff includes the exact candidate, private evidence references, focused-check results, and cleanup result; publication and merge remain controller-owned.
