# Security Policy

## Reporting a Vulnerability

Report security issues through GitHub Security Advisories:
**https://github.com/brendatamaar/invoke/security/advisories/new**

Do not open a public issue for security vulnerabilities.

## Disclosure Timeline

We follow a 90-day coordinated disclosure process:

1. You submit a report via GitHub Security Advisories
2. We acknowledge receipt within 3 business days
3. We investigate and keep you informed of progress
4. We aim to ship a fix within 90 days of confirmation
5. We coordinate with you on timing before any public disclosure

If a fix requires longer than 90 days, we will communicate this and agree on an extension.

## Scope

**In scope:**

- SSRF via user-supplied request URLs — requests that cause the server or executor to reach internal infrastructure
- Credential or token exposure — stored requests or collections leaking secrets through logs, exports, or the API
- Webhook payload injection — crafted payloads that affect behavior beyond the intended webhook receiver
- Collection import parser vulnerabilities — malformed input that causes unexpected code execution or data leakage during import

**Out of scope:**

- Rate limiting and brute-force protection
- Denial-of-service attacks
- Self-XSS (requires the attacker to already control the victim's session)

## Preferred Languages

English.
