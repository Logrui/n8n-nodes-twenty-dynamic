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

✨ **Dual-Source Architecture**: Combines Metadata API and GraphQL introspection for complete field coverage  
✨ **Resource Group Filtering**: Organize resources by All, System, Custom, Database, and Database Item groups  
✨ **Automatic Field Detection**: Field types auto-detected and configured (no manual type selection)  
✨ **Built-in Enum Support**: Now supports all Twenty built-in enums (Person.gender, Opportunity.stage, etc.)  
✨ **Dynamic Resource Discovery**: Automatically fetches standard and custom objects from your Twenty instance  
✨ **Auto-Adapting Fields**: Discovers all available fields dynamically (no hardcoded field lists)  
✨ **Custom Object Support**: Works seamlessly with your custom objects and fields  
✨ **CRUD Operations**: Full Create, Read, Update, and Delete support  
✨ **Complex Field Types**: Template-based inputs for FullName, Links, Currency, Address, Emails, Phones  
✨ **SELECT/MULTI_SELECT Fields**: Dynamic dropdowns with real-time option loading  
✨ **Smart Caching**: 10-minute TTL with force refresh option  
✨ **Zero Dependencies**: Built with n8n native HTTP helpers only  

## Current Status

**v0.5.0** - Production-ready with dual-source architecture for complete field coverage.

### What's New in v0.5.0

- **Dual-Source Field Discovery**: Queries both Metadata API and GraphQL introspection for 100% field coverage
- **Built-in Enum Support**: Now discovers and supports all Twenty built-in enum fields (previously invisible)
- **Automatic Type Detection**: Field types auto-detected and hidden from users (improved UX)
- **Smart Fallback**: Tries Metadata API first (custom SELECTs), falls back to GraphQL (built-in enums)
- **Complete Coverage**: All Twenty CRM fields now supported, including Person.gender, Opportunity.stage, etc.

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

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
- **List/Search**: Retrieve multiple records with pagination (up to 100 records)

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

## Standard Objects Supported

All Twenty standard objects are automatically discovered and supported:
- **General**: Core system objects
- **API Keys**: API key management
- **Attachments**: File attachments
- **Blocklists**: Blocked contacts/domains
- **Calendar Channels**: Calendar integrations
- **Calendar Events**: Calendar event management
- **Calendar Event Participants**: Event attendees
- **Companies**: Organization/company records
- **Connected Accounts**: External account connections
- **Favorites**: User favorites
- **Favorite Folders**: Favorite organization
- **Message Channels**: Messaging integrations
- **Message Threads**: Conversation threads
- **Messages**: Individual messages
- **Message Participants**: Message recipients
- **Message Folders**: Message organization
- **Notes**: Note records
- **Note Targets**: Note associations
- **Opportunities**: Sales opportunities
- **People**: Contact/person records
- **Tasks**: Task management
- **Task Targets**: Task associations
- **Timeline Activities**: Activity tracking
- **Views**: Custom views
- **View Fields**: View field configurations
- **View Filters**: View filtering
- **View Filter Groups**: Filter grouping
- **View Groups**: View grouping
- **View Sorts**: View sorting
- **Webhooks**: Webhook configurations
- **Workflows**: Workflow automation
- **Workflow Runs**: Workflow execution history
- **Workflow Versions**: Workflow versioning
- **Workflow Automated Triggers**: Workflow triggers
- **Workspace Members**: Workspace user management

## Dynamic Custom Object Support

**Automatically discovers and supports:**
- Custom objects you create in Twenty
- Custom fields on standard objects
- Custom complex field types
- Adapts to schema changes without node updates

**Note:** Certain complex custom field types that are objects may still be work-in-progress. Please report any issues with custom fields on GitHub.

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

See [PLAN_V2.md](PLAN_V2.md) for detailed development roadmap.

## Architecture

**Dynamic Schema Discovery:**
```
User Opens Node → Check Cache (10min TTL) → Fetch /metadata if stale
                                          ↓
                              Parse Objects & Fields → Build UI Options
```

**Query Construction Flow:**
```
User Selects Resource → Load Fields Dynamically → User Fills Values
                                                 ↓
                              Build GraphQL Query String → Execute via HTTP Helper
```

**Key Components:**
- `Twenty.node.ts`: Main node implementation with UI definition and operation handlers
- `TwentyApi.client.ts`: Helper functions for schema discovery and query building
- `FieldParameters.ts`: Centralized field parameter definitions for complex types
- `FieldTransformation.ts`: Data transformation logic (flat inputs → nested GraphQL objects)
- `ComplexFieldDetection.ts`: Field type detection utilities
- `TwentyApi.credentials.ts`: Credential definition with caching support

**No External Dependencies:** All API communication uses n8n's native `this.helpers.httpRequestWithAuthentication` method, following n8n best practices.

## Compatibility

**Tested and verified with:**
- **Twenty CRM**: v0.40+ (tested with v1.0.3)
- **n8n**: v1.91+ (tested with v1.91.3)

Compatible with both self-hosted and cloud instances of Twenty CRM.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Twenty developer documentation](https://twenty.com/developers/)
* [Twenty GraphQL API documentation](https://twenty.com/developers/section/graphql)
* [Project Development Plan](PLAN_V2.md)
* [Changelog](CHANGELOG.md)
* [GitHub Repository](https://github.com/Logrui/n8n-nodes-twenty-dynamic)
* [npm Package](https://www.npmjs.com/package/n8n-nodes-twenty-dynamic)

## Credits

**Dynamic node and custom objects integration:**
- Primary development by [Logrui](https://github.com/Logrui)
- Based on dynamic architecture concepts from [s-yhc](https://github.com/s-yhc/n8n-nodes-twenty-dynamic)

**Previous versions (v0.0.x OpenAPI-based):**
The v0.1.x and v0.3.x series represent a complete rewrite with dynamic architecture. Previous versions (v0.0.1-0.0.5) were based on work by:
- [devlikeapro](https://github.com/devlikeapro/n8n-openapi-node) - Generic n8n node builders for OpenAPI specs
- [ivov](https://github.com/ivov) - Early OpenAPI integration tools
- [feelgood-interface](https://github.com/feelgood-interface) - Additional OpenAPI tooling

**Community Contributors:**
- Testing and feedback from the n8n and Twenty communities
- Bug reports and feature requests via GitHub Issues

---

**License:** MIT

**Maintainer:** [Logrui](https://github.com/Logrui)

**Support:** [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)


