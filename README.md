# n8n-nodes-twenty-dynamic

![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

This is an n8n community node that integrates **[Twenty CRM](https://twenty.com)** with fully **dynamic resource and field discovery**. It automatically adapts to your Twenty instance schema, including custom objects and fields, without requiring node updates.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Twenty CRM](https://twenty.com) is a modern, open-source CRM system built for self hosting

**Table of Contents:**  
[Features](#features) • [Installation](#installation) • [Operations](#operations) • [Credentials](#credentials) • [Development Status](#development-status) • [Bug Reporting](#bug-reporting-and-feature-requests) • [Resources](#resources) • [Credits](#credits)

---

## Features

🗄️ **Supports Custom Databases and Fields**: Automatically fetches all standard and custom objects from your Twenty instance

🔓 **Access System Databases**: View and edit system databases not normally accessible through the Twenty UI (Company/Person Attachments (attachments), Synced Email Metadata (messages), and more)

⚡ **Full CRUD + Bulk Operations**: Create, Read, Update, Delete, Upsert - all with bulk variants  

🧩 **Support for Complex Field Types**: Template-based inputs for FullName, Links, Currency, Address, Emails, Phones  

📋 **SELECT/MULTI_SELECT Fields**: Dynamic dropdowns with real-time option loading  

🆕 **🆕 Fetch Database Schemas**: Fetch the schema for a specific database (Databases -> Get Schema) - uses Twenty OpenAPI schema for example data formats + Database specific fields

🆕 **🆕 Manage System Attachments**: Manage attachments in N8N using the new Resource: Attachments -> (Upload File, Download File, Get File)
---

## About This Project

Modelled after the official Notion N8N node. Unlike traditional n8n nodes with static operations, this node **dynamically discovers** the Twenty CRM schema at runtime. It queries the Twenty REST and GraphQL APIs to automatically adapt to:
- Support all standard and system Twenty objects (Company, Person, Opportunity, etc.)
- Custom databases and fields created in your Twenty instance  
- Schema changes and updates without requiring node updates

**Key Architecture:**
- **Dynamic Schema Discovery**: Queries `/metadata` endpoint to get available standard and custom resources and fields
- **Hybrid OpenAPI/GraphQL/REST**: GraphQL for mutations, REST API for efficient data retrieval and node queries, and OpenAPI for schema validation
- **Runtime Query Construction**: Builds queries dynamically based on user selections
- **Intelligent Caching**: Fresh schema on execution, cached in editor UI for performance

[Twenty CRM](https://twenty.com/) is an open-source CRM under rapid development. This node stays compatible through dynamic adaptation rather than static operation definitions. 
---

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

**Quick Install in n8n:**
```
Settings → Community Nodes → Install → n8n-nodes-twenty-dynamic
```

**Or via npm:**
```bash
npm install n8n-nodes-twenty-dynamic
```

### For Developers & Advanced Users: Beta Channel 🧪

Want to test new features before they're released? Install from the **beta** channel:

```bash
npm install n8n-nodes-twenty-dynamic@beta
```

**Beta Channel Features:**
- 🔬 Early access to new features currently in development
- 🐛 Help us test and provide feedback before stable release
- ⚠️ May contain bugs - not recommended for production workflows
- 📢 Report issues on [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)

**Current Beta Features (v0.10.0-beta.2):**
- 📎 **Attachment Management**: Upload files to Twenty CRM with 4 selection modes
  - ✅ From List: Searchable dropdown of parent records
  - ✅ By URL: Paste Twenty CRM record URL
  - ✅ By ID: Enter UUID directly
  - ✅ By Field: Match by unique field (email, domain, etc.)
- 📥 File upload/download functionality (coming soon in next beta)
- �️ Attachment metadata fields (coming soon in next beta)

**📋 See [CHANGELOG-BETA.md](CHANGELOG-BETA.md) for detailed beta release notes**

To switch back to stable:
```bash
npm install n8n-nodes-twenty-dynamic@latest
```

---

## Credentials

Generate an API key in Twenty by following the [Twenty API documentation](https://twenty.com/user-guide/section/functions/api-webhooks).

**Quick Steps:**
1. Open your Twenty instance
2. Navigate to **Settings → Developers → API Keys**
3. Click **Create API Key**
4. Copy the generated key

**In n8n:**
1. Click **Add Credential** and search for **"Twenty API"**
2. Provide:
   - **API Key**: Your Twenty API key (from above)
   - **Twenty Domain**: Your Twenty instance URL (e.g., `http://localhost:3000` or `https://twenty.example.com`)

**Important:** Use the **root domain only**, not the GraphQL endpoint:
- ✅ Correct: `https://twenty.example.com`
- ❌ Wrong: `https://twenty.example.com/graphql`

---

## Operations

This node dynamically discovers available objects from your Twenty CRM instance and supports the following operations:

### Single Record Operations

- **Create**: Create a new record with intelligent field inputs
- **Get**: Retrieve a single record by ID  
- **Update**: Update an existing record (partial updates supported)
- **Delete**: Delete a record by ID (permanent - cannot be undone)
- **Create or Update (Upsert)**: Smart upsert - create if not found, update if exists (match by ID or unique field)
- **List/Search**: Retrieve multiple records with pagination (up to 100 records)

### Bulk Operations

Process multiple records in parallel for maximum performance:

- **Create Many**: Bulk create multiple records (10-20x faster than sequential)
- **Get Many**: Retrieve multiple records by IDs in parallel
- **Update Many**: Bulk update multiple records with different field values
- **Delete Many**: Bulk delete multiple records by IDs
- **Create or Update Many (Upsert Many)**: Bulk smart upsert - create or update multiple records based on unique field matching

**Bulk Operations Benefits:**
- ⚡ **10-20x faster** than sequential operations
- 🛡️ **Resilient**: Individual failures don't stop the entire batch
- 📊 **Detailed results**: Each item returns success/error status with index tracking
- 🔄 **Parallel execution**: Uses `Promise.allSettled()` for concurrent processing

### Resource Selection
- **Database Group**: Filter databases by type
  - **All Databases**: Show all available objects (default)
  - **Standard Databases**: Main user-facing Twenty objects (Company, Person, Opportunity, Task, Note, etc.)
  - **System Databases**: Internal meta-objects (Views, Filters, Attachments, etc.) - Advanced users only
  - **Custom Databases**: User-created custom objects
- **Database**: Select the specific object/database to work with (dynamically filtered based on Database Group)

### Smart Field Inputs

The node automatically provides appropriate inputs based on field types:

- **FullName fields** (Person.name): Individual First Name and Last Name inputs
- **Links fields** (domainName, linkedinLink): URL and Label inputs  
- **Currency fields** (annualRecurringRevenue): Amount and Currency Code inputs with dropdown
- **Address fields**: Street, City, State, Postal Code, Country, and Coordinates inputs
- **Emails/Phones**: Multiple entry support with primary designation
- **SELECT/MULTI_SELECT**: Dynamic dropdowns with options from your Twenty instance
- **Simple fields**: Standard text, number, date, and boolean inputs
- **Resource-aware**: Same field name behaves differently based on object type (e.g., Company.name is text, Person.name is FullName)

### Supported Databases

**Standard Databases:**
- Companies, People, Opportunities, Tasks, Notes
- Workflows, Workflow Runs, Workflow Versions

**System Databases:**
- Attachments, Calendar Events, Messages, Message Channels, Note Targets, etc.

**Custom Databases:**
- ✅ All custom databases you create in Twenty
- ✅ Custom fields on standard objects
- ✅ Most custom field types supported

**Note:** The majority of custom fields are fully supported. If you encounter issues with specific custom field types, please [report them on GitHub](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues).

---

## Field Format Specifications 🆕

**Available in v0.10.0-beta.3+**

The **Get Schema** operation now includes detailed format specifications for each field type, based on comprehensive empirical testing of the Twenty CRM API. This helps you understand exactly what format to send and what to expect back.

### What's Included

Each field type includes:
- **Pattern**: Human-readable format description
- **Example**: Concrete example value in the correct format
- **Description**: Brief explanation of the field type
- **Accepts**: List of accepted input format variations
- **Returns**: Description of what format Twenty returns
- **Validation**: Strictness level (strict/flexible/none)
- **Critical Notes**: ⚠️ Important behaviors you MUST know about
- **Notes**: Additional helpful information

### Field Types Covered

Format specifications available for 17+ field types:
- **Date/Time**: DATE_TIME, DATE
- **Contact**: EMAILS, PHONES, LINKS
- **Structured**: FULL_NAME, ADDRESS, CURRENCY
- **Data**: ARRAY, RAW_JSON, NUMBER, TEXT, BOOLEAN
- **Enums**: RATING, MULTI_SELECT
- **IDs**: UUID

**Coverage**: ~88% of fields in a typical database have format specifications.

---

## Bug Reporting and Feature Requests

Please report bugs and request features on [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues).

**When reporting bugs, please include:**
- Your Twenty CRM version
- Your n8n version  
- The database/object you're working with
- Steps to reproduce the issue
- Expected vs actual behavior
- Any error messages

---

## Development Status: Ready to Use for Majority of Operations ✅

### Production-Ready Features 

- ✅ **Dual-source architecture**: Metadata API + GraphQL introspection
- ✅ **Complete field coverage**: Custom SELECTs + built-in enums
- ✅ **All CRUD operations**: Create, Read, Update, Delete, List, Upsert
- ✅ **Bulk operations**: Create Many, Get Many, Update Many, Delete Many, Upsert Many
- ✅ **Complex field types**: FullName, Links, Currency, Address, Emails, Phones
- ✅ **SELECT/MULTI_SELECT**: Dynamic options with real-time loading
- ✅ **Automatic field type detection**: Template-based inputs (no JSON required)
- ✅ **Smart caching**: Fresh on execution, cached in editor
- ✅ **Zero external dependencies**: Native n8n helpers only

### Active Development Features 🚧

**Attachment Management** (Available in Beta - v0.10.0-beta.2) ⭐ **NEW IMPROVEMENTS**
- 📎 **Upload Files**: Upload files from n8n workflows to Twenty CRM
- 🔗 **Attach to Records**: Link files to Companies, People, Tasks, Notes, Opportunities with 4 selection modes:
  - ✅ **From List**: Searchable dropdown of actual records (NEW in beta.2)
  - ✅ **By URL**: Paste Twenty CRM record URL (NEW in beta.2)
  - ✅ **By ID**: Enter UUID directly (NEW in beta.2)
  - ✅ **By Field**: Match by unique field like email/domain (NEW in beta.2)
- 📁 **File Categorization**: Organize as Attachments, Files, or Profile Pictures
- 💾 **Binary Data Support**: Works with files from HTTP Request, Google Drive, etc.
- 🎯 **Standalone Files**: Upload files without parent records
- ⏳ **Coming Soon**: Download files, Attachment metadata fields

**Install Beta to Test:**
```bash
npm install n8n-nodes-twenty-dynamic@beta
```

### Roadmap ⏳
- ⏳ Download attachments from Twenty CRM
- ⏳ Attachment metadata fields (Fields/Properties for attachments)
- ⏳ Advanced filter UI improvements
- ⏳ Add support for remaining Twenty complex field types (Rating, etc.)
- ⏳ Support for Twenty "Views" and "Relations"
- ⏳ Support for get Database and Notion style resources

---
---

## Resources

- 📚 [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- 🔧 [Twenty Developer Documentation](https://twenty.com/developers/)
- 🔗 [Twenty GraphQL API Documentation](https://twenty.com/developers/section/graphql)
- 📝 [Changelog](CHANGELOG.md) - Stable version history and release notes
- 🧪 [Beta Changelog](CHANGELOG-BETA.md) - Beta releases and experimental features
- 💻 [GitHub Repository](https://github.com/Logrui/n8n-nodes-twenty-dynamic) - Source code and issues
- 📦 [npm Package](https://www.npmjs.com/package/n8n-nodes-twenty-dynamic) - Package details

---


## Compatibility

Compatible and tested with Twenty v1.7.6 and n8n Version 1.113.3


## Credits

**Primary Development:**
- [s-yhc](https://github.com/s-yhc) - Dynamic node architecture and custom objects integration

**Maintainer:**
- [Logrui](https://github.com/Logrui)

**Community Contributors:**
- Testing and feedback from the n8n and Twenty communities
- Bug reports and feature requests via GitHub Issues

---

**License:** MIT

**Support:** [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)

**Latest Version:** Check [npm](https://www.npmjs.com/package/n8n-nodes-twenty-dynamic) or [GitHub Releases](https://github.com/Logrui/n8n-nodes-twenty-dynamic/releases)


