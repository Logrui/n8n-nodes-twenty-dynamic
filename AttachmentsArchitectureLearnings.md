# Attachments Feature Update - Architecture Learnings from Google Nodes

**Addendum to:** AttachmentsFeatureUpdate.md  
**Date:** October 15, 2025  
**Sources Analyzed:** 
- Google Drive v2 Node (`GoogleDriveV2.node.ts`)
- Google Cloud Storage Node (`GoogleCloudStorage.node.ts`)

---

## 🎓 Key Learnings from Google Drive & Cloud Storage Nodes

After analyzing n8n's official Google Drive v2 and Google Cloud Storage implementations, here are critical insights that will improve our Twenty CRM Attachments implementation:

---

## 1. 📁 Node Architecture Pattern

### Google Drive v2 Architecture (Recommended Pattern)

```
GoogleDriveV2.node.ts (Main Node)
├── actions/
│   ├── router.ts              # Routes operations to handlers
│   ├── versionDescription.ts  # Node metadata
│   ├── file/
│   │   ├── File.resource.ts   # Resource descriptions
│   │   ├── upload.operation.ts
│   │   ├── download.operation.ts
│   │   ├── delete.operation.ts
│   │   └── ... (other operations)
│   └── folder/
├── helpers/
│   └── utils.ts               # Shared utilities
├── methods/
│   └── listSearch.ts          # Resource locator methods
└── transport/
    └── api.ts                 # API request wrappers
```

**Benefits:**
- ✅ **Modular**: Each operation is self-contained
- ✅ **Maintainable**: Easy to add new operations
- ✅ **Testable**: Isolated operation logic
- ✅ **Scalable**: Clean separation of concerns

### Google Cloud Storage Architecture (Declarative Pattern)

```
GoogleCloudStorage.node.ts (All-in-One)
├── BucketDescription.ts       # Bucket operations & fields
├── ObjectDescription.ts        # Object operations & fields
└── Inline routing/send/output handlers
```

**Benefits:**
- ✅ **Declarative**: Uses n8n's routing system
- ✅ **Concise**: Less boilerplate code
- ✅ **Integrated**: Request/response handling in one place

---

## 2. 🔧 Binary Data Handling Patterns

### Key Helper Functions Used

Both nodes extensively use these n8n binary helpers:

```typescript
// 1. Assert binary data exists
this.helpers.assertBinaryData(itemIndex, propertyName);

// 2. Get binary stream (for large files)
const stream = await this.helpers.getBinaryStream(binaryData.id, chunkSize);
const metadata = await this.helpers.getBinaryMetadata(binaryData.id);

// 3. Get binary buffer (for small files)
const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);

// 4. Prepare binary data (for output)
const binaryData = await this.helpers.prepareBinaryData(
    buffer,
    fileName,
    mimeType
);
```

### Google Drive Upload Pattern (CRITICAL LEARNING)

**Two Upload Strategies Based on Data Type:**

#### Strategy A: Buffer Upload (Small Files)
```typescript
if (Buffer.isBuffer(fileContent)) {
    const multiPartBody = new FormData();
    multiPartBody.append('metadata', JSON.stringify(metadata), {
        contentType: 'application/json',
    });
    multiPartBody.append('data', fileContent, {
        contentType: mimeType,
        knownLength: contentLength,
    });

    const response = await googleApiRequest.call(
        this,
        'POST',
        '/upload/drive/v3/files',
        multiPartBody.getBuffer(),
        { uploadType: 'multipart' },
        undefined,
        {
            headers: {
                'Content-Type': `multipart/related; boundary=${multiPartBody.getBoundary()}`,
                'Content-Length': multiPartBody.getLengthSync(),
            },
        },
    );
}
```

**Key Takeaways:**
- Uses `FormData` from `form-data` npm package
- Appends metadata as JSON part
- Appends file as binary part
- Sets proper multipart headers with boundary
- Single request for small files

#### Strategy B: Resumable Upload (Large Files via Stream)
```typescript
else {
    // 1. Initiate resumable upload
    const resumableUpload = await googleApiRequest.call(
        this,
        'POST',
        '/upload/drive/v3/files',
        metadata,
        { uploadType: 'resumable' },
        undefined,
        {
            returnFullResponse: true,
            headers: {
                'X-Upload-Content-Type': mimeType,
            },
        },
    );

    const uploadUrl = resumableUpload.headers.location;

    // 2. Upload in chunks (2MB chunks)
    const chunkSizeBytes = 2048 * 1024;  // Must be multiple of 256kB

    await processInChunks(fileContent, chunkSizeBytes, async (chunk, offset) => {
        const response = await this.helpers.httpRequest({
            method: 'PUT',
            url: uploadUrl,
            headers: {
                'Content-Length': chunk.length,
                'Content-Range': `bytes ${offset}-${offset + chunk.byteLength - 1}/${contentLength}`,
            },
            body: chunk,
        });
    });
}
```

**Key Takeaways:**
- Two-phase upload: initiate → upload chunks
- Chunks must be multiples of 256kB
- Uses `Content-Range` header for each chunk
- Handles large files without memory issues
- Uses stream processing with `processInChunks` helper

### Google Cloud Storage Upload Pattern

**Simpler Multipart Approach:**

```typescript
// In preSend hook
const body = new FormData();

// Append metadata
body.append('metadata', JSON.stringify(metadata), {
    contentType: 'application/json',
});

// Determine content source
let content: string | Buffer | Readable;
let contentType: string;
let contentLength: number;

const useBinary = this.getNodeParameter('createFromBinary') as boolean;

if (useBinary) {
    const binaryPropertyName = this.getNodeParameter('createBinaryPropertyName') as string;
    const binaryData = this.helpers.assertBinaryData(binaryPropertyName);
    
    if (binaryData.id) {
        // Stream for large files
        content = await this.helpers.getBinaryStream(binaryData.id);
        const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
        contentType = metadata.mimeType ?? 'application/octet-stream';
        contentLength = metadata.fileSize;
    } else {
        // Buffer for small files
        content = Buffer.from(binaryData.data, BINARY_ENCODING);
        contentType = binaryData.mimeType;
        contentLength = content.length;
    }
} else {
    // Text content
    content = this.getNodeParameter('createContent') as string;
    contentType = 'text/plain';
    contentLength = content.length;
}

body.append('file', content, { contentType, knownLength: contentLength });

// Set headers
requestOptions.headers['Content-Length'] = body.getLengthSync();
requestOptions.headers['Content-Type'] = `multipart/related; boundary=${body.getBoundary()}`;

requestOptions.body = body;
```

**Key Takeaways:**
- Checks for `binaryData.id` to determine if streaming is needed
- Uses `getBinaryStream()` for large files
- Uses `Buffer.from()` for small files
- Properly sets `Content-Length` and boundary
- Supports both binary and text content

---

## 3. 📥 Download Patterns

### Google Drive Download Pattern

```typescript
export async function execute(this: IExecuteFunctions, i: number, item: INodeExecutionData) {
    const fileId = this.getNodeParameter('fileId', i, undefined, {
        extractValue: true,
    }) as string;

    const downloadOptions = this.getNodeParameter('options', i);

    const requestOptions = {
        useStream: true,
        returnFullResponse: true,
        encoding: 'arraybuffer',  // CRITICAL: Get response as binary
        json: false,               // CRITICAL: Don't parse as JSON
    };

    // Get file metadata first
    const file = await googleApiRequest.call(
        this,
        'GET',
        `/drive/v3/files/${fileId}`,
        {},
        { fields: 'mimeType,name' },
    );

    // Download file content
    const response = await googleApiRequest.call(
        this,
        'GET',
        `/drive/v3/files/${fileId}`,
        {},
        { alt: 'media' },  // CRITICAL: Request file content, not metadata
        undefined,
        requestOptions,
    );

    // Extract metadata
    const mimeType = response.headers?.['content-type'] ?? file.mimeType;
    const fileName = downloadOptions.fileName ?? file.name;

    // Prepare binary data
    const dataPropertyName = downloadOptions.binaryPropertyName || 'data';

    item.binary![dataPropertyName] = await this.helpers.prepareBinaryData(
        response.body as Buffer,
        fileName,
        mimeType,
    );

    return [item];
}
```

**Key Takeaways:**
- Set `encoding: 'arraybuffer'` for binary response
- Set `json: false` to prevent JSON parsing
- Use `alt=media` query parameter to get file content
- Separate metadata request from content request
- Use `prepareBinaryData()` to create proper binary format
- Preserve existing binary data if present

### Google Cloud Storage Download Pattern (Declarative)

```typescript
{
    name: 'Get',
    value: 'get',
    routing: {
        request: {
            method: 'GET',
            url: '={{"/b/" + $parameter["bucketName"] + "/o/" + $parameter["objectName"]}}',
            returnFullResponse: true,
            qs: {
                alt: '={{$parameter["alt"]}}',  // 'media' or 'json'
            },
        },
        send: {
            preSend: [
                async function (this, requestOptions) {
                    const datatype = this.getNodeParameter('alt') as string;
                    
                    if (datatype === 'media') {
                        requestOptions.encoding = 'arraybuffer';  // Binary mode
                    }
                    
                    return requestOptions;
                },
            ],
        },
        output: {
            postReceive: [
                async function (this, items, responseData) {
                    const datatype = this.getNodeParameter('alt') as string;

                    if (datatype === 'media') {
                        const destinationName = this.getNodeParameter('binaryPropertyName') as string;
                        const fileName = this.getNodeParameter('objectName') as string;
                        
                        const binaryData = await this.helpers.prepareBinaryData(
                            responseData.body as Buffer,
                            fileName,
                        );

                        // Transform items to binary output
                        items = items.map((item) => {
                            item.json = {};
                            item.binary = { [destinationName]: binaryData };
                            return item;
                        });
                    }
                    return items;
                },
            ],
        },
    },
}
```

**Key Takeaways:**
- Use `preSend` hook to set binary encoding conditionally
- Use `postReceive` hook to transform response to binary format
- Clear JSON data when outputting binary (`item.json = {}`)
- More declarative approach using n8n's routing system

---

## 4. 🎨 UI/UX Patterns

### Input Binary Field Pattern

**Google Drive Upload:**
```typescript
{
    displayName: 'Input Data Field Name',
    name: 'inputDataFieldName',
    type: 'string',
    placeholder: 'e.g. data',
    default: 'data',
    required: true,
    hint: 'The name of the input field containing the binary file data to update the file',
    description: 'Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab',
}
```

**Google Cloud Storage Upload:**
```typescript
{
    displayName: 'Use Input Binary Field',
    name: 'createFromBinary',
    type: 'boolean',
    default: true,
    description: 'Whether to upload file data from a binary field',
},
{
    displayName: 'Input Binary Field Name',
    name: 'createBinaryPropertyName',
    type: 'string',
    default: 'data',
    displayOptions: {
        show: {
            createFromBinary: [true],
        },
    },
    placeholder: 'e.g. data',
    description: 'The name of the binary property to upload',
}
```

**Recommendation for Twenty:**
- Use **toggle approach** (like Cloud Storage) to support both binary and manual input
- Provide clear hints and descriptions
- Default to `'data'` as binary field name (n8n convention)

### Output Binary Field Pattern

**Consistent across both:**
```typescript
{
    displayName: 'Put Output File in Field',
    name: 'binaryPropertyName',
    type: 'string',
    placeholder: 'e.g. data',
    default: 'data',
    description: 'Use this field name in the following nodes, to use the binary file data',
    hint: 'The name of the output binary field to put the file in',
}
```

**Recommendation for Twenty:**
- Use exact same pattern
- Emphasize it's for "following nodes" in description

### File Name Handling

**Google Drive (Flexible):**
```typescript
{
    displayName: 'File Name',
    name: 'name',
    type: 'string',
    default: '',
    placeholder: 'e.g. My New File',
    description: 'If not specified, the original file name will be used',
}

// In execution:
const name = (this.getNodeParameter('name', i) as string) || originalFilename;
```

**Recommendation for Twenty:**
- Allow optional file name override
- Fall back to original filename from binary data
- Support expressions

---

## 5. 🔄 Resource Locator Best Practices

### Pattern from Google Drive v2

```typescript
// In common.descriptions.ts
export const fileRLC: INodeProperties = {
    displayName: 'File',
    name: 'fileId',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            placeholder: 'Select a file...',
            typeOptions: {
                searchListMethod: 'fileSearch',
                searchable: true,
            },
        },
        {
            displayName: 'By URL',
            name: 'url',
            type: 'string',
            placeholder: 'https://drive.google.com/file/d/1mJZJxxx/view',
            extractValue: {
                type: 'regex',
                regex: 'https://drive.google.com/file/d/([0-9a-zA-Z\\-_]+)/.*',
            },
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: 'https://drive.google.com/file/d/([0-9a-zA-Z\\-_]+)/.*',
                        errorMessage: 'Not a valid Google Drive File URL',
                    },
                },
            ],
        },
        {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. 1mJZJxxx',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '[a-zA-Z0-9\\-_]+',
                        errorMessage: 'Not a valid File ID',
                    },
                },
            ],
        },
    ],
};
```

**Key Features:**
- Reusable RLC definitions
- Proper regex validation
- URL extraction patterns
- Clear placeholders
- Custom error messages

**Recommendation for Twenty:**
- Create reusable RLC definitions in separate file
- Validate Twenty UUID format: `^[a-f0-9-]{36}$`
- Extract ID from Twenty URLs: `https://app.twenty.com/objects/{type}/{id}`

---

## 6. 🚀 Upload Strategy Decision Tree

Based on the patterns observed, here's the recommended decision tree:

```
┌─────────────────────────────────┐
│ Is binaryData.id present?       │
└────────────┬────────────────────┘
             │
        ┌────┴────┐
        │         │
       YES       NO
        │         │
        ▼         ▼
┌───────────┐  ┌──────────────┐
│  STREAM   │  │   BUFFER     │
│ (Large)   │  │   (Small)    │
└─────┬─────┘  └──────┬───────┘
      │                │
      ▼                ▼
┌───────────────┐  ┌──────────────────┐
│ getBinaryStream│  │ Buffer.from(     │
│ getBinaryMetadata│  │  data, base64) │
└───────────────┘  └──────────────────┘
      │                │
      ▼                ▼
┌────────────────┐  ┌────────────────┐
│ Resumable      │  │ Multipart      │
│ Upload (Chunks)│  │ Upload (1 req) │
└────────────────┘  └────────────────┘
```

---

## 7. 📦 Implementation Recommendations for Twenty

### Architecture Choice

**Recommendation: HYBRID APPROACH**

Use **Google Cloud Storage's declarative pattern** for simplicity, but with **Google Drive's modular structure** for maintainability:

```
TwentyApi.client.ts
├── uploadAttachment()       # Handle FormData construction
├── downloadAttachment()     # Handle binary response
└── createAttachmentRecord() # Link file to parent

Twenty.node.ts
└── Declarative routing with preSend/postReceive hooks
```

### Upload Implementation Pattern

```typescript
// Use Google Cloud Storage pattern with Twenty GraphQL
async function uploadAttachment(this: IExecuteFunctions, i: number) {
    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
    const fileName = this.getNodeParameter('fileName', i) as string;
    const fileFolder = this.getNodeParameter('fileFolder', i) as 'attachment' | 'file';

    // Assert and get binary data
    const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

    let content: string | Buffer | Readable;
    let contentType: string;
    let contentLength: number;

    if (binaryData.id) {
        // STREAM: Large file
        content = await this.helpers.getBinaryStream(binaryData.id);
        const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
        contentType = metadata.mimeType ?? 'application/octet-stream';
        contentLength = metadata.fileSize;
    } else {
        // BUFFER: Small file
        content = Buffer.from(binaryData.data, BINARY_ENCODING);
        contentType = binaryData.mimeType ?? 'application/octet-stream';
        contentLength = content.length;
    }

    // Construct GraphQL multipart request
    const FormData = require('form-data');
    const form = new FormData();

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
            file: null,
            fileFolder: fileFolder,
        },
    }));

    form.append('map', JSON.stringify({ '0': ['variables.file'] }));
    form.append('0', content, {
        filename: fileName,
        contentType: contentType,
        knownLength: contentLength,
    });

    // Send request
    const response = await this.helpers.httpRequestWithAuthentication.call(
        this,
        'twentyApi',
        {
            method: 'POST',
            url: `${domain}/graphql`,
            body: form,
            headers: {
                ...form.getHeaders(),
                'Content-Length': form.getLengthSync(),
            },
        },
    );

    return response.data.uploadFile;
}
```

### Download Implementation Pattern

```typescript
async function downloadAttachment(this: IExecuteFunctions, i: number, item: INodeExecutionData) {
    const attachmentId = this.getNodeParameter('attachmentId', i, undefined, {
        extractValue: true,
    }) as string;
    
    const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i, 'data') as string;

    // 1. Get attachment metadata (name, fullPath with signed URL)
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

    const attachmentData = await twentyApiRequest.call(this, 'graphql', query, { id: attachmentId });
    const attachment = attachmentData.attachment;

    // 2. Download file from signed URL
    const fileResponse = await this.helpers.httpRequest({
        method: 'GET',
        url: attachment.fullPath,
        encoding: 'arraybuffer',  // CRITICAL
        json: false,               // CRITICAL
        returnFullResponse: true,
    });

    // 3. Prepare binary data
    const binaryData = await this.helpers.prepareBinaryData(
        fileResponse.body as Buffer,
        attachment.name,
        attachment.type || 'application/octet-stream',
    );

    // 4. Create output item
    const newItem: INodeExecutionData = {
        json: {
            attachmentId: attachment.id,
            fileName: attachment.name,
            mimeType: attachment.type,
            size: (fileResponse.body as Buffer).length,
        },
        binary: {
            [outputBinaryPropertyName]: binaryData,
        },
    };

    // Preserve existing binary data
    if (item.binary) {
        Object.assign(newItem.binary, item.binary);
    }

    return [newItem];
}
```

---

## 8. 🎯 Updated Implementation Checklist

### Upload File Operation

- [ ] **Binary Input Field**
  - [ ] Add toggle: "Use Binary Field" vs "Manual Content"
  - [ ] Binary field name input (default: 'data')
  - [ ] Validate binary data exists with `assertBinaryData()`

- [ ] **Stream vs Buffer Detection**
  - [ ] Check for `binaryData.id`
  - [ ] Use `getBinaryStream()` + `getBinaryMetadata()` for large files
  - [ ] Use `Buffer.from(data, BINARY_ENCODING)` for small files

- [ ] **FormData Construction**
  - [ ] Import `form-data` package
  - [ ] Append GraphQL operations
  - [ ] Append map for file variable
  - [ ] Append file with proper content type and length

- [ ] **File Name Handling**
  - [ ] Allow optional override
  - [ ] Fall back to original filename
  - [ ] Support expressions

- [ ] **Parent Record Linking**
  - [ ] Resource locator for parent
  - [ ] Support Company, Person, Task, Note, Opportunity
  - [ ] Optional (allow standalone uploads)

### Download File Operation

- [ ] **Attachment Selection**
  - [ ] Resource locator (List, URL, ID)
  - [ ] UUID validation
  - [ ] URL extraction pattern

- [ ] **Binary Response Handling**
  - [ ] Set `encoding: 'arraybuffer'`
  - [ ] Set `json: false`
  - [ ] Use `returnFullResponse: true`

- [ ] **Metadata Retrieval**
  - [ ] Query attachment for name, type, fullPath
  - [ ] Download from signed URL
  - [ ] Extract mimeType from response headers

- [ ] **Binary Data Preparation**
  - [ ] Use `prepareBinaryData()` helper
  - [ ] Set output binary property name
  - [ ] Preserve existing binary fields
  - [ ] Include file metadata in JSON

### Testing Checklist

- [ ] **Upload Tests**
  - [ ] Small file (< 1 MB) via buffer
  - [ ] Large file (> 5 MB) via stream
  - [ ] Different file types (PDF, image, text)
  - [ ] With parent record
  - [ ] Without parent record
  - [ ] Filename override
  - [ ] Expression in filename

- [ ] **Download Tests**
  - [ ] Download and verify checksum
  - [ ] Different file types
  - [ ] Custom output field name
  - [ ] Download then upload (round-trip)

- [ ] **Error Handling**
  - [ ] Missing binary data
  - [ ] Invalid attachment ID
  - [ ] Expired signed URL
  - [ ] Network timeout

---

## 9. 📝 Code Quality Standards from Google Nodes

### Error Handling Pattern

```typescript
// Google Drive pattern
if (!inputDataFieldName) {
    throw new NodeOperationError(
        this.getNode(),
        'The name of the input field containing the binary file data must be set',
        { itemIndex: i },
    );
}

// Always include itemIndex for debugging
this.helpers.assertBinaryData(i, inputDataFieldName);
```

### Type Safety

```typescript
// Explicit type extraction
const fileId = this.getNodeParameter('fileId', i, undefined, {
    extractValue: true,  // Extract value from resource locator
}) as string;

// Proper type guards
if (Buffer.isBuffer(fileContent)) {
    // Handle buffer
} else {
    // Handle stream
}
```

### Helper Function Abstraction

```typescript
// Google Drive creates reusable helpers
async function getItemBinaryData(
    this: IExecuteFunctions,
    inputDataFieldName: string,
    i: number,
) {
    // ... complex logic
    return {
        contentLength,
        fileContent,
        originalFilename,
        mimeType,
    };
}

// Used in operations
const { contentLength, fileContent, originalFilename, mimeType } = 
    await getItemBinaryData.call(this, inputDataFieldName, i);
```

---

## 10. 🎁 Bonus: Useful Utilities to Copy

### Process in Chunks (from Google Drive)

```typescript
export async function processInChunks(
    stream: Readable,
    chunkSize: number,
    process: (chunk: Buffer, offset: number) => void | Promise<void>,
) {
    let buffer = Buffer.alloc(0);
    let offset = 0;

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length >= chunkSize) {
            const chunkToProcess = buffer.subarray(0, chunkSize);
            await process(chunkToProcess, offset);

            buffer = buffer.subarray(chunkSize);
            offset += chunkSize;
        }
    }

    // Process last chunk
    if (buffer.length > 0) {
        await process(buffer, offset);
    }
}
```

**Use Case:** If Twenty needs resumable uploads for very large files

### Construct Execution Metadata (from Google Drive)

```typescript
// Add execution metadata for better traceability
const executionData = this.helpers.constructExecutionMetaData(
    [item],
    { itemData: { item: i } }
);

return executionData;
```

---

## 🎯 Final Recommendations

### Must Implement

1. **Binary Data Detection Pattern** ✅ CRITICAL
   - Check `binaryData.id` to choose stream vs buffer
   - Use proper helpers for each case

2. **FormData Multipart Upload** ✅ CRITICAL
   - Follow Google Cloud Storage pattern exactly
   - Proper boundary and content-length headers

3. **Binary Download Pattern** ✅ CRITICAL
   - Set `encoding: 'arraybuffer'` and `json: false`
   - Use `prepareBinaryData()` for output

4. **Error Handling** ✅ CRITICAL
   - Include `itemIndex` in all errors
   - Use `assertBinaryData()` for validation

### Nice to Have

5. **Resumable Upload** ⭐ OPTIONAL
   - Only if supporting files > 50MB
   - Use Google Drive's chunking pattern

6. **File Type Conversion** ⭐ OPTIONAL
   - Like Google Drive's Google Docs conversion
   - Twenty doesn't need this

7. **Advanced Options** ⭐ OPTIONAL
   - Simplify output toggle
   - ACL/permissions settings

---

## 📊 Comparison Matrix

| Feature | Google Drive v2 | Google Cloud Storage | Recommended for Twenty |
|---------|----------------|---------------------|----------------------|
| **Architecture** | Modular (router) | Declarative (routing) | Declarative ✅ |
| **Upload Strategy** | Buffer + Resumable | Buffer + Stream | Buffer + Stream ✅ |
| **Binary Detection** | `binaryData.id` check | `binaryData.id` check | `binaryData.id` check ✅ |
| **FormData Library** | `form-data` | `form-data` | `form-data` ✅ |
| **Download Encoding** | `arraybuffer` | `arraybuffer` | `arraybuffer` ✅ |
| **Resource Locators** | Yes | No | Yes ✅ |
| **Binary Toggle** | No | Yes | Yes ✅ |
| **Chunked Upload** | Yes | No | No (unless needed) |

---

## ✅ Implementation Priority

### Phase 1: Core Upload/Download (Week 1-2)
Based on **Google Cloud Storage** pattern:
- Binary data detection
- FormData multipart upload
- Binary download with proper encoding
- Resource locators for attachments

### Phase 2: Parent Linking (Week 2-3)
Based on **Google Drive** resource locator pattern:
- Parent record resource locators
- Dynamic loading based on attach type
- Validation

### Phase 3: Polish (Week 3-4)
Inspired by both nodes:
- Error handling improvements
- Helper function abstractions
- Testing
- Documentation

---

**CONCLUSION:** The Google Drive v2 and Google Cloud Storage nodes provide excellent, production-tested patterns for binary data handling in n8n. The key insights are:

1. ✅ Use `binaryData.id` to detect streaming needs
2. ✅ Use `form-data` for multipart uploads
3. ✅ Set `encoding: 'arraybuffer'` for binary downloads
4. ✅ Use n8n's binary helpers consistently
5. ✅ Follow established UI/UX patterns

These patterns will ensure our Twenty Attachments feature is **robust, performant, and maintainable**.

---

**Next Step:** Update `AttachmentsFeatureUpdate.md` with these implementation patterns in Phase 5 (Backend Implementation).
