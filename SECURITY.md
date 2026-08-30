# Security policy

## Supported version

Security fixes target the current `main` branch. This source repository does not itself prove what is deployed at nymrel.com.

## Reporting a vulnerability

Email `contact@nymrel.com` with the affected path, reproduction steps, impact, and any suggested mitigation. Please do not open a public issue for an unpatched vulnerability or include real customer markup, checkout data, or credentials in a report.

## Security boundary

JSON-LD Studio generates and checks structured data in the browser. Generated or pasted values may be saved automatically in browser local storage so a local draft survives reloads. Product values must not be attached to analytics or other network requests. The hosted page also loads aggregate Vercel Web Analytics.

Generated JSON is intended for an HTML `application/ld+json` script block. Every literal `<` in serialized data is emitted as `\u003c`; this preserves the parsed JSON value while preventing user-controlled text from terminating the enclosing script block early. Free and Pro serializers share this invariant.

Checkout verification and paid artifact delivery are separate server-backed boundaries. Verification must fail closed when its verifier is unavailable.

There is no public bug-bounty promise. We will acknowledge actionable reports and coordinate remediation proportionate to the issue.
