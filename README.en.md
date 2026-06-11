<p align="center">
  <img src="assets/logo/sunshine-wordmark.svg" alt="Sunshine Browser" width="560">
</p>

# ☀️ Sunshine Browser

**Sunshine** is a desktop web browser (Windows / macOS / Linux) based on
[Brave](https://github.com/brave/brave-core), itself based on Chromium.

🇫🇷 [Version française](README.md)

This is the project's *meta* repository (modeled after
[`brave/brave-browser`](https://github.com/brave/brave-browser)): it holds the
branding, upstream-sync scripts, rebranding patches and release automation.
The browser sources themselves (brave-core + Chromium, dozens of GB) are
fetched at build time and are **not** versioned here. Pinned versions live in
the [`VERSION`](VERSION) file.

## Quick start

> ⚠️ Building a Chromium-based browser requires a beefy machine: 16+ GB RAM
> (32 recommended), ~100 GB of free disk, and several hours of compilation.
> See [docs/BUILD.md](docs/BUILD.md).

```bash
./scripts/doctor.sh   # check your machine (disk, RAM, tools)
make icons            # render PNG/ICO/ICNS icons from the SVG logo
make init             # fetch brave-browser + brave-core + Chromium (pinned)
make brand            # apply Sunshine branding onto brave-core
make build            # compile (Release)
./scripts/package_linux.sh   # build .deb + portable tarball (Linux)
```

## Tracking Brave releases

The [`upstream-watch`](.github/workflows/upstream-watch.yml) workflow checks
Brave's latest release daily and opens a pull request updating `VERSION` when
a new one ships. Pushing a `v*` tag then publishes a Sunshine release.

## Contributing & security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
Run `make check` (syntax + unit tests) before opening a PR.

## License

Sunshine is released under the [MPL-2.0](LICENSE) license, like Brave.
Sunshine is not affiliated with Brave Software, Inc.
