# Developer Quickstart Guide

**Feature**: 001-dynamic-graphql-based  
**Target**: New contributors to n8n-nodes-twenty-dynamic project

---

## Prerequisites

### Required Software

1. **Node.js** 18.10.0 or higher
   - Verify: `node --version`
   - Download: https://nodejs.org/

2. **pnpm** 9.1.4 or higher (package manager)
   - Install: `npm install -g pnpm@9.1.4`
   - Verify: `pnpm --version`

3. **Git** (for version control)
   - Verify: `git --version`
   - Download: https://git-scm.com/

4. **n8n** (for testing)
   - Install globally: `npm install -g n8n`
   - Verify: `n8n --version`

5. **VS Code** (recommended IDE)
   - Download: https://code.visualstudio.com/
   - Extensions: ESLint, Prettier, TypeScript

### Required Accounts

1. **Twenty CRM Account**
   - Sign up: https://app.twenty.com (or self-hosted instance)
   - Create API key: Settings → Developers → API Keys → Generate

2. **GitHub Account** (for contributions)
   - Create: https://github.com/signup

---

## Initial Setup

### 1. Clone Repository

```powershell
# Navigate to your development folder
cd D:\Homelab

# Clone the repository
git clone https://github.com/YOUR_USERNAME/n8n-nodes-twenty-dynamic.git

# Navigate into the project
cd n8n-nodes-twenty-dynamic
```

### 2. Install Dependencies

```powershell
# Install all packages
pnpm install

# Verify installation (should show no errors)
pnpm list
```

**Expected Output**:
```
n8n-nodes-twenty-dynamic@1.0.0 D:\Homelab\n8n-nodes-twenty-dynamic
├── n8n-workflow@1.59.0 (peer)
├── typescript@5.5.3
├── @types/node@18.10.0
└── ...
```

### 3. Verify Build System

```powershell
# Compile TypeScript
pnpm build

# Check for compilation errors (should exit with code 0)
```

**Build Output** (on success):
```
> n8n-nodes-twenty-dynamic@1.0.0 build
> tsc && gulp build:icons

[10:00:00] Using gulpfile D:\Homelab\n8n-nodes-twenty-dynamic\gulpfile.js
[10:00:00] Starting 'build:icons'...
[10:00:00] Finished 'build:icons' after 50 ms
```

### 4. Link Node to n8n (Development)

```powershell
# Navigate to project root
cd D:\Homelab\n8n-nodes-twenty-dynamic

# Link package globally
pnpm link --global

# Navigate to n8n's custom nodes folder
mkdir -p $env:USERPROFILE\.n8n\custom

# Link the node into n8n
cd $env:USERPROFILE\.n8n\custom
pnpm link --global n8n-nodes-twenty-dynamic
```

**Verify Link**:
```powershell
# Check if symlink exists
dir $env:USERPROFILE\.n8n\custom
```

Should show:
```
n8n-nodes-twenty-dynamic -> D:\Homelab\n8n-nodes-twenty-dynamic
```

---

## Development Workflow

### Step 1: Start n8n in Development Mode

```powershell
# Set environment variable for debug mode
$env:N8N_LOG_LEVEL = "debug"

# Start n8n
n8n start

# n8n will run on http://localhost:5678
```

**Expected Console Output**:
```
n8n ready on 0.0.0.0, port 5678
Version: 1.x.x
Editor is now accessible via:
http://localhost:5678/
```

### Step 2: Access n8n Editor

1. Open browser: http://localhost:5678
2. Create new workflow
3. Click "+" → Search "Twenty"
4. Node should appear: "Twenty" with Twenty CRM logo

**If node doesn't appear**:
- Check `$env:USERPROFILE\.n8n\custom` symlink exists
- Restart n8n: `Ctrl+C` then `n8n start`
- Check n8n logs for errors

### Step 3: Configure Twenty CRM Credentials

1. In Twenty node, click "Credentials" → "Create New"
2. Fill in:
   - **Credential Name**: My Twenty CRM
   - **API Key**: (paste from Twenty CRM Settings → Developers)
   - **Domain**: https://app.twenty.com (or your instance URL)
3. Click "Save"
4. Click "Test Credentials" (should show ✅ success)

**Troubleshooting**:
- ❌ "Invalid API Key" → Regenerate key in Twenty CRM
- ❌ "Domain unreachable" → Check URL (no trailing slash)
- ❌ "CORS error" → Use correct domain (Twenty hosted or self-hosted)

### Step 4: Test Node Operations

**Test Create Operation**:
1. Select Resource: "Company"
2. Select Operation: "Create One"
3. Fill fields:
   - Name: Test Company
   - Industry: Technology
4. Click "Execute Node"
5. Verify output shows created record with ID

**Test List/Search Operation**:
1. Select Resource: "Company"
2. Select Operation: "List/Search"
3. Add filter:
   - Field: Industry
   - Operator: Equals
   - Value: Technology
4. Click "Execute Node"
5. Verify output shows array of matching companies

---

## Build Commands

### Development Build

```powershell
# Compile TypeScript (watch mode for auto-rebuild)
pnpm build:watch
```

**Use Case**: Keep this running in a terminal while developing. Code changes will auto-compile.

### Production Build

```powershell
# Clean build (removes old files)
pnpm clean

# Full build with type checking
pnpm build

# Output: dist/ folder with compiled JavaScript
```

### Lint & Format

```powershell
# Run ESLint (check code quality)
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Run Prettier (format code)
pnpm format
```

**Linting Rules**:
- Uses n8n-nodes-base ESLint plugin
- Enforces n8n best practices
- Requires proper displayName casing (Title Case)

---

## Testing Workflow

### Manual Testing Checklist

**For Each Operation** (Create, Get, Update, Delete, List/Search):

1. **Basic Success Path**:
   - [ ] Operation executes without errors
   - [ ] Response data structure is correct
   - [ ] Data appears in Twenty CRM UI

2. **Error Handling**:
   - [ ] Invalid record ID shows user-friendly error
   - [ ] Missing required fields shows clear message
   - [ ] Network errors are caught and displayed

3. **Dynamic UI**:
   - [ ] Resource dropdown populates with objects
   - [ ] Field inputs match schema (text, number, date, etc.)
   - [ ] Relational fields show dropdown of related records

4. **Filter Builder** (List/Search only):
   - [ ] Single filter works (industry = Technology)
   - [ ] Multiple filters work (AND logic within group)
   - [ ] Multiple filter groups work (OR logic between groups)
   - [ ] View selection applies filters correctly

5. **Schema Caching**:
   - [ ] Schema loads on first use
   - [ ] Schema uses cache on subsequent loads (<10 min)
   - [ ] Force Refresh toggle clears cache

### Constitutional Compliance Checklist

See `.specify/memory/constitution.md` for full constitutional requirements. Key checks:

**Principle 1: Dynamic Schema Discovery**:
- [ ] Node queries /metadata endpoint
- [ ] All standard + custom objects appear in dropdown
- [ ] All standard + custom fields appear in UI

**Principle 2: n8n Native Tooling**:
- [ ] Uses `this.helpers.httpRequestWithAuthentication()`
- [ ] NO axios, node-fetch, or graphql-request imports
- [ ] Authorization header added by credential system

**Principle 3: User Experience First**:
- [ ] All text uses n8n text styling (bold labels, code blocks)
- [ ] Error messages are user-friendly (not raw GraphQL errors)
- [ ] Field descriptions use placeholders/hints

**Principle 4: Relational Intelligence**:
- [ ] Relation fields show dropdown (not just text input)
- [ ] Dropdown shows name, stores ID
- [ ] Many-to-one relations work correctly

**Principle 5: Filter Builder Interface**:
- [ ] Uses fixedCollection type (not JSON text input)
- [ ] Supports AND within group, OR between groups
- [ ] All operators work (eq, gt, contains, etc.)

**Principle 6: Semantic Versioning**:
- [ ] Breaking changes increment MAJOR version
- [ ] New features increment MINOR version
- [ ] Bug fixes increment PATCH version

---

## Project Structure

```
n8n-nodes-twenty-dynamic/
├── credentials/
│   └── TwentyApi.credentials.ts      # Credential definition (API key + domain)
├── nodes/
│   └── Twenty/
│       ├── Twenty.node.ts             # Main node logic (INodeType)
│       ├── Twenty.node.json           # Node metadata (icon, display name)
│       ├── TwentyApi.client.ts        # GraphQL helper functions
│       └── twenty.svg                 # Node icon
├── specs/
│   └── 001-dynamic-graphql-based/     # Feature specification
│       ├── spec.md                    # Requirements, user stories
│       ├── plan.md                    # Implementation plan
│       ├── research.md                # Technical decisions
│       ├── data-model.md              # Entity definitions
│       └── contracts/
│           └── twenty-graphql-queries.md  # GraphQL examples
├── .specify/
│   ├── memory/
│   │   └── constitution.md            # Project governance (6 principles)
│   └── scripts/
│       └── powershell/                # Automation scripts
├── package.json                       # Dependencies, scripts, n8n config
├── tsconfig.json                      # TypeScript compiler settings
├── gulpfile.js                        # Icon copying task
└── README.md                          # Project documentation
```

---

## Key Files to Understand

### 1. `credentials/TwentyApi.credentials.ts`

**Purpose**: Defines credential UI and authentication

**Key Code**:
```typescript
export class TwentyApi implements ICredentialType {
  name = 'twentyApi';
  displayName = 'Twenty CRM API';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
    },
    {
      displayName: 'Domain',
      name: 'domain',
      type: 'string',
      default: 'https://app.twenty.com',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '={{"Bearer " + $credentials.apiKey}}',
      },
    },
  };
}
```

**What This Does**:
- Shows API Key + Domain fields in credential UI
- Automatically adds `Authorization: Bearer {apiKey}` header
- Stores credential securely in n8n's encrypted storage

### 2. `nodes/Twenty/Twenty.node.ts`

**Purpose**: Main node implementation (INodeType interface)

**Key Sections**:
```typescript
export class Twenty implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Twenty',
    name: 'twenty',
    icon: 'file:twenty.svg',
    group: ['transform'],
    version: 1,
    credentials: [{ name: 'twentyApi', required: true }],
    properties: [
      // Resource dropdown (Company, Contact, etc.)
      // Operation dropdown (Create, Get, Update, etc.)
      // Dynamic field inputs based on schema
    ],
  };

  methods = {
    loadOptions: {
      // Populate resource dropdown with objects
      async getResources(): Promise<INodePropertyOptions[]> { ... },
      
      // Populate field dropdowns with schema
      async getFields(): Promise<INodePropertyOptions[]> { ... },
    },
  };

  async execute(): Promise<INodeExecutionData[][]> {
    // 1. Get credentials
    // 2. Fetch schema (with caching)
    // 3. Build GraphQL query
    // 4. Execute via httpRequestWithAuthentication
    // 5. Transform response to workflow records
  }
}
```

### 3. `nodes/Twenty/TwentyApi.client.ts`

**Purpose**: GraphQL helper functions (shared logic)

**Key Function**:
```typescript
export async function twentyApiRequest(
  this: IExecuteFunctions,
  method: string,
  endpoint: string,
  body: any = {},
): Promise<any> {
  const credentials = await this.getCredentials('twentyApi');
  const options: IHttpRequestOptions = {
    method,
    url: `${credentials.domain}${endpoint}`,
    body,
    json: true,
  };

  try {
    const response = await this.helpers.httpRequestWithAuthentication.call(
      this,
      'twentyApi',
      options,
    );
    return response;
  } catch (error) {
    // Transform GraphQL errors to user-friendly messages
    throw new NodeApiError(this.getNode(), error);
  }
}
```

**Usage Example**:
```typescript
const result = await twentyApiRequest.call(
  this,
  'POST',
  '/graphql',
  { query: graphqlQuery, variables: graphqlVariables }
);
```

---

## Common Development Tasks

### Task 1: Add New Field Type Support

**Scenario**: Twenty CRM adds a new field type (e.g., "PHONE")

**Steps**:
1. Update schema type mapping in `TwentyApi.client.ts`:
   ```typescript
   function getFieldTypeControl(fieldType: string): string {
     switch (fieldType) {
       case 'TEXT': return 'string';
       case 'NUMBER': return 'number';
       case 'PHONE': return 'string';  // NEW
       // ...
     }
   }
   ```

2. Test with a custom object that has a phone field
3. Run lint: `pnpm lint`
4. Build: `pnpm build`
5. Test in n8n

### Task 2: Add New Operation

**Scenario**: Support "Bulk Create" operation

**Steps**:
1. Add operation to `Twenty.node.ts` properties:
   ```typescript
   {
     displayName: 'Operation',
     name: 'operation',
     type: 'options',
     options: [
       { name: 'Create One', value: 'createOne' },
       { name: 'Bulk Create', value: 'bulkCreate' },  // NEW
       // ...
     ],
   }
   ```

2. Add conditional fields for bulk operation
3. Implement GraphQL mutation logic in `execute()` method
4. Add to constitutional checklist
5. Test with multiple records

### Task 3: Debug Schema Caching Issue

**Problem**: Schema cache not clearing after 10 minutes

**Debug Steps**:
1. Add console.log to cache check:
   ```typescript
   const cachedAt = credentials.schemaCache?.cachedAt;
   const now = Date.now();
   console.log('Cache age (ms):', now - cachedAt);
   console.log('Cache valid:', now - cachedAt < 600000);
   ```

2. Restart n8n in debug mode: `$env:N8N_LOG_LEVEL = "debug"; n8n start`
3. Execute node, check n8n console output
4. Verify timestamp logic (10 min = 600000 ms)

---

## Troubleshooting Guide

### Issue: "Cannot find module 'n8n-workflow'"

**Cause**: Peer dependency not installed

**Fix**:
```powershell
pnpm install n8n-workflow@latest
```

### Issue: "Node doesn't appear in n8n"

**Cause**: Symlink not created or n8n not restarted

**Fix**:
```powershell
# Re-link node
cd D:\Homelab\n8n-nodes-twenty-dynamic
pnpm link --global

cd $env:USERPROFILE\.n8n\custom
pnpm link --global n8n-nodes-twenty-dynamic

# Restart n8n
# Ctrl+C in terminal running n8n
n8n start
```

### Issue: "ESLint errors on build"

**Cause**: Code doesn't follow n8n conventions

**Fix**:
```powershell
# Auto-fix most issues
pnpm lint:fix

# Manually fix remaining issues
# Common: displayName must be Title Case
# Example: "API key" → "API Key"
```

### Issue: "GraphQL error: Field not found"

**Cause**: Schema cache is stale (field added after cache created)

**Fix**:
1. In n8n node, toggle "Force Refresh Schema" to ON
2. Execute node (will fetch fresh schema)
3. Toggle "Force Refresh Schema" back to OFF
4. Continue normal operation

### Issue: "TypeScript compilation errors"

**Cause**: Type mismatch or missing types

**Fix**:
```powershell
# Clean build
pnpm clean
pnpm build

# Check TypeScript version matches project
pnpm list typescript
# Should be 5.5.3

# Update if needed
pnpm install typescript@5.5.3 --save-dev
```

---

## Development Best Practices

### Code Style

✅ **DO**:
- Use n8n text styling: `<strong>Bold</strong>`, `<code>code</code>`
- Handle all errors with user-friendly messages
- Use template literals for GraphQL queries
- Cache schema metadata in credential data
- Clone input items, never mutate

❌ **DON'T**:
- Import axios, node-fetch, or graphql-request
- Use raw GraphQL errors in error messages
- Hard-code object/field names (use schema metadata)
- Forget to handle null/undefined values
- Use `console.log()` in production code

### Git Workflow

**Feature Branch Pattern**:
```powershell
# Create feature branch
git checkout -b 001-dynamic-graphql-based

# Make changes, commit frequently
git add .
git commit -m "feat: add filter builder UI"

# Push to remote
git push origin 001-dynamic-graphql-based

# Create pull request on GitHub
```

**Commit Message Format**:
- `feat: add new feature` (new functionality)
- `fix: resolve bug` (bug fix)
- `docs: update README` (documentation)
- `refactor: restructure code` (no behavior change)
- `test: add test cases` (testing)

### Testing Before Commit

**Pre-commit Checklist**:
```powershell
# 1. Lint code
pnpm lint:fix

# 2. Build successfully
pnpm clean
pnpm build

# 3. Test in n8n (all operations)
n8n start
# Test each operation manually

# 4. Check constitutional compliance
# See .specify/memory/constitution.md

# 5. Commit
git add .
git commit -m "feat: your feature description"
```

---

## Resources

### n8n Documentation
- Creating Nodes: https://docs.n8n.io/integrations/creating-nodes/
- Node Basics: https://docs.n8n.io/integrations/creating-nodes/build/node-basics/
- HTTP Request Auth: https://docs.n8n.io/integrations/creating-nodes/code/http-request/

### Twenty CRM Documentation
- GraphQL API: https://docs.twenty.com/developer/graphql-api
- Authentication: https://docs.twenty.com/developer/authentication
- Metadata Objects: https://docs.twenty.com/developer/metadata

### Project Documentation
- Constitution: `.specify/memory/constitution.md`
- Feature Spec: `specs/001-dynamic-graphql-based/spec.md`
- GraphQL Examples: `specs/001-dynamic-graphql-based/contracts/twenty-graphql-queries.md`
- Best Practices: `N8N_NODE_BEST_PRACTICES.md`

### Tools
- n8n-node-linter: `npx n8n-node-linter` (validate node structure)
- TypeScript Playground: https://www.typescriptlang.org/play
- GraphQL Playground: `https://app.twenty.com/graphql` (when logged in)

---

## Getting Help

### Internal Resources
1. **Constitution**: `.specify/memory/constitution.md` - Project principles
2. **Spec**: `specs/001-dynamic-graphql-based/spec.md` - Feature requirements
3. **Research**: `specs/001-dynamic-graphql-based/research.md` - Technical decisions

### Community Support
1. **GitHub Issues**: Report bugs or request features
2. **n8n Community**: https://community.n8n.io
3. **Twenty Community**: https://discord.gg/twenty

### Quick Questions?
- Check `N8N_NODE_BEST_PRACTICES.md` for common patterns
- Review `contracts/twenty-graphql-queries.md` for GraphQL examples
- Search n8n source code: https://github.com/n8n-io/n8n

---

## Next Steps

After completing this quickstart:

1. **Explore Codebase**: Read through `Twenty.node.ts` and `TwentyApi.client.ts`
2. **Run Tests**: Execute all 5 operations (Create, Get, Update, Delete, List/Search)
3. **Review Constitution**: Understand the 6 NON-NEGOTIABLE principles
4. **Read Spec**: Familiarize yourself with user stories and requirements
5. **Start Contributing**: Pick a task from GitHub Issues or implement a new feature

**Welcome to the project! 🚀**
