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
    buildGetQuery,
    buildUpdateMutation,
    buildDeleteMutation,
    buildListQuery,
    twentyApiRequest,
} from './TwentyApi.client';
import { transformFieldsData, IFieldData } from './FieldTransformation';

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
            // Force Refresh Schema toggle
            {
                displayName: 'Force Refresh Schema',
                name: 'forceRefresh',
                type: 'boolean',
                default: false,
                description:
                    'Whether to bypass cache and fetch fresh schema from Twenty CRM. Toggle ON to refresh, then toggle back OFF for normal operation.',
            },
            // Resource selection
            {
                displayName: 'Object Name or ID',
                name: 'resource',
                type: 'options',
																noDataExpression: true,
                typeOptions: {
                    loadOptionsMethod: 'getResources',
                },
                default: '',
                required: true,
                description: 'Choose from the list, or specify a resource name using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. <strong>Note:</strong> Schema is cached for 10 minutes - new custom objects may take up to 10 minutes to appear unless you toggle Force Refresh Schema. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            // Operation selection
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                // Show operation field when any resource is selected
                // displayOptions: show when resource field has any value
                options: [
                    {
                        name: 'Create One',
                        value: 'createOne',
                        description: 'Create a new record',
                        action: 'Create a record',
                    },
                    {
                        name: 'Delete One',
                        value: 'deleteOne',
                        description: 'Delete a record by ID',
                        action: 'Delete a record',
                    },
                    {
                        name: 'Get One',
                        value: 'findOne',
                        description: 'Retrieve a single record by ID',
                        action: 'Get a record',
                    },
                    {
                        name: 'List/Search',
                        value: 'findMany',
                        description: 'Get multiple records with optional filters',
                        action: 'List records',
                    },
                    {
                        name: 'Update One',
                        value: 'updateOne',
                        description: 'Update an existing record',
                        action: 'Update a record',
                    },
                ],
                default: 'createOne',
                required: true,
            },
            // Record ID field (for Get, Update, Delete operations)
            {
                displayName: 'Record ID',
                name: 'recordId',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['findOne', 'updateOne', 'deleteOne'],
                    },
                },
                default: '',
                required: true,
                description: 'The UUID of the record to retrieve, update, or delete. ?? Delete operations are permanent and cannot be undone.',
                placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
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
                        operation: ['createOne', 'updateOne'],
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
                                description: 'The name of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                            },
                            {
                                displayName: 'Field Type',
                                name: 'fieldType',
                                type: 'options',
                                options: [
                                    {
                                        name: 'Address (Street, City, State, Etc.)',
                                        value: 'address',
                                    },
                                    {
                                        name: 'Boolean (True/False)',
                                        value: 'boolean',
                                    },
                                    {
                                        name: 'Currency (Amount + Currency Code)',
                                        value: 'currency',
                                    },
                                    {
                                        name: 'Emails (Primary Email Address)',
                                        value: 'emails',
                                    },
                                    {
                                        name: 'Full Name (First/Last Name)',
                                        value: 'fullName',
                                    },
                                    {
                                        name: 'Link (URL With Label)',
                                        value: 'link',
                                    },
                                    {
                                        name: 'Multi-Select (Multiple Choices)',
                                        value: 'multiSelect',
                                    },
                                    {
                                        name: 'Phones (Primary Phone Details)',
                                        value: 'phones',
                                    },
                                    {
                                        name: 'Select (Single Choice)',
                                        value: 'select',
                                    },
                                    {
                                        name: 'Simple Value (Text, Number, Date, Etc.)',
                                        value: 'simple',
                                    },
                                ],
                                default: 'simple',
                                description: 'The type of field. Check the Field Name description for the recommended type based on Twenty\'s schema.',
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
                                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
                                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
             * Get all available resources (objects) from Twenty CRM schema.
             * Uses cached schema with 10-minute TTL.
             */
            async getResources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    // Get forceRefresh parameter
                    let forceRefresh = false;
                    try {
                        forceRefresh = this.getNodeParameter('forceRefresh', 0) as boolean;
                    } catch {
                        // Parameter doesn't exist or not set, default to false
                    }

                    // Get schema with caching
                    const schema: ISchemaMetadata = await getCachedSchema.call(this, forceRefresh);

                    // Transform objects to dropdown options
                    const options: INodePropertyOptions[] = schema.objects.map((obj) => ({
                        name: obj.labelSingular,
                        value: obj.nameSingular,
                        description: obj.isCustom ? '(Custom Object)' : '(Standard Object)',
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
                        `Failed to load resources from Twenty CRM. Please check your credentials and connection. Error: ${error.message}`,
                    );
                }
            },

            /**
             * Get writable fields for the selected resource.
             * Uses GraphQL introspection on the /graphql data schema to get ALL fields.
             * This replaces the previous /metadata approach which only returned custom fields.
             */
            async getFieldsForResource(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    // Get the selected resource
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

                    // Use data schema introspection to get ALL fields (standard + custom)
                    const fields = await getDataSchemaForObject.call(this, resource);

                    // Filter fields based on operation
                    const isCreateOrUpdate = operation === 'createOne' || operation === 'updateOne';
                    const filteredFields = isCreateOrUpdate
                        ? fields.filter((field) => field.isWritable) // Only writable fields for Create/Update
                        : fields; // All fields for Get/List/Delete

                    // Transform to dropdown options with Twenty field type and suggested n8n Field Type
                    const options: INodePropertyOptions[] = filteredFields.map((field) => {
                        // Map Twenty field types to suggested n8n Field Types
                        let suggestedFieldType = '';
                        switch (field.type) {
                            case 'FullName':
                                suggestedFieldType = ' ? Use "Full Name"';
                                break;
                            case 'Links':
                                suggestedFieldType = ' ? Use "Link"';
                                break;
                            case 'Currency':
                                suggestedFieldType = ' ? Use "Currency"';
                                break;
                            case 'Address':
                                suggestedFieldType = ' ? Use "Address"';
                                break;
                            case 'EMAILS':
                                suggestedFieldType = ' ? Use "Emails"';
                                break;
                            case 'PHONES':
                                suggestedFieldType = ' ? Use "Phones"';
                                break;
                            case 'TEXT':
                            case 'NUMBER':
                            case 'DATE_TIME':
                            case 'DATE':
                            case 'BOOLEAN':
                            case 'UUID':
                            case 'RAW_JSON':
                                suggestedFieldType = ' ? Use "Simple"';
                                break;
                            case 'SELECT':
                                suggestedFieldType = ' ? Use "Select"';
                                break;
                            case 'MULTI_SELECT':
                                suggestedFieldType = ' ? Use "Multi-Select"';
                                break;
                            case 'RELATION':
                                suggestedFieldType = ' ? Not yet supported';
                                break;
                        }

                        return {
                            name: `${field.name} (${field.label})`,
                            value: field.name,
                            description: `Twenty Type: ${field.type}${suggestedFieldType}${field.isNullable ? ' (optional)' : ' (required)'}`,
                        };
                    });

                    // Sort: 'name' first, then system/standard fields, then alphabetically
                    options.sort((a, b) => {
                        const aValue = String(a.value);
                        const bValue = String(b.value);
                        
                        // 'name' always comes first
                        if (aValue === 'name') return -1;
                        if (bValue === 'name') return 1;
                        
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
             * Load options for SELECT and MULTI_SELECT fields
             * Returns the available options from Twenty's metadata
             */
            async getOptionsForSelectField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    // Get the selected resource and field name
                    const resource = this.getCurrentNodeParameter('resource') as string;
                    if (!resource) {
                        return [];
                    }

                    // Get the field name - in loadOptions context for fixedCollection items,
                    // we can access sibling parameters using getCurrentNodeParameter
                    const fieldName = this.getCurrentNodeParameter('fieldName') as string;
                    
                    if (!fieldName) {
                        return [];
                    }

                    // Get full schema to find field options
                    const allFields = await getDataSchemaForObject.call(this, resource);
                    const selectedField = allFields.find(f => f.name === fieldName);

                    if (!selectedField || !selectedField.options || selectedField.options.length === 0) {
                        return [];
                    }

                    // Transform Twenty options to n8n dropdown options
                    // Sort by position to maintain order
                    const sortedOptions = [...selectedField.options].sort((a, b) => a.position - b.position);
                    
                    return sortedOptions.map(opt => ({
                        name: opt.label,
                        value: opt.value,
                        description: `Color: ${opt.color}`,
                    }));
                } catch (error) {
                    // Return empty array on error to prevent UI breaks
                    return [];
                }
            },

            /**
             * Auto-detect field type based on selected field
             * Returns suggested field type options based on Twenty's metadata
             */
            async getFieldTypeOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                // Default options
                const defaultOptions: INodePropertyOptions[] = [
                    {
                        name: 'Address (Street, City, State, Etc.)',
                        value: 'address',
                    },
                    {
                        name: 'Currency (Amount + Currency Code)',
                        value: 'currency',
                    },
                    {
                        name: 'Emails (Primary Email Address)',
                        value: 'emails',
                    },
                    {
                        name: 'Full Name (First/Last Name)',
                        value: 'fullName',
                    },
                    {
                        name: 'Link (URL With Label)',
                        value: 'link',
                    },
                    {
                        name: 'Multi-Select (Multiple Choices)',
                        value: 'multiSelect',
                    },
                    {
                        name: 'Phones (Primary Phone Details)',
                        value: 'phones',
                    },
                    {
                        name: 'Select (Single Choice)',
                        value: 'select',
                    },
                    {
                        name: 'Simple Value (Text, Number, Date, Etc.)',
                        value: 'simple',
                    },
                ];

                try {
                    // Get the selected resource and field name
                    const resource = this.getCurrentNodeParameter('resource') as string;
                    if (!resource) {
                        return defaultOptions;
                    }

                    // Try to get the field name
                    const fieldName = this.getCurrentNodeParameter('fieldName') as string;

                    if (!fieldName) {
                        return defaultOptions;
                    }

                    // Get full schema to find field type
                    const allFields = await getDataSchemaForObject.call(this, resource);
                    const selectedField = allFields.find((f: any) => f.name === fieldName);

                    if (!selectedField) {
                        return defaultOptions;
                    }

                    // Map Twenty field type to n8n field type and put it first in the list
                    let suggestedValue: string = 'simple';

                    switch (selectedField.type) {
                        case 'FullName':
                            suggestedValue = 'fullName';
                            break;
                        case 'Links':
                            suggestedValue = 'link';
                            break;
                        case 'Currency':
                            suggestedValue = 'currency';
                            break;
                        case 'Address':
                            suggestedValue = 'address';
                            break;
                        case 'EMAILS':
                            suggestedValue = 'emails';
                            break;
                        case 'PHONES':
                            suggestedValue = 'phones';
                            break;
                        case 'SELECT':
                            suggestedValue = 'select';
                            break;
                        case 'MULTI_SELECT':
                            suggestedValue = 'multiSelect';
                            break;
                        default:
                            suggestedValue = 'simple';
                    }

                    // Reorder options to put the suggested one first with a special marker
                    const suggestedOption = defaultOptions.find((opt: INodePropertyOptions) => opt.value === suggestedValue);
                    const otherOptions = defaultOptions.filter((opt: INodePropertyOptions) => opt.value !== suggestedValue);

                    if (suggestedOption) {
                        return [
                            {
                                ...suggestedOption,
                                name: `${suggestedOption.name} ? (Recommended)`,
                                description: `Automatically detected from Twenty schema. Type: ${selectedField.type}`,
                            },
                            ...otherOptions,
                        ];
                    }

                    return defaultOptions;
                } catch (error) {
                    return defaultOptions;
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
        const schema: ISchemaMetadata = await getCachedSchema.call(this, false);
        const objectMetadata = schema.objects.find((obj) => obj.nameSingular === resource);

        if (!objectMetadata) {
            throw new NodeOperationError(this.getNode(), `Object "${resource}" not found in schema`);
        }

        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'createOne') {
                    // Get fields from node parameters
                    const fieldsParam = this.getNodeParameter('fields', i, {}) as {
                        field?: IFieldData[];
                    };

                    // Transform fields array to data object using modular transformation
                    // Pass resource to handle resource-specific transformations (e.g., Person.name is FullName, Company.name is String)
                    const fieldsData = transformFieldsData(fieldsParam.field || [], resource);

                    // Build and execute create mutation
                    const { query, variables } = buildCreateMutation(
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
                } else if (operation === 'findOne') {
                    // Get recordId from node parameters
                    const recordId = this.getNodeParameter('recordId', i) as string;

                    // Build and execute get query
                    const { query, variables } = buildGetQuery(resource, recordId, objectMetadata);
                    const response: any = await twentyApiRequest.call(
                        this,
                        'graphql',
                        query,
                        variables,
                    );

                    // Extract record from GraphQL edges/node structure
                    const edges = response[resource]?.edges || [];
                    if (edges.length === 0) {
                        throw new NodeOperationError(this.getNode(), `Record with ID "${recordId}" not found`);
                    }

                    const record = edges[0].node;

                    returnData.push({
                        json: record,
                        pairedItem: { item: i },
                    });
                } else if (operation === 'updateOne') {
                    // Get recordId and fields from node parameters
                    const recordId = this.getNodeParameter('recordId', i) as string;
                    const fieldsParam = this.getNodeParameter('fields', i, {}) as {
                        field?: IFieldData[];
                    };

                    // Transform fields array to data object (partial update) using modular transformation
                    // Pass resource to handle resource-specific transformations (e.g., Person.name is FullName, Company.name is String)
                    const fieldsData = transformFieldsData(fieldsParam.field || [], resource);

                    // Build and execute update mutation
                    const { query, variables } = buildUpdateMutation(
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
                } else if (operation === 'deleteOne') {
                    // Get recordId from node parameters
                    const recordId = this.getNodeParameter('recordId', i) as string;

                    // Build and execute delete mutation
                    const { query, variables } = buildDeleteMutation(
                        resource,
                        recordId,
                        objectMetadata,
                    );
                    const response: any = await twentyApiRequest.call(
                        this,
                        'graphql',
                        query,
                        variables,
                    );

                    // Extract deleted record ID from response
                    const operationName = `delete${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
                    const deletedRecord = response[operationName];

                    returnData.push({
                        json: { success: true, id: deletedRecord.id },
                        pairedItem: { item: i },
                    });
                } else if (operation === 'findMany') {
                    // Get limit from node parameters
                    const limit = this.getNodeParameter('limit', i) as number;

                    // Build and execute list query
                    const { query, variables } = buildListQuery(
                        resource,
                        limit,
                        objectMetadata,
                    );
                    const response: any = await twentyApiRequest.call(
                        this,
                        'graphql',
                        query,
                        variables,
                    );

                    // Extract records from GraphQL edges/node structure
                    const pluralName = objectMetadata.namePlural;
                    const edges = response[pluralName]?.edges || [];

                    // Transform each record to workflow record
                    for (const edge of edges) {
                        returnData.push({
                            json: edge.node,
                            pairedItem: { item: i },
                        });
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