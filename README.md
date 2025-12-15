# n8n-nodes-twenty-dynamic

<p align="center">
  <img src="https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png" alt="n8n-nodes-twenty-dynamic Banner" width="100%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/n8n-nodes-twenty-dynamic">
    <img src="https://img.shields.io/npm/v/n8n-nodes-twenty-dynamic.svg?style=flat-square" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/n8n-nodes-twenty-dynamic">
    <img src="https://img.shields.io/npm/dm/n8n-nodes-twenty-dynamic.svg?style=flat-square" alt="npm downloads">
  </a>
  <a href="https://github.com/Logrui/n8n-nodes-twenty-dynamic/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/n8n-nodes-twenty-dynamic.svg?style=flat-square" alt="license">
  </a>
</p>

 The most dynamic, **zero-config** integration for [Twenty CRM](https://twenty.com). Custom built n8n community node under active development modelled after the official Notion n8n node for ease of use and dynamic resource and field discovery. It automatically adapts to your Twenty instance custom schema, including custom objects and fields, without requiring node updates. It is a fork of the official Twenty CRM node and extends it with dynamic resource and field discovery.

Unlike older Twenty CRM nodes, this node **dynamically adapts** to your Twenty instance in real-time. It automatically discovers your **custom objects**, **fields**, and schema changes without requiring manual node updates or configuration. This node is backwards compatible for older Twenty CRM instances and the latest Twenty CRM instances and aligns with the direction the official team is going with the dynamic GraphQL API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Twenty CRM](https://twenty.com) is a modern, open-source CRM system built for self hosting

## Overview

| Feature | Older Nodes / Forks | **n8n-nodes-twenty-dynamic** |
| :--- | :--- | :--- |
| **Custom Objects** | ❌ Requires manual JSON inputs or HTTP Request Nodes | ✅ **Auto-discovered instantly** |
| **Custom Fields** | ❌ Often missing or raw JSON | ✅ **Native n8n inputs** for all types |
| **Performance** | 🐢 Sequential (slow) | ⚡ **Bulk Ops (10-100x faster)** |
| **System Objects** | ❌ Hidden | ✅ **Full Access** (Attachments, Metadata) |
| **Ease of Use** | 🔧 Configuration heavy | ✨ **Zero-config**, smart defaults |

---

### 🚀 Key Features

✨ **Supports Personal and Enterprise Custom Databases and Fields**: Automatically fetches all standard and custom objects from your personal Twenty instance

💎 **Support for Complex Field Types**: Template-based and dynamicinputs for FullName, Links, Currency, Address, Emails, Phones  

🔓 **Unlocks Access TwentyCRM System Databases**: View and edit system databases not normally accessible through the Twenty UI (Company/Person Attachments (attachments), Synced Email Metadata (messages), and more for advanced workflows)

🎯 **Smart Field Resolution**: Dynamic dropdowns for SELECT/MULTI_SELECT and auto-formatted inputs for specialized types  

⚡ **High-Performance Bulk Operations**: Process thousands of records with **10x-100x speed improvements** (Create, Update, Delete, Upsert)  

🧬 **Dual-API Architecture**: Utilizes both Twenty Metadata API and GraphQL introspection for complete field coverage for standard and custom fields. REST API used for execution of queries. Maintain compatibility with older Twenty CRM API structures.

---
## 📦 Installation

**For n8n Self Hosted Community Edition Instances**

1. Go to **Settings** → **Community Nodes**
2. Select **Install**
3. Enter package name: `n8n-nodes-twenty-dynamic`

### Requirements (In GEneral Works for Most N8N and Twenty CRM Self Hosted Instances)
- **Twenty CRM**: v1.4.0 or later - Supports Twenty CRM v1.11.0 (Newest Version as of 2025-12-15)
- **n8n**: v1.0.0 or later (Recommended) - Supports n8n 2.0 Beta (Newest Version as of 2025-12-15)

---

## 🔧 Configuration

### 1. Generate API Key
In your **Twenty CRM** instance:
1. Navigate to **Settings** → **Developers** → **API Keys**
2. Click **Create API Key** and copy the value

### 2. Add Credentials in n8n
1. Search for **"Twenty API"** credentials
2. Enter the following details:
   - **API Key**: The key you copied from Twenty
   - **Domain**: Your Twenty instance URL (e.g., `https://app.twenty.com` or `http://localhost:3000`)

> [!IMPORTANT]
> **Do not** include `/graphql` or `/metadata` in the domain. The node handles this automatically.
>
> ✅ Correct: `https://app.twenty.com`
> ❌ Incorrect: `https://app.twenty.com/graphql`

---
---

### About This Project

Modelled after the official Notion N8N node. Unlike traditional n8n nodes with static operations, this node **dynamically discovers** the Twenty CRM schema at runtime. It queries the Twenty REST and GraphQL APIs to automatically adapt to:
- Support for all standard and system Twenty objects (Company, Person, Opportunity, etc.)
- Support for all custom databases and fields created in your Twenty instance  
- Schema changes and updates without requiring node updates

**Key Technical Architecture:**
- **Dynamic Schema Discovery**: Queries `/metadata` endpoint to get available resources and fields
- **Hybrid GraphQL/REST**: GraphQL for mutations, REST API for efficient data retrieval and node queries
- **Runtime Query Construction**: Builds queries dynamically based on user selections
- **Intelligent Caching**: Fresh schema on execution, cached in editor UI for performance
- **Native n8n Integration**: Uses n8n's newest built-in HTTP request functionality for all API calls
- **TypeScript**: Modern, type-safe development with TypeScript
- **Zero Dependencies**: No external dependencies, pure n8n functionality

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
- ⚠️ Some complex object-based custom fields are work-in-progress - please report bugs on GitHub

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

## Development Status: Ready to Use for Majority of Operations✅

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

### Roadmap ⏳
- ⏳ Advanced filter UI improvements
- ⏳ Add support for remaining Twenty complex field types (Rating, etc.)
- ⏳ Support for Twenty "Views" and "Relations" and new AI Features
- ⏳ Support for get Database and Notion style resources


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

Compatible and tested with the newest Twenty v1.11.0 and n8n Version 2.0 Beta (Last Updated: 2025-12-15)


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


