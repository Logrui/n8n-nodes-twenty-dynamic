# Implementation Plan: Dynamic GraphQL-Based n8n Node for Twenty CRM

**Branch**: `001-dynamic-graphql-based` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-dynamic-graphql-based/spec.md`

## Summary

This plan outlines the implementation of a self-adapting n8n node for Twenty CRM that automatically discovers and adapts to the Twenty API schema at runtime. The node will query Twenty's GraphQL metadata endpoint to get all available resources and fields, then dynamically construct GraphQL queries based on user selections. This approach enables support for custom objects and fields without requiring code changes or node updates.

**Technical Approach**: Programmatic n8n node using TypeScript, n8n's native HTTP helpers for GraphQL API communication, runtime schema discovery with 10-minute TTL caching, dynamic UI generation via loadOptions methods, and visual filter builder for complex queries.

## Technical Context

**Language/Version**: TypeScript 5.5.3 (n8n requires TypeScript for all nodes)  
**Primary Dependencies**: n8n-workflow (peer dependency), n8n native HTTP helpers  
**Storage**: Runtime cache only (credential data for schema cache with 10-minute TTL)  
**Testing**: Manual testing with actual Twenty CRM instance (see constitution testing requirements)  
**Target Platform**: n8n workflow automation platform (Node.js 18.10+)  
**Project Type**: n8n community node package (single TypeScript project)  
**Performance Goals**: 
- Schema cache hit rate >90%
- Relational dropdowns load within 3 seconds for 1000 records
- Operations complete within 30 seconds
- Support 100+ records in List/Search without degradation

**Constraints**: 
- MUST use n8n's `httpRequestWithAuthentication` helper (no external HTTP libraries)
- MUST pass n8n-node-linter validation
- MUST follow n8n programmatic style (GraphQL requires it)
- Schema cache limited to credential data scope (10-minute TTL)
- No batch operations (Twenty GraphQL API limitation)

**Scale/Scope**: 
- Support unlimited custom objects (dynamically discovered)
- Handle 100-1000 records per operation
- 5 CRUD operations (Create, Get, Update, Delete, List/Search)
- Visual filter builder with AND/OR logic
- Relational field auto-population
- Twenty CRM views integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Dynamic Schema Discovery ✅ PASS
- ✅ Plan includes metadata endpoint querying for schema discovery
- ✅ GraphQL queries constructed dynamically from discovered schema
- ✅ 10-minute TTL caching strategy specified
- ✅ Force refresh mechanism included
- ✅ No hardcoded resource names or field lists

### Principle II: n8n Native Tooling ✅ PASS
- ✅ Using `this.helpers.httpRequestWithAuthentication()` for all API calls
- ✅ No external HTTP libraries (axios, node-fetch, graphql-request)
- ✅ n8n credential system for authentication
- ✅ loadOptions methods for dynamic dropdowns
- ✅ Programmatic style as required for GraphQL

### Principle III: User Experience First ✅ PASS
- ✅ Field order: Credentials → Resource → Operation → Required → Optional
- ✅ Searchable dropdowns + manual ID entry for all selections
- ✅ n8n text styling standards compliance planned
- ✅ Helpful descriptions and hints planned
- ✅ displayOptions for conditional field display
- ✅ Error messages will be user-friendly (no raw GraphQL errors)

### Principle IV: Relational Intelligence ✅ PASS
- ✅ RELATION field type detection planned
- ✅ Searchable record lists for relational fields
- ✅ Both dropdown and manual ID entry supported
- ✅ Relational data caching planned

### Principle V: Filter Builder Interface ✅ PASS
- ✅ Visual filter builder UI planned
- ✅ AND/OR logic support specified
- ✅ Multiple filter operators (eq, neq, contains, gt, lt, etc.)
- ✅ GraphQL filter syntax generation from UI

### Principle VI: Semantic Versioning ✅ PASS
- ✅ Version 0.0.10 currently (from package.json)
- ✅ CHANGELOG.md maintenance planned
- ✅ Breaking changes will be documented

### n8n Node Standards ✅ PASS
- ✅ TypeScript with strict mode
- ✅ Code structure follows n8n conventions
- ✅ n8n-node-linter validation required
- ✅ Data immutability will be preserved
- ✅ Error handling with user-friendly messages

### Code Quality Gates ✅ PASS
- ✅ TypeScript compilation with zero errors required
- ✅ ESLint validation with n8n-nodes-base plugin
- ✅ Prettier formatting automated
- ✅ JSDoc comments for exported functions

### Testing Requirements ✅ PASS
- ✅ Manual testing checklist defined in constitution
- ✅ Test with standard and custom objects
- ✅ CRUD operation verification
- ✅ Schema refresh testing
- ✅ Relational fields testing
- ✅ Filter builder testing
- ✅ Error handling testing

**GATE RESULT: ✅ ALL GATES PASSED - Proceed to Phase 0**

No constitutional violations. All principles aligned with planned implementation.

## Project Structure

### Documentation (this feature)

```
specs/001-dynamic-graphql-based/
├── plan.md              # This file (implementation plan)
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technical research and decisions
├── data-model.md        # Phase 1: Entity and schema documentation
├── quickstart.md        # Phase 1: Developer quickstart guide
├── contracts/           # Phase 1: GraphQL schema examples
│   └── twenty-graphql-queries.md
└── checklists/
    └── requirements.md  # Spec quality validation (complete)
```

### Source Code (repository root - n8n community node)

```
n8n-nodes-twenty-dynamic/
├── package.json              # n8n node manifest (n8nNodesApiVersion: 1)
├── tsconfig.json            # TypeScript configuration (strict mode)
├── .eslintrc.js             # ESLint with n8n-nodes-base plugin
├── .prettierrc.js           # Code formatting rules
├── gulpfile.js              # Build tasks (icon copying)
├── README.md                # User documentation
├── N8N_NODE_BEST_PRACTICES.md  # Development guidance
├── PLAN_V2.md               # Historical development tracking
├── credentials/
│   └── TwentyApi.credentials.ts    # API key + domain credential
├── nodes/
│   └── Twenty/
│       ├── Twenty.node.ts          # Main node (INodeType)
│       ├── Twenty.node.json        # Node metadata
│       ├── TwentyApi.client.ts     # GraphQL helper functions
│       └── twenty.svg              # Node icon
├── dist/                    # Build output (gitignored)
└── .specify/                # Spec-driven development framework
    ├── memory/
    │   └── constitution.md  # Project governance (v1.1.0)
    ├── scripts/
    │   └── powershell/      # Automation scripts
    └── templates/           # Document templates
```

**Structure Decision**: n8n community node package (single TypeScript project)

This is an n8n community node, which requires a specific structure:
- `credentials/` for authentication definitions
- `nodes/` for node implementations
- `package.json` with `n8n` section defining entry points
- Build output to `dist/` directory

The project follows n8n's programmatic node pattern (not declarative) because:
1. GraphQL APIs require programmatic style
2. Dynamic schema discovery needs runtime logic
3. Complex UI generation requires loadOptions methods
4. Filter builder requires dynamic query construction

## Complexity Tracking

*No constitutional violations - this section intentionally left empty.*

All implementation decisions align with constitutional principles. No complexity justifications required.

---

## Phase 0: Research ✅ COMPLETE

**Objective**: Resolve all technical unknowns and finalize technology stack

**Deliverable**: `research.md` (350+ lines)

**Key Decisions**:
1. ✅ HTTP Request Library: n8n native `httpRequestWithAuthentication` (constitutional requirement)
2. ✅ Schema Caching Strategy: 10-minute TTL in credential data
3. ✅ Dynamic UI Generation: `loadOptions` methods with `loadOptionsDependsOn`
4. ✅ GraphQL Query Construction: Template literals + variables for security
5. ✅ Filter Builder Implementation: `fixedCollection` type with AND/OR groups
6. ✅ Error Handling: Transform raw GraphQL errors to user-friendly messages
7. ✅ Field Type Handling: Metadata-driven UI controls (string, number, dateTime, etc.)
8. ✅ Views Integration: Query views endpoint, merge filters with AND logic
9. ✅ Data Immutability: Clone input items, return new array (never mutate)
10. ✅ Testing Approach: Manual with 40+ scenario constitutional checklist

**Technology Stack**:
- TypeScript 5.5.3 (strict mode)
- n8n-workflow (peer dependency - interfaces only)
- n8n native HTTP helpers (NO external HTTP libraries)

**Security Considerations**:
- API key storage in encrypted n8n credentials
- GraphQL injection prevention via parameterized queries
- Never log credentials or expose in error messages

**Performance Targets**:
- Schema cache hit rate >90%
- Relational dropdowns load <3s for 1000 records
- Operations complete <30s

**Status**: ✅ All technical unknowns resolved, ready for Phase 1

---

## Phase 1: Design & Contracts ✅ COMPLETE

**Objective**: Create developer onboarding and reference documentation

**Deliverables**:
1. ✅ `data-model.md` - 8 entities with relationships and validation rules
2. ✅ `contracts/twenty-graphql-queries.md` - Complete GraphQL reference (500+ lines)
3. ✅ `quickstart.md` - Developer setup guide with troubleshooting
4. ✅ GitHub Copilot instructions updated (via `update-agent-context.ps1`)

**Entity Definitions** (data-model.md):
- **Schema Metadata**: Cached object/field definitions (10-min TTL)
- **Node Configuration**: User's workflow settings (resource, operation, filters)
- **GraphQL Query**: Dynamically constructed query + variables
- **Filter Condition**: Single filter criterion (field, operator, value)
- **Filter Group**: AND-combined conditions (OR between groups)
- **Twenty CRM View**: Pre-configured filters from Twenty
- **Workflow Record**: n8n execution data (json + pairedItem)
- **Credential**: Encrypted API key + domain

**GraphQL Contracts** (contracts/):
- Metadata queries (Get Objects, Get Views)
- CRUD operations (Create, Get, Update, Delete, List/Search)
- Filter syntax reference (eq, neq, gt, lt, contains, startsWith, in, etc.)
- Relational field queries (dropdown population)
- Error response structures (authentication, validation, not found, permissions)
- HTTP request headers and authentication

**Quickstart Guide** (quickstart.md):
- Prerequisites (Node.js 18.10+, pnpm 9.1.4, n8n, Twenty CRM account)
- Initial setup (clone, install, build, link to n8n)
- Development workflow (start n8n, configure credentials, test operations)
- Build commands (watch mode, production, lint, format)
- Manual testing checklist (basic success, error handling, dynamic UI, filters, caching)
- Constitutional compliance checklist (6 principles × testing scenarios)
- Project structure walkthrough
- Key files explained (credentials, node, client helper)
- Common development tasks with examples
- Troubleshooting guide (7 common issues + fixes)
- Development best practices (code style, git workflow, pre-commit checklist)

**Agent Context Updates**:
- ✅ GitHub Copilot instructions updated with TypeScript, n8n-workflow, n8n native helpers
- Technologies: TypeScript 5.5.3 + n8n-workflow (peer dependency), n8n native HTTP helpers
- Architecture: Runtime cache only (credential data for schema cache with 10-minute TTL)
- Commands: npm test; npm run lint

**Constitution Re-evaluation**: ✅ ALL GATES STILL PASSING
- All 6 principles validated against design artifacts
- No new violations introduced
- Data model, contracts, and quickstart all align with constitutional requirements

**Status**: ✅ Design complete, developer onboarding ready, ready for implementation

---

## Next Steps

**Immediate**: Execute `speckit.tasks` command to break down implementation into actionable tasks

**Future Phases**:
- Phase 2: Implement credential definition (`TwentyApi.credentials.ts`)
- Phase 3: Implement core node structure (`Twenty.node.ts` skeleton)
- Phase 4: Implement schema discovery and caching
- Phase 5: Implement CRUD operations
- Phase 6: Implement filter builder
- Phase 7: Testing and refinement

**Ready for**: Task breakdown and implementation start

---

## Completion Summary

**Planning Status**: ✅ Complete (Phase 0 + Phase 1 finished)

**Branch**: `001-dynamic-graphql-based`

**Artifacts Created**:
- ✅ `specs/001-dynamic-graphql-based/spec.md` (190 lines - requirements, user stories, success criteria)
- ✅ `specs/001-dynamic-graphql-based/plan.md` (this file - implementation plan)
- ✅ `specs/001-dynamic-graphql-based/research.md` (350+ lines - 10 technical decisions)
- ✅ `specs/001-dynamic-graphql-based/data-model.md` (8 entities, relationships, validation rules)
- ✅ `specs/001-dynamic-graphql-based/contracts/twenty-graphql-queries.md` (500+ lines - complete GraphQL reference)
- ✅ `specs/001-dynamic-graphql-based/quickstart.md` (comprehensive developer guide)
- ✅ `.github/copilot-instructions.md` (auto-generated agent context)

**Documentation Quality**:
- Specification: ✅ All quality gates passed (zero [NEEDS CLARIFICATION] markers)
- Constitution: ✅ All 6 principles validated (v1.1.0)
- Research: ✅ All 10 technical decisions documented with rationale
- Data Model: ✅ 8 entities with attributes, relationships, validation, ERD
- Contracts: ✅ Complete GraphQL reference with examples, error handling, filter syntax
- Quickstart: ✅ Prerequisites → Setup → Development → Testing → Troubleshooting → Resources

**Readiness**: ✅ Ready for task breakdown and implementation

**Command to Start Implementation**: `speckit.tasks` (break down into actionable coding tasks)
