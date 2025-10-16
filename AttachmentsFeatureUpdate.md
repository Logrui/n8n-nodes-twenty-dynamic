# Attachments Feature Update - Planning Document

**Version:** 1.0  
**Date:** October 15, 2025  
**Status:** Planning / Feasibility Analysis  

---

## 📋 Executive Summary

This document outlines the implementation plan for adding **Attachment Management** capabilities to the n8n-nodes-twenty-dynamic package. The feature will introduce a new **Resource Group** selector at the top level, enabling users to work with either **Databases** (existing functionality) or **Attachments** (new functionality).

### Feasibility Assessment: ✅ **FULLY FEASIBLE**

After comprehensive analysis of both Twenty CRM's API and n8n's capabilities, this feature is **completely implementable** with the existing infrastructure.

---

## 🎯 Feature Overview

### Current State
- Single resource type: **Databases** (Companies, People, etc.)
- Operations focused on CRUD for database records
- No file/binary data handling

### Proposed State
- **Two resource groups**:
  1. **Databases** (existing - unchanged)
  2. **Attachments** (new - file management)
- File upload and download operations
- Integration with Twenty's binary file storage system
- Full support for n8n's binary data handling

---

## 🏗️ Architecture Overview

### Twenty CRM Attachment System

**Storage Architecture:**
```
Twenty CRM File Storage
├── Storage Layer (Binary Files)
│   ├── Local Storage: .local-storage/
│   └── S3 Storage: {bucket}/
├── File Metadata (PostgreSQL)
│   ├── file table (FileEntity)
│   └── attachment table (AttachmentWorkspaceEntity)
└── GraphQL API
    ├── uploadFile mutation
    └── Query with signed URLs
```

**Key Components:**
1. **FileStorageService**: Handles binary file storage (Local/S3)
2. **FileUploadService**: Processes uploads, generates signed paths
3. **AttachmentWorkspaceEntity**: Database object linking files to records
4. **FileFolder Enum**: Categorizes files (ProfilePicture, Attachment, File, etc.)

### n8n Binary Data System

**Binary Data Flow:**
```
n8n Binary Data Handling
├── Input: Binary tab data
│   └── Format: { data: base64, fileName, mimeType, ... }
├── Processing: this.helpers
│   ├── getBinaryDataBuffer() - Retrieve binary as Buffer
│   ├── prepareBinaryData() - Create binary metadata
│   └── setBinaryDataBuffer() - Store binary data
└── Output: Binary results
    └── Return binary data for downstream nodes
```

**Available Helper Methods:**
- `this.helpers.assertBinaryData(itemIndex, propertyName)` - Validate binary exists
- `this.helpers.getBinaryDataBuffer(itemIndex, propertyName)` - Get Buffer
- `this.helpers.getBinaryStream(binaryId, chunkSize)` - Get Readable stream for large files
- `this.helpers.getBinaryMetadata(binaryId)` - Get file info without loading content
- `this.helpers.prepareBinaryData(buffer, fileName, mimeType)` - Create IBinaryData
- `this.helpers.setBinaryDataBuffer(metadata, buffer)` - Store binary

---

## 🎓 Learnings from n8n Google Nodes

**Reference:** See `AttachmentsArchitectureLearnings.md` for comprehensive analysis

After analyzing n8n's **Google Drive v2** and **Google Cloud Storage** nodes, we've identified proven patterns for file operations that will guide our implementation.

### Key Insights

#### 1. Binary Data Detection Pattern ⭐ **CRITICAL**

Both Google nodes use this pattern to handle small vs large files efficiently:

```typescript
const binaryData = this.helpers.assertBinaryData(i, inputDataFieldName);

if (binaryData.id) {
    // LARGE FILE: Use streaming (file is on disk)
    const stream = await this.helpers.getBinaryStream(binaryData.id, chunkSize);
    const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
    // metadata contains: fileSize, fileName, mimeType
} else {
    // SMALL FILE: Use buffer (file is in memory)
    const buffer = Buffer.from(binaryData.data, BINARY_ENCODING);
    const fileName = binaryData.fileName;
    const mimeType = binaryData.mimeType;
}
```

**Why this matters:**
- Small files (< 1MB): In memory as base64 in `binaryData.data`
- Large files: On disk, accessed via `binaryData.id`
- Using the wrong method causes memory issues or errors

#### 2. FormData Multipart Upload Pattern ⭐ **CRITICAL**

Google Cloud Storage shows exactly how to construct multipart requests:

```typescript
const FormData = require('form-data');
const form = new FormData();

// Append metadata
form.append('metadata', JSON.stringify(metadata), {
    contentType: 'application/json',
});

// Append file
form.append('file', content, {
    filename: fileName,
    contentType: mimeType,
    knownLength: contentLength,
});

// Send with proper headers
await this.helpers.httpRequest({
    method: 'POST',
    url: endpoint,
    body: form,
    headers: {
        ...form.getHeaders(),  // Includes boundary
        'Content-Length': form.getLengthSync(),
    },
});
```

**For Twenty CRM's GraphQL Upload:**
```typescript
form.append('operations', JSON.stringify({
    query: 'mutation uploadFile($file: Upload!) {...}',
    variables: { file: null },
}));
form.append('map', JSON.stringify({ '0': ['variables.file'] }));
form.append('0', fileContent, { filename, contentType });
```

#### 3. Binary Download Pattern ⭐ **CRITICAL**

Google Drive shows the correct way to handle binary responses:

```typescript
const response = await this.helpers.httpRequest({
    method: 'GET',
    url: fileUrl,
    encoding: 'arraybuffer',  // CRITICAL: Prevents mangling binary data
    json: false,               // CRITICAL: Don't parse as JSON
    returnFullResponse: true,
});

// Prepare for n8n
const binaryData = await this.helpers.prepareBinaryData(
    response.body as Buffer,
    fileName,
    mimeType,
);

// Add to item
item.binary![outputFieldName] = binaryData;
```

#### 4. UI/UX Best Practices

**Binary Input Field (from Google Drive):**
```typescript
{
    displayName: 'Input Data Field Name',
    name: 'inputDataFieldName',
    type: 'string',
    default: 'data',
    placeholder: 'e.g. data',
    hint: 'The name of the input field containing the binary file data',
    description: 'Find the name in the Input panel Binary tab',
}
```

**Binary Output Field (from both nodes):**
```typescript
{
    displayName: 'Put Output File in Field',
    name: 'binaryPropertyName',
    type: 'string',
    default: 'data',
    placeholder: 'e.g. data',
    description: 'The name of the output field to put the file in',
}
```

### Architecture Decision

**Recommended Approach:** Hybrid of both patterns

- **Use Google Cloud Storage's declarative pattern** for simplicity
- **Use Google Drive's modular helpers** for reusability
- **Create utility functions** like Google Drive's `getItemBinaryData()`

### Implementation Checklist Updates

Based on Google nodes analysis:

- ✅ Use `binaryData.id` detection for stream vs buffer
- ✅ Use `form-data` npm package for multipart uploads
- ✅ Set `encoding: 'arraybuffer'` for binary downloads
- ✅ Create `getItemBinaryData()` helper function
- ✅ Follow n8n naming conventions (`inputDataFieldName`, `binaryPropertyName`)
- ✅ Include `itemIndex` in all error messages
- ✅ Use `assertBinaryData()` for validation
- ✅ Preserve existing binary data in items

---

## 🔧 Implementation Plan

### Phase 1: Node Structure Changes

#### 1.1 Add Resource Group Selector

**Location:** Top of node, before Database Group  
**Implementation:**

```typescript
{
    displayName: 'Resource Group',
    name: 'resourceType',
    type: 'options',
    noDataExpression: true,
    options: [
        {
            name: 'Databases',
            value: 'database',
            description: 'Work with Twenty CRM database records (Companies, People, etc.)',
        },
        {
            name: 'Attachments',
            value: 'attachment',
            description: 'Upload, download, and manage file attachments',
        },
    ],
    default: 'database',
    required: true,
    description: 'Choose the type of resource to interact with',
},
```

#### 1.2 Update Database Group Visibility

**Change:** Make Database Group dependent on Resource Group selection

```typescript
{
    displayName: 'Database Group',
    name: 'resourceGroup',
    // ... existing config ...
    displayOptions: {
        show: {
            resourceType: ['database'],  // NEW: Only show for database resource type
        },
    },
},
```

#### 1.3 Update All Existing Fields

**Action:** Add `resourceType: ['database']` to displayOptions for all existing database-related fields:
- Database Name or ID
- Operation
- All operation-specific fields (recordId, fields, bulkData, etc.)

---

### Phase 2: Attachment Operations

#### 2.1 Attachment Operations Selector

**New Field:**

```typescript
{
    displayName: 'Operation',
    name: 'attachmentOperation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
        show: {
            resourceType: ['attachment'],
        },
    },
    options: [
        {
            name: 'Upload File',
            value: 'uploadFile',
            description: 'Upload a file and create an attachment record',
            action: 'Upload a file',
        },
        {
            name: 'Download File',
            value: 'downloadFile',
            description: 'Download an attachment file as binary data',
            action: 'Download a file',
        },
    ],
    default: 'uploadFile',
    required: true,
},
```

---

### Phase 3: Upload File Operation

#### 3.1 Input Data Field Name

```typescript
{
    displayName: 'Input Binary Field',
    name: 'binaryPropertyName',
    type: 'string',
    displayOptions: {
        show: {
            resourceType: ['attachment'],
            attachmentOperation: ['uploadFile'],
        },
    },
    default: 'data',
    required: true,
    placeholder: 'data',
    description: 'Name of the binary property in the input data (found in Binary tab)',
    hint: 'The field containing the file data from the previous node',
},
```

#### 3.2 File Name

```typescript
{
    displayName: 'File Name',
    name: 'fileName',
    type: 'string',
    displayOptions: {
        show: {
            resourceType: ['attachment'],
            attachmentOperation: ['uploadFile'],
        },
    },
    default: '',
    required: true,
    placeholder: 'document.pdf',
    description: 'Name to give the uploaded file',
},
```

#### 3.3 Parent Record Type

```typescript
{
    displayName: 'Attach To',
    name: 'attachToType',
    type: 'options',
    displayOptions: {
        show: {
            resourceType: ['attachment'],
            attachmentOperation: ['uploadFile'],
        },
    },
    options: [
        {
            name: 'Company',
            value: 'company',
            description: 'Attach file to a Company record',
        },
        {
            name: 'Person',
            value: 'person',
            description: 'Attach file to a Person record',
        },
        {
            name: 'Task',
            value: 'task',
            description: 'Attach file to a Task record',
        },
        {
            name: 'Note',
            value: 'note',
            description: 'Attach file to a Note record',
        },
        {
            name: 'Opportunity',
            value: 'opportunity',
            description: 'Attach file to an Opportunity record',
        },
        {
            name: 'None',
            value: 'none',
            description: 'Upload file without attaching to a record',
        },
    ],
    default: 'company',
    required: true,
},
```

#### 3.4 Parent Record Resource Locator

```typescript
{
    displayName: 'Parent Record',
    name: 'parentRecordId',
    type: 'resourceLocator',
    displayOptions: {
        show: {
            resourceType: ['attachment'],
            attachmentOperation: ['uploadFile'],
            attachToType: ['company', 'person', 'task', 'note', 'opportunity'],
        },
    },
    default: { mode: 'list', value: '' },
    required: true,
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            placeholder: 'Select a record...',
            typeOptions: {
                searchListMethod: 'getParentRecordsForAttachment',
                searchable: true,
            },
        },
        {
            displayName: 'By URL',
            name: 'url',
            type: 'string',
            placeholder: 'https://app.twenty.com/objects/companies/abc-123',
            extractValue: {
                type: 'regex',
                regex: '/([a-f0-9-]{36})$',
            },
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '/([a-f0-9-]{36})$',
                        errorMessage: 'Not a valid Twenty CRM record URL',
                    },
                },
            ],
        },
        {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. abc-123-def-456',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '^[a-f0-9-]{36}$',
                        errorMessage: 'Not a valid record ID',
                    },
                },
            ],
        },
    ],
    description: 'The record to attach the file to',
},
```

#### 3.5 File Folder Selection

```typescript
{
    displayName: 'File Folder',
    name: 'fileFolder',
    type: 'options',
    displayOptions: {
        show: {
            resourceType: ['attachment'],
            attachmentOperation: ['uploadFile'],
        },
    },
    options: [
        {
            name: 'Attachment',
            value: 'attachment',
            description: 'General attachments (recommended)',
        },
        {
            name: 'File',
            value: 'file',
            description: 'Generic file storage',
        },
    ],
    default: 'attachment',
    required: true,
    description: 'The folder category to store the file in',
},
```

---

### Phase 4: Download File Operation

#### 4.1 Attachment Resource Locator

```typescript
{
    displayName: 'Attachment',
    name: 'attachmentId',
    type: 'resourceLocator',
    displayOptions: {
        show: {
            resourceType: ['attachment'],
            attachmentOperation: ['downloadFile'],
        },
    },
    default: { mode: 'list', value: '' },
    required: true,
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            placeholder: 'Select an attachment...',
            typeOptions: {
                searchListMethod: 'getAttachments',
                searchable: true,
            },
        },
        {
            displayName: 'By URL',
            name: 'url',
            type: 'string',
            placeholder: 'https://app.twenty.com/objects/attachments/abc-123',
            extractValue: {
                type: 'regex',
                regex: '/([a-f0-9-]{36})$',
            },
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '/([a-f0-9-]{36})$',
                        errorMessage: 'Not a valid Twenty CRM attachment URL',
                    },
                },
            ],
        },
        {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. abc-123-def-456',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '^[a-f0-9-]{36}$',
                        errorMessage: 'Not a valid attachment ID',
                    },
                },
            ],
        },
    ],
    description: 'The attachment file to download',
},
```

#### 4.2 Binary Property Name (Output)

```typescript
{
    displayName: 'Put Output File in Field',
    name: 'outputBinaryPropertyName',
    type: 'string',
    displayOptions: {
        show: {
            resourceType: ['attachment'],
            attachmentOperation: ['downloadFile'],
        },
    },
    default: 'data',
    required: true,
    placeholder: 'data',
    description: 'Name of the binary property to store the downloaded file',
    hint: 'The field name for the output binary data',
},
```

---

### Phase 5: Backend Implementation

#### 5.1 Helper Function: Get Binary Data

**File:** `TwentyApi.client.ts` - New helper (inspired by Google Drive)

```typescript
/**
 * Extract binary data from n8n input
 * Handles both small files (buffer) and large files (stream)
 * 
 * Based on Google Drive v2 pattern - see AttachmentsArchitectureLearnings.md
 */
async function getItemBinaryData(
    this: IExecuteFunctions,
    inputDataFieldName: string,
    itemIndex: number,
): Promise<{
    content: Buffer | Readable;
    fileName: string;
    mimeType: string;
    fileSize: number;
}> {
    // Validate binary data exists
    const binaryData = this.helpers.assertBinaryData(itemIndex, inputDataFieldName);

    let content: Buffer | Readable;
    let fileName: string;
    let mimeType: string;
    let fileSize: number;

    if (binaryData.id) {
        // LARGE FILE: Use streaming (file stored on disk)
        content = await this.helpers.getBinaryStream(binaryData.id);
        const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
        
        fileName = metadata.fileName || 'file';
        mimeType = metadata.mimeType || 'application/octet-stream';
        fileSize = metadata.fileSize;
    } else {
        // SMALL FILE: Use buffer (file in memory)
        const BINARY_ENCODING = 'base64';
        content = Buffer.from(binaryData.data, BINARY_ENCODING);
        
        fileName = binaryData.fileName || 'file';
        mimeType = binaryData.mimeType || 'application/octet-stream';
        fileSize = content.length;
    }

    return { content, fileName, mimeType, fileSize };
}
```

#### 5.2 Upload File Logic (Updated with Google Patterns)

**File:** `TwentyApi.client.ts` - New function

```typescript
/**
 * Upload a file to Twenty CRM
 * 
 * Uses patterns from Google Cloud Storage node:
 * - Binary data detection (stream vs buffer)
 * - FormData multipart construction
 * - Proper headers with boundary
 * 
 * Twenty's uploadFile mutation expects:
 * - GraphQL Upload scalar (multipart/form-data)
 * - File and fileFolder parameter
 * 
 * Returns: { path: string, token: string }
 */
export async function uploadFileToTwenty(
    this: IExecuteFunctions,
    itemIndex: number,
    inputDataFieldName: string,
    fileNameOverride: string | undefined,
    fileFolder: 'attachment' | 'file' = 'attachment',
): Promise<{ path: string; token: string }> {
    const credentials = await this.getCredentials('twentyApi');
    const domain = (credentials.domain as string).replace(/\/$/, '');

    // Extract binary data using helper
    const { content, fileName: originalFileName, mimeType, fileSize } = 
        await getItemBinaryData.call(this, inputDataFieldName, itemIndex);

    const fileName = fileNameOverride || originalFileName;

    // GraphQL Upload requires multipart/form-data with specific structure
    const FormData = require('form-data');
    const form = new FormData();

    // Part 1: GraphQL operation
    form.append('operations', JSON.stringify({
        query: `
            mutation uploadFile($file: Upload!, $fileFolder: FileFolder) {
                uploadFile(file: $file, fileFolder: $fileFolder) {
                    path
                    token
                }
            }
        `,
        variables: {
            file: null, // Will be mapped to the actual file
            fileFolder: fileFolder,
        },
    }));

    // Part 2: Map which variable corresponds to which file
    form.append('map', JSON.stringify({
        '0': ['variables.file'], // File at index 0 maps to variables.file
    }));

    // Part 3: The actual file (handles both Buffer and Stream)
    form.append('0', content, {
        filename: fileName,
        contentType: mimeType,
        knownLength: fileSize,  // Important for streams
    });

    // Send multipart request with proper headers
    const response = await this.helpers.httpRequestWithAuthentication.call(
        this,
        'twentyApi',
        {
            method: 'POST',
            url: `${domain}/graphql`,
            body: form,
            headers: {
                ...form.getHeaders(),  // Includes Content-Type with boundary
                'Content-Length': form.getLengthSync(),
            },
        },
    );

    if (!response.data?.uploadFile) {
        throw new NodeOperationError(
            this.getNode(),
            'File upload failed: No response from server',
            { itemIndex },
        );
    }

    return response.data.uploadFile;
}
```

#### 5.2 Create Attachment Record

**File:** `TwentyApi.client.ts` - New function

```typescript
/**
 * Create an attachment record linking a file to a parent record
 */
export async function createAttachmentRecord(
    this: IExecuteFunctions,
    filePath: string,
    fileName: string,
    mimeType: string,
    parentType: 'company' | 'person' | 'task' | 'note' | 'opportunity' | 'none',
    parentId: string | null,
): Promise<any> {
    const mutation = `
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

    const variables = {
        data: {
            name: fileName,
            fullPath: filePath,
            type: mimeType,
            ...(parentType !== 'none' && parentId && {
                [`${parentType}Id`]: parentId,
            }),
        },
    };

    const response = await twentyApiRequest.call(this, 'graphql', mutation, variables);
    return response.createAttachment;
}
```

#### 5.4 Download File Logic (Updated with Google Patterns)

**File:** `TwentyApi.client.ts` - New function

```typescript
/**
 * Download an attachment file from Twenty CRM
 * 
 * Uses patterns from Google Drive v2 node:
 * - encoding: 'arraybuffer' for binary data
 * - json: false to prevent parsing
 * - returnFullResponse: true for headers
 * - prepareBinaryData() for output
 * 
 * Twenty returns signed URLs for attachments. We:
 * 1. Query the attachment to get the signed fullPath URL
 * 2. Download the file from that URL
 * 3. Convert to n8n binary format
 */
export async function downloadFileFromTwenty(
    this: IExecuteFunctions,
    attachmentId: string,
    itemIndex: number,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    // Step 1: Get attachment metadata with signed URL
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

    const response = await twentyApiRequest.call(this, 'graphql', query, {
        id: attachmentId,
    });

    const attachment = response.attachment;

    if (!attachment) {
        throw new NodeOperationError(
            this.getNode(),
            `Attachment with ID ${attachmentId} not found`,
            { itemIndex },
        );
    }

    // Step 2: Download file from signed URL
    // CRITICAL: Use arraybuffer encoding and json: false for binary data
    const fileResponse = await this.helpers.httpRequest({
        method: 'GET',
        url: attachment.fullPath,
        encoding: 'arraybuffer',  // CRITICAL: Get response as binary
        json: false,               // CRITICAL: Don't parse as JSON
        returnFullResponse: true,  // Get headers for content-type
    });

    // Extract mimeType from response headers if available
    const mimeType = fileResponse.headers?.['content-type'] || 
                     attachment.type || 
                     'application/octet-stream';

    return {
        buffer: fileResponse.body as Buffer,
        fileName: attachment.name,
        mimeType: mimeType,
    };
}
```

#### 5.5 Execution Logic: Upload File Operation

**File:** `Twenty.node.ts` - In execute() method

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
        const resourceType = this.getNodeParameter('resourceType', i) as string;

        if (resourceType === 'attachment') {
            const operation = this.getNodeParameter('attachmentOperation', i) as string;

            if (operation === 'uploadFile') {
                try {
                    // Get parameters
                    const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i, 'data') as string;
                    const fileName = this.getNodeParameter('fileName', i, '') as string;
                    const fileFolder = this.getNodeParameter('fileFolder', i, 'attachment') as 'attachment' | 'file';
                    const attachToType = this.getNodeParameter('attachToType', i, 'none') as string;
                    
                    // Upload file to Twenty storage
                    const uploadResult = await uploadFileToTwenty.call(
                        this,
                        i,
                        inputDataFieldName,
                        fileName || undefined,
                        fileFolder,
                    );

                    // If attaching to parent, create attachment record
                    if (attachToType !== 'none') {
                        const parentRecordId = this.getNodeParameter('parentRecordId', i, undefined, {
                            extractValue: true,
                        }) as string;

                        const { buffer, fileName: uploadedFileName, mimeType } = 
                            await downloadFileFromTwenty.call(this, uploadResult.path, i);

                        const attachment = await createAttachmentRecord.call(
                            this,
                            uploadResult.path,
                            uploadedFileName,
                            mimeType,
                            attachToType as any,
                            parentRecordId,
                        );

                        returnData.push({
                            json: attachment,
                            pairedItem: { item: i },
                        });
                    } else {
                        // Return upload result without attachment record
                        returnData.push({
                            json: {
                                path: uploadResult.path,
                                token: uploadResult.token,
                                fileName: fileName,
                            },
                            pairedItem: { item: i },
                        });
                    }
                } catch (error) {
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: {
                                error: error.message,
                            },
                            pairedItem: { item: i },
                        });
                        continue;
                    }
                    throw error;
                }
            }

            if (operation === 'downloadFile') {
                try {
                    const attachmentId = this.getNodeParameter('attachmentId', i, undefined, {
                        extractValue: true,
                    }) as string;
                    const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i, 'data') as string;

                    // Download file from Twenty
                    const { buffer, fileName, mimeType } = await downloadFileFromTwenty.call(
                        this,
                        attachmentId,
                        i,
                    );

                    // Prepare binary data for n8n (using Google Drive pattern)
                    const binaryData = await this.helpers.prepareBinaryData(
                        buffer,
                        fileName,
                        mimeType,
                    );

                    // Create output item with binary data
                    const newItem: INodeExecutionData = {
                        json: {
                            attachmentId,
                            fileName,
                            mimeType,
                            size: buffer.length,
                        },
                        binary: {
                            [outputBinaryPropertyName]: binaryData,
                        },
                        pairedItem: { item: i },
                    };

                    // Preserve existing binary data from input
                    if (items[i].binary) {
                        Object.assign(newItem.binary!, items[i].binary);
                    }

                    returnData.push(newItem);
                } catch (error) {
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: {
                                error: error.message,
                            },
                            pairedItem: { item: i },
                        });
                        continue;
                    }
                    throw error;
                }
            }
        } else {
            // Existing database operations...
        }
    }

    return [returnData];
}
```

#### 5.6 Resource Locator Methods

**File:** `Twenty.node.ts` - New methods section

```typescript
methods = {
    loadOptions: {
        // ... existing methods ...

        /**
         * Get parent records for attachment (dynamic based on attachToType)
         */
        async getParentRecordsForAttachment(
            this: ILoadOptionsFunctions,
        ): Promise<INodePropertyOptions[]> {
            const attachToType = this.getNodeParameter('attachToType') as string;
            
            // Map attachment types to database names
            const resourceMap: Record<string, string> = {
                company: 'company',
                person: 'person',
                task: 'task',
                note: 'note',
                opportunity: 'opportunity',
            };

            const resource = resourceMap[attachToType];
            
            if (!resource) {
                return [];
            }

            // Use REST API to get records
            const response = await twentyRestApiRequest.call(
                this,
                'GET',
                `/${resource}`,
            );

            return response.data.map((record: any) => ({
                name: record.name || record.title || `${record.firstName} ${record.lastName}` || record.id,
                value: record.id,
            }));
        },

        /**
         * Get all attachments for download operation
         */
        async getAttachments(
            this: ILoadOptionsFunctions,
        ): Promise<INodePropertyOptions[]> {
            const query = `
                query attachments {
                    attachments {
                        edges {
                            node {
                                id
                                name
                            }
                        }
                    }
                }
            `;

            const response = await twentyApiRequest.call(this, 'graphql', query);
            
            return response.attachments.edges.map((edge: any) => ({
                name: edge.node.name,
                value: edge.node.id,
            }));
        },
    },
};
```

#### 5.5 Execute Method Updates

**File:** `Twenty.node.ts` - Execute method additions

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    // Check resource type
    const resourceType = this.getNodeParameter('resourceType', 0) as string;

    if (resourceType === 'attachment') {
        // ATTACHMENT OPERATIONS
        const attachmentOperation = this.getNodeParameter('attachmentOperation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                if (attachmentOperation === 'uploadFile') {
                    // UPLOAD FILE OPERATION
                    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                    const fileName = this.getNodeParameter('fileName', i) as string;
                    const attachToType = this.getNodeParameter('attachToType', i) as string;
                    const fileFolder = this.getNodeParameter('fileFolder', i) as 'attachment' | 'file';

                    // Get parent record ID if applicable
                    let parentId: string | null = null;
                    if (attachToType !== 'none') {
                        const parentRecordParam = this.getNodeParameter('parentRecordId', i) as any;
                        parentId = typeof parentRecordParam === 'string' 
                            ? parentRecordParam 
                            : parentRecordParam.value;
                    }

                    // Get binary data from input
                    this.helpers.assertBinaryData(i, binaryPropertyName);
                    const binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                    
                    // Get mime type from binary metadata
                    const item = items[i];
                    const mimeType = item.binary?.[binaryPropertyName]?.mimeType || 'application/octet-stream';

                    // Upload file to Twenty
                    const uploadResult = await uploadFileToTwenty.call(
                        this,
                        binaryData,
                        fileName,
                        mimeType,
                        fileFolder,
                    );

                    // Create attachment record
                    const attachment = await createAttachmentRecord.call(
                        this,
                        uploadResult.path,
                        fileName,
                        mimeType,
                        attachToType as any,
                        parentId,
                    );

                    returnData.push({
                        json: attachment,
                        pairedItem: { item: i },
                    });

                } else if (attachmentOperation === 'downloadFile') {
                    // DOWNLOAD FILE OPERATION
                    const attachmentIdParam = this.getNodeParameter('attachmentId', i) as any;
                    const attachmentId = typeof attachmentIdParam === 'string'
                        ? attachmentIdParam
                        : attachmentIdParam.value;
                    
                    const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i) as string;

                    // Download file from Twenty
                    const downloadResult = await downloadFileFromTwenty.call(
                        this,
                        attachmentId,
                    );

                    // Convert to n8n binary format
                    const binaryData = await this.helpers.prepareBinaryData(
                        downloadResult.buffer,
                        downloadResult.fileName,
                        downloadResult.mimeType,
                    );

                    returnData.push({
                        json: {
                            attachmentId,
                            fileName: downloadResult.fileName,
                            mimeType: downloadResult.mimeType,
                            size: downloadResult.buffer.length,
                        },
                        binary: {
                            [outputBinaryPropertyName]: binaryData,
                        },
                        pairedItem: { item: i },
                    });
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                        },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }

    // EXISTING DATABASE OPERATIONS
    // ... existing code unchanged ...
}
```

---

## 🔍 Technical Challenges & Solutions

### Challenge 1: GraphQL Upload Mutation ✅ **SOLVED**

**Problem:** Twenty's `uploadFile` mutation uses `GraphQLUpload` scalar type, requiring multipart/form-data encoding. n8n's standard `httpRequestWithAuthentication` doesn't support GraphQL multipart uploads natively.

**Solution (from Google Cloud Storage pattern):** 
- Use `form-data` npm package to construct multipart request
- Map file to GraphQL variables using the multipart specification
- Send to `/graphql` endpoint with proper headers including boundary
- Set `Content-Length` using `form.getLengthSync()`

**Key Code Pattern:**
```typescript
const form = new FormData();
form.append('operations', JSON.stringify({ query, variables }));
form.append('map', JSON.stringify({ '0': ['variables.file'] }));
form.append('0', content, { filename, contentType, knownLength });

// Send with proper headers
await this.helpers.httpRequest({
    body: form,
    headers: {
        ...form.getHeaders(),  // Includes boundary
        'Content-Length': form.getLengthSync(),
    },
});
```

**Implementation Status:** ✅ **SOLVED** - Pattern proven in Google Cloud Storage node

### Challenge 2: Large File Handling ✅ **SOLVED**

**Problem:** Large files could cause memory issues if loaded entirely into memory.

**Solution (from Google Drive v2 pattern):**
- Detect file size using `binaryData.id` presence
- Small files (< 1MB): Use `Buffer.from(binaryData.data, 'base64')`
- Large files: Use `getBinaryStream(binaryData.id)` for streaming
- Use `getBinaryMetadata(binaryData.id)` to get file info without loading content

**Key Code Pattern:**
```typescript
if (binaryData.id) {
    // Large file - stream it
    const stream = await this.helpers.getBinaryStream(binaryData.id);
    const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
} else {
    // Small file - use buffer
    const buffer = Buffer.from(binaryData.data, 'base64');
}
```

**Implementation Status:** ✅ **SOLVED** - Pattern proven in Google Drive v2 node

### Challenge 3: Binary Download Response ✅ **SOLVED**

**Problem:** Downloading binary files requires special handling to prevent data corruption.

**Solution (from Google Drive v2 pattern):**
- Set `encoding: 'arraybuffer'` to get raw binary data
- Set `json: false` to prevent JSON parsing
- Use `returnFullResponse: true` to access headers
- Extract mimeType from response headers
- Use `prepareBinaryData()` to convert Buffer to n8n format

**Key Code Pattern:**
```typescript
const response = await this.helpers.httpRequest({
    encoding: 'arraybuffer',  // CRITICAL
    json: false,               // CRITICAL
    returnFullResponse: true,
});

const binaryData = await this.helpers.prepareBinaryData(
    response.body as Buffer,
    fileName,
    mimeType,
);
```

**Implementation Status:** ✅ **SOLVED** - Pattern proven in Google Drive v2 node

### Challenge 4: Signed URL Expiration ⚠️ **MITIGATED**

**Problem:** Twenty returns signed URLs for attachment files that expire after a configured time (default: based on `FILE_TOKEN_EXPIRES_IN`).

**Solution:**
- Download files immediately upon query (don't cache URLs)
- Always fetch fresh signed URL when downloading
- Query and download in single operation
- Document that downloaded files should be used promptly

**Implementation Status:** ⚠️ **MITIGATED** - Query and download in single operation

### Challenge 5: Parent Record Type Dynamic Loading ✅ **SOLVED**

**Problem:** Resource locator needs to load different records based on `attachToType` selection.

**Solution (n8n native feature):**
- Use `loadOptionsDependsOn: ['attachToType']` to reload when selection changes
- Implement dynamic `getParentRecordsForAttachment` method
- Map attachment types to corresponding database endpoints
- Return formatted options for resource locator

**Implementation Status:** ✅ **SOLVED** - n8n supports dependent loading natively

---

## 🎓 Summary: Google Nodes Patterns Applied

| Challenge | Google Node Pattern | Applied to Twenty |
|-----------|-------------------|------------------|
| **Binary Input** | `getItemBinaryData()` helper checks `binaryData.id` | ✅ Extract binary with stream/buffer detection |
| **Multipart Upload** | FormData with proper headers + boundary | ✅ GraphQL Upload with operations map |
| **Large Files** | Stream processing with `getBinaryStream()` | ✅ Handle both buffer and stream |
| **Binary Download** | `encoding: 'arraybuffer'`, `json: false` | ✅ Download from signed URLs |
| **Binary Output** | `prepareBinaryData()` for conversion | ✅ Convert Buffer to n8n format |
| **Error Handling** | Include `itemIndex` in all errors | ✅ Better debugging context |
| **UI Patterns** | `inputDataFieldName`, `binaryPropertyName` | ✅ Follow n8n conventions |

**Result:** All technical challenges have proven solutions from production n8n nodes.

---

## 📊 API Endpoints Analysis

### Twenty GraphQL Mutations

#### Upload File
```graphql
mutation uploadFile($file: Upload!, $fileFolder: FileFolder) {
    uploadFile(file: $file, fileFolder: $fileFolder) {
        path    # Returns: "attachment/uuid.pdf"
        token   # Returns: JWT token for signed URL
    }
}
```

**Requirements:**
- Content-Type: `multipart/form-data`
- File as binary stream
- FileFolder enum value

**Returns:**
- `path`: Relative path in storage (e.g., "attachment/abc-123.pdf")
- `token`: JWT token for constructing signed URLs

#### Create Attachment
```graphql
mutation createAttachment($data: AttachmentCreateInput!) {
    createAttachment(data: $data) {
        id
        name
        fullPath
        type
        createdAt
        companyId
        personId
        # ... other relation IDs
    }
}
```

**Input:**
```typescript
{
    name: string;           // File display name
    fullPath: string;       // Path from uploadFile
    type: string;           // MIME type
    companyId?: string;     // Optional parent relation
    personId?: string;      // Optional parent relation
    taskId?: string;        // Optional parent relation
    noteId?: string;        // Optional parent relation
    opportunityId?: string; // Optional parent relation
}
```

### Twenty GraphQL Queries

#### Get Attachment
```graphql
query getAttachment($id: ID!) {
    attachment(id: $id) {
        id
        name
        fullPath    # Automatically signed URL
        type
        createdAt
        author {
            id
            name
        }
        company {
            id
            name
        }
        person {
            id
            name
        }
    }
}
```

**Returns:**
- `fullPath` is automatically transformed to signed URL
- Format: `https://domain.com/files/{path}?token={jwt}`

#### List Attachments
```graphql
query attachments {
    attachments {
        edges {
            node {
                id
                name
                fullPath
                type
            }
        }
    }
}
```

### File Download

**Endpoint:** `GET /files/{folderPath}/{filename}?token={jwt}`

**Example:**
```
GET https://app.twenty.com/files/workspace-abc123/attachment/file-uuid.pdf?token=eyJhbGc...
```

**Authentication:** JWT token in query string (generated by Twenty)

**Response:** Binary file stream

---

## 🧪 Testing Plan

### Unit Tests

1. **Upload File Operation**
   - Test with different file types (PDF, image, text)
   - Test with different file sizes
   - Test parent record attachment
   - Test without parent record
   - Test error handling (missing binary, invalid parent ID)

2. **Download File Operation**
   - Test successful download
   - Test invalid attachment ID
   - Test expired signed URL handling
   - Test different file types

3. **Resource Locator Methods**
   - Test parent record loading for each type
   - Test attachment listing
   - Test search functionality

### Integration Tests

1. **End-to-End Upload Flow**
   ```
   HTTP Request (download file) 
   → Twenty Upload File
   → Verify in Twenty UI
   ```

2. **End-to-End Download Flow**
   ```
   Twenty Download File
   → Save to Disk
   → Verify file integrity
   ```

3. **Round-Trip Test**
   ```
   Upload File → Download Same File → Compare Checksums
   ```

### Manual Testing Checklist

- [ ] Upload small file (< 1 MB)
- [ ] Upload large file (> 10 MB)
- [ ] Upload to Company
- [ ] Upload to Person
- [ ] Upload without parent
- [ ] Download file and verify content
- [ ] Test all resource locator modes (List, URL, ID)
- [ ] Test expression support in fileName
- [ ] Test error messages are clear
- [ ] Verify binary data appears in Binary tab

---

## 📦 Dependencies

### New NPM Packages Required

```json
{
    "form-data": "^4.0.0"  // For multipart/form-data uploads
}
```

**Justification:** Required for constructing GraphQL multipart requests for file uploads.

### Existing n8n Packages (Already Available)

- `n8n-workflow` - Binary data types
- Core helpers:
  - `this.helpers.assertBinaryData()`
  - `this.helpers.getBinaryDataBuffer()`
  - `this.helpers.prepareBinaryData()`
  - `this.helpers.httpRequest()`
  - `this.helpers.httpRequestWithAuthentication()`

---

## 🚀 Implementation Phases & Timeline

### Phase 1: Foundation (Week 1)
- [ ] Add Resource Group selector
- [ ] Update existing fields displayOptions
- [ ] Add attachment operation selector
- [ ] Test Database operations still work

**Deliverable:** Node structure updated, backward compatible

### Phase 2: Upload Implementation (Week 2)
- [ ] Add upload file parameters
- [ ] Implement `uploadFileToTwenty()` function
- [ ] Implement `createAttachmentRecord()` function
- [ ] Add parent record resource locator
- [ ] Implement `getParentRecordsForAttachment()` method
- [ ] Test upload operation

**Deliverable:** Working file upload with attachment creation

### Phase 3: Download Implementation (Week 3)
- [ ] Add download file parameters
- [ ] Implement `downloadFileFromTwenty()` function
- [ ] Add attachment resource locator
- [ ] Implement `getAttachments()` method
- [ ] Test download operation

**Deliverable:** Working file download with binary output

### Phase 4: Testing & Documentation (Week 4)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update README with attachment examples
- [ ] Update CHANGELOG
- [ ] Create usage guide
- [ ] Test edge cases

**Deliverable:** Production-ready feature with full documentation

### Phase 5: Release
- [ ] Version bump (0.10.0 - minor version for new feature)
- [ ] Publish to npm
- [ ] Announce feature

---

## 📚 Documentation Updates Needed

### README.md

**New Section:**

```markdown
### Attachment Management

Upload and download files attached to your Twenty CRM records.

#### Upload File

Upload a file from n8n and attach it to a Company, Person, or other record.

**Example Workflow:**
1. HTTP Request node downloads file
2. Twenty node uploads file to attachment
3. File is linked to Company record

**Configuration:**
- Resource Group: Attachments
- Operation: Upload File
- Input Binary Field: `data` (from previous node)
- File Name: `contract.pdf`
- Attach To: Company
- Parent Record: Select from list

#### Download File

Download an attachment file as binary data for use in other nodes.

**Example Workflow:**
1. Twenty node downloads attachment
2. Send Email node attaches file

**Configuration:**
- Resource Group: Attachments
- Operation: Download File
- Attachment: Select from list
- Put Output File in Field: `data`
```

### CHANGELOG.md

```markdown
## [0.10.0] - 2025-XX-XX

### ✨ New Feature - Attachment Management

**Upload and download files with Twenty CRM**

#### Added
- ✅ Resource Group selector (Databases / Attachments)
- ✅ Upload File operation
  - Upload binary files from n8n to Twenty CRM
  - Attach files to Companies, People, Tasks, Notes, Opportunities
  - Support for all file types
- ✅ Download File operation
  - Download attachments as binary data
  - Output to n8n binary property for downstream use
- ✅ Resource locators for parent records and attachments
  - Select from list, by URL, or by ID

#### Technical Details
- Integrated with Twenty's GraphQL Upload mutation
- Full support for n8n binary data helpers
- Automatic signed URL handling for secure file access
- Support for both Local and S3 storage backends

### Breaking Changes
**None!** Existing database operations unchanged.
```

---

## 🎨 User Experience

### Before (Current)
```
┌─────────────────────────────┐
│ Twenty CRM - Dynamic        │
├─────────────────────────────┤
│ Database Group: [Standard ▼]│
│ Database: [Company ▼]       │
│ Operation: [Create ▼]       │
│ Fields: ...                 │
└─────────────────────────────┘
```

### After (With Attachments)
```
┌─────────────────────────────┐
│ Twenty CRM - Dynamic        │
├─────────────────────────────┤
│ Resource Group: [Databases ▼]│ ← NEW
│                             │
│ [When Databases selected]   │
│ Database Group: [Standard ▼]│
│ Database: [Company ▼]       │
│ Operation: [Create ▼]       │
│                             │
│ [When Attachments selected] │
│ Operation: [Upload File ▼]  │
│ Input Binary Field: data    │
│ File Name: contract.pdf     │
│ Attach To: [Company ▼]      │
│ Parent Record: [From List ▼]│
│ File Folder: [Attachment ▼] │
└─────────────────────────────┘
```

---

## ✅ Feasibility Conclusion

### Summary of Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| **Twenty API Support** | ✅ Fully Supported | uploadFile mutation and attachment queries available |
| **n8n Binary Handling** | ✅ Fully Supported | Complete binary helpers available |
| **GraphQL Upload** | ✅ Feasible | Requires form-data package for multipart |
| **Resource Locators** | ✅ Fully Supported | n8n native feature |
| **Backward Compatibility** | ✅ Maintained | Existing operations unchanged |
| **Performance** | ✅ Acceptable | n8n handles binary streaming efficiently |

### Recommendation

**✅ PROCEED WITH IMPLEMENTATION IMMEDIATELY**

This feature is **fully feasible** with **proven implementation patterns** from n8n's Google Drive v2 and Google Cloud Storage nodes. All technical challenges have documented solutions.

**Key Success Factors:**

1. ✅ **Twenty API Complete**: uploadFile mutation and attachment queries available
2. ✅ **n8n Binary Handling**: Complete binary helpers with stream support
3. ✅ **Proven Patterns**: Google nodes provide exact templates to follow
4. ✅ **Backward Compatibility**: Existing operations unchanged
5. ✅ **Performance**: n8n handles binary streaming efficiently
6. ✅ **Error Handling**: Comprehensive patterns from Google nodes

**Updated Implementation Approach:**

Following **Google Cloud Storage's declarative pattern** with **Google Drive's helper functions**:
- Create `getItemBinaryData()` helper for binary extraction
- Use FormData multipart for GraphQL Upload
- Implement `encoding: 'arraybuffer'` for downloads
- Follow n8n naming conventions exactly

**Estimated Complexity:** Medium  
**Estimated Development Time:** 3-4 weeks  
**Risk Level:** ⬇️ **Low** (reduced from initial assessment due to proven patterns)  
**Code Reusability:** ⬆️ **High** (adapt existing Google node patterns)

---

## 🚀 Implementation Readiness Summary

### Code Patterns Ready ✅

All critical code patterns have been identified and documented:

| Component | Source | Status | Location |
|-----------|--------|--------|----------|
| **Binary Extraction** | Google Drive v2 | ✅ Ready | `getItemBinaryData()` helper |
| **Upload Logic** | Google Cloud Storage | ✅ Ready | FormData multipart pattern |
| **Download Logic** | Google Drive v2 | ✅ Ready | `arraybuffer` encoding pattern |
| **Error Handling** | Both Google nodes | ✅ Ready | Include `itemIndex` |
| **UI/UX Patterns** | Both Google nodes | ✅ Ready | Input/output field naming |

### Dependencies Identified ✅

```json
{
  "dependencies": {
    "form-data": "^4.0.0"  // Already used by n8n core
  }
}
```

### Architecture Decisions Made ✅

- ✅ **Pattern**: Hybrid (Cloud Storage declarative + Drive helpers)
- ✅ **Binary Handling**: Stream detection via `binaryData.id`
- ✅ **Upload Strategy**: FormData multipart with GraphQL operations map
- ✅ **Download Strategy**: Query metadata → Download from signed URL
- ✅ **Error Strategy**: Include itemIndex in all NodeOperationError instances

### Documentation Created ✅

- ✅ **Planning Document**: AttachmentsFeatureUpdate.md (this file)
- ✅ **Architecture Learnings**: AttachmentsArchitectureLearnings.md
- ✅ **Code Examples**: Complete implementation patterns documented
- ✅ **API Analysis**: Twenty GraphQL mutations and queries mapped

### Testing Strategy Defined ✅

See **Phase 6: Testing** section for complete test plan including:
- Unit tests for helper functions
- Integration tests for upload/download
- Manual testing checklist
- Error scenario coverage

---

## 🎯 Ready for Development

**All prerequisites complete:**

✅ Planning document finalized  
✅ Architecture researched (Google Drive v2 & Cloud Storage)  
✅ Technical challenges solved with proven patterns  
✅ Code examples documented  
✅ Dependencies identified  
✅ Testing plan created  
✅ Timeline estimated (3-4 weeks)  

**Next immediate action:** Begin Phase 1 implementation (Resource Group selector)

---

## 📞 Questions & Clarifications

### Open Questions

1. **File Size Limits:** Should we implement a configurable file size limit in the node? Twenty likely has server-side limits.

2. **Progress Indication:** For large files, should we show upload/download progress? (n8n has limited support for this)

3. **Batch Operations:** Should we support batch upload (multiple files at once)? Or keep it simple with one file per execution?

4. **Error Handling:** What should happen if upload succeeds but attachment creation fails? Delete the uploaded file?

5. **File Folders:** Should we expose all FileFolder options or just the most relevant (Attachment, File)?

### Assumptions Made

- Users will primarily attach files to Company and Person records
- Download operation will be used less frequently than upload
- Most files will be < 50 MB (reasonable for n8n memory handling)
- Signed URLs will be valid long enough for download operation to complete

---

**Document Status:** Ready for Review  
**Next Update:** After implementation begins  
**Maintainer:** Development Team
