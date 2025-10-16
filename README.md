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

💾 **Smart Caching**: Automatic schema caching - fresh on execution, cached in editor for speed  

🔄 **Dual-API Architecture**: Utilizes Twenty Metadata API and GraphQL introspection for complete field coverage for standard and custom fields. REST API used for execution of queries

---

## About This Project

Modelled after the official Notion N8N node. Unlike traditional n8n nodes with static operations, this node **dynamically discovers** the Twenty CRM schema at runtime. It queries the Twenty REST and GraphQL APIs to automatically adapt to:
- Support all standard and system Twenty objects (Company, Person, Opportunity, etc.)
- Custom databases and fields created in your Twenty instance  
- Schema changes and updates without requiring node updates

**Key Architecture:**
- **Dynamic Schema Discovery**: Queries `/metadata` endpoint to get available resources and fields
- **Hybrid GraphQL/REST**: GraphQL for mutations, REST API for efficient data retrieval and node queries
- **Runtime Query Construction**: Builds queries dynamically based on user selections
- **Intelligent Caching**: Fresh schema on execution, cached in editor UI for performance
- **Native n8n Integration**: Uses `this.helpers.httpRequestWithAuthentication` for all API calls

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

**Current Beta Features (v0.10.0-beta.1):**
- 📎 **Attachment Management**: Upload files to Twenty CRM, attach to records (Company/Person/Task/Note/Opportunity)
- 📥 File download functionality (coming soon in beta)
- 🎯 Resource locators for easy record selection (coming soon in beta)

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
- ⚠️ Some complex object-based custom fields are work-in-progress

**Note:** The majority of custom fields are fully supported. If you encounter issues with specific custom field types, please [report them on GitHub](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues).

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

**Attachment Management** (Available in Beta - v0.10.0-beta.1)
- 📎 **Upload Files**: Upload files from n8n workflows to Twenty CRM
- 🔗 **Attach to Records**: Link files to Companies, People, Tasks, Notes, Opportunities
- 📁 **File Categorization**: Organize as Attachments, Files, or Profile Pictures
- 💾 **Binary Data Support**: Works with files from HTTP Request, Google Drive, etc.
- 🎯 **Standalone Files**: Upload files without parent records
- ⏳ **Coming Soon**: Download files, Resource Locators for easy record selection

**Install Beta to Test:**
```bash
npm install n8n-nodes-twenty-dynamic@beta
```

### Roadmap ⏳
- ⏳ Download attachments from Twenty CRM
- ⏳ Resource Locators (user-friendly record selection UI)
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
- 📝 [Changelog](CHANGELOG.md) - Version history and release notes
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


