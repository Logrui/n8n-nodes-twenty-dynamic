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
    queryGraphQLType,
    queryEnumValues,
    IFieldMetadata,
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
             * Get writable fields for the selected resource using DUAL-SOURCE architecture.
             * Combines metadata API (custom fields with detailed options) + GraphQL introspection (built-in enum fields).
             * Returns pipe-separated values (fieldName|fieldType) for auto-detection.
             */
            async getFieldsForResource(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    // Get the selected resource
                    const resource = this.getCurrentNodeParameter('resource') as string;
                    if (!resource) {
                        return [];
                    }

                    // Get force refresh flag
                    const forceRefresh = this.getCurrentNodeParameter('forceRefresh') as boolean || false;

                    // Get operation to determine which fields to show
                    let operation = '';
                    try {
                        operation = this.getCurrentNodeParameter('operation') as string;
                    } catch {
                        // Operation not selected yet, default to showing all fields
                    }

                    // SOURCE 1: Metadata API (custom SELECT fields with rich options)
                    const schema = await getCachedSchema.call(this, forceRefresh);
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

                    // Filter fields based on operation
                    const isCreateOrUpdate = operation === 'createOne' || operation === 'updateOne';
                    const filteredFields = isCreateOrUpdate
                        ? allFields.filter((field) => field.isWritable) // Only writable fields for Create/Update
                        : allFields; // All fields for Get/List/Delete

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
                            name: field.label || field.name,
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
                    const forceRefresh = this.getCurrentNodeParameter('forceRefresh') as boolean || false;
                    const schema = await getCachedSchema.call(this, forceRefresh);
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