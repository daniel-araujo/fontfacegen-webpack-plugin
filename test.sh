#!/bin/sh

# Bails when one version fails.
set -e

# Webpack versions that this library is tested against.
webpacks_versions="~4.47.0 ~5.109.2"

for version in $webpacks_versions; do
  # The module of this version is installed temporarily so that in case
  # the test fails you will be able to debug the code faster by directly
  # executing the command that runs the unit tests.
  npm install --no-save "webpack@$version"

  case "$version" in
    ~4.*)
      # Webpack 4's MD4 hashing breaks under OpenSSL 3 (Node 17+).
      NODE_OPTIONS=--openssl-legacy-provider npx mocha --timeout 5000
      ;;
    *)
      npx mocha --timeout 5000
      ;;
  esac
done
