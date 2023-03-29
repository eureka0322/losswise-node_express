#!/bin/bash
rm -rf losswise.zip
zip losswise.zip -r * .[^.]* -x "node_modules**" "*.zip"
eb deploy --timeout 40
