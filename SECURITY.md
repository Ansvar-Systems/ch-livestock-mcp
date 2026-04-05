# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

**Email:** security@ansvar.eu
**Subject:** `[ch-livestock-mcp] Vulnerability Report`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.

Do **not** open a public GitHub issue for security vulnerabilities.

## Security Measures

- **CodeQL** -- Static analysis on every push and PR
- **Gitleaks** -- Secret detection in commits
- **Dependency scanning** -- npm audit in CI
- **Read-only data** -- SQLite database is read-only at runtime in Docker (data volume)
- **Non-root container** -- Runs as UID 1001 (nodejs user)
- **No network egress** -- Server does not make outbound requests at runtime
- **No authentication data** -- Server stores no credentials, tokens, or user data
