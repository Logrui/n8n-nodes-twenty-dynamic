---
description: Iterate and publish a new stable branch npm update
---

## User Input

```text
$ARGUMENTS
```

## Goal

Identify the newest 'normal/stable' npm branch tag in the npm online repository and iterate at the smallest increment by updating the local package.json

## Instructions

Increment our local build by the smallest possible increment eg latest online = 0.10.1.5 ----> 0.10.1.6

run npm version [version-tag.number] eg npm version 0.10.1.6

run git add .

run git commit -m '[commit_type]:[short summary]' eg bugfix: [description] or feature: [description]

Get the latest npm tags in the online repo
run npm view n8n-nodes-twenty-dynamic dist-tags 


run npm publish

## Inform and report back to user