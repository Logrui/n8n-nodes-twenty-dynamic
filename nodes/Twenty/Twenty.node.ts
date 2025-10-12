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
import { getAllComplexFieldParameters, getComplexFieldNames } from './FieldParameters';
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
                description: 'The UUID of the record to retrieve, update, or delete. ⚠️ Delete operations are permanent and cannot be undone.',
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
                            // Simple field value (hidden for complex fields except name)
                            {
                                displayName: 'Field Value',
                                name: 'fieldValue',
                                type: 'string',
                                displayOptions: {
                                    hide: {
                                        fieldName: getComplexFieldNames(),
                                    },
                                },
                                default: '',
                                description: 'The value to set for this field',
                                placeholder: 'Enter value',
                            },
                            // Company/Other resources: name field is simple text
                            {
                                displayName: 'Field Value',
                                name: 'fieldValue',
                                type: 'string',
                                displayOptions: {
                                    show: {
                                        fieldName: ['name'],
                                    },
                                    hide: {
                                        resource: ['person'],
                                    },
                                },
                                default: '',
                                description: 'The company/object name',
                                placeholder: 'Acme Corporation',
                            },
                            // Complex field parameters (imported from FieldParameters module)
                            ...getAllComplexFieldParameters(),
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

                    // Transform to dropdown options
                    const options: INodePropertyOptions[] = filteredFields.map((field) => ({
                        name: `${field.name} (${field.label})`,
                        value: field.name,
                        description: `Type: ${field.type}${field.isNullable ? ' (optional)' : ' (required)'}`,
                    }));

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