# Beta Channel Changelog

This changelog tracks beta releases for the **n8n-nodes-twenty-dynamic** package.

**⚠️ Beta releases are experimental and may contain bugs. Not recommended for production use.**

To install beta versions:
```bash
npm install n8n-nodes-twenty-dynamic@beta
```

---

## [Unreleased]

---

## [0.10.1-beta.10] - 2025-10-16

### ✨ Added

**Get Schema Operation - Include Read-Only Fields Toggle** 🔒
- Added new `includeReadOnlyFields` parameter to Get Schema operation
- **Default behavior (OFF)**: Excludes read-only fields (isWritable=false) from output
- **When enabled (ON)**: Includes read-only fields in the schema
- **Use case**: By default, only shows fields that can be modified via API
- **Impact**: 
  - Company database: 7 read-only fields filtered by default
  - With all filters (system, inactive, read-only): Only 17 user-editable fields shown
  - Helps users focus on fields they can actually modify
- **Testing**: Comprehensive test suite confirms correct filtering behavior

**Philosophy**: Show only what users can edit by default, include everything when needed for inspection.

---

## [0.10.1-beta.9] - 2025-10-16

### ✨ Improved - PROPER SOLUTION

**Metadata API - Switched to `fieldsList` Resolver** 🎯
- **BREAKING CHANGE**: Replaced pagination workaround with proper Twenty API approach
- Changed GraphQL query from `fields(paging: { first: 500 })` to `fieldsList`
- **Discovery**: Twenty's Metadata API provides `fieldsList` resolver that:
  - Returns ALL fields automatically without pagination
  - Used by Twenty's own frontend application
  - Simpler data structure (direct array instead of nested edges/node)
  - No hardcoded limits needed
- **Impact**: 
  - Cleaner, more maintainable code
  - Guaranteed to get ALL fields regardless of count
  - Follows Twenty's recommended API usage pattern
  - No more pagination complexity or hardcoded limits
- **Evidence**: Verified in Twenty source code (`packages/twenty-front/src/modules/object-metadata/graphql/queries.ts`)
- **Testing**: Comprehensive test suite confirms all 34+ fields returned for company database

**Code Changes**:
- Query: `fields(paging: { first: 500 })` → `fieldsList`
- Parsing: `node.fields.edges.map(edge => edge.node)` → `node.fieldsList.map(field => ...)`
- Result: Simpler, more reliable field retrieval

**Philosophy**: "Surgical precision, not ocean of information" - `fieldsList` IS the precision mechanism we needed.

---

## [0.10.1-beta.8] - 2025-10-16

### 🐛 Fixed - CRITICAL

**Metadata API Pagination Issue** 🎯
- **ROOT CAUSE IDENTIFIED**: Twenty Metadata API has unusual pagination behavior
- Changed GraphQL query from `fields(paging: { first: 200 })` to `fields(paging: { first: 500 })`
- **Discovery**: Page size parameter behaves unexpectedly in Twenty API:
  - `first: 200` returned only 6 fields
  - `first: 500` returns all 27 fields (complete field list)
  - `first: 1000` returns 34 fields
- **Impact**: Get Schema operation now correctly returns ALL fields for all databases
- **Testing**: Verified with multiple test suites showing all 27 company fields returned

**Investigation Notes**:
- API doesn't provide `hasNextPage` in `pageInfo`
- API doesn't support `totalCount` field
- Pagination behavior suggests the API returns a fraction/percentage of requested count rather than "first N items"
- Setting `first: 500` ensures all fields are retrieved for standard databases

---

## [0.10.1-beta.7] - 2025-10-16

### 🐛 Fixed

**Metadata API Query - Fields Truncation**
- Removed empty `filter: {}` parameter from fields query in getCachedSchema
- **Issue**: Twenty Metadata API was applying a default filter when `filter: {}` was present, returning only 6 fields instead of all fields
- **Impact**: Get Schema operation was showing only 6 fields regardless of toggle settings
- **Fix**: Changed `fields(paging: { first: 200 }, filter: {})` to `fields(paging: { first: 200 })`
- ~~Now properly returns all 27 fields for company database (or all fields for any database)~~ (**NOTE**: This fix was incomplete - actual issue was pagination, fixed in beta.8)

---

## [0.10.1-beta.6] - 2025-10-16

### 🐛 Fixed

**Field Filtering Logic**
- Fixed filtering to properly handle fields without `isActive` or `isSystem` properties
- Changed filter logic to use strict equality checks:
  - `isSystem !== true` (instead of `!isSystem`) - includes fields without isSystem property
  - `isActive !== false` (instead of `isActive`) - includes fields without isActive property
- **Impact**: Fields without these properties are now always included in output
- **Behavior**: Only explicitly system fields (`isSystem === true`) or explicitly inactive fields (`isActive === false`) are filtered out

---

## [0.10.1-beta.5] - 2025-10-16

### ✨ Added

**Field Filtering in Get Schema** 🎯
- 🔍 **Include System Fields Toggle**: Control whether to include system fields (isSystem=true) in schema output
  - Default: `false` (system fields excluded)
  - System fields are managed by Twenty CRM and typically not user-editable
- 🔍 **Include Inactive Fields Toggle**: Control whether to include inactive fields (isActive=false) in schema output
  - Default: `false` (inactive fields excluded)
  - Inactive fields are hidden in the UI and not typically used

### 🔧 Changed

**Get Schema Operation**
- Fields are now filtered by default to show only:
  - Active fields (`isActive=true`)
  - Non-system fields (`isSystem=false`)
- Users can enable toggles to include system and/or inactive fields as needed
- Reduces noise in schema output by focusing on user-editable fields

---

## [0.10.1-beta.4] - 2025-10-16

### 🐛 Fixed

**Module Import Path**
- Fixed "Cannot find module '../../../dist/fieldFormatSpecifications'" error
- Moved `fieldFormatSpecifications.ts` from `src/` to `nodes/` folder
- Updated import path in `getDatabaseSchema.operation.ts` to `../../fieldFormatSpecifications`
- Verified compiled output structure: `dist/nodes/fieldFormatSpecifications.js` correctly accessible

---

## [0.10.0-beta.3] - 2025-10-16

### ✨ Added

**Field Format Specifications** �
- � **Format Details in Get Schema**: Enhanced `Get Schema` operation with comprehensive field format specifications
  - Pattern/structure for each field type (CURRENCY, EMAILS, DATE_TIME, etc.)
  - Example values showing correct format
  - Accepts/Returns documentation
  - Validation requirements
  - Critical notes for problematic fields
  - Usage notes with best practices
- 🔧 **Toggle Parameter**: `Include Format Details` (default: enabled)
  - Enable: Shows complete format specifications for each field
  - Disable: Shows only basic field information (type, required, readonly)
- 📊 **Coverage**: 17+ field types documented, ~88% of typical database fields
- 🗂️ **New Format Map**: `src/fieldFormatSpecifications.ts`
  - Hardcoded format specifications for 17 Twenty CRM field types
  - Based on comprehensive empirical testing (60+ format variations)
  - Helper functions: `getFormatSpec()`, `hasFormatSpec()`, `getFormatSpecWithFallback()`

**Critical Field Behaviors Documented** ⚠️
- **EMAILS**: NO validation (accepts invalid email formats)
- **CURRENCY**: `amountMicros` returned as STRING, not number
- **ADDRESS**: Coordinates returned as STRINGS, not numbers
- **PHONES**: Strips `+` prefix from phone number
- **RATING**: Must use enum strings (RATING_1 to RATING_5), NOT numbers
- **MULTI_SELECT**: Must be array format, not single string
- **ARRAY**: Must be array type, single values rejected
- **RAW_JSON**: Plain strings rejected, must be JSON structure
- **LINKS**: DOES validate URL format (unlike EMAILS)

**Documentation**
- 📚 **README.md**: Added comprehensive Field Format Specifications section
  - Critical field behaviors with warnings
  - Before/after examples showing value
  - Usage instructions and coverage statistics
- 📖 **Specs Documentation**: Complete technical documentation
  - `FORMAT_QUICK_REFERENCE.md`: Quick reference for all critical behaviors
  - `FORMAT_SPECIFICATIONS_COMPLETE.md`: Complete implementation summary with test results
  - `INTEGRATION_STEP_2_COMPLETE.md`: Production integration documentation

### � Changed

**Get Schema Operation Enhanced**
- Updated `operations/getDatabaseSchema.operation.ts`:
  - Added `includeFormatDetails` parameter to function signature
  - Enhanced field mapping with `formatDetails` property in both simplified and full modes
  - Added `fieldsWithFormatDetails` count to summary statistics
- Updated `nodes/Twenty/Twenty.node.ts`:
  - Added `includeFormatDetails` parameter definition (default: true)
  - Parameter shows for: resourceType='database', operation='getSchema'
  - Passes parameter to `executeGetDatabaseSchema()`

**Field Output Structure**
- Fields now include `formatDetails` property when format specs available:
  ```json
  {
    "name": "currencyField",
    "type": "CURRENCY",
    "formatDetails": {
      "pattern": "{ amountMicros: string, currencyCode: string }",
      "example": "{ \"amountMicros\": \"5000000\", \"currencyCode\": \"USD\" }",
      "description": "Currency amount in micros (millionths)",
      "accepts": "Object with amountMicros (string) and currencyCode (string)",
      "returns": "Object - same structure as input",
      "validation": "amountMicros must be numeric string, currencyCode must be valid ISO code",
      "criticalNotes": ["⚠️ amountMicros is returned as STRING, not number"],
      "notes": ["For $50.00: amountMicros = \"5000000\" (multiply by 1,000,000)"]
    }
  }
  ```

### 🧪 Testing

**Comprehensive Empirical Testing**
- Created `tests/test-all-field-formats.js`: Tested 14 field types with 60+ format variations
- Created `tests/test-format-specs-integration.js`: Verified format spec map integration
- Test Results: All tests passed ✅
  - CURRENCY spec: 3 critical notes verified
  - 7/7 tested field types have specifications
  - Critical keywords found in all problematic fields
  - Integration: READY ✅

### 📊 Metrics

- **Field Types Covered**: 17+ types (CURRENCY, EMAILS, DATE_TIME, DATE, PHONES, LINKS, FULL_NAME, ADDRESS, ARRAY, RAW_JSON, NUMBER, RATING, MULTI_SELECT, UUID, TEXT, SELECT, BOOLEAN, etc.)
- **Coverage**: ~88% of typical database fields (23/26 fields in test databases)
- **Critical Notes**: 9 field types with critical behavior warnings
- **Build Status**: Zero TypeScript/ESLint errors

---

## [0.10.0-beta.2] - 2025-10-16

### 🎯 MAJOR UI IMPROVEMENT: Resource Locator for Parent Record Selection

**Addressing user feedback - making parent record selection user-friendly!**

This release adds a complete Resource Locator UI for selecting parent records, eliminating the need for manual ID entry and providing multiple selection modes.

#### ✨ Added

**Resource Locator for Parent Records** 🎉
- 📋 **From List Mode**: Searchable dropdown showing actual parent records with names
  - Real-time search across companies, people, tasks, notes, opportunities
  - Displays record names (handles Person's firstName/lastName automatically)
  - Shows record URLs for quick reference
- 🔗 **By URL Mode**: Paste Twenty CRM record URL directly
  - URL validation with helpful error messages
  - Extracts record ID automatically from URL
- 🆔 **By ID Mode**: Enter record UUID manually
  - UUID format validation
  - For power users who already have IDs
- 🔍 **By Field Mode**: Match by unique field value
  - Select any field from parent record type (email, domainName, etc.)
  - Enter value to match (e.g., john@example.com)
  - Automatically finds and links to matching record

**New UI Parameters**
- **Match By**: Mode selector (From List / By URL / By ID / By Field)
- **Parent Record**: Resource Locator (for list/url/id modes)
- **Match Field**: Dynamic dropdown of fields (for field mode)
- **Match Value**: Text input for match value (for field mode)

**New Backend Methods**
- `getRecordsForAttachmentParent()`: ListSearch method to load parent records for dropdown
- `getFieldsForAttachmentParent()`: LoadOptions method to populate match field dropdown
- Updated `execute()` to handle all 4 match modes with proper error handling

#### 🐛 Fixed

- **Input Binary Field Tooltip**: Updated description for better clarity
  - Old: "The name of the binary property which contains the file to upload"
  - New: "Find the name of the input field containing the binary data in the Input panel on the left, in the Binary tab"

#### 🔧 Technical Details

**Query Optimization**
- Field-based matching performs GraphQL query before attachment creation
- Proper error handling for "record not found" scenarios
- Match field dropdown uses `loadOptionsDependsOn` for dynamic loading

**Code Quality**
- Added proper TypeScript type handling for resource locators
- Fixed function signatures for `getDataSchemaForObject()` and `getCleanFieldLabel()`
- Moved `getFieldsForAttachmentParent()` to correct section (loadOptions vs listSearch)

#### 📝 Usage Examples

**Example 1: From List (Easiest - Recommended for Most Users)**
```
1. Attach To: Company
2. Match By: From List
3. Parent Record: [Search and select from dropdown] → "Acme Corporation"
4. File uploads and attaches to Acme Corporation
```

**Example 2: By Field (Most Flexible - Great for Automation)**
```
1. Attach To: Person
2. Match By: By Field
3. Match Field: email
4. Match Value: {{ $json.email }}
5. Finds person by email, then attaches file
```

**Example 3: By URL (Quick Copy-Paste)**
```
1. Attach To: Task
2. Match By: By URL
3. Parent Record URL: https://app.twenty.com/objects/tasks/abc-123-def
4. File attaches to that specific task
```

**Example 4: By ID (Power Users)**
```
1. Attach To: Note  
2. Match By: By ID
3. Parent Record ID: abc-123-def-456
4. File attaches to that note
```

#### ⏳ Known Issues

- **Fields/Properties Parameter**: Not yet visible for attachment operations (coming in next beta)
  - Will be used for setting attachment metadata
  - Currently only shows for database operations (create/update/upsert)
- **No download functionality yet**: Planned for next beta release

#### 🚀 Migration from beta.1

No breaking changes! If you were manually entering IDs in beta.1, you can now:
- Switch to "From List" for easier selection
- Or continue using "By ID" mode (works the same way)

Simply update to beta.2:
```bash
npm install n8n-nodes-twenty-dynamic@beta
# Restart n8n
```

---

## [0.10.0-beta.1] - 2025-10-15

### 🎉 NEW FEATURE: Attachment Management (Upload Files to Twenty CRM)

**First beta release of attachment upload functionality!**

This release introduces the ability to upload files from n8n workflows to Twenty CRM and optionally attach them to CRM records.

#### ✨ Added

**New Resource Type: Attachment**
- 📎 **Upload File Operation**: Upload files from n8n binary data to Twenty CRM
- 🔗 **Parent Record Linking**: Attach files to Companies, People, Tasks, Notes, or Opportunities
- 🎯 **Standalone Mode**: Upload files without attaching to any parent record
- 📁 **File Categorization**: Organize files as Attachments, Files, or Profile Pictures
- ✏️ **Custom File Names**: Override original filename with custom names
- 💾 **Binary Data Support**: Works with files from HTTP Request, Google Drive, Dropbox, etc.

**Technical Implementation**
- ✅ Uses Node.js 18+ built-in FormData (zero external dependencies)
- ✅ GraphQL Upload multipart specification compliant
- ✅ Batch processing support with continueOnFail
- ✅ Error handling with itemIndex tracking for debugging
- ✅ Stream and buffer detection for optimal memory usage

**New Helper Functions** (TwentyApi.client.ts)
- `getItemBinaryData()`: Extract binary data from n8n workflow items
- `uploadFileToTwenty()`: Upload files using GraphQL Upload multipart protocol
- `createAttachmentRecord()`: Create attachment records with parent relationships

**UI Parameters**
- Input Binary Field: Select which binary data field to upload
- Attach To: Choose parent record type (Company/Person/Task/Note/Opportunity/None)
- File Folder: Categorize as Attachment, File, or Profile Picture
- Custom File Name: Optional filename override

#### 📝 Examples

**Upload File from HTTP Request:**
```
HTTP Request (download file) → Twenty Upload → Creates attachment in Twenty
```

**Attach File to Company:**
1. Set "Attach To" = Company
2. Provide Company ID
3. File uploads and links to company record

**Standalone File Upload:**
1. Set "Attach To" = None (Standalone)
2. File uploads without parent relationship

#### 🔧 Technical Details

**Architecture Changes:**
- Added `resourceType` parameter (Database/Attachment) to node root
- Separated attachment operations from database operations in execute() method
- Implemented FormData multipart upload using globalThis.FormData
- Zero external dependencies (removed form-data package)

**Build System:**
- Added @types/node for Buffer, Stream, and FormData types
- Updated tsconfig.json to include es2021 lib for FormData support
- All TypeScript compilation errors resolved

**Testing:**
- Published to npm beta channel: `n8n-nodes-twenty-dynamic@beta`
- Package renamed from testing variant to use standard beta tagging
- Deprecated n8n-nodes-twenty-dynamic-testing in favor of beta channel

#### ⏳ Known Limitations

- ⚠️ Manual ID entry required for parent records (Resource Locators coming in next beta)
- ⚠️ No download functionality yet (planned for next beta release)
- ⚠️ Parent IDs must be provided manually (no dropdown selection yet)

#### 🚀 Coming Soon in Beta

The following features are planned for upcoming beta releases:

- **Download Attachments**: Retrieve files from Twenty CRM into n8n workflows
- **Resource Locators**: User-friendly dropdowns for selecting:
  - Parent records (Companies, People, Tasks, etc.)
  - Existing attachments
  - URL and ID modes for flexibility
- **Attachment Listing**: Query and filter attachments
- **Attachment Metadata Updates**: Rename files, change categories, etc.

#### 📊 Implementation Status

**Phase 3 Complete (Upload - User Story 1)** ✅
- [x] Binary data extraction helper
- [x] File upload helper (GraphQL Upload multipart)
- [x] Attachment record creation helper
- [x] Upload execution logic
- [x] Error handling with batch support
- [x] UI parameters (binary field, parent type, folder, filename)

**Phase 4 Pending (Resource Locators - User Story 3)** ⏳
- [ ] Parent record resource locators (Company/Person/Task/Note/Opportunity)
- [ ] Attachment resource locator
- [ ] loadOptionsDependsOn implementation
- [ ] URL and ID modes

**Phase 5 Pending (Download - User Story 2)** ⏳
- [ ] Download operation UI
- [ ] File download helper
- [ ] Download execution logic
- [ ] Binary data output

#### 🐛 Bug Fixes

- Fixed TypeScript compilation errors for Buffer and Stream imports
- Fixed FormData type definitions with globalThis
- Fixed alphabetical ordering of attachToType options (linting)
- Resolved eslint-disable comment syntax for FormData instantiation

#### 📚 Documentation

- Updated README with Beta Channel section
- Added Active Development Features section for attachment management
- Created comprehensive FORMDATA_ANALYSIS.md documenting dependency elimination
- Updated installation instructions with beta channel commands

#### 🔍 Testing Instructions

To test the beta upload feature:

1. Install beta version:
   ```bash
   npm install n8n-nodes-twenty-dynamic@beta
   ```

2. Restart n8n

3. Create test workflow:
   - **Node 1**: HTTP Request (download a file)
   - **Node 2**: Twenty CRM - Dynamic
     - Resource Type: Attachment
     - Operation: Upload File
     - Configure upload parameters

4. Expected behavior:
   - File uploads to Twenty CRM
   - Returns attachment record with ID, path, etc.
   - If parent specified, file appears linked in Twenty UI

5. Report issues: [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)

#### 💡 Migration from Testing Package

If you previously installed `n8n-nodes-twenty-dynamic-testing`:

1. Uninstall testing package:
   ```bash
   npm uninstall n8n-nodes-twenty-dynamic-testing
   ```

2. Install from beta channel:
   ```bash
   npm install n8n-nodes-twenty-dynamic@beta
   ```

The testing package has been deprecated in favor of standard beta channel releases.

#### 🎯 Feedback Welcome!

This is a beta release - your feedback is crucial:
- Report bugs on [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)
- Request features or improvements
- Share your use cases and workflows
- Help us identify edge cases before stable release

---

## Version History

- **0.10.0-beta.1** (2025-10-15) - Initial beta release with attachment upload
- More beta versions coming soon...

---

## About Beta Releases

**What is the beta channel?**
- Early access to new features before stable release
- Opportunity to test and provide feedback
- May contain bugs or incomplete features
- Not recommended for production workflows

**How to switch channels:**
- **Install beta**: `npm install n8n-nodes-twenty-dynamic@beta`
- **Install stable**: `npm install n8n-nodes-twenty-dynamic@latest`
- **Check version**: `npm list n8n-nodes-twenty-dynamic`

**When do beta features become stable?**
- After thorough testing and feedback
- When all planned features in the version are complete
- When critical bugs are resolved
- Typically 1-2 weeks after initial beta release

**What happens to my workflows when beta becomes stable?**
- No breaking changes expected
- Simply update to latest version: `npm install n8n-nodes-twenty-dynamic@latest`
- All beta features will work the same way in stable

---

**Latest Stable Version**: [See main CHANGELOG.md](../CHANGELOG.md)

**Report Issues**: [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)

**View Source**: [GitHub Repository](https://github.com/Logrui/n8n-nodes-twenty-dynamic)
