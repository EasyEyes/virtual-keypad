# Security update: 2026-10-23

Node.js 22.23.4 is selected in `.nvmrc` and `engines.node`. This includes the October 21 security patches. Application source behavior is unchanged except for required build integration configuration.

Source: [Node.js October security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).

## Verification and limitations

Clean installation and production build pass. The test script is a placeholder. npm 10 audit-fix initially crashed; npm 11 completed remediation successfully.

Native npm audit: 0 critical, 8 high, 2 moderate, 0 low findings. Counts represent affected dependency packages, not unique CVEs.

Remaining findings are deferred to a separate compatibility/reachability review by 2026-10-30. High findings are not claimed fixed or harmless. Many are inherited from braces/micromatch, test tooling, development servers, or discontinued packages; runtime exposure must be assessed before release.

| Package | Severity | Remediation status | Advisory |
| --- | --- | --- | --- |
| `braces` | high | Requires declared-range/major change | [braces vulnerable to stack-exhaustion denial of service through deeply nested patterns](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| `chokidar` | high | Requires declared-range/major change | Inherited from vulnerable dependency |
| `http-proxy-middleware` | high | Requires declared-range/major change | Inherited from vulnerable dependency |
| `micromatch` | high | Requires declared-range/major change | Inherited from vulnerable dependency |
| `node-forge` | high | Requires declared-range/major change | [node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| `selfsigned` | high | Requires declared-range/major change | Inherited from vulnerable dependency |
| `webpack-dev-middleware` | high | Requires declared-range/major change | [webpack-dev-middleware vulnerable to Path Traversal via non-slash-terminated publicPath](https://github.com/advisories/GHSA-g84c-rxfj-3j2c) |
| `webpack-dev-server` | high | Requires declared-range/major change | [webpack-dev-server users' source code may be stolen when they access a malicious web site with non-Chromium based browser](https://github.com/advisories/GHSA-9jgg-88mc-972h); [webpack-dev-server users' source code may be stolen when they access a malicious web site](https://github.com/advisories/GHSA-4v9v-hfq4-rm2v); [webpack-dev-server vulnerable to cross-origin source code exposure on non-HTTPS origins](https://github.com/advisories/GHSA-79cf-xcqc-c78w); [webpack-dev-server vulnerable to HMR WebSocket interception via permissive user proxies](https://github.com/advisories/GHSA-mx8g-39q3-5c79); [webpack-dev-server vulnerable to cross-site request forgery via internal developer endpoints](https://github.com/advisories/GHSA-f5vj-f2hx-8m93); [webpack-dev-server vulnerable to denial of service via a malformed Host or Origin header](https://github.com/advisories/GHSA-m28w-2pqf-7qgj) |

## Verification scenario

Use the pinned Node version. Install from the authoritative lockfile with dependency scripts disabled first, review native/postinstall scripts, and run only those required by the package. Run the documented test/build commands. Repeat the native audit before release. In a preview, exercise the package's normal entry point and check browser/server errors. A successful build does not prove production integration.
