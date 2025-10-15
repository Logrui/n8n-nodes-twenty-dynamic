import {
    IExecuteFunctions,
    INodeType,
    INodeTypeDescription,
    INodePropertyOptions,
    ILoadOptionsFunctions,
    INodeExecutionData,
    NodeOperationError,
} from 'n8n-workflow';
import {
    getCachedSchema,
    ISchemaMetadata,
    getDataSchemaForObject,
    buildCreateMutation,
    buildUpdateMutation,
    twentyApiRequest,
    twentyRestApiRequest,
    queryGraphQLType,
    queryEnumValues,
    IFieldMetadata,
    getCleanFieldLabel,
} from './TwentyApi.client';
import { transformFieldsData, IFieldData } from './FieldTransformation';
import { 
    executeUpsert,
    executeCreateMany,
    executeGetMany,
    executeUpdateMany,
    executeDeleteMany,
    executeUpsertMany,
} from './operations';

export class Twenty implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Twenty CRM - Dynamic',
        name: 'twenty',
        icon: 'file:twenty.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interact with Twenty CRM - supporting standard and custom data models - dynamically adapts to your database schema.',
        defaults: {
            name: 'Twenty CRM - Dynamic',
        },
        inputs: ['main'] as any,
        outputs: ['main'] as any,
        credentials: [
            {
                name: 'twentyApi',
                required: true,
            },
        ],
        properties: [
            // Database Group selection
            {
                displayName: 'Database Group',
                name: 'resourceGroup',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'All Databases',
                        value: 'all',
                        description: 'Show all available databases in your Twenty CRM workspace',
                    },
                    {
                        name: 'Custom Databases',
                        value: 'custom',
                        description: 'Your user-created custom databases with your own data models',
                    },
                    {
                        name: 'Standard Databases',
                        value: 'standard',
                        description: 'Your core Twenty CRM databases (Company, Person, Opportunity, etc.)',
                    },
                    {
                        name: 'System Databases',
                        value: 'system',
                        description: 'Hidden Twenty system databases not normally accessible to users - Advanced use only',
                    },
                ],
                default: 'standard',
                required: true,
                description: 'Filter databases by group to narrow down the selection',
            },
            // Database selection
            {
                displayName: 'Database Name or ID',
                name: 'resource',
                type: 'options',
																noDataExpression: true,
                typeOptions: {
                    loadOptionsMethod: 'getResources',
                    loadOptionsDependsOn: ['resourceGroup'],
                },
                default: '',
                required: true,
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
            },
            // Operation selection
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                // Show operation field when any database is selected
                // displayOptions: show when resource field has any value
                options: [
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Create a new record',
                        action: 'Create a record',
                    },
                    {
                        name: 'Create Many',
                        value: 'createMany',
                        description: 'Create multiple new records at once',
                        action: 'Create many records',
                    },
                    {
                        name: 'Create or Update',
                        value: 'upsert',
                        description: 'Create a new record, or update the current one if it already exists (upsert)',
                        action: 'Create or update a record',
                    },
                    {
                        name: 'Create or Update Many',
                        value: 'upsertMany',
                        description: 'Create or update multiple records at once',
                        action: 'Create or update many records',
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                        description: 'Delete a record by ID',
                        action: 'Delete a record',
                    },
                    {
                        name: 'Delete Many',
                        value: 'deleteMany',
                        description: 'Delete multiple records by IDs',
                        action: 'Delete many records',
                    },
                    {
                        name: 'Get',
                        value: 'get',
                        description: 'Retrieve a single record by ID',
                        action: 'Get a record',
                    },
                    {
                        name: 'Get Many',
                        value: 'getMany',
                        description: 'Retrieve multiple records by IDs',
                        action: 'Get many records',
                    },
                    {
                        name: 'List/Search',
                        value: 'findMany',
                        description: 'Get multiple records with optional filters',
                        action: 'List records',
                    },
                    {
                        name: 'Update',
                        value: 'update',
                        description: 'Update an existing record',
                        action: 'Update a record',
                    },
                    {
                        name: 'Update Many',
                        value: 'updateMany',
                        description: 'Update multiple records at once',
                        action: 'Update many records',
                    },
                ],
                default: 'create',
                required: true,
            },
            // Record ID (for Get operation) - using resourceLocator pattern
            {
                displayName: 'Record',
                name: 'recordId',
                type: 'resourceLocator',
                default: { mode: 'list', value: '' },
                required: true,
                displayOptions: {
                    show: {
                        operation: ['get'],
                    },
                },
                modes: [
                    {
                        displayName: 'From List',
                        name: 'list',
                        type: 'list',
                        placeholder: 'Select a record...',
                        typeOptions: {
                            searchListMethod: 'getRecordsForDatabase',
                            searchable: true,
                        },
                    },
                    {
                        displayName: 'By URL',
                        name: 'url',
                        type: 'string',
                        placeholder: 'https://app.twenty.com/objects/companies/123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: 'https?://.*?/objects/[^/]+/([a-f0-9-]{36})',
                                    errorMessage: 'Not a valid Twenty record URL',
                                },
                            },
                        ],
                        extractValue: {
                            type: 'regex',
                            regex: 'https?://.*?/objects/[^/]+/([a-f0-9-]{36})',
                        },
                    },
                    {
                        displayName: 'By ID',
                        name: 'id',
                        type: 'string',
                        placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: '^[a-f0-9-]{36}$',
                                    errorMessage: 'Not a valid UUID',
                                },
                            },
                        ],
                    },
                ],
                description: 'The record to retrieve from the selected database',
            },
            // Record ID field (for Delete operation) - now uses resourceLocator like Get
            {
                displayName: 'Record',
                name: 'recordIdDelete',
                type: 'resourceLocator',
                default: { mode: 'list', value: '' },
                required: true,
                displayOptions: {
                    show: {
                        operation: ['delete'],
                    },
                },
                description: 'The record to delete from the selected database. ⚠️ Delete operations are permanent and cannot be undone.',
                modes: [
                    {
                        displayName: 'From List',
                        name: 'list',
                        type: 'list',
                        hint: 'Select a record from the dropdown list',
                        typeOptions: {
                            searchListMethod: 'getRecordsForDatabase',
                            searchable: true,
                            searchFilterRequired: false,
                        },
                    },
                    {
                        displayName: 'By URL',
                        name: 'url',
                        type: 'string',
                        hint: 'Paste the record URL from Twenty CRM',
                        placeholder: 'https://app.twenty.com/objects/people/123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: 'https?://.*?/objects/[^/]+/[a-f0-9-]{36}',
                                    errorMessage: 'Not a valid Twenty CRM record URL',
                                },
                            },
                        ],
                    },
                    {
                        displayName: 'By ID',
                        name: 'id',
                        type: 'string',
                        hint: 'Enter the record UUID directly',
                        placeholder: '123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: '^[a-f0-9-]{36}$',
                                    errorMessage: 'Not a valid UUID',
                                },
                            },
                        ],
                    },
                ],
            },
            // Record ID field (for Update operation) - now uses resourceLocator like Get and Delete
            {
                displayName: 'Record',
                name: 'recordIdUpdate',
                type: 'resourceLocator',
                default: { mode: 'list', value: '' },
                required: true,
                displayOptions: {
                    show: {
                        operation: ['update'],
                    },
                },
                description: 'The record to update in the selected database',
                modes: [
                    {
                        displayName: 'From List',
                        name: 'list',
                        type: 'list',
                        hint: 'Select a record from the dropdown list',
                        typeOptions: {
                            searchListMethod: 'getRecordsForDatabase',
                            searchable: true,
                            searchFilterRequired: false,
                        },
                    },
                    {
                        displayName: 'By URL',
                        name: 'url',
                        type: 'string',
                        hint: 'Paste the record URL from Twenty CRM',
                        placeholder: 'https://app.twenty.com/objects/people/123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: 'https?://.*?/objects/[^/]+/[a-f0-9-]{36}',
                                    errorMessage: 'Not a valid Twenty CRM record URL',
                                },
                            },
                        ],
                    },
                    {
                        displayName: 'By ID',
                        name: 'id',
                        type: 'string',
                        hint: 'Enter the record UUID directly',
                        placeholder: '123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: '^[a-f0-9-]{36}$',
                                    errorMessage: 'Not a valid UUID',
                                },
                            },
                        ],
                    },
                ],
            },
            // Upsert Mode - How to match existing records
            {
                displayName: 'Match By',
                name: 'upsertMode',
                type: 'options',
                displayOptions: {
                    show: {
                        operation: ['upsert'],
                    },
                },
                options: [
                    {
                        name: 'Record ID',
                        value: 'id',
                        description: 'Match by record UUID (if you already know the ID)',
                    },
                    {
                        name: 'Unique Field',
                        value: 'field',
                        description: 'Match by a unique field (e.g., email for people, domain for companies)',
                    },
                ],
                default: 'field',
                description: 'How to determine if a record already exists',
            },
            // Record ID field (for Upsert operation when matching by ID)
            {
                displayName: 'Record',
                name: 'recordIdUpsert',
                type: 'resourceLocator',
                default: { mode: 'list', value: '' },
                required: true,
                displayOptions: {
                    show: {
                        operation: ['upsert'],
                        upsertMode: ['id'],
                    },
                },
                description: 'The record to update if it exists. If not found, a new record will be created with the provided fields.',
                modes: [
                    {
                        displayName: 'From List',
                        name: 'list',
                        type: 'list',
                        hint: 'Select a record from the dropdown list',
                        typeOptions: {
                            searchListMethod: 'getRecordsForDatabase',
                            searchable: true,
                            searchFilterRequired: false,
                        },
                    },
                    {
                        displayName: 'By URL',
                        name: 'url',
                        type: 'string',
                        hint: 'Paste the record URL from Twenty CRM',
                        placeholder: 'https://app.twenty.com/objects/people/123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: 'https?://.*?/objects/[^/]+/[a-f0-9-]{36}',
                                    errorMessage: 'Not a valid Twenty CRM record URL',
                                },
                            },
                        ],
                    },
                    {
                        displayName: 'By ID',
                        name: 'id',
                        type: 'string',
                        hint: 'Enter the record UUID directly',
                        placeholder: '123e4567-e89b-12d3-a456-426614174000',
                        validation: [
                            {
                                type: 'regex',
                                properties: {
                                    regex: '^[a-f0-9-]{36}$',
                                    errorMessage: 'Not a valid UUID',
                                },
                            },
                        ],
                    },
                ],
            },
            // Match field for upsert (when matching by unique field)
            {
                displayName: 'Match Field Name or ID',
                name: 'upsertMatchField',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getFieldsForResource',
                },
                displayOptions: {
                    show: {
                        operation: ['upsert'],
                        upsertMode: ['field'],
                    },
                },
                default: '',
                required: true,
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
                placeholder: 'Select a unique field (e.g., email)',
            },
            // Match value for upsert (when matching by unique field)
            {
                displayName: 'Match Value',
                name: 'upsertMatchValue',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['upsert'],
                        upsertMode: ['field'],
                    },
                },
                default: '',
                required: true,
                description: 'The value to search for in the match field',
                placeholder: 'e.g., john@example.com',
            },
            // ========================================
            // BULK OPERATIONS PARAMETERS
            // ========================================
            // Bulk data input (for all bulk operations)
            {
                displayName: 'Input Data',
                name: 'bulkData',
                type: 'json',
                displayOptions: {
                    show: {
                        operation: ['createMany', 'getMany', 'updateMany', 'deleteMany', 'upsertMany'],
                    },
                },
                default: '[]',
                required: true,
                description: 'Array of data for bulk operation. Format varies by operation - see documentation.',
                placeholder: '[{"field1": "value1"}, {"field1": "value2"}]',
                hint: 'Provide array of objects. For Create Many: array of field objects. For Get/Delete Many: array of IDs. For Update/Upsert Many: array of objects with id/matchValue and fields.',
            },
            // Match field for upsert many (when matching by unique field)
            {
                displayName: 'Match Field Name or ID',
                name: 'upsertManyMatchField',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getFieldsForResource',
                },
                displayOptions: {
                    show: {
                        operation: ['upsertMany'],
                    },
                },
                default: '',
                required: true,
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
                placeholder: 'Select a unique field (e.g., email)',
                hint: 'The unique field to match records on. Each item in Input Data should have a matchValue for this field.',
            },
            // Fields collection (for Create and Update operations)
            {
                displayName: 'Fields',
                name: 'fields',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                },
                displayOptions: {
                    show: {
                        operation: ['create', 'update', 'upsert'],
                    },
                },
                default: {},
                placeholder: 'Add Field',
                description: 'The fields to set on the record',
                options: [
                    {
                        name: 'field',
                        displayName: 'Field',
                        values: [
                            {
                                displayName: 'Field Name or ID',
                                name: 'fieldName',
                                type: 'options',
                                typeOptions: {
                                    loadOptionsMethod: 'getFieldsForResource',
                                },
                                default: '',
                                description: 'The name of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
                            },
                            {
                                displayName: 'Field Type',
                                name: 'fieldType',
                                type: 'hidden',  // ✅ Hidden from user - auto-detected!
                                default: '={{$parameter["&fieldName"].split("|")[1]}}',  // ⭐ Extract type from pipe-separated value
                                description: 'Auto-detected field type from Twenty CRM schema. Extracted from fieldName value.',
                            },
                            // Boolean field
                            {
                                displayName: 'Boolean Value',
                                name: 'fieldBooleanValue',
                                type: 'options',
                                options: [
                                    {
                                        name: 'True',
                                        value: true,
                                    },
                                    {
                                        name: 'False',
                                        value: false,
                                    },
                                ],
                                displayOptions: {
                                    show: {
                                        fieldType: ['boolean'],
                                    },
                                },
                                default: false,
                                description: 'Select True or False',
                            },
                            // Simple field value
                            {
                                displayName: 'Value',
                                name: 'fieldValue',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['simple'],
                                    },
                                },
                                default: '',
                                description: 'The value to set for this field',
                                placeholder: 'Enter value',
                            },
                            // Full Name fields  
                            {
                                displayName: 'First Name',
                                name: 'firstName',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['fullName'],
                                    },
                                },
                                default: '',
                                description: 'First name / given name',
                                placeholder: 'John',
                            },
                            {
                                displayName: 'Last Name',
                                name: 'lastName',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['fullName'],
                                    },
                                },
                                default: '',
                                description: 'Last name / family name',
                                placeholder: 'Doe',
                            },
                            // Link fields
                            {
                                displayName: 'URL',
                                name: 'primaryLinkUrl',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['link'],
                                    },
                                },
                                default: '',
                                description: 'The complete URL',
                                placeholder: 'https://example.com',
                            },
                            {
                                displayName: 'Label',
                                name: 'primaryLinkLabel',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['link'],
                                    },
                                },
                                default: '',
                                description: 'Display label for the URL',
                                placeholder: 'example.com',
                            },
                            // Currency fields
                            {
                                displayName: 'Amount',
                                name: 'currencyAmount',
                                type: 'number',
                                displayOptions: {
                                    show: {
                                        fieldType: ['currency'],
                                    },
                                },
                                default: 0,
                                description: 'Amount in your currency (will be converted to micros automatically)',
                                placeholder: '100000',
                            },
                            {
                                displayName: 'Currency Code',
                                name: 'currencyCode',
                                type: 'options',
                                displayOptions: {
                                    show: {
                                        fieldType: ['currency'],
                                    },
                                },
                                options: [
                                    { name: 'Australian Dollar (AUD)', value: 'AUD' },
                                    { name: 'British Pound (GBP)', value: 'GBP' },
                                    { name: 'Canadian Dollar (CAD)', value: 'CAD' },
                                    { name: 'Chinese Yuan (CNY)', value: 'CNY' },
                                    { name: 'Euro (EUR)', value: 'EUR' },
                                    { name: 'Japanese Yen (JPY)', value: 'JPY' },
                                    { name: 'Swiss Franc (CHF)', value: 'CHF' },
                                    { name: 'US Dollar (USD)', value: 'USD' },
                                ],
                                default: 'USD',
                                description: 'Three-letter currency code',
                            },
                            // Address fields
                            {
                                displayName: 'Street Address 1',
                                name: 'addressStreet1',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: '',
                                description: 'Primary street address',
                                placeholder: '123 Main Street',
                            },
                            {
                                displayName: 'Street Address 2',
                                name: 'addressStreet2',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: '',
                                description: 'Apartment, suite, unit, etc. (optional).',
                                placeholder: 'Suite 100',
                            },
                            {
                                displayName: 'City',
                                name: 'addressCity',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: '',
                                description: 'City or locality',
                                placeholder: 'New York',
                            },
                            {
                                displayName: 'Postal Code',
                                name: 'addressPostcode',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: '',
                                description: 'ZIP or postal code',
                                placeholder: '10001',
                            },
                            {
                                displayName: 'State / Province',
                                name: 'addressState',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: '',
                                description: 'State, province, or region',
                                placeholder: 'NY',
                            },
                            {
                                displayName: 'Country',
                                name: 'addressCountry',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: '',
                                description: 'Country name',
                                placeholder: 'United States',
                            },
                            {
                                displayName: 'Latitude',
                                name: 'addressLat',
                                type: 'number',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: undefined,
                                description: 'Geographic latitude (optional)',
                                placeholder: '40.7128',
                            },
                            {
                                displayName: 'Longitude',
                                name: 'addressLng',
                                type: 'number',
                                displayOptions: {
                                    show: {
                                        fieldType: ['address'],
                                    },
                                },
                                default: undefined,
                                description: 'Geographic longitude (optional)',
                                placeholder: '-74.0060',
                            },
                            // Emails fields
                            {
                                displayName: 'Primary Email',
                                name: 'primaryEmail',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['emails'],
                                    },
                                },
                                default: '',
                                description: 'Primary email address',
                                placeholder: 'john@example.com',
                            },
                            // Phones fields
                            {
                                displayName: 'Primary Phone Number',
                                name: 'primaryPhoneNumber',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['phones'],
                                    },
                                },
                                default: '',
                                placeholder: '+1-555-0123',
                            },
                            {
                                displayName: 'Country Code',
                                name: 'primaryPhoneCountryCode',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['phones'],
                                    },
                                },
                                default: '',
                                description: 'Two-letter country code (ISO 3166-1 alpha-2)',
                                placeholder: 'US',
                            },
                            {
                                displayName: 'Calling Code',
                                name: 'primaryPhoneCallingCode',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldType: ['phones'],
                                    },
                                },
                                default: '',
                                description: 'International calling code with plus sign',
                                placeholder: '+1',
                            },
                            // Select field
                            {
                                displayName: 'Value Name or ID',
                                name: 'fieldSelectValue',
                                type: 'options',
                                typeOptions: {
                                    loadOptionsMethod: 'getOptionsForSelectField',
                                    loadOptionsDependsOn: ['fieldName'],
                                },
                                displayOptions: {
                                    show: {
                                        fieldType: ['select'],
                                    },
                                },
                                default: '',
                                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
                            },
                            // Multi-select field
                            {
                                displayName: 'Values Names or IDs',
                                name: 'fieldMultiSelectValue',
                                type: 'multiOptions',
                                typeOptions: {
                                    loadOptionsMethod: 'getOptionsForSelectField',
                                    loadOptionsDependsOn: ['fieldName'],
                                },
                                displayOptions: {
                                    show: {
                                        fieldType: ['multiSelect'],
                                    },
                                },
                                default: [],
                                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
                            },
                        ],
                    },
                ],
            },
            // Limit field (for List/Search operation)
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                },
                displayOptions: {
                    show: {
                        operation: ['findMany'],
                    },
                },
                default: 50,
                description: 'Max number of results to return',
            },
        ],
    };

    methods = {
        loadOptions: {
            /**
             * Get all available databases (objects) from Twenty CRM schema.
             * Uses cached schema with 10-minute TTL.
             */
            async getResources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    // Get resourceGroup parameter (Database Group)
                    let resourceGroup = 'all';
                    try {
                        resourceGroup = this.getCurrentNodeParameter('resourceGroup') as string;
                    } catch {
                        // Parameter doesn't exist or not set, default to 'all'
                        resourceGroup = 'all';
                    }

                    // Get schema - use cache for editor UI performance
                    // Fresh execution will always fetch fresh schema anyway
                    const schema: ISchemaMetadata = await getCachedSchema.call(this, false);

                    // Filter objects based on database group
                    let filteredObjects = schema.objects;
                    
                    switch (resourceGroup) {
                        case 'all':
                            // Show all databases
                            filteredObjects = schema.objects;
                            break;
                        case 'standard':
                            // Standard databases: main user-facing Twenty objects
                            // Explicitly: not custom, not system, and active
                            filteredObjects = schema.objects.filter(obj => 
                                obj.isCustom === false && obj.isSystem === false && obj.isActive === true
                            );
                            break;
                        case 'system':
                            // System databases: internal meta-objects
                            // Explicitly: system objects, not custom
                            filteredObjects = schema.objects.filter(obj => 
                                obj.isSystem === true && obj.isCustom === false
                            );
                            break;
                        case 'custom':
                            // Custom databases: user-created objects
                            // Explicitly: custom objects only
                            filteredObjects = schema.objects.filter(obj => 
                                obj.isCustom === true
                            );
                            break;
                        default:
                            filteredObjects = schema.objects;
                    }

                    // Transform objects to dropdown options
                    const options: INodePropertyOptions[] = filteredObjects.map((obj) => ({
                        name: obj.labelSingular,
                        value: obj.nameSingular,
                        description: obj.isCustom ? '(Custom Database)' : '(Standard Database)',
                    }));

                    // Sort: standard objects first, then custom objects, alphabetically within each group
                    options.sort((a, b) => {
                        const aIsCustom = a.description?.includes('Custom') || false;
                        const bIsCustom = b.description?.includes('Custom') || false;

                        if (aIsCustom === bIsCustom) {
                            return a.name.localeCompare(b.name);
                        }
                        return aIsCustom ? 1 : -1;
                    });

                    return options;
                } catch (error) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Failed to load databases from Twenty CRM. Please check your credentials and connection. Error: ${error.message}`,
                    );
                }
            },

            /**
             * Get writable fields for the selected database using DUAL-SOURCE architecture.
             * Combines metadata API (custom fields with detailed options) + GraphQL introspection (built-in enum fields).
             * Returns pipe-separated values (fieldName|fieldType) for auto-detection.
             */
            async getFieldsForResource(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    // Get the selected database
                    const resource = this.getCurrentNodeParameter('resource') as string;
                    if (!resource) {
                        return [];
                    }

                    // Get operation to determine which fields to show
                    let operation = '';
                    try {
                        operation = this.getCurrentNodeParameter('operation') as string;
                    } catch {
                        // Operation not selected yet, default to showing all fields
                    }

                    // SOURCE 1: Metadata API (custom SELECT fields with rich options)
                    // Use cache for editor UI performance
                    const schema = await getCachedSchema.call(this, false);
                    const objectMeta = schema.objects.find((obj) => obj.nameSingular === resource);
                    const metadataFields: IFieldMetadata[] = objectMeta?.fields || [];

                    // SOURCE 2: GraphQL Introspection (ALL fields including built-in enums)
                    const graphqlFields: IFieldMetadata[] = await getDataSchemaForObject.call(this, resource);

                    // MERGE: Combine both sources, deduplicating (metadata takes priority for richer data)
                    const fieldMap = new Map<string, IFieldMetadata>();

                    // Add GraphQL fields first (base coverage)
                    graphqlFields.forEach((field) => {
                        fieldMap.set(field.name, {
                            ...field,
                            source: 'graphql',
                        });
                    });

                    // Override with metadata fields (richer data, especially for custom SELECT fields)
                    metadataFields.forEach((field) => {
                        fieldMap.set(field.name, {
                            ...field,
                            source: 'metadata',
                        });
                    });

                    // Convert map to array
                    const allFields = Array.from(fieldMap.values());

                    // Filter fields based on operation and active status
                    const isCreateOrUpdate = operation === 'create' || operation === 'update';
                    const filteredFields = allFields.filter((field) => {
                        // Always exclude deactivated fields (isActive: false)
                        if (field.isActive === false) {
                            return false;
                        }
                        // For Create/Update, only show writable fields
                        if (isCreateOrUpdate) {
                            return field.isWritable;
                        }
                        // For Get/List/Delete, show all active fields
                        return true;
                    });

                    // Helper: Map Twenty field type to n8n field type
                    const mapTwentyTypeToN8nType = (twentyType: string): string => {
                        const typeMap: Record<string, string> = {
                            'SELECT': 'select',
                            'MULTI_SELECT': 'multiSelect',
                            'FullName': 'fullName',
                            'Links': 'link',
                            'Currency': 'currency',
                            'Address': 'address',
                            'EMAILS': 'emails',
                            'PHONES': 'phones',
                            'BOOLEAN': 'boolean',
                            'TEXT': 'simple',
                            'NUMBER': 'simple',
                            'DATE_TIME': 'simple',
                            'DATE': 'simple',
                            'UUID': 'simple',
                            'RAW_JSON': 'simple',
                            'RELATION': 'relation',
                        };
                        return typeMap[twentyType] || 'simple';
                    };

                    // Helper: Map GraphQL type to n8n field type (for built-in enums)
                    const mapGraphQLTypeToN8nType = (graphqlType: string): string => {
                        // Check for LIST types (MULTI_SELECT)
                        if (graphqlType.startsWith('LIST<') && graphqlType.includes('Enum')) {
                            return 'multiSelect';
                        }
                        // Check for single enum types (SELECT)
                        if (graphqlType.includes('Enum')) {
                            return 'select';
                        }
                        // Default mapping
                        return mapTwentyTypeToN8nType(graphqlType);
                    };

                    // Transform to dropdown options with pipe-separated values (fieldName|fieldType)
                    const options: INodePropertyOptions[] = filteredFields.map((field) => {
                        // Determine n8n field type
                        const n8nType = field.source === 'metadata' 
                            ? mapTwentyTypeToN8nType(field.type)
                            : mapGraphQLTypeToN8nType(field.type);

                        return {
                            name: getCleanFieldLabel(field.label, field.name),  // Clean label without description
                            value: `${field.name}|${n8nType}`,  // ✅ Pipe-separated for auto-detection
                            description: field.type,
                        };
                    });

                    // Sort: 'name' first, then system/standard fields, then alphabetically
                    options.sort((a, b) => {
                        const aValue = String(a.value);
                        const bValue = String(b.value);
                        
                        // 'name' always comes first
                        if (aValue.startsWith('name|')) return -1;
                        if (bValue.startsWith('name|')) return 1;
                        
                        const aIsStandard = ['id', 'createdAt', 'updatedAt', 'deletedAt'].some(
                            (f) => aValue.includes(f)
                        );
                        const bIsStandard = ['id', 'createdAt', 'updatedAt', 'deletedAt'].some(
                            (f) => bValue.includes(f)
                        );

                        if (aIsStandard === bIsStandard) {
                            return a.name.localeCompare(b.name);
                        }
                        return aIsStandard ? -1 : 1;
                    });

                    return options;
                } catch (error) {
                    throw new NodeOperationError(this.getNode(), `Failed to load fields for resource: ${error.message}`);
                }
            },

            /**
             * Load options for SELECT and MULTI_SELECT fields using DUAL-SOURCE strategy.
             * Strategy 1: Try metadata API first (custom fields with colors).
             * Strategy 2: Fall back to GraphQL introspection (built-in enum fields).
             */
            async getOptionsForSelectField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    // Get the selected resource and field name
                    const resource = this.getCurrentNodeParameter('resource') as string;
                    if (!resource) {
                        throw new NodeOperationError(this.getNode(), 'No resource selected');
                    }

                    // Get the field name from the fixedCollection context
                    // In fixedCollection, we need to access the current parameter being loaded
                    // Use '&fieldName' to reference the parameter within the same collection
                    let fieldNameWithType: string;
                    try {
                        // Try to get from current field context using & prefix
                        fieldNameWithType = this.getCurrentNodeParameter('&fieldName') as string;
                    } catch {
                        // If that fails, the field hasn't been selected yet
                        return [];
                    }
                    
                    if (!fieldNameWithType) {
                        return [];
                    }

                    // Extract field name and type from pipe-separated value
                    const parts = fieldNameWithType.split('|');
                    if (parts.length !== 2) {
                        throw new NodeOperationError(this.getNode(), `Invalid field format: ${fieldNameWithType}`);
                    }
                    
                    const [fieldName, fieldType] = parts;

                    // Validate it's a SELECT/MULTI_SELECT type
                    if (!['select', 'multiSelect'].includes(fieldType)) {
                        return [];
                    }

                    // STRATEGY 1: Try Metadata API first (custom SELECT fields with colors)
                    // Use cache for editor UI performance
                    const schema = await getCachedSchema.call(this, false);
                    const objectMeta = schema.objects.find((obj) => obj.nameSingular === resource);
                    
                    if (objectMeta?.fields) {
                        const metadataField = objectMeta.fields.find((f: IFieldMetadata) => f.name === fieldName);
                        
                        if (metadataField?.options && metadataField.options.length > 0) {
                            // Found in metadata - return rich options with colors
                            const sortedOptions = [...metadataField.options].sort((a, b) => a.position - b.position);
                            return sortedOptions.map(opt => ({
                                name: opt.label,
                                value: opt.value,
                                description: opt.color ? `Color: ${opt.color}` : undefined,
                            }));
                        }
                    }

                    // STRATEGY 2: Fall back to GraphQL introspection (built-in enum fields)
                    const typeName = resource.charAt(0).toUpperCase() + resource.slice(1);
                    const graphqlSchema = await queryGraphQLType.call(this, typeName);
                    
                    if (graphqlSchema.__type?.fields) {
                        const graphqlField = graphqlSchema.__type.fields.find((f: any) => f.name === fieldName);
                        
                        if (graphqlField) {
                            // Check if it's an enum type
                            let enumTypeName = null;
                            
                            if (graphqlField.type.kind === 'ENUM') {
                                // Single SELECT enum
                                enumTypeName = graphqlField.type.name;
                            } else if (graphqlField.type.kind === 'LIST' && graphqlField.type.ofType?.kind === 'ENUM') {
                                // MULTI_SELECT enum (LIST of ENUM)
                                enumTypeName = graphqlField.type.ofType.name;
                            }
                            
                            if (enumTypeName) {
                                // Query enum values
                                const enumValues = await queryEnumValues.call(this, enumTypeName);
                                return enumValues.map(ev => ({
                                    name: ev.label,
                                    value: ev.name,
                                }));
                            }
                        }
                    }

                    // No options found from either source
                    throw new NodeOperationError(
                        this.getNode(),
                        `No options found for field "${fieldName}" (type: ${fieldType}). This field may not be a SELECT or MULTI_SELECT type, or the field data is not available.`,
                    );
                } catch (error) {
                    // If it's already a NodeOperationError, rethrow it
                    if (error instanceof NodeOperationError) {
                        throw error;
                    }
                    // Otherwise, wrap in NodeOperationError with helpful message
                    throw new NodeOperationError(
                        this.getNode(),
                        `Error fetching options: ${error.message}`,
                    );
                }
            },
        },
        listSearch: {
            /**
             * Get records from the selected database for the "From List" mode in Get operation.
             * Returns a searchable list of records with their display name and ID.
             * Supports filtering based on user's search input.
             */
            async getRecordsForDatabase(
                this: ILoadOptionsFunctions,
                filter?: string,
            ): Promise<{ results: Array<{ name: string; value: string; url?: string }> }> {
                try {
                    // Get the selected database
                    const resource = this.getCurrentNodeParameter('resource') as string;
                    if (!resource) {
                        return { results: [] };
                    }
                    
                    // Get schema to find the object metadata
                    // Always fetch fresh schema on execution for accuracy
                    const schema: ISchemaMetadata = await getCachedSchema.call(this, true);
                    const objectMetadata = schema.objects.find((obj) => obj.nameSingular === resource);

                    if (!objectMetadata) {
                        throw new NodeOperationError(this.getNode(), `Database "${resource}" not found in schema`);
                    }

                    // Always query common display fields regardless of schema
                    // The schema metadata from /metadata endpoint is often incomplete
                    // Special handling for Person: name is a FullName complex type (firstName, lastName)
                    const isPerson = resource === 'person';
                    const nameFieldQuery = isPerson 
                        ? `name {
                            firstName
                            lastName
                        }`
                        : 'name';
                    
                    const fieldsToQuery = ['id', nameFieldQuery]; // Always include id and name at minimum

                    // Build GraphQL query to list records (limit to 100 for dropdown performance)
                    // Use plural name (e.g., 'companies') with first argument, not paging
                    const pluralName = objectMetadata.namePlural;
                    
                    // Build filter clause if user has typed a search term
                    // Use ilike for case-insensitive partial matching
                    // For Person database, search in both firstName and lastName
                    const hasFilter = filter && filter.trim() !== '';
                    let filterClause = '';
                    
                    if (hasFilter) {
                        if (isPerson) {
                            // Search in firstName OR lastName for Person database
                            filterClause = ', filter: { or: [ { name: { firstName: { ilike: $searchPattern } } }, { name: { lastName: { ilike: $searchPattern } } } ] }';
                        } else {
                            // Standard search in name field for other databases
                            filterClause = ', filter: { name: { ilike: $searchPattern } }';
                        }
                    }
                    
                    const query = `
                        query List${objectMetadata.labelPlural.replace(/\s+/g, '')}($limit: Int!${hasFilter ? ', $searchPattern: String!' : ''}) {
                            ${pluralName}(first: $limit${filterClause}) {
                                edges {
                                    node {
                                        ${fieldsToQuery.join('\n                                        ')}
                                    }
                                }
                            }
                        }
                    `;

                    const variables: any = {
                        limit: 100,
                    };
                    
                    // Add search pattern with wildcards for partial matching
                    if (hasFilter) {
                        variables.searchPattern = `%${filter}%`;
                    }

                    const response: any = await twentyApiRequest.call(this, 'graphql', query, variables);

                    // Extract records from GraphQL edges/node structure
                    const edges = response[pluralName]?.edges || [];
                    
                    if (edges.length === 0) {
                        return {
                            results: [
                                {
                                    name: `No ${objectMetadata.labelPlural} Found`,
                                    value: '',
                                },
                            ],
                        };
                    }

                    // Transform to list search results
                    const results = edges.map((edge: any) => {
                        const record = edge.node;
                        
                        // Handle different name field types
                        let displayValue: string;
                        if (isPerson && record.name && typeof record.name === 'object') {
                            // For Person: name is { firstName, lastName }
                            const firstName = record.name.firstName || '';
                            const lastName = record.name.lastName || '';
                            displayValue = `${firstName} ${lastName}`.trim() || record.id;
                        } else {
                            // For other databases: name is a simple string
                            displayValue = record.name || record.id;
                        }
                        
                        return {
                            name: displayValue,
                            value: record.id,
                            url: `https://app.twenty.com/objects/${objectMetadata.namePlural}/${record.id}`,
                        };
                    });

                    return { results };
                } catch (error) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Failed to load records from Twenty CRM. Error: ${error.message}`,
                    );
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;
        const resource = this.getNodeParameter('resource', 0) as string;

        // Get schema for field information
        // Always fetch fresh schema on execution for accuracy
        const schema: ISchemaMetadata = await getCachedSchema.call(this, true);
        const objectMetadata = schema.objects.find((obj) => obj.nameSingular === resource);

        if (!objectMetadata) {
            throw new NodeOperationError(this.getNode(), `Object "${resource}" not found in schema`);
        }

        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'create') {
                    // Get fields from node parameters
                    const fieldsParam = this.getNodeParameter('fields', i, {}) as {
                        field?: IFieldData[];
                    };

                    // Transform fields array to data object using modular transformation
                    // Pass resource to handle resource-specific transformations (e.g., Person.name is FullName, Company.name is String)
                    const fieldsData = transformFieldsData(fieldsParam.field || [], resource);

                    // Build and execute create mutation (using introspection for comprehensive field discovery)
                    const { query, variables } = await buildCreateMutation.call(
                        this,
                        resource,
                        fieldsData,
                        objectMetadata,
                    );
                    const response: any = await twentyApiRequest.call(
                        this,
                        'graphql',
                        query,
                        variables,
                    );

                    // Extract created record from response
                    const operationName = `create${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
                    const createdRecord = response[operationName];

                    returnData.push({
                        json: createdRecord,
                        pairedItem: { item: i },
                    });
                } else if (operation === 'createMany') {
                    // Bulk create operation
                    const bulkDataParam = this.getNodeParameter('bulkData', i) as string;
                    const recordsData = JSON.parse(bulkDataParam);

                    if (!Array.isArray(recordsData)) {
                        throw new NodeOperationError(this.getNode(), 'Input Data must be an array of objects');
                    }

                    // Transform each record's fields
                    const transformedRecords = recordsData.map(record => transformFieldsData(
                        Object.entries(record).map(([key, value]) => ({
                            fieldName: key,
                            fieldValue: value,
                        })),
                        resource,
                    ));

                    // Execute bulk create
                    const results = await executeCreateMany(this, resource, transformedRecords, objectMetadata);

                    // Add all results to return data
                    results.forEach((result) => {
                        returnData.push({
                            json: result.success ? result.record : { error: result.error, index: result.index },
                            pairedItem: { item: i },
                        });
                    });
                } else if (operation === 'get') {
                    // Get recordId from resourceLocator parameter
                    const recordIdParam = this.getNodeParameter('recordId', i) as string | { mode: string; value: string };
                    
                    let recordId: string;
                    
                    // Handle both old string format (backward compatibility) and new resourceLocator format
                    if (typeof recordIdParam === 'string') {
                        recordId = recordIdParam;
                    } else if (recordIdParam && typeof recordIdParam === 'object' && recordIdParam.value) {
                        // ResourceLocator format
                        if (recordIdParam.mode === 'url') {
                            // Extract ID from URL using regex
                            const urlMatch = recordIdParam.value.match(/https?:\/\/.*?\/objects\/[^\/]+\/([a-f0-9-]{36})/i);
                            if (!urlMatch) {
                                throw new NodeOperationError(
                                    this.getNode(),
                                    `Could not extract record ID from URL: ${recordIdParam.value}`,
                                );
                            }
                            recordId = urlMatch[1];
                        } else {
                            // For 'list' and 'id' modes, value is already the ID
                            recordId = recordIdParam.value;
                        }
                    } else {
                        throw new NodeOperationError(
                            this.getNode(),
                            'No record ID provided',
                        );
                    }

                    // Use REST API for Get operation - simpler, faster, and handles all complex types automatically
                    // GraphQL still used for database/field selection, but REST for actual data retrieval
                    const pluralName = objectMetadata.namePlural;
                    const restPath = `/${pluralName}/${recordId}`;
                    
                    try {
                        const response: any = await twentyRestApiRequest.call(
                            this,
                            'GET',
                            restPath,
                        );

                        // REST API returns data in format: { data: { [resourceSingular]: { ...fields } } }
                        const record = response.data?.[resource];
                        
                        if (!record) {
                            throw new NodeOperationError(this.getNode(), `Record with ID "${recordId}" not found`);
                        }

                        returnData.push({
                            json: record,
                            pairedItem: { item: i },
                        });
                    } catch (error) {
                        // If REST API fails, provide helpful error message
                        if (error.message.includes('Record not found')) {
                            throw new NodeOperationError(this.getNode(), `Record with ID "${recordId}" not found`);
                        }
                        throw error;
                    }
                } else if (operation === 'getMany') {
                    // Bulk get operation
                    const bulkDataParam = this.getNodeParameter('bulkData', i) as string;
                    const recordIds = JSON.parse(bulkDataParam);

                    if (!Array.isArray(recordIds)) {
                        throw new NodeOperationError(this.getNode(), 'Input Data must be an array of record IDs');
                    }

                    // Execute bulk get
                    const results = await executeGetMany(this, resource, recordIds, objectMetadata);

                    // Add all results to return data
                    results.forEach((result) => {
                        returnData.push({
                            json: result.success ? result.record : { error: result.error, id: result.id, index: result.index },
                            pairedItem: { item: i },
                        });
                    });
                } else if (operation === 'update') {
                    // Get recordId from resourceLocator parameter (same pattern as Get and Delete operations)
                    const recordIdParam = this.getNodeParameter('recordIdUpdate', i) as string | { mode: string; value: string };
                    
                    let recordId: string;
                    
                    // Handle both old string format (backward compatibility) and new resourceLocator format
                    if (typeof recordIdParam === 'string') {
                        recordId = recordIdParam;
                    } else if (recordIdParam && typeof recordIdParam === 'object' && recordIdParam.value) {
                        // ResourceLocator format
                        if (recordIdParam.mode === 'url') {
                            // Extract ID from URL using regex
                            const urlMatch = recordIdParam.value.match(/https?:\/\/.*?\/objects\/[^\/]+\/([a-f0-9-]{36})/i);
                            if (!urlMatch) {
                                throw new NodeOperationError(
                                    this.getNode(),
                                    `Could not extract record ID from URL: ${recordIdParam.value}`,
                                );
                            }
                            recordId = urlMatch[1];
                        } else {
                            // For 'list' and 'id' modes, value is already the ID
                            recordId = recordIdParam.value;
                        }
                    } else {
                        throw new NodeOperationError(
                            this.getNode(),
                            'No record ID provided',
                        );
                    }

                    const fieldsParam = this.getNodeParameter('fields', i, {}) as {
                        field?: IFieldData[];
                    };

                    // Transform fields array to data object (partial update) using modular transformation
                    // Pass resource to handle resource-specific transformations (e.g., Person.name is FullName, Company.name is String)
                    const fieldsData = transformFieldsData(fieldsParam.field || [], resource);

                    // Build and execute update mutation (using introspection for comprehensive field discovery)
                    const { query, variables } = await buildUpdateMutation.call(
                        this,
                        resource,
                        recordId,
                        fieldsData,
                        objectMetadata,
                    );
                    const response: any = await twentyApiRequest.call(
                        this,
                        'graphql',
                        query,
                        variables,
                    );

                    // Extract updated record from response
                    const operationName = `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
                    const updatedRecord = response[operationName];

                    returnData.push({
                        json: updatedRecord,
                        pairedItem: { item: i },
                    });
                } else if (operation === 'updateMany') {
                    // Bulk update operation
                    const bulkDataParam = this.getNodeParameter('bulkData', i) as string;
                    const updatesData = JSON.parse(bulkDataParam);

                    if (!Array.isArray(updatesData)) {
                        throw new NodeOperationError(this.getNode(), 'Input Data must be an array of objects with id and fields');
                    }

                    // Transform each update's fields
                    const transformedUpdates = updatesData.map(update => ({
                        id: update.id,
                        fieldsData: transformFieldsData(
                            Object.entries(update.fields || {}).map(([key, value]) => ({
                                fieldName: key,
                                fieldValue: value,
                            })),
                            resource,
                        ),
                    }));

                    // Execute bulk update
                    const results = await executeUpdateMany(this, resource, transformedUpdates, objectMetadata);

                    // Add all results to return data
                    results.forEach((result) => {
                        returnData.push({
                            json: result.success ? result.record : { error: result.error, id: result.id, index: result.index },
                            pairedItem: { item: i },
                        });
                    });
                } else if (operation === 'upsert') {
                    // Get upsert mode (match by ID or by unique field)
                    const upsertMode = this.getNodeParameter('upsertMode', i, 'field') as string;
                    
                    const fieldsParam = this.getNodeParameter('fields', i, {}) as {
                        field?: IFieldData[];
                    };

                    // Transform fields array to data object using modular transformation
                    const fieldsData = transformFieldsData(fieldsParam.field || [], resource);

                    // Prepare options based on upsert mode
                    const options: any = {};
                    
                    if (upsertMode === 'id') {
                        options.recordIdParam = this.getNodeParameter('recordIdUpsert', i);
                    } else {
                        const matchFieldParam = this.getNodeParameter('upsertMatchField', i) as string;
                        const matchValue = this.getNodeParameter('upsertMatchValue', i) as string;
                        // Extract field name from pipe-separated value (fieldName|fieldType)
                        options.matchField = matchFieldParam.split('|')[0];
                        options.matchValue = matchValue;
                    }

                    // Execute upsert using modularized operation
                    const { record, action } = await executeUpsert(
                        this,
                        upsertMode,
                        resource,
                        fieldsData,
                        objectMetadata,
                        options,
                    );

                    returnData.push({
                        json: { ...record, __upsertAction: action },
                        pairedItem: { item: i },
                    });
                } else if (operation === 'upsertMany') {
                    // Bulk upsert operation
                    const bulkDataParam = this.getNodeParameter('bulkData', i) as string;
                    const upsertData = JSON.parse(bulkDataParam);

                    if (!Array.isArray(upsertData)) {
                        throw new NodeOperationError(this.getNode(), 'Input Data must be an array of objects with matchValue and fields');
                    }

                    const matchFieldParam = this.getNodeParameter('upsertManyMatchField', i) as string;
                    const matchField = matchFieldParam.split('|')[0];

                    // Transform each upsert's fields
                    const transformedUpserts = upsertData.map(item => ({
                        matchValue: item.matchValue,
                        fieldsData: transformFieldsData(
                            Object.entries(item.fields || {}).map(([key, value]) => ({
                                fieldName: key,
                                fieldValue: value,
                            })),
                            resource,
                        ),
                    }));

                    // Execute bulk upsert
                    const results = await executeUpsertMany(
                        this,
                        resource,
                        'field',
                        transformedUpserts,
                        objectMetadata,
                        { matchField },
                    );

                    // Add all results to return data
                    results.forEach((result) => {
                        returnData.push({
                            json: result.success 
                                ? { ...result.record, __upsertAction: result.action }
                                : { error: result.error, index: result.index },
                            pairedItem: { item: i },
                        });
                    });
                } else if (operation === 'delete') {
                    // Get recordId from resourceLocator parameter (same pattern as Get operation)
                    const recordIdParam = this.getNodeParameter('recordIdDelete', i) as string | { mode: string; value: string };
                    
                    let recordId: string;
                    
                    // Handle both old string format (backward compatibility) and new resourceLocator format
                    if (typeof recordIdParam === 'string') {
                        recordId = recordIdParam;
                    } else if (recordIdParam && typeof recordIdParam === 'object' && recordIdParam.value) {
                        // ResourceLocator format
                        if (recordIdParam.mode === 'url') {
                            // Extract ID from URL using regex
                            const urlMatch = recordIdParam.value.match(/https?:\/\/.*?\/objects\/[^\/]+\/([a-f0-9-]{36})/i);
                            if (!urlMatch) {
                                throw new NodeOperationError(
                                    this.getNode(),
                                    `Could not extract record ID from URL: ${recordIdParam.value}`,
                                );
                            }
                            recordId = urlMatch[1];
                        } else {
                            // For 'list' and 'id' modes, value is already the ID
                            recordId = recordIdParam.value;
                        }
                    } else {
                        throw new NodeOperationError(
                            this.getNode(),
                            'No record ID provided',
                        );
                    }

                    // Use REST API for Delete operation - simple, semantic HTTP verb
                    const pluralName = objectMetadata.namePlural;
                    const restPath = `/${pluralName}/${recordId}`;
                    
                    try {
                        const response: any = await twentyRestApiRequest.call(
                            this,
                            'DELETE',
                            restPath,
                        );

                        // REST API DELETE can return different formats:
                        // - { data: { [resourceSingular]: { id: "..." } } }
                        // - { data: { id: "..." } }
                        // - Just the deleted object itself
                        let deletedRecord;
                        
                        if (response.data) {
                            // Check if it's nested under resource name
                            deletedRecord = response.data[resource] || response.data[objectMetadata.nameSingular] || response.data;
                        } else {
                            // Response might be the record itself
                            deletedRecord = response;
                        }
                        
                        // If we got a valid response, consider it successful
                        // DELETE operations often return the deleted record or just { id: "..." }
                        const resultId = deletedRecord?.id || recordId;

                        returnData.push({
                            json: { success: true, id: resultId, deletedRecord },
                            pairedItem: { item: i },
                        });
                    } catch (error) {
                        // If REST API fails, provide helpful error message
                        if (error.message && error.message.includes('Record not found')) {
                            throw new NodeOperationError(this.getNode(), `Record with ID "${recordId}" not found`);
                        }
                        throw new NodeOperationError(
                            this.getNode(),
                            `Failed to delete record with ID "${recordId}": ${error.message || error}`,
                        );
                    }
                } else if (operation === 'deleteMany') {
                    // Bulk delete operation
                    const bulkDataParam = this.getNodeParameter('bulkData', i) as string;
                    const recordIds = JSON.parse(bulkDataParam);

                    if (!Array.isArray(recordIds)) {
                        throw new NodeOperationError(this.getNode(), 'Input Data must be an array of record IDs');
                    }

                    // Execute bulk delete
                    const results = await executeDeleteMany(this, resource, recordIds, objectMetadata);

                    // Add all results to return data
                    results.forEach((result) => {
                        returnData.push({
                            json: result.success 
                                ? { success: true, id: result.id }
                                : { error: result.error, id: result.id, index: result.index },
                            pairedItem: { item: i },
                        });
                    });
                } else if (operation === 'findMany') {
                    // Get limit from node parameters
                    const limit = this.getNodeParameter('limit', i) as number;

                    // Use REST API for List/Search operation - returns all fields automatically
                    // GraphQL still used for database/field selection, but REST for actual data retrieval
                    const pluralName = objectMetadata.namePlural;
                    
                    // Build query parameters for REST API
                    // Note: REST API uses query parameters for pagination
                    const queryParts: string[] = [];
                    if (limit) {
                        queryParts.push(`limit=${limit}`);
                    }
                    
                    const restPath = `/${pluralName}${queryParts.length > 0 ? '?' + queryParts.join('&') : ''}`;
                    
                    try {
                        const response: any = await twentyRestApiRequest.call(
                            this,
                            'GET',
                            restPath,
                        );

                        // REST API returns data in format: { data: { [resourcePlural]: [...records] } }
                        const records = response.data?.[pluralName];
                        
                        if (!records) {
                            // No records found - return empty array
                            continue;
                        }

                        // Handle both array response and paginated response
                        const recordsArray = Array.isArray(records) ? records : records.edges?.map((edge: any) => edge.node) || [];

                        // Transform each record to workflow record
                        for (const record of recordsArray) {
                            returnData.push({
                                json: record,
                                pairedItem: { item: i },
                            });
                        }
                    } catch (error) {
                        // If REST API fails, provide helpful error message
                        if (error.message.includes('not found')) {
                            // Empty result - continue
                            continue;
                        }
                        throw error;
                    }
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}