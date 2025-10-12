# n8n-nodes-twenty

This is an n8n community node for **Twenty CRM** that uses dynamic schema discovery and enables working with Standard AND Custom data objects and fields

⚠️ BETA VERSION - Under Active Development - Do not use for production workflows

[Twenty CRM](https://twenty.com/) is an open-source CRM (customer relationship management) tool that is under rapid development. Please consider this as a **Alpha/Beta** release that is likely to break with future changes in the Twenty API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Resources](#resources)  
[Credit](#credit)  
[Version history](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Settings -> Community Nodes -> Install -> n8n-nodes-twenty-dynamic

## Bug Reporting and Features Requests


## Standard Operations
    - General
    - Api Keys
    - Attachments
    - Blocklists
    - Calendar Channel Event Associations
    - Calendar Channels
    - Calendar Event Participants
    - Calendar Events
    - Companies
    - Connected Accounts
    - Favorite Folders
    - Favorites
    - Message Channel Message Associations
    - Message Channels
    - Message Folders
    - Message Participants
    - Messages
    - Message Threads
    - Notes
    - Note Targets
    - Opportunities
    - People
    - Tasks
    - Task Targets
    - Timeline Activities
    - View Fields
    - View Filter Groups
    - View Filters
    - View Groups
    - Views
    - View Sorts
    - Webhooks
    - Workflow Automated Triggers
    - Workflow Runs
    - Workflows
    - Workflow Versions
    - Workspace Members

## Dynamic Operations
    -Support for majority of custom objects and fields. Certain complex fields that are objects are still being WIP


## ROADMAP
    -Dynamic Field Integrations for All Standard and Custom Data Models
    -Standard and Custom Object Retrieval [x]
    -Standard Integrated Operations
        -Standard CRUD Operations
        -Standard Integrations
            -List people by Company
            -Get notes by Company
            -Get notes by Person
    -Operations:
        -Create One by ID
        -Delete One by ID
        -Get One by ID
        -Find One by Name
        -List/Search
        -Update One

## Credentials

Generate an API key in Twenty by following the [Twenty docs](https://twenty.com/user-guide/section/functions/api-webhooks). In summary, create an API key in the Settings -> Developers section.

Copy the API key. Click 'Add Credential' in n8n and search for 'Twenty API'. Provide the API key and your Twenty domain (e.g. http://localhost:5020, https://n8n.example.org). Do _not_ use the 'API Base URL', e.g. https://n8n.example.org/rest/.

## Compatibility

Compatible and tested with Twenty v1.0.3 and n8n v1.91.3.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Twenty developer documentation](https://twenty.com/developers/)

## Version history


## Credit
Dynamic node and custom objects integration credit goes to [s-yhc](https://github.com/s-yhc/n8n-nodes-twenty-dynamic)

Previous versions and learnings from [devlikeapro](https://github.com/devlikeapro/n8n-openapi-node) for the work on generic n8n nodebuilders for OpenAPI specs. 

Previous versions relied on similar tools from [ivov](https://github.com/ivov) and [feelgood-interface](https://github.com/feelgood-interface).

