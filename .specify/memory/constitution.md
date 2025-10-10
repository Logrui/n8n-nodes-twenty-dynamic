<!--
SYNC IMPACT REPORT:
Version: 1.0.0 → 1.1.0 (Enhanced n8n best practices integration)
Modified Principles:
  - Principle II: Enhanced with specific n8n helper method requirements
  - Principle III: Enhanced with detailed n8n UX conventions and text styling
Added Sections:
  - Enhanced n8n Node Standards with detailed text styling table
  - Expanded Code Quality standards with n8n-node-linter requirements
  - Added Error Handling and User Feedback section
  - Expanded Testing Requirements with n8n-specific scenarios
Removed Sections: None
Templates Status:
  - plan-template.md: ✅ Reviewed - Constitution Check gate aligns with new standards
  - spec-template.md: ✅ Compatible - User story format supports UX-first approach
  - tasks-template.md: ✅ Compatible - Task structure supports workflow requirements
  - N8N_NODE_BEST_PRACTICES.md: ✅ Updated - References constitution for governance
Follow-up TODOs: None
-->

# n8n-nodes-twenty-dynamic Constitution

## Core Principles

### I. Dynamic Schema Discovery (NON-NEGOTIABLE)
The node MUST automatically discover and adapt to the Twenty CRM API schema at runtime. This principle ensures the node supports custom objects and fields without requiring code changes or redeployment.

**Requirements**:
- Query Twenty's metadata/schema endpoints to discover all available resources and fields
- Dynamically construct GraphQL queries based on discovered schema
- Implement hybrid caching with configurable TTL (default: 10 minutes) to balance performance and freshness
- Provide user-accessible cache refresh mechanism ("Force Refresh Schema" toggle)
- Never hardcode resource names, field lists, or API structure

**Rationale**: Twenty CRM is highly customizable. Users create custom objects and fields frequently. A static node becomes obsolete immediately upon custom schema changes.

### II. n8n Native Tooling (NON-NEGOTIABLE)
The node MUST use n8n's built-in helpers and methods for all core operations. External dependencies MUST be minimized and justified. This is a programmatic-style node as required for GraphQL APIs.

**Requirements**:
- Use `this.helpers.httpRequestWithAuthentication()` for ALL API calls (NEVER axios, node-fetch, or graphql-request)
- Set proper request options: `method`, `baseURL`, `url`, `body`, `json: true` for automatic JSON handling
- Use n8n's credential system (`await this.getCredentials('twentyApi')`) for authentication
- Use n8n's `loadOptions` methods (`loadOptionsMethod`) for ALL dynamic dropdowns
- Use n8n's type system (`INodeType`, `INodeTypeDescription`, `IExecuteFunctions`, `ILoadOptionsFunctions`)
- Leverage `loadOptionsDependsOn` for cascading dropdown dependencies
- Use `returnFullObject: true` in typeOptions when returning structured data from loadOptions
- External dependencies permitted only when n8n provides no native alternative (must justify in code comments)

**Rationale**: Following n8n best practices ensures reliability, security, proper credential handling, consistency with the n8n ecosystem, and reduces maintenance burden. The built-in HTTP helper provides automatic authentication, error handling, and request/response transformation.

### III. User Experience First (NON-NEGOTIABLE)
The node UI MUST be intuitive, helpful, and aligned with n8n UX conventions. Complexity MUST be hidden from users who don't need it.

**Requirements**:
- Follow n8n's strict field order: Credentials (auto) → Resource → Operation → Required Fields → Optional Fields
- Field naming: Use format `<Record name> Name or ID` for ID fields (e.g., "Company Name or ID")
- Provide BOTH searchable dropdowns AND manual expression input for all ID selections
- Use consistent terminology with Twenty CRM's own UI (if Twenty says "Companies", use "Companies")
- Use `noDataExpression: true` for fields where expressions don't make sense
- Provide `description` with helpful guidance and links to n8n expression docs when applicable
- Add `hint` text for complex fields to guide users
- For relational fields, provide searchable record lists with automatic population via loadOptions
- Group optional/advanced features under collapsible `collection` type fields
- Use `displayOptions.show` to conditionally display fields based on operation/resource selection
- Preserve user input when switching operations (reuse internal `name` values across operations)
- Provide clear, actionable error messages (never expose raw API errors without context)

**Text Styling Standards** (MUST follow):
| Element | Style | Example |
|---------|-------|---------|
| Node name | Title Case | "Twenty CRM Dynamic" |
| Parameter displayName | Title Case | "Resource Name or ID" |
| Parameter name (internal) | camelCase | "resource", "operation" |
| Dropdown option name | Title Case | "Create", "Update", "List/Search" |
| Description | Sentence case | "Choose from the list, or specify an ID..." |
| Hint | Sentence case, no period for one sentence | "New custom objects may take up to 10 minutes to appear" |
| Tooltip | Sentence case, no period for one sentence | "Forces a fresh schema fetch from the API" |
| Subtitle | Expression with Title Case ops | `={{$parameter["operation"] + ": " + $parameter["resource"]}}` |

**Rationale**: The node's primary users are workflow builders, not developers. A confusing or inconsistent interface destroys productivity regardless of functionality. Following n8n conventions ensures the node feels native to the platform.

### IV. Relational Intelligence
The node MUST provide intelligent assistance for relational fields by automatically detecting and presenting related record options.

**Requirements**:
- Detect fields that reference other objects (RELATION field type)
- Automatically query and present searchable lists of available records for relational fields
- Allow both selection from list and manual ID entry for flexibility
- Handle circular references and deep relationship chains gracefully
- Cache relational data appropriately to avoid performance degradation

**Rationale**: Relational data is core to CRM systems. Forcing users to manually look up and enter UUIDs is poor UX and error-prone.

### V. Filter Builder Interface
The node MUST provide a user-friendly, structured interface for building complex queries rather than requiring raw JSON or GraphQL knowledge.

**Requirements**:
- Provide visual filter builder UI for List/Search operations
- Support AND/OR logic combinations
- Support all Twenty filter operators (eq, neq, in, contains, startsWith, etc.)
- Generate correct GraphQL filter syntax from UI inputs
- Validate filter inputs before query execution
- Provide raw/advanced mode as an escape hatch for power users (future enhancement)

**Rationale**: GraphQL filter syntax is complex and error-prone. Users should build queries visually, not by reading GraphQL documentation.

### VI. Semantic Versioning and Breaking Changes
The node version MUST follow semantic versioning. Breaking changes MUST be documented and migration paths provided.

**Requirements**:
- Version format: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes to node interface, removed operations, incompatible credential changes
- MINOR: New features, new operations, schema enhancements (backward compatible)
- PATCH: Bug fixes, performance improvements, documentation updates
- Maintain CHANGELOG.md with all version changes
- Tag releases in Git with version number
- Document migration steps for major version upgrades

**Rationale**: n8n workflows depend on stable node interfaces. Unannounced breaking changes destroy production workflows.

## n8n Node Standards

### Code Structure (MANDATORY)
```
n8n-nodes-twenty-dynamic/
├── package.json              # n8n node manifest (n8nNodesApiVersion: 1)
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js             # ESLint with n8n-nodes-base plugin
├── credentials/
│   └── TwentyApi.credentials.ts    # Credential definition
├── nodes/
│   └── Twenty/
│       ├── Twenty.node.ts          # Main node implementation (INodeType)
│       ├── TwentyApi.client.ts     # GraphQL helper functions
│       └── twenty.svg              # Node icon
└── dist/                    # Build output (gitignored)
```

**Requirements**:
- TypeScript MUST be used for all code (no JavaScript)
- All files MUST use TypeScript strict mode
- Export types for all function signatures
- Use n8n's provided types: `INodeType`, `INodeTypeDescription`, `IExecuteFunctions`, `ILoadOptionsFunctions`, `INodePropertyOptions`, `INodeExecutionData`
- Code MUST pass `n8n-node-linter` validation before ANY commit
- Code MUST pass ESLint validation with `eslint-plugin-n8n-nodes-base` rules
- Use proper type annotations (avoid `any` except where n8n types require it)

### GraphQL Implementation
- Use programmatic style (REQUIRED for GraphQL APIs, not declarative)
- Construct queries dynamically based on user input and discovered schema
- Use template literals for GraphQL query strings with proper escaping
- Include ONLY requested/needed fields in queries to minimize payload size
- Always request `id` field as it's essential for Twenty CRM operations
- Handle GraphQL errors gracefully: check `response.errors` before accessing `response.data`
- Implement pagination for List operations (limit parameter with sensible defaults)
- Use variables object for GraphQL parameters (NEVER string interpolation into query for user data)
- Example: `{ query: "query($id: ID!) { ... }", variables: { id: userId } }`

### Data Immutability (CRITICAL)
- NEVER modify incoming data directly (`this.getInputData()` is shared across workflow nodes)
- ALWAYS clone input data before transformation: `const items = [...inputItems]`
- Return new, transformed data as output from execute method
- Violation of this rule causes silent data corruption in workflows
- Each item should be processed independently and returned in new array

### Error Handling and User Feedback
- Catch all errors in execute and loadOptions methods
- Transform GraphQL/API errors into user-friendly messages
- Provide context in error messages: what operation failed, what resource, suggested fix
- Never expose raw stack traces or internal error details to users
- Use try/catch blocks around all API calls
- Example: `throw new Error('Failed to fetch companies: Company object may not exist in your Twenty workspace')`
- For loadOptions methods, return empty array on error with console warning (don't break UI)

### Performance
- Implement schema caching with TTL (default: 10 minutes) stored in credential data
- Cache relational field options per resource to avoid repeated API calls
- Avoid N+1 query patterns: batch requests when possible
- Use GraphQL field selection to request only needed data
- Implement request debouncing for loadOptions that depend on user input
- Respect Twenty API rate limits (implement exponential backoff if needed)
- Set reasonable timeouts for API requests
- Provide informative descriptions about caching: "Schema is cached for 10 minutes..."

## Development Workflow

### Planning and Task Management
- Use `.specify/` directory structure for project planning
- Follow plan-template.md for feature planning
- Break work into phases with clear deliverables
- Track progress in PLAN_V2.md or equivalent
- Mark tasks complete with verification criteria

### Code Quality (MANDATORY GATES)
- All code MUST pass TypeScript compilation with ZERO errors and ZERO warnings
- All code MUST pass ESLint validation with `eslint-plugin-n8n-nodes-base` rules
- All code MUST pass `n8n-node-linter` validation (run via `pnpm lint`)
- Use Prettier for code formatting (automated via `pnpm format`)
- Follow existing code style and patterns consistently
- Comment complex logic with WHY not WHAT, especially:
  - GraphQL query construction and dynamic field selection
  - Schema caching logic and TTL calculations
  - Filter transformation from UI to GraphQL syntax
  - Relational field detection and handling
- Use JSDoc comments for all exported functions with param and return types
- Name variables descriptively: `resourceName` not `r`, `fieldMetadata` not `fm`
- Keep functions focused and small (< 50 lines ideally)
- Extract complex logic into separate helper functions in TwentyApi.client.ts

### Testing Requirements (PRE-PUBLISH MANDATORY)
**Manual Testing Checklist** (MUST complete before ANY npm publish):

**Setup Testing**:
- [ ] Test with fresh Twenty CRM instance (standard objects only)
- [ ] Test with Twenty instance containing custom objects
- [ ] Test credential validation with valid and invalid API keys
- [ ] Test credential validation with valid and invalid domain URLs

**CRUD Operations** (test on BOTH standard and custom objects):
- [ ] Create: Verify record creation with all field types (text, number, date, relation, etc.)
- [ ] Read (Get): Verify single record retrieval by ID
- [ ] Update: Verify record updates (partial updates, all fields)
- [ ] Delete: Verify record deletion and proper error on non-existent ID
- [ ] List/Search: Verify listing with no filters, with filters, with limit

**Dynamic Schema**:
- [ ] Verify resource dropdown populates from metadata endpoint
- [ ] Verify field dropdowns update when resource changes
- [ ] Create custom object in Twenty, verify it appears after cache refresh
- [ ] Test "Force Refresh Schema" toggle functionality
- [ ] Verify schema cache persists for 10 minutes, then auto-refreshes

**Relational Fields**:
- [ ] Test relational field dropdowns populate with records
- [ ] Test creating record with relation by selecting from dropdown
- [ ] Test creating record with relation by entering ID manually
- [ ] Test handling of deleted/non-existent related records

**Filter Builder**:
- [ ] Test all filter operators (eq, neq, gt, lt, contains, startsWith, etc.)
- [ ] Test AND logic with multiple filters
- [ ] Test OR logic with filter groups
- [ ] Test complex nested AND/OR conditions
- [ ] Verify filters transform correctly to GraphQL syntax

**Error Handling**:
- [ ] Test with invalid API key (expect user-friendly error)
- [ ] Test with non-existent resource (expect helpful message)
- [ ] Test with non-existent record ID (expect clear "not found" message)
- [ ] Test with invalid field values (type mismatch)
- [ ] Test with network timeout/failure

**n8n Integration**:
- [ ] Test node in actual n8n workflow (not just in isolation)
- [ ] Test data passing between nodes (verify immutability)
- [ ] Test expression resolution in field values
- [ ] Test node with multiple input items (batching)
- [ ] Verify node subtitle displays operation + resource correctly

### Documentation (MANDATORY FOR USER-FACING CHANGES)
- Update README.md for ALL user-facing changes (new operations, new features, breaking changes)
- Update N8N_NODE_BEST_PRACTICES.md for development guidance changes
- Maintain CHANGELOG.md with version history following Keep a Changelog format
- Maintain inline code comments for complex logic (GraphQL construction, caching, filters)
- Document known limitations in README with workarounds when possible
- Provide usage examples for non-obvious features (filter builder, relational fields, views)
- Include screenshots or GIFs for complex UI interactions
- Update package.json description if node capabilities change significantly
- Reference this constitution in N8N_NODE_BEST_PRACTICES.md for governance guidance

## Governance

This constitution supersedes all other project practices and conventions. All development decisions MUST comply with these principles.

### Amendment Process
1. Propose amendment with clear rationale
2. Document impact on existing code and workflows
3. Update dependent templates and documentation
4. Increment constitution version according to semantic versioning
5. Update LAST_AMENDED_DATE

### Compliance Review
- All pull requests MUST verify compliance with constitution principles
- Complexity MUST be justified with reference to specific principles
- Violations require explicit justification or code revision
- Use N8N_NODE_BEST_PRACTICES.md for detailed runtime development guidance

### Principle Conflicts
- When principles appear to conflict, User Experience First (Principle III) takes precedence for UI decisions
- Dynamic Schema Discovery (Principle I) takes precedence for data handling decisions
- n8n Native Tooling (Principle II) takes precedence for implementation decisions

**Version**: 1.1.0 | **Ratified**: 2025-10-10 | **Last Amended**: 2025-10-10