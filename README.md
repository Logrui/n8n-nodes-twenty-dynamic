# n8n-nodes-twenty-dynamic

This is an n8n community node for **Twenty CRM** that uses dynamic schema discovery and enables working with Standard AND Custom data objects and fields.

🎯 **BETA VERSION - Approaching Production Ready** 🎯

**Current Status (v0.3.10):**
- ✅ Dynamic schema discovery from Twenty CRM (metadata + GraphQL introspection)
- ✅ All CRUD operations fully implemented and tested
- ✅ Complex field types supported (FullName, Links, Currency, Address, Emails, Phones)
- ✅ **Smart field selection** - Field Type suggestions based on Twenty's metadata
- ✅ **Conditional field display** - only relevant fields appear based on Field Type selection
- ✅ Clean, intuitive UI with no field clutter
- ✅ Modular architecture for easy maintenance
- ✅ Support for Standard AND Custom objects/fields
- 🧪 **Beta testing** - Core functionality stable, additional features in development
- ⚠️ **Production use with caution** - Test thoroughly in your environment first

**Recent Improvements (v0.3.x):**
- Field selection now shows Twenty field type + suggested n8n Field Type to use (v0.3.10)
- Added Emails field type (Primary Email) for person.emails and similar fields (v0.3.9)
- Added Phones field type (Primary Phone Number + Country/Calling Codes) (v0.3.9)
- Conditional display using path-based displayOptions - only relevant fields show (v0.3.8)
- Fixed annoying UX bug where 12+ fields appeared for every field selection (v0.3.8)
- Explicit field type selector - users choose Simple/FullName/Link/Currency/Address/Emails/Phones (v0.3.7-v0.3.9)
- Fixed critical n8n circular dependency bug preventing field additions (v0.3.6)
- Complex field types with template-based inputs (no more JSON editing!)
- Modular codebase with separate field parameter and transformation modules
- GraphQL introspection for accurate field type detection

**Known Limitations:**
- Advanced filtering UI still basic (can use expressions for complex filters)
- Emails/Phones field types only support primary fields (not additionalEmails/additionalPhones arrays)
- Some Twenty-specific field types may need additional handling (SELECT, MULTI_SELECT, RELATION, etc.)
- Relational fields work but UI could be improved

**Feedback Welcome:** This node is approaching production readiness. Please report issues on [GitHub](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues).

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

**Supported Operations:**
- **Create One**: Create a new record with intelligent field inputs
- **Find One**: Retrieve a single record by ID
- **Update One**: Update an existing record (partial updates supported)
- **Delete One**: Delete a record by ID (permanent - cannot be undone)
- **Find Many**: Retrieve multiple records with pagination (up to 100 records)

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

**Phase 1: Build Functional Prototype** ✅ Complete
- Core GraphQL integration
- Dynamic resource discovery
- All CRUD operations (Create, Read, Update, Delete, List)
- Runtime query construction

**Phase 2: Production-Ready Enhancements** ✅ Complete
- ✅ Refactored to use n8n native HTTP helpers (no external dependencies)
- ✅ Enhanced field returns (automatically queries all available fields)
- ✅ Implemented intelligent caching with 10-minute TTL
- ✅ Added "Force Refresh Schema" option
- ✅ Complex field type support (FullName, Links, Currency, Address)
- ✅ Template-based field inputs (no JSON required)
- ✅ Resource-aware field rendering
- ✅ Modular architecture for maintainability

**Phase 3: Polish and Testing** 🚧 In Progress
- ✅ Field type introspection and validation
- ✅ Resource-specific field behavior (Company vs Person)
- ✅ Modular codebase (FieldParameters, FieldTransformation modules)
- ⏳ Advanced filter UI improvements
- ⏳ Support for all Twenty complex field types (Emails, Phones, Rating, etc.)
- ⏳ Schema versioning and change detection
- ⏳ Support for Twenty "Views"
- ⏳ Comprehensive testing across all field types

**Current Status:**
- Core CRUD operations are stable and production-ready
- Complex field types work well for common scenarios
- Beta testing in progress for edge cases and additional field types

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

This node is being developed and tested against:
- **Twenty CRM**: v0.40+ (tested with v1.0.3)
- **n8n**: v1.91+ (tested with v1.91.3)

Currently in beta testing phase. Compatible with both self-hosted and cloud instances of Twenty CRM.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Twenty developer documentation](https://twenty.com/developers/)
* [Twenty GraphQL API documentation](https://twenty.com/developers/section/graphql)
* [Project Development Plan](PLAN_V2.md)
* [GitHub Repository](https://github.com/Logrui/n8n-nodes-twenty-dynamic)
* [npm Package](https://www.npmjs.com/package/n8n-nodes-twenty-dynamic)

## Version History

**Current Development Series (v0.3.x - Complex Fields & Resource-Aware Implementation):**

#### v0.3.10 (October 12, 2025)
- **UX IMPROVEMENT:** Field selection dropdown now shows Twenty field type + suggested n8n Field Type
- Examples: "name (Name) - Twenty Type: FullName → Use 'Full Name' (required)"
- Helps users choose the correct Field Type without guessing
- Indicates unsupported types (SELECT, MULTI_SELECT, RELATION)

#### v0.3.9 (October 12, 2025)
- **NEW FEATURE:** Added Emails field type with Primary Email support
- **NEW FEATURE:** Added Phones field type with Primary Phone Number, Country Code, and Calling Code
- Supports person.emails and future emails/phones fields in Twenty CRM
- Added introspection tooling for complex field type discovery
- Note: Does not support additionalEmails/additionalPhones JSON arrays (by design)

#### v0.3.8 (October 12, 2025)
- **CRITICAL UX FIX:** Implemented conditional field display using path-based displayOptions
- Only relevant input fields now appear based on Field Type selection
- Fixed annoying bug where 12+ fields showed up for every field
- Uses `/fields.field[0].fieldType` path reference for proper conditional display
- Much cleaner, more professional user experience

#### v0.3.7 (October 12, 2025)
- **MAJOR UX IMPROVEMENT:** Added explicit "Field Type" selector
- Users now choose field type: Simple / Full Name / Link / Currency / Address
- Updated transformation logic to use fieldType parameter
- Note: All fields still visible (fixed in v0.3.8)

#### v0.3.6 (October 12, 2025)
- **CRITICAL FIX:** Removed displayOptions from fixedCollection child parameters
- Resolves "Could not resolve parameter dependencies. Max iterations reached!" error
- Field addition now works correctly in Create One and Update One operations
- Simplified field parameter structure for better n8n compatibility
- Note: All complex field inputs visible (superseded by v0.3.7's field type selector)

#### v0.3.5 (October 12, 2025)
- Integrated comprehensive README from template
- Enhanced bug reporting section
- Added complete list of 40+ standard Twenty objects
- Improved credits and installation sections

#### v0.3.4 (October 12, 2025)
- Comprehensive README documentation update
- Enhanced installation and usage instructions
- Complete standard objects list
- Improved bug reporting guidelines

#### v0.3.3 (October 12, 2025)
- Fixed field creation button bug caused by duplicate fieldValue parameters
- Improved field value parameter logic with separate handling for Company.name vs other fields
- "name" field now always appears first in dropdown for better UX

#### v0.3.2 (October 12, 2025)
- Resource-aware field parameters (Person.name vs Company.name)
- Person.name shows First Name/Last Name inputs (FullName type)
- Company.name shows simple text input (String type)
- Updated field transformation to be resource-aware
- GraphQL introspection script to detect field types by resource

#### v0.3.1 (October 12, 2025)
- Modular architecture refactoring
- Created FieldParameters.ts module for UI parameter definitions
- Created FieldTransformation.ts module for data transformation logic
- Reduced Twenty.node.ts from 839 to 436 lines (48% reduction)
- Improved code maintainability and extensibility

#### v0.3.0 (October 12, 2025)
- Template-based field inputs for complex types (no more JSON!)
- FullName fields: Separate First Name and Last Name inputs
- Links fields: URL and Label inputs
- Currency fields: Amount and Currency Code with dropdown
- Address fields: 8 separate inputs (street1, street2, city, postal, state, country, lat, lng)
- Automatic currency micros conversion (amount * 1,000,000)
- User-friendly field input experience

**Previous Series (v0.1.x - Dynamic Schema Discovery):**

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


