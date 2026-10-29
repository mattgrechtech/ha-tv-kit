# Security

## Reporting a vulnerability

If you find a way the kit could expose someone's home (a script that leaks data, a config that opens a port, a doc step that weakens security), please report it privately through GitHub's **Security → Report a vulnerability** on this repository rather than in a public issue. Include steps to reproduce and remove any personal details from logs.

## The kit's trust model

The kit assumes a home network you control. See the **Safety and privacy** section of the [README](README.md#safety-and-privacy): TvOverlay and `/config/www` have no authentication, adb debugging grants control of a TV, and the optional trusted_networks setup trades security for convenience. None of it should be reachable from the internet.
