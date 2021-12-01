#!/bin/bash
echo "Creating a $1 verion."

npm version $1
version=`git diff HEAD^..HEAD -- "$(git rev-parse --show-toplevel)"/package.json | grep '^\+.*version' | sed -s 's/[^0-9\.]//g'`

echo "Creating version $version."

git push
git push --tags
npm publish --access public