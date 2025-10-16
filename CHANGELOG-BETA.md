# Beta Channel Changelog

This changelog tracks beta releases for the **n8n-nodes-twenty-dynamic** package.

**⚠️ Beta releases are experimental and may contain bugs. Not recommended for production use.**

To install beta versions:
```bash
npm install n8n-nodes-twenty-dynamic@beta
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
