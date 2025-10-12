# n8n-nodes-twenty-dynamic

This is an n8n community node for **Twenty CRM** that uses dynamic schema discovery.

⚠️ **ALPHA VERSION - NOT PRODUCTION READY** ⚠️

**Current Status (v0.1.11):**
- ✅ Dynamic schema discovery from Twenty CRM
- ✅ Basic CRUD operations structure implemented
- 🧪 **Testing empty filter parameter** - Attempting to retrieve all available fields
- ⚠️ **Under active development** - API integration being refined
- ❌ **Do not use in production workflows**

This is an early alpha release for testing and development purposes only.

**Known Limitations:**
- Field loading may not show all available fields for some objects
- Query execution not fully tested across all field types
- Custom field type handling in progress

**Feedback Welcome:** If you're testing this node, please report issues on GitHub.

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
[Development Status](#development-status)  
[Architecture](#architecture)  
[Compatibility](#compatibility)  
[Resources](#resources)  
[Version History](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

This node dynamically discovers available objects from your Twenty CRM instance via the metadata API. 

**Supported Operations:**
- **Create One**: Create a new record in any Twenty object
- **Find One**: Retrieve a single record by ID
- **Update One**: Update an existing record (partial updates supported)
- **Delete One**: Delete a record by ID (permanent - cannot be undone)
- **Find Many**: Retrieve multiple records with pagination (up to 100 records)

**Dynamic Features:**
- Automatically discovers all standard Twenty objects (Company, Person, Opportunity, Task, Note, etc.)
- Supports custom objects you've created in Twenty
- Dynamically loads available fields for each object type
- Adapts to schema changes without node updates
- Field type validation and appropriate input controls

## Credentials

Generate an API key in Twenty by following the [Twenty docs](https://twenty.com/user-guide/section/functions/api-webhooks). In summary, create an API key in the Settings -> Developers section.

Copy the API key. Click 'Add Credential' in n8n and search for 'Twenty API'. Provide the API key and your Twenty domain (e.g. http://localhost:5020, https://n8n.example.org). Do _not_ use the 'API Base URL', e.g. https://n8n.example.org/rest/.

## Development Status

**Phase 1: Build Functional Prototype** ✅ Complete
- Core GraphQL integration
- Dynamic resource discovery
- All CRUD operations (Create, Read, Update, Delete, List)
- Runtime query construction

**Phase 2: Production-Ready Enhancements** 🚧 In Progress
- ✅ Refactored to use n8n native HTTP helpers (no external dependencies)
- ✅ Enhanced field returns (automatically queries all available fields)
- ✅ Implemented intelligent caching with 10-minute TTL
- ✅ Added "Force Refresh Schema" option
- ⏳ Advanced filter UI (currently basic implementation)
- ⏳ Schema versioning and change detection
- ⏳ Support for Twenty "Views"
- ⏳ Final review and comprehensive testing

**Current Known Issues:**
- Schema discovery works but node is still in testing phase
- Advanced filtering features not yet implemented
- Relational field handling in development

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
- `TwentyApi.credentials.ts`: Credential definition with caching support

**No External Dependencies:** All API communication uses n8n's native `this.helpers.httpRequestWithAuthentication` method, following n8n best practices.

## Compatibility

This node is being developed against Twenty API v0.40+ and n8n v1.91+. Currently in alpha testing phase.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Twenty developer documentation](https://twenty.com/developers/)
* [Twenty GraphQL API documentation](https://twenty.com/developers/section/graphql)
* [Project Development Plan](PLAN_V2.md)

## Version History

**Current Development Series (v0.1.x - Dynamic Implementation):**

#### v0.1.11 (October 11, 2025)
- Added empty filter parameter to fields query
- Testing if explicit filter retrieves all fields

#### v0.1.10 (October 11, 2025)
- Enhanced schema field querying
- Improved field metadata collection

#### v0.1.9 (October 11, 2025)
- Schema cache refresh improvements
- Field count debugging

#### v0.1.8 (October 11, 2025)
- Field filtering adjustments
- Debug improvements

#### v0.1.7 (October 11, 2025)
- Testing phase for CRUD operations
- Field visibility validation

#### v0.1.6 (October 11, 2025)
- Improved field filtering logic for writable fields
- Enhanced isWritable calculation

#### v0.1.5 (October 11, 2025)
Fixed UI visibility:
- Removed regex-based displayOptions that prevented Operation dropdown from showing
- Operation selection now always visible after Resource selection

#### v0.1.4 (October 11, 2025)
Simplified schema query:
- Removed relation field queries causing GraphQL errors
- Set relationMetadata to null (basic CRUD doesn't require relation details)

#### v0.1.3 (October 11, 2025)
Fixed schema discovery query to work with updated Twenty API:
- Changed `isWritable` field to `isUIReadOnly` (with inverted logic)
- Changed `relationMetadata` field to `relation`
- Fixed GraphQL schema query compatibility

#### v0.1.2 (October 11, 2025)
Fixed GraphQL request body formatting for proper variable handling

#### v0.1.1 (October 11, 2025)
Complete CRUD operations implementation:
- Dynamic schema discovery from Twenty metadata API
- Create, Read (Get/List), Update, and Delete operations
- Support for both standard and custom objects
- Dynamic field loading based on selected resource
- Intelligent caching with 10-minute TTL
- Force refresh schema option

#### v0.0.11 and earlier
Foundation work:
- Initial dynamic architecture design
- GraphQL client integration
- Basic schema fetching

---

**Previous Implementation Series (v0.0.1-0.0.5 - OpenAPI-based):**

*Note: Versions 0.0.1-0.0.5 used a different architecture based on static OpenAPI specifications. The current v0.1.x series represents a complete rewrite using dynamic schema discovery.*

#### v0.0.5
Simplified to build on n8n-openapi-node

#### v0.0.4
Compatible with Twenty's updated API in v0.40.7

#### v0.0.3
Compatible with Twenty's updated API in v0.33.4

#### v0.0.1
Initial release

## Credits

The v0.1.x series is a complete rewrite with dynamic architecture. Previous versions (v0.0.1-0.0.5) were based on work by [devlikeapro](https://github.com/devlikeapro/n8n-openapi-node), [ivov](https://github.com/ivov), and [feelgood-interface](https://github.com/feelgood-interface) using OpenAPI-based approaches.


