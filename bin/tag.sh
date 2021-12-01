#!/bin/bash

if [ $1 ]; then
  echo "Creating a new $1 version."

  npm version $1
  version=`git diff HEAD^..HEAD -- "$(git rev-parse --show-toplevel)"/package.json | grep '^\+.*version' | sed -s 's/[^0-9\.]//g'`

  npm run build
  git add -A
  git commit -m "Building for $version."

  echo "Creating version $version."

  git push
  git push --tags
  npm publish --access public
else
  echo "No version type provided. (ie. ./bin/tag.sh version)";
fi

