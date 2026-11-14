# Protected vendor trees

These directories are **copied reference repositories**. Gestura must not rewrite them in place.

| Path | Upstream | Role | License / access |
|---|---|---|---|
| `vendor/genasl` | https://github.com/sanaro99/GenASL | ASL interpreter-avatar pipeline (protected foundation) | GPL-3.0 |
| `vendor/sign-kit` | https://github.com/spectre900/Sign-Kit-An-Avatar-based-ISL-Toolkit | Mixamo-bone ISL alphabet/word animation clips | Upstream repo; treat as third-party |

**Rules**

1. Do not delete, rewrite, or “fit” these trees into Gestura’s folder layout.
2. Do not change GenASL schemas, API routes, or pipeline stages without explicit approval.
3. Integrate through adapters and documented contracts only.
4. `vendor/genasl/cookies.txt` contains YouTube session cookies. Do not commit, publish, or reuse it.
5. SignAvatars motion data is **not** vendored here. Access requires their research license form.

See `GESTURA_IMPLEMENTATION_PLAN.md`.
