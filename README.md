# n8n-nodes-twenty-dynamic

![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

This is an n8n community node that integrates **[Twenty CRM](https://twenty.com)** with fully **dynamic resource and field discovery**. It automatically adapts to your Twenty instance schema, including custom objects and fields, without requiring node updates.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Twenty CRM](https://twenty.com) is a modern, open-source CRM system built with GraphQL.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Resources](#resources)  

## Features

✨ **Dual-Source Architecture**: Combines Twenty Metadata API and GraphQL introspection for complete field coverage and efficient API queries for 
✨ **Dynamic Resource Discovery**: Automatically fetches standard and custom objects from your Twenty instance  
✨ **Full CRUD Operations and Batch Operations**: Full Create, Read, Update, and Delete support w/ new Update/Create if not found operation 
✨ **Support forComplex Field Types**: Template-based inputs for FullName, Links, Currency, Address, Emails, Phones  
✨ **SELECT/MULTI_SELECT Fields**: Dynamic dropdowns with real-time option loading  
✨ **Smart Caching**: 10-minute TTL with force refresh option  
✨ **Zero Dependencies**: Built with n8n native HTTP helpers only  


## About This Project

Unlike traditional n8n nodes with static operations, this node **dynamically discovers** the Twenty CRM schema at runtime. It queries the Twenty metadata API to automatically adapt to:
- All standard Twenty objects (Company, Person, Opportunity, etc.)
- Custom objects you've created in your Twenty instance
- Schema changes and updates without requiring node updates

**Key Architecture:**
- **Dynamic Schema Discovery:** Queries `/metadata` endpoint to get available resources and fields
- **Runtime Query Construction:** Builds GraphQL queries dynamically based on user selections
- **Native n8n Integration:** Uses `this.helpers.httpRequestWithAuthentication` for all API calls
- **Intelligent Caching:** 10-minute TTL cache with force refresh option for optimal performance

[Twenty CRM](https://twenty.com/) is an open-source CRM under rapid development. This node aims to stay compatible through dynamic adaptation rather than static operation definitions.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

**Table of Contents:**
[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Bug Reporting](#bug-reporting-and-feature-requests)  
[Development Status](#development-status)  
[Architecture](#architecture)  
[Compatibility](#compatibility)  
[Resources](#resources)  
[Version History](#version-history)  
[Credits](#credits)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

**Quick Install:**
```
Settings → Community Nodes → Install → n8n-nodes-twenty-dynamic
```

Or via npm:
```bash
npm install n8n-nodes-twenty-dynamic
```

## Bug Reporting and Feature Requests

Please report bugs and request features on [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues).

When reporting bugs, please include:
- Your Twenty CRM version
- Your n8n version
- The resource/object you're working with
- Steps to reproduce the issue
- Expected vs actual behavior

## Operations

This node dynamically discovers available objects from your Twenty CRM instance via the metadata API and GraphQL introspection.

**Resource Selection:**
- **Resource Group**: Filter resources by type
  - **All Resources**: Show all available objects (default)
  - **Standard Resources**: Main user-facing Twenty objects (Company, Person, Opportunity, Task, Note, etc.)
  - **System Resources**: Internal meta-objects (Views, Filters, Attachments, etc.) - Advanced users only
  - **Custom Resources**: User-created custom objects
- **Resource**: Select the specific object/resource to work with (dynamically filtered based on Resource Group)

**Supported Operations:**
- **Create**: Create a new record with intelligent field inputs
- **Get**: Retrieve a single record by ID
- **Update**: Update an existing record (partial updates supported)
- **Delete**: Delete a record by ID (permanent - cannot be undone)
- **Update/Create if not found**: Upsert operation for selectively updating or creating a record
- **List/Search**: Retrieve multiple records with pagination (up to 100 records)
- **Batch**: Many operations for Get, Create, Update

**Dynamic Features:**
- Automatically discovers all standard Twenty objects (Company, Person, Opportunity, Task, Note, etc.)
- Supports custom objects you've created in Twenty
- Dynamically loads available fields for each object type (both standard and custom fields)
- Adapts to schema changes without node updates
- Field type validation and appropriate input controls

**Smart Field Inputs:**
- **FullName fields** (Person.name): Shows First Name and Last Name inputs instead of JSON
- **Links fields** (domainName, linkedinLink, etc.): Shows URL and Label inputs
- **Currency fields** (annualRecurringRevenue): Shows Amount and Currency Code inputs with dropdown
- **Address fields**: Shows individual inputs for street, city, state, postal code, country, and coordinates
- **Simple fields**: Standard text, number, date, and boolean inputs
- **Resource-aware**: Same field name behaves differently based on object type (e.g., Company.name is text, Person.name is FullName)

## Supported Features
	-Dynamic Field Integrations for All Standard and Custom Data Models
	-Standard and Custom Database/Field Retrieval
	-Standard Integrated Operations
		-Standard CRUD Operations
		-Standard Integrations
			-List people by Company
			-Get notes by Company
			-Get notes by Person
	-Operations:
		-Create
		-Delete
		-Get
		-List/Search
		-Update
		-Create Many
		-Delete Many
		-Get Many
		-Find Many
		-Update/Create Many

## Standard Databases
	-Companies
	-People
	-Notes
	-Tasks
	-Workflows
	-Workflow Runs

## System Databases
	-Attachments
    -Calendar Events
	-Messages
	-Message Channels
	-Note Targets, etc

## Custom Dynamic Databases and Fields
	-Support for custom databases and most fields Certain complex fields that are objects are still  WIP. 
	-Please report if you find an issue https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues


**Automatically discovers and supports your custom Databases/Fields in Twenty:**
- Custom objects you create in Twenty
- Custom fields on standard objects
- Custom complex field types
- Adapts to schema changes without node updates

**Note:** Majority of fields are supported Certain complex custom field types that are objects may still be work-in-progress. Please report any issues with custom fields on GitHub.

## Credentials

Generate an API key in Twenty by following the [Twenty docs](https://twenty.com/user-guide/section/functions/api-webhooks). In summary, create an API key in the Settings → Developers section.

Copy the API key. Click 'Add Credential' in n8n and search for 'Twenty API'. Provide:
- **API Key**: Your Twenty API key
- **Twenty Domain**: Your Twenty instance URL (e.g., `http://localhost:3000` or `https://twenty.example.com`)

**Important:** Do _not_ use the 'API Base URL'. Use the root domain only (e.g., `https://twenty.example.com`, not `https://twenty.example.com/graphql`).

## Development Status

**Production-Ready Features:**
- ✅ Dual-source architecture (Metadata API + GraphQL introspection)
- ✅ Complete field coverage (custom SELECTs + built-in enums)
- ✅ All CRUD operations (Create, Read, Update, Delete, List)
- ✅ Complex field types (FullName, Links, Currency, Address, Emails, Phones)
- ✅ SELECT/MULTI_SELECT with dynamic options
- ✅ Automatic field type detection
- ✅ Template-based inputs (no JSON required)
- ✅ Smart caching with 10-minute TTL
- ✅ Zero external dependencies

**Future Enhancements:**
- ⏳ Advanced filter UI improvements
- ⏳ Support for remaining Twenty complex field types (Rating, etc.)
- ⏳ Schema versioning and change detection
- ⏳ Support for Twenty "Views"


## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Twenty developer documentation](https://twenty.com/developers/)
* [Twenty GraphQL API documentation](https://twenty.com/developers/section/graphql)
* [Changelog](CHANGELOG.md)
* [GitHub Repository](https://github.com/Logrui/n8n-nodes-twenty-dynamic)
* [npm Package](https://www.npmjs.com/package/n8n-nodes-twenty-dynamic)

## Credits

**Dynamic node and custom objects integration:**
- Primary development by [s-yhc] (https://github.com/s-yhc)
- Based on dynamic architecture concepts from [s-yhc] (https://github.com/s-yhc)


**Community Contributors:**
- Testing and feedback from the n8n and Twenty communities
- Bug reports and feature requests via GitHub Issues

---

**License:** MIT

**Maintainer:** [Logrui](https://github.com/Logrui)

**Support:** [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)


