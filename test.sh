#!/bin/sh

# Bails when one version fails.
set -e

# Webpack versions that this library is tested against.
webpacks_versions="~4.44.2 ~5.15.0"

for version in $webpacks_versions; do
  # The module of this version is installed temporarily so that in case
  # the test fails you will be able to debug the code faster by directly
  # executing the command that runs the unit tests.
  npm install --no-save "webpack@$version"

  # Runs unit tests against this version.
  npx mocha --timeout 5000
done
