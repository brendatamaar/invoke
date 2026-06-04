# Security Policy

## Reporting a Vulnerability

Report security issues through GitHub Security Advisories:
**https://github.com/brendatamaar/invoke/security/advisories/new**

Do not open a public issue for security vulnerabilities.

## What to Include

Please include as much detail as possible:

- A description of the vulnerability
- Steps to reproduce
- Affected version, commit, or deployment
- Expected and actual behavior
- Any proof of concept, logs, screenshots, or sample files
- Suggested impact or severity, if known

## Disclosure Timeline

After you submit a report:

1. We will acknowledge receipt when possible
2. We will review the issue and try to reproduce it
3. If the issue is confirmed, we will work on a fix based on severity and maintainer availability
4. We will coordinate with you before any public disclosure when possible

Please do not publicly disclose the issue until we have had a reasonable opportunity to investigate and fix it.

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

English & Indonesia
