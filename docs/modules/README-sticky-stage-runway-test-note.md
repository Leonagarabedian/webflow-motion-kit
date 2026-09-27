# Test note

This branch adds `tests/sticky-stage-runway.test.js`, which verifies that `sticky-stage-runway` is registered as a reusable primitive and mountable through the runtime registry.

Full local validation command:

```bash
pnpm test -- tests/sticky-stage-runway.test.js tests/registry.test.js
pnpm build
```
