---
description: Iterate and publish a new stable branch beta update
---

## User Input

```text
$ARGUMENTS
```

## Goal

Identify the newest 'beta' npm branch tag in the npm online repository and iterate at the smallest increment by updating the local package.json and publishing


## Instructions

run git add .

run git commit -m '[short summary]'

run the command that lists npm latest versions from online repo and identify the most recent online versions

Increment our local build by the smallest possible increment eg latest online = 0.10.1-beta.10 ----> 0.10.1-beta.11

run npm version [version-tag.number] eg npm version 0.10.1-beta.11

run npm publish --tag beta

## Inform and report back to user