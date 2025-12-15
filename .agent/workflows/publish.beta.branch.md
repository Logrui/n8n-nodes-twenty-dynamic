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

Get the latest npm tags in the online repo
run npm view n8n-nodes-twenty-dynamic dist-tags 

Increment our local build by the smallest possible increment eg latest online = 0.10.1-beta.10 ----> 0.10.1-beta.11

run npm version [version-tag.number] eg npm version 0.10.1-beta.11

run git add .

run git commit -m '[commit_type]:[short summary]' eg bugfix: [description] or feature: [description]

run npm publish --tag beta


## Inform and report back to developer

For installation instructions, instruct the user as follows: (required format)


**Installation**

Goto Settings ---> Community Nodes

Click Install ---> Version Information Below

```bash
Name of Node such as (n8n-nodes-suna-kortix)@[npm version]
```


Example

```bash
n8n-nodes-suna-kortix@0.10.1-beta.11
```



Note: N8N will prompt you to update to the "latest" version - do not do this because it will revert you. Additionally, you may need to uninstall previous beta or latest nodes first in order to install a beta version of the node