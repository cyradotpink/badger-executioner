#!/bin/bash

version=$(node -e "process.stdout.write(JSON.parse(fs.readFileSync('package.json').toString()).version)")
archivename=$(node -e "process.stdout.write('v' + '$version'.replace(/\./g, '_') + '.tar.gz')")
echo "Compressing version $version to archive release/$archivename"

if mkdir tmp/ ; then
    mkdir tmp/package/
    cp package.json tmp/package/
    cp -r src tmp/package/

    tar -czf release/$archivename --directory tmp package
    rm -r tmp

    cp release/$archivename release/latest.tar.gz
else
    echo "Remove tmp directory"
fi