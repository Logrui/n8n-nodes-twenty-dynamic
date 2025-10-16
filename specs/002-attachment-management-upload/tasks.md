# Tasks: Attachment Management for Twenty CRM n8n Node

**Input**: Design documents from `/specs/002-attachment-management-upload/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-operations.md, research.md, quickstart.md  

**Tests**: Manual testing only (n8n node testing framework limitations - documented in quickstart.md)  

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**⚠️ CRITICAL UI REQUIREMENT**: ResourceLocator MUST be used for ALL record/attachment selections in the new operations. This includes:
- Parent record selection (Company, Person, Task, Note, Opportunity) - T016
- Attachment selection for download operation - T018
- ResourceLocator provides 3 modes: From List (dropdown), By URL (paste URL), By ID (manual UUID)
- This follows constitution Principle III (User Experience First) and provides both novice and power-user workflows

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- Single project structure at repository root: `n8n-nodes-twenty-dynamic/`
- Node implementation: `nodes/Twenty/Twenty.node.ts`
- API client: `nodes/Twenty/TwentyApi.client.ts`
- Documentation: `README.md`, `CHANGELOG.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] **T001** [P] ~~Add form-data dependency to `package.json`~~ - **SKIPPED**: Using Node.js 18+ built-in FormData instead (no external dependency needed)
- [X] **T002** [P] Update package version in `package.json` - Change version from `0.9.32` to `0.10.0` (MINOR bump for new feature)
- [X] **T003** ~~Install dependencies~~ - **SKIPPED**: No new dependencies to install

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] **T004** Add Resource Group parameter to `nodes/Twenty/Twenty.node.ts` - Insert at top of properties array before operation selector:
  ```typescript
  {
    displayName: 'Resource',
    name: 'resourceType',
    type: 'options',
    noDataExpression: true,
    options: [
      { name: 'Database', value: 'database' },
      { name: 'Attachment', value: 'attachment' }
    ],
    default: 'database',
    description: 'The type of resource to work with'
  }
  ```

- [X] **T005** Update all existing Database field displayOptions in `nodes/Twenty/Twenty.node.ts` - Add `show: { resourceType: ['database'] }` to every existing property's displayOptions to maintain backward compatibility

- [X] **T006** Add Attachment Operation selector in `nodes/Twenty/Twenty.node.ts` - Add after Resource Group:
  ```typescript
  {
    displayName: 'Operation',
    name: 'attachmentOperation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resourceType: ['attachment'] } },
    options: [
      { name: 'Upload File', value: 'uploadFile', description: 'Upload a file to Twenty CRM' },
      { name: 'Download File', value: 'downloadFile', description: 'Download an attachment from Twenty CRM' }
    ],
    default: 'uploadFile'
  }
  ```

- [X] **T007** [P] Implement getItemBinaryData() helper in `nodes/Twenty/TwentyApi.client.ts` - Extract binary data from n8n item with stream vs buffer detection (reference: Google Drive v2 pattern from research.md):
  ```typescript
  export async function getItemBinaryData(
    this: IExecuteFunctions,
    itemIndex: number,
    propertyName: string
  ): Promise<{ content: Buffer | Readable; fileName: string; mimeType: string; fileSize: number }> {
    const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
    
    if (binaryData.id) {
      // Large file: stream from disk
      const stream = await this.helpers.getBinaryStream(binaryData.id);
      const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
      return {
        content: stream,
        fileName: binaryData.fileName,
        mimeType: binaryData.mimeType,
        fileSize: metadata.fileSize
      };
    } else {
      // Small file: buffer from memory
      const buffer = Buffer.from(binaryData.data, 'base64');
      return {
        content: buffer,
        fileName: binaryData.fileName,
        mimeType: binaryData.mimeType,
        fileSize: buffer.length
      };
    }
  }
  ```

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload File to Twenty CRM (Priority: P1) 🎯 MVP

**Goal**: Enable users to upload files from n8n workflows to Twenty CRM and attach them to CRM records

**Independent Test**: Connect a file source node (HTTP Request, Google Drive) to Twenty node, upload a file, verify it appears in Twenty CRM's file storage and is attached to the specified CRM record

### Implementation for User Story 1

- [ ] **T008** [P] [US1] Add "Input Binary Field" parameter in `nodes/Twenty/Twenty.node.ts` - Binary data input field selector:
  ```typescript
  {
    displayName: 'Input Binary Field',
    name: 'inputDataFieldName',
    type: 'string',
    displayOptions: {
      show: {
        resourceType: ['attachment'],
        attachmentOperation: ['uploadFile']
      }
    },
    default: 'data',
    required: true,
    description: 'The name of the binary property which contains the file to upload',
    hint: 'The binary data will be taken from the field specified here'
  }
  ```

- [ ] **T009** [P] [US1] Add "Attach To" parameter in `nodes/Twenty/Twenty.node.ts` - Parent record type selector:
  ```typescript
  {
    displayName: 'Attach To',
    name: 'attachToType',
    type: 'options',
    displayOptions: {
      show: {
        resourceType: ['attachment'],
        attachmentOperation: ['uploadFile']
      }
    },
    options: [
      { name: 'Company', value: 'company' },
      { name: 'Person', value: 'person' },
      { name: 'Task', value: 'task' },
      { name: 'Note', value: 'note' },
      { name: 'Opportunity', value: 'opportunity' },
      { name: 'None (Standalone)', value: 'none' }
    ],
    default: 'company',
    description: 'The type of record to attach the file to'
  }
  ```

- [ ] **T010** [P] [US1] Add "File Folder" parameter in `nodes/Twenty/Twenty.node.ts` - File categorization:
  ```typescript
  {
    displayName: 'File Folder',
    name: 'fileFolder',
    type: 'options',
    displayOptions: {
      show: {
        resourceType: ['attachment'],
        attachmentOperation: ['uploadFile']
      }
    },
    options: [
      { name: 'Attachment', value: 'Attachment' },
      { name: 'File', value: 'File' },
      { name: 'Profile Picture', value: 'ProfilePicture' }
    ],
    default: 'Attachment',
    description: 'The folder category for file organization in Twenty CRM'
  }
  ```

- [ ] **T011** [P] [US1] Add "Custom File Name" parameter (optional) in `nodes/Twenty/Twenty.node.ts`:
  ```typescript
  {
    displayName: 'Custom File Name',
    name: 'fileName',
    type: 'string',
    displayOptions: {
      show: {
        resourceType: ['attachment'],
        attachmentOperation: ['uploadFile']
      }
    },
    default: '',
    description: 'Custom filename to use instead of the original filename. Leave empty to use original.',
    placeholder: 'e.g. contract-2025.pdf'
  }
  ```

- [ ] **T012** [US1] Implement uploadFileToTwenty() in `nodes/Twenty/TwentyApi.client.ts` - Upload file using FormData multipart (reference: Google Cloud Storage pattern from research.md):
  ```typescript
  export async function uploadFileToTwenty(
    this: IExecuteFunctions,
    itemIndex: number,
    content: Buffer | Readable,
    fileName: string,
    mimeType: string,
    fileSize: number,
    fileFolder: string
  ): Promise<{ path: string; token: string }> {
    const FormData = require('form-data');
    const form = new FormData();
    
    const query = `mutation uploadFile($file: Upload!) { uploadFile(file: $file) { paths tokens } }`;
    
    form.append('operations', JSON.stringify({
      query,
      variables: { file: null }
    }));
    
    form.append('map', JSON.stringify({ '0': ['variables.file'] }));
    
    form.append('0', content, {
      filename: fileName,
      contentType: mimeType,
      knownLength: fileSize  // Critical for streams
    });
    
    const response = await this.helpers.httpRequestWithAuthentication.call(
      this,
      'twentyApi',
      {
        method: 'POST',
        url: '/graphql',
        body: form,
        headers: {
          ...form.getHeaders(),
          'Content-Length': form.getLengthSync()
        }
      }
    );
    
    if (response.errors) {
      throw new NodeOperationError(
        this.getNode(),
        `Upload failed: ${response.errors[0].message}`,
        { itemIndex }
      );
    }
    
    return {
      path: response.data.uploadFile.paths[0],
      token: response.data.uploadFile.tokens[0]
    };
  }
  ```

- [ ] **T013** [US1] Implement createAttachmentRecord() in `nodes/Twenty/TwentyApi.client.ts` - Create attachment record linking file to parent:
  ```typescript
  export async function createAttachmentRecord(
    this: IExecuteFunctions,
    itemIndex: number,
    filePath: string,
    fileName: string,
    mimeType: string,
    parentType: string,
    parentId: string | null
  ): Promise<any> {
    const data: any = {
      name: fileName,
      fullPath: filePath,
      type: mimeType
    };
    
    // Add parent relationship if specified
    if (parentId && parentType !== 'none') {
      const parentField = `${parentType}Id`;
      data[parentField] = parentId;
    }
    
    const query = `
      mutation createAttachment($data: AttachmentCreateInput!) {
        createAttachment(data: $data) {
          id
          name
          fullPath
          type
          createdAt
          ${parentType !== 'none' ? `${parentType}Id` : ''}
        }
      }
    `;
    
    const response = await this.helpers.httpRequestWithAuthentication.call(
      this,
      'twentyApi',
      {
        method: 'POST',
        url: '/graphql',
        body: { query, variables: { data } },
        json: true
      }
    );
    
    if (response.errors) {
      throw new NodeOperationError(
        this.getNode(),
        `Failed to create attachment: ${response.errors[0].message}`,
        { itemIndex }
      );
    }
    
    return response.data.createAttachment;
  }
  ```

- [ ] **T014** [US1] Add Upload File execution logic to execute() method in `nodes/Twenty/Twenty.node.ts` - Handle upload operation in main execution flow:
  ```typescript
  // In execute() method, add case for attachment resource type
  if (resourceType === 'attachment') {
    if (attachmentOperation === 'uploadFile') {
      const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i) as string;
      const attachToType = this.getNodeParameter('attachToType', i) as string;
      const fileFolder = this.getNodeParameter('fileFolder', i) as string;
      const customFileName = this.getNodeParameter('fileName', i, '') as string;
      
      // Extract binary data
      const { content, fileName, mimeType, fileSize } = await getItemBinaryData.call(
        this,
        i,
        inputDataFieldName
      );
      
      const finalFileName = customFileName || fileName;
      
      // Upload file
      const { path, token } = await uploadFileToTwenty.call(
        this,
        i,
        content,
        finalFileName,
        mimeType,
        fileSize,
        fileFolder
      );
      
      let result: any = { path, token, fileName: finalFileName };
      
      // Create attachment record if parent specified
      if (attachToType !== 'none') {
        const parentId = this.getNodeParameter(`${attachToType}Id`, i) as string;
        const attachment = await createAttachmentRecord.call(
          this,
          i,
          path,
          finalFileName,
          mimeType,
          attachToType,
          parentId
        );
        result = attachment;
      }
      
      returnData.push({ json: result });
    }
  }
  ```

- [ ] **T015** [US1] Add error handling for binary data validation in `nodes/Twenty/Twenty.node.ts` - Wrap upload logic in try-catch with clear error messages including itemIndex

**Checkpoint**: At this point, User Story 1 (Upload File) should be fully functional and testable independently. Users can upload files to Twenty CRM with or without attaching to parent records.

---

## Phase 4: User Story 3 - Resource Locators (Priority: P2)

**Goal**: Provide user-friendly interface for selecting CRM records and attachments without manual ID lookup

**Independent Test**: Open node configuration UI, verify dropdowns populate with real Twenty CRM data (company names, attachment filenames), verify URL and ID modes work correctly

**Note**: US3 implemented before US2 because US2 (Download) depends on attachment selection UI from US3

### Implementation for User Story 3

- [ ] **T016** [P] [US3] Add parent record resource locators in `nodes/Twenty/Twenty.node.ts` - Add for each parent type (Company, Person, Task, Note, Opportunity):
  ```typescript
  // Example for Company
  {
    displayName: 'Company',
    name: 'companyId',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    displayOptions: {
      show: {
        resourceType: ['attachment'],
        attachmentOperation: ['uploadFile'],
        attachToType: ['company']
      }
    },
    modes: [
      {
        displayName: 'From List',
        name: 'list',
        type: 'list',
        typeOptions: {
          searchListMethod: 'getCompaniesForAttachment',
          searchable: true
        }
      },
      {
        displayName: 'By URL',
        name: 'url',
        type: 'string',
        extractValue: {
          type: 'regex',
          regex: 'https://app\\.twenty\\.com/objects/companies/([a-f0-9-]{36})'
        },
        validation: [
          {
            type: 'regex',
            properties: {
              regex: 'https://app\\.twenty\\.com/objects/companies/([a-f0-9-]{36})',
              errorMessage: 'Not a valid Twenty CRM company URL'
            }
          }
        ]
      },
      {
        displayName: 'By ID',
        name: 'id',
        type: 'string',
        placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
        validation: [
          {
            type: 'regex',
            properties: {
              regex: '^[a-f0-9-]{36}$',
              errorMessage: 'Not a valid UUID'
            }
          }
        ]
      }
    ]
  }
  ```

- [ ] **T017** [P] [US3] Implement loadOptions methods for parent records in `nodes/Twenty/Twenty.node.ts` - Add methods property to class with getCompaniesForAttachment, getPeopleForAttachment, getTasksForAttachment, getNotesForAttachment, getOpportunitiesForAttachment. **IMPORTANT**: Each parent record resource locator (T016) MUST use `loadOptionsDependsOn: ['attachToType']` to enable dynamic loading based on the selected "Attach To" type:
  ```typescript
  async getCompaniesForAttachment(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const query = `query { companies(limit: 100) { edges { node { id name } } } }`;
    try {
      const response = await twentyApiRequest.call(this, 'graphql', query);
      return response.data.companies.edges.map((edge: any) => ({
        name: edge.node.name,
        value: edge.node.id
      }));
    } catch (error) {
      console.warn('Failed to load companies:', error.message);
      return [];  // Return empty array to prevent UI crash
    }
  }
  ```

- [ ] **T018** [P] [US3] Add attachment resource locator for Download operation in `nodes/Twenty/Twenty.node.ts`:
  ```typescript
  {
    displayName: 'Attachment',
    name: 'attachmentId',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    displayOptions: {
      show: {
        resourceType: ['attachment'],
        attachmentOperation: ['downloadFile']
      }
    },
    modes: [
      {
        displayName: 'From List',
        name: 'list',
        type: 'list',
        typeOptions: {
          searchListMethod: 'getAttachments',
          searchable: true
        }
      },
      {
        displayName: 'By URL',
        name: 'url',
        type: 'string',
        extractValue: {
          type: 'regex',
          regex: 'https://app\\.twenty\\.com/objects/attachments/([a-f0-9-]{36})'
        },
        validation: [
          {
            type: 'regex',
            properties: {
              regex: 'https://app\\.twenty\\.com/objects/attachments/([a-f0-9-]{36})',
              errorMessage: 'Not a valid Twenty CRM attachment URL'
            }
          }
        ]
      },
      {
        displayName: 'By ID',
        name: 'id',
        type: 'string',
        placeholder: 'e.g. 660e8400-e29b-41d4-a716-446655440001',
        validation: [
          {
            type: 'regex',
            properties: {
              regex: '^[a-f0-9-]{36}$',
              errorMessage: 'Not a valid UUID'
            }
          }
        ]
      }
    ]
  }
  ```

- [ ] **T019** [US3] Implement getAttachments loadOptions method in `nodes/Twenty/Twenty.node.ts`:
  ```typescript
  async getAttachments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const query = `
      query {
        attachments(limit: 100) {
          edges {
            node {
              id
              name
              type
            }
          }
        }
      }
    `;
    try {
      const response = await twentyApiRequest.call(this, 'graphql', query);
      return response.data.attachments.edges.map((edge: any) => ({
        name: `${edge.node.name} (${edge.node.type})`,
        value: edge.node.id
      }));
    } catch (error) {
      console.warn('Failed to load attachments:', error.message);
      return [];
    }
  }
  ```

**Checkpoint**: Resource locators are fully functional. Users can select records from dropdowns, paste URLs, or enter IDs manually with validation.

---

## Phase 5: User Story 2 - Download Attachment (Priority: P2)

**Goal**: Enable users to download attachments from Twenty CRM for downstream processing

**Independent Test**: Create an attachment in Twenty CRM (manually or via Upload), use Download operation to retrieve it, verify file content appears in n8n Binary tab with correct metadata

**Dependencies**: Requires US3 (attachment resource locator) to be complete

### Implementation for User Story 2

- [ ] **T020** [P] [US2] Add "Put Output File in Field" parameter in `nodes/Twenty/Twenty.node.ts`:
  ```typescript
  {
    displayName: 'Put Output File in Field',
    name: 'outputBinaryPropertyName',
    type: 'string',
    displayOptions: {
      show: {
        resourceType: ['attachment'],
        attachmentOperation: ['downloadFile']
      }
    },
    default: 'data',
    required: true,
    description: 'The name of the binary property to store the downloaded file',
    hint: 'The downloaded file will be accessible in subsequent nodes via this field name'
  }
  ```

- [ ] **T021** [US2] Implement downloadFileFromTwenty() in `nodes/Twenty/TwentyApi.client.ts` - Download file from signed URL with proper encoding (reference: Google Drive v2 pattern from research.md):
  ```typescript
  export async function downloadFileFromTwenty(
    this: IExecuteFunctions,
    itemIndex: number,
    attachmentId: string
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    // First, get attachment metadata with signed URL
    const query = `
      query getAttachment($id: ID!) {
        attachment(id: $id) {
          id
          name
          fullPath
          type
        }
      }
    `;
    
    const attachmentResponse = await twentyApiRequest.call(
      this,
      'graphql',
      query,
      { id: attachmentId }
    );
    
    if (!attachmentResponse.data.attachment) {
      throw new NodeOperationError(
        this.getNode(),
        `Attachment with id ${attachmentId} not found`,
        { itemIndex }
      );
    }
    
    const { fullPath, name, type } = attachmentResponse.data.attachment;
    
    // Download file from signed URL
    let response;
    try {
      response = await this.helpers.httpRequest({
        method: 'GET',
        url: fullPath,
        encoding: 'arraybuffer',  // CRITICAL: Prevents binary corruption
        json: false,               // CRITICAL: Don't parse as JSON
        returnFullResponse: true
      });
    } catch (error) {
      // Handle expired signed URL (FR-031)
      if (error.statusCode === 401) {
        // Refetch attachment to get fresh signed URL
        const refreshedResponse = await twentyApiRequest.call(
          this,
          'graphql',
          query,
          { id: attachmentId }
        );
        const freshFullPath = refreshedResponse.data.attachment.fullPath;
        
        // Retry download with fresh URL
        response = await this.helpers.httpRequest({
          method: 'GET',
          url: freshFullPath,
          encoding: 'arraybuffer',
          json: false,
          returnFullResponse: true
        });
      } else {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to download file: ${error.message}`,
          { itemIndex }
        );
      }
    }
    
    return {
      buffer: response.body as Buffer,
      fileName: name,
      mimeType: type
    };
  }
  ```

- [ ] **T022** [US2] Add Download File execution logic to execute() method in `nodes/Twenty/Twenty.node.ts`:
  ```typescript
  // In execute() method, add case for download operation
  if (resourceType === 'attachment') {
    if (attachmentOperation === 'downloadFile') {
      const attachmentId = this.getNodeParameter('attachmentId', i, '', { extractValue: true }) as string;
      const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i) as string;
      
      // Download file
      const { buffer, fileName, mimeType } = await downloadFileFromTwenty.call(
        this,
        i,
        attachmentId
      );
      
      // Convert to n8n binary data format
      const binaryData = await this.helpers.prepareBinaryData(
        buffer,
        fileName,
        mimeType
      );
      
      // Preserve existing binary data from input
      const newItem: INodeExecutionData = {
        json: items[i].json,
        binary: {
          ...(items[i].binary || {}),
          [outputBinaryPropertyName]: binaryData
        }
      };
      
      returnData.push(newItem);
    }
  }
  ```

- [ ] **T023** [US2] Add error handling for download operation in `nodes/Twenty/Twenty.node.ts` - Wrap download logic with try-catch for attachment not found, file deleted, network errors

**Checkpoint**: Download operation is fully functional. Users can download attachments and use them in subsequent nodes (email, storage, etc.)

---

## Phase 6: User Story 4 - Standalone File Upload (Priority: P3)

**Goal**: Support advanced workflows where files are uploaded without immediately attaching to a CRM record

**Independent Test**: Upload a file with "Attach To: None", verify file is stored in Twenty CRM with path and token returned, verify no attachment record is created

**Dependencies**: Builds on US1 (Upload) - only requires conditional logic change

### Implementation for User Story 4

- [ ] **T024** [US4] Update Upload execution logic in `nodes/Twenty/Twenty.node.ts` - Modify T014 to handle standalone uploads (attachToType === 'none') by skipping createAttachmentRecord() call and returning { path, token, fileName } instead

**Checkpoint**: Standalone file upload is functional. Files can be uploaded for staging or later attachment creation.

---

## Phase 7: Polish & Integration

**Purpose**: Cross-cutting concerns, documentation, and final quality checks

- [ ] **T025** [P] Update README.md - Add "Attachment Management" section with usage examples:
  - Upload file to Company example
  - Download attachment example
  - Resource locator usage (list/url/id modes)
  - Standalone upload example

- [ ] **T026** [P] Update CHANGELOG.md - Document version 0.10.0 changes:
  ```markdown
  ## [0.10.0] - 2025-10-15
  
  ### Added
  - **Attachment Management**: Upload and download files with Twenty CRM integration
  - Resource Group selector (Databases vs Attachments)
  - Upload File operation with support for all file types
  - Download File operation with automatic signed URL refresh
  - Resource locators for parent records (Company, Person, Task, Note, Opportunity)
  - Resource locator for attachments with 3 modes (From List, By URL, By ID)
  - Standalone file upload (without parent record)
  - Large file support (up to 50 MB) with streaming
  - Custom filename specification
  - File folder categorization (Attachment, File, Profile Picture)
  
  ### Changed
  - Added form-data dependency for GraphQL Upload multipart requests
  
  ### Technical
  - Implemented binary data helpers (getBinaryStream, getBinaryMetadata, prepareBinaryData)
  - FormData multipart construction for GraphQL Upload scalar
  - Automatic stream vs buffer detection for optimal memory usage
  - Signed URL expiration handling with automatic refresh
  ```

- [ ] **T027** [P] Add JSDoc comments to new functions in `nodes/Twenty/TwentyApi.client.ts` - Document getItemBinaryData(), uploadFileToTwenty(), createAttachmentRecord(), downloadFileFromTwenty() with parameter descriptions and return types

- [ ] **T028** Run linter - Execute `npm run lint` and fix any ESLint errors

- [ ] **T029** Build production version - Execute `npm run build` and verify no TypeScript compilation errors

- [ ] **T030** Execute pre-release checklist from quickstart.md - Verify all items in "Pre-Release Checklist" section:
  - [ ] Code Quality: TypeScript compiles, ESLint passes, no console.log
  - [ ] Functionality: All 6 test workflows from quickstart.md pass
  - [ ] Backward Compatibility: Database operations unchanged
  - [ ] Documentation: README and CHANGELOG updated
  - [ ] Constitution Compliance: Text styling, helpers, versioning
  - [ ] Performance: Large files (50 MB) work without errors or timeouts
  - [ ] Performance: Resource locators load within 3 seconds (measure with browser DevTools Network tab or stopwatch)

---

## Dependencies & Execution Order

### User Story Dependency Graph

```
Phase 1: Setup (T001-T003)
         ↓
Phase 2: Foundation (T004-T007) ← BLOCKING: Must complete before any US
         ↓
         ├─────────────────┬──────────────────┬─────────────────┐
         ↓                 ↓                  ↓                 ↓
    US1: Upload      US3: Locators      US2: Download    US4: Standalone
    (T008-T015)      (T016-T019)        (T020-T023)      (T024)
    Priority: P1     Priority: P2        Priority: P2     Priority: P3
    Independent      Independent         Depends on US3   Depends on US1
         ↓                 ↓                  ↓                 ↓
         └─────────────────┴──────────────────┴─────────────────┘
                                    ↓
                        Phase 7: Polish (T025-T030)
```

### Critical Path

1. **Setup** (T001-T003): 30 minutes
2. **Foundation** (T004-T007): 2 hours ⚠️ BLOCKING
3. **User Story 1** (T008-T015): 4-6 hours 🎯 MVP
4. **User Story 3** (T016-T019): 3-4 hours (parallelizable with US1 after foundation)
5. **User Story 2** (T020-T023): 2-3 hours (requires US3)
6. **User Story 4** (T024): 30 minutes
7. **Polish** (T025-T030): 2-3 hours

**Total Estimated Time**: 16-20 hours

### Parallel Execution Opportunities

**After Foundation (T007) Completes**:

- **Parallel Stream 1** (Developer A): US1 Upload (T008-T015)
- **Parallel Stream 2** (Developer B): US3 Resource Locators (T016-T019)
- **Sequential after US3**: US2 Download (T020-T023) requires US3 attachment locator
- **Sequential after US1**: US4 Standalone (T024) requires US1 upload logic

**Final Parallel Tasks**:

- T025 (README), T026 (CHANGELOG), T027 (JSDoc) can all run in parallel
- T028-T030 must run sequentially (lint → build → checklist)

---

## Implementation Strategy

### MVP Scope (Recommended First Release)

**Minimum Viable Product** = User Story 1 only:
- Setup (Phase 1)
- Foundation (Phase 2)
- User Story 1: Upload File to Twenty CRM (Phase 3)
- Basic Polish (T025, T026, T028-T030)

**MVP Delivers**:
- Core value proposition: Upload files from n8n to Twenty CRM
- Attach files to CRM records
- Foundation for remaining features
- Immediate user value: File automation

**Estimated MVP Time**: 8-10 hours

### Incremental Delivery Plan

1. **Release 0.10.0-beta.1** (MVP): US1 Upload only
2. **Release 0.10.0-beta.2**: Add US3 Resource Locators + US2 Download
3. **Release 0.10.0**: Add US4 Standalone + full polish
4. **Release 0.10.1** (future): Performance optimizations, additional file types

---

## Task Summary

**Total Tasks**: 30

**Task Count by User Story**:
- Setup (Phase 1): 3 tasks
- Foundation (Phase 2): 4 tasks (BLOCKING)
- User Story 1 (Upload): 8 tasks
- User Story 3 (Resource Locators): 4 tasks
- User Story 2 (Download): 4 tasks
- User Story 4 (Standalone): 1 task
- Polish (Phase 7): 6 tasks

**Parallel Opportunities**:
- 15 tasks marked with [P] can run in parallel
- After foundation: 2 parallel streams (US1 + US3)
- Final polish: 3 parallel tasks (README, CHANGELOG, JSDoc)

**Independent Test Criteria**:
- ✅ US1: Upload file → verify in Twenty CRM storage
- ✅ US3: Open dropdowns → verify data loads, modes work
- ✅ US2: Download attachment → verify in Binary tab
- ✅ US4: Upload without parent → verify path/token returned

---

## Next Steps

1. Review task breakdown with team
2. Assign developers to parallel streams
3. Execute Setup phase (T001-T003)
4. Execute Foundation phase (T004-T007) - MUST COMPLETE FIRST
5. Begin parallel implementation: US1 + US3
6. Complete US2 after US3
7. Complete US4 after US1
8. Execute Polish phase
9. Release 0.10.0

**Ready to begin implementation following quickstart.md setup guide**
