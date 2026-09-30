# Changelog

## [1.0.0-rc.3](https://github.com/email-utils/validator-syntax/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2026-09-30)


### Features

* **parser:** expose the resolved maxLength on SyntaxValidator ([#46](https://github.com/email-utils/validator-syntax/issues/46)) ([361fe3f](https://github.com/email-utils/validator-syntax/commit/361fe3f79990d355fe123080d499f68efac4dce0))

## [1.0.0-rc.2](https://github.com/email-utils/validator-syntax/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2026-09-30)


### Features

* **parser:** add maxLength and convert U-labels in batches ([#43](https://github.com/email-utils/validator-syntax/issues/43)) ([623e210](https://github.com/email-utils/validator-syntax/commit/623e210768a32bda2e50182c4eba5c6c1a17fbf1))


### Bug Fixes

* **parser:** describe unquoted_space as whitespace, not a space ([#39](https://github.com/email-utils/validator-syntax/issues/39)) ([3eff0eb](https://github.com/email-utils/validator-syntax/commit/3eff0ebfa02eb852bbb16beaefc55018702b836b))

## [1.0.0-rc.1](https://github.com/email-utils/validator-syntax/compare/v1.0.0-rc.0...v1.0.0-rc.1) (2026-09-29)


### ⚠ BREAKING CHANGES

* **parser:** add parseAddress, isValidSyntax, and createSyntaxValidator with presets ([#29](https://github.com/email-utils/validator-syntax/issues/29))

### Features

* add previewSyntaxOptions to preview what a configuration accepts ([#35](https://github.com/email-utils/validator-syntax/issues/35)) ([610bad2](https://github.com/email-utils/validator-syntax/commit/610bad21298f7a9bf0a4ea8df8be80920f33ef4f))
* **parser:** add opt-in Unicode, IDN, and IP-literal overrides ([#33](https://github.com/email-utils/validator-syntax/issues/33)) ([69e68f7](https://github.com/email-utils/validator-syntax/commit/69e68f79e627348d88decfcee94b81e13fd70038))
* **parser:** add parseAddress, isValidSyntax, and createSyntaxValidator with presets ([#29](https://github.com/email-utils/validator-syntax/issues/29)) ([c67f9f9](https://github.com/email-utils/validator-syntax/commit/c67f9f9fa91d98d36c45e506cc17aa133bdfb039))
* **presets:** publish the syntax corpus as /fixtures ([#26](https://github.com/email-utils/validator-syntax/issues/26)) ([b691668](https://github.com/email-utils/validator-syntax/commit/b6916683b1b8bfa91621da5cd180108b57764226))


### Bug Fixes

* **data:** accept IDN TLDs by their xn-- A-labels ([#32](https://github.com/email-utils/validator-syntax/issues/32)) ([df08f28](https://github.com/email-utils/validator-syntax/commit/df08f28a8a29a50135b1937f569656dfed8988d6))
