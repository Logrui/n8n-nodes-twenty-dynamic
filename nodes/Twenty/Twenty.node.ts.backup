import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { twentyApiRequest } from './TwentyApi.client';

const credentialName = 'twentyApi';

export class Twenty implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twenty CRM Dynamic',
		name: 'twenty',
		icon: 'file:twenty.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Twenty API with dynamic schema support',
		defaults: {
			name: 'Twenty CRM Dynamic',
		},
		inputs: ['main'] as any,
		outputs: ['main'] as any,
		credentials: [
			{
				name: credentialName,
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Force Refresh Schema',
				name: 'forceRefresh',
				type: 'boolean',
				default: false,
				description: 'Check this to ignore cache and fetch fresh schema from Twenty API. Uncheck after refresh to restore fast loading.',
			},
			{
				displayName: 'Resource Name or ID',
				name: 'resource',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Note: Schema is cached for 10 minutes - new custom objects may take up to 10 minutes to appear.',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getTwentyResources',
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Create', value: 'createOne' },
					{ name: 'Delete', value: 'deleteOne' },
					{ name: 'Get', value: 'findOne' },
					{ name: 'List/Search', value: 'findMany' },
					{ name: 'Update', value: 'updateOne' },
				],
				default: 'createOne',
				required: true,
			},
			// Dynamic fields for Create/Update
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['createOne', 'updateOne'],
						resource: [''],
					},
				},
				options: [
					{
						displayName: 'Field Key Name or ID',
						name: 'key',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getFieldsForResource',
							loadOptionsDependsOn: ['resource'],
							returnFullObject: true,
						},
					},
					{
						displayName: 'Field Value',
						name: 'value',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Field Value Name or ID',
						name: 'valueLookup',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getRelationRecords',
							loadOptionsDependsOn: ['key'],
						},
					},
				],
			},
			// ID field for Get/Delete
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['findOne', 'deleteOne'],
						resource: [''],
					},
				},
			},
			// Fields for List/Search
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				displayOptions: {
					show: {
						operation: ['findMany'],
						resource: [''],
					},
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'View Name or ID',
				name: 'viewId',
				type: 'options',
				default: '',
				displayOptions: {
					show: {
						operation: ['findMany'],
						resource: [''],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getViewsForResource',
				},
				description: 'Select a pre-configured view from Twenty. If a view is selected, the filters below will be ignored. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Filter Logic',
				name: 'filterLogic',
				type: 'options',
				default: 'AND',
				displayOptions: {
					show: {
						operation: ['findMany'],
						resource: [''],
					},
				},
				options: [
					{ name: 'Match All (AND)', value: 'AND' },
					{ name: 'Match Any (OR)', value: 'OR' },
				],
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						operation: ['findMany'],
						resource: [''],
					},
				},
				options: [
					{
						displayName: 'Field Name or ID',
						name: 'key',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getFieldsForResource',
						},
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'eq',
						options: [
							{ name: 'Contains', value: 'contains' },
							{ name: 'Ends With', value: 'endsWith' },
							{ name: 'Equals', value: 'eq' },
							{ name: 'Greater Than', value: 'gt' },
							{ name: 'Greater Than or Equal', value: 'gte' },
							{ name: 'In', value: 'in' },
							{ name: 'Less Than', value: 'lt' },
							{ name: 'Less Than or Equal', value: 'lte' },
							{ name: 'Not Equal', value: 'not' },
							{ name: 'Not In', value: 'notIn' },
							{ name: 'Starts With', value: 'startsWith' },
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getTwentyResources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let forceRefresh = false;
				try {
					forceRefresh = this.getNodeParameter('forceRefresh', 0) as boolean;
				} catch (error) {
					// Parameter doesn't exist or is not set, default to false
				}
				const credentials = await this.getCredentials('twentyApi');
				const cachedSchema = (credentials.schemaCache ? JSON.parse(credentials.schemaCache as string) : {}) as { resources?: { name: string; value: string; id: string }[], fields?: any, timestamp?: number };

				// If cache is present and not older than 10 minutes, return it (unless force refresh is enabled)
				if (!forceRefresh && cachedSchema.resources && cachedSchema.timestamp && (Date.now() - cachedSchema.timestamp < 600000)) {
					return cachedSchema.resources;
				}

				// If cache is empty or stale, fetch from API and update the credential
				this.logger.info('Schema cache is empty or stale. Fetching fresh Twenty API schema...');
				const schemaQuery = `
					query FullSchema {
						ObjectMetadataItems {
							id
							apiName
							labelPlural
							fieldsList {
								apiName
								label
								type
								relation {
									relatedTo
								}
							}
						}
					}
				`;
				try {
					const data = await twentyApiRequest.call(this, 'metadata', schemaQuery) as { ObjectMetadataItems: any[] };

					const newFields: { [key: string]: any[] } = {};
					data.ObjectMetadataItems.forEach(item => {
						newFields[item.apiName] = item.fieldsList.map((field: { apiName: string; label: string; type: string; relation?: { relatedTo?: string } }) => ({
							name: field.label,
							value: field.apiName,
							type: field.type,
							relatedTo: field.relation?.relatedTo,
						}));
					});

					const newResources = data.ObjectMetadataItems.map(item => ({ name: item.labelPlural, value: item.apiName, id: item.id }));

					const schema = { resources: newResources, fields: newFields, timestamp: Date.now() };

					// The 'as any' cast is a necessary workaround to access updateCredentialData
					await (this as any).updateCredentialData('twentyApi', { schemaCache: JSON.stringify(schema) });

					this.logger.info('Successfully fetched and cached new Twenty API schema.');
					return newResources;
				} catch (error) {
					this.logger.error(`Failed to fetch Twenty API schema. Error: ${error.message}`);
					// Return any stale resources from cache if the fetch fails, otherwise return empty
					return cachedSchema.resources || [];
				}
			},

			async getFieldsForResource(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = this.getCurrentNodeParameter('resource') as string;
				if (!resource) return [];

				const credentials = await this.getCredentials('twentyApi');
				const cachedSchema = (credentials.schemaCache ? JSON.parse(credentials.schemaCache as string) : {}) as { fields?: { [key: string]: { name: string; value: string }[] } };

				// Try to return from cache first
				if (cachedSchema.fields && cachedSchema.fields[resource]) {
					return cachedSchema.fields[resource];
				}

				// If cache is empty, fetch from API
				const query = `
					query ObjectMetadataItem($apiName: String!) {
						ObjectMetadataItem(apiName: $apiName) {
							fieldsList {
								apiName
								label
							}
						}
					}
				`;
				try {
					const data = await twentyApiRequest.call(this, 'metadata', query, { apiName: resource }) as { ObjectMetadataItem: { fieldsList: { apiName: string; label: string }[] } };
					return data.ObjectMetadataItem.fieldsList.map((field: { apiName: string; label: string }) => ({ name: field.label, value: field.apiName }));
				} catch (error) {
					return [];
				}
			},

			async getRelationRecords(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const key = this.getCurrentNodeParameter('key') as { value: string; relatedTo?: string };
				if (!key || !key.relatedTo) return [];

				const relatedResource = key.relatedTo;

				// We need a descriptive field to show the user. We'll try common names.
				// A more robust solution might get this from metadata.
				const descriptiveField = 'name'; // Or 'label', 'title', etc.

				const queryName = `${relatedResource}s`;
				const query = `
					query ListRelatedRecords {
						${queryName}(first: 200) { # Fetch up to 200 records for the dropdown
							edges {
									node {
										id
										${descriptiveField}
									}
								}
							}
						}
					}
				`;

				try {
					const data = await twentyApiRequest.call(this, 'graphql', query) as { [key: string]: { edges: { node: { id: string; [key: string]: any } }[] } };
					const nodes = data[queryName].edges.map(edge => edge.node);
					return nodes.map(node => ({ name: node[descriptiveField] || node.id, value: node.id }));
				} catch (error) {
					// If the query fails (e.g., 'name' field doesn't exist), return an empty list
					this.logger.warn(`Could not load records for relation '${relatedResource}'. Error: ${error.message}`);
					return [];
				}
			},

			async getViewsForResource(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resourceApiName = this.getCurrentNodeParameter('resource') as string;
				if (!resourceApiName) return [];

				const credentials = await this.getCredentials('twentyApi');
				const cachedSchema = (credentials.schemaCache ? JSON.parse(credentials.schemaCache as string) : {}) as { resources?: { value: string; id: string }[] };

				const resourceMetadata = cachedSchema.resources?.find(r => r.value === resourceApiName);
				if (!resourceMetadata) {
					this.logger.warn(`Could not find metadata for resource '${resourceApiName}' in cache.`);
					return [];
				}

				const query = `
					query GetCoreViews($objectMetadataId: String!) {
						getCoreViews(objectMetadataId: $objectMetadataId) {
							id
							name
						}
					}
				`;

				try {
					const data = await twentyApiRequest.call(this, 'graphql', query, { objectMetadataId: resourceMetadata.id }) as { getCoreViews: { id: string; name: string }[] };
					return data.getCoreViews.map(view => ({ name: view.name, value: view.id }));
				} catch (error) {
					this.logger.warn(`Could not load views for resource '${resourceApiName}'. Error: ${error.message}`);
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<any> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Fetch all available fields for the selected resource to dynamically build the query
		let fieldsString = 'id'; // Default to 'id' if the metadata call fails
		if (operation !== 'deleteOne') {
			try {
				const fieldsQuery = `query ObjectMetadataItem($apiName: String!) { ObjectMetadataItem(apiName: $apiName) { fieldsList { apiName } } }`;
				const fieldsData = await twentyApiRequest.call(this, 'metadata', fieldsQuery, { apiName: resource }) as { ObjectMetadataItem: { fieldsList: { apiName: string }[] } };
				fieldsString = fieldsData.ObjectMetadataItem.fieldsList.map(field => field.apiName).join('\n');
			} catch (error) {
				// The call might fail if permissions are missing, proceed with just 'id'
				this.logger.warn(`Could not fetch resource fields for '${resource}'. Defaulting to 'id'. Error: ${error.message}`);
			}
		}

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'createOne' || operation === 'updateOne') {
					const { fields } = this.getNodeParameter('fields', i, {}) as {
						fields: { key: { value: string }; value?: string; valueLookup?: string }[];
					};

					const input = (fields || []).reduce((acc, field) => {
						// Use value from the standard input or the lookup input
						const fieldValue = field.value ?? field.valueLookup;
						if (fieldValue !== undefined) {
							acc[field.key.value] = fieldValue;
						}
						return acc;
					}, {} as { [key: string]: any });

					const mutationName = `${operation}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
					const inputType = `${resource.charAt(0).toUpperCase() + resource.slice(1)}CreateOrUpdateInput!`;

					const query = `
						mutation ${mutationName}($input: ${inputType}) {
							${mutationName}(input: $input) {
								${fieldsString}
							}
						}
					`;

					const result = await twentyApiRequest.call(this, 'graphql', query, { input }) as { [key: string]: { [key: string]: any } };
					returnData.push({ json: result, pairedItem: { item: i } });
				} else if (operation === 'findOne') {
					const id = this.getNodeParameter('id', i) as string;

					const queryName = `findOne${resource.charAt(0).toUpperCase() + resource.slice(1)}`;

					const query = `
						query ${queryName}($id: ID!) {
							${queryName}(id: $id) {
								${fieldsString}
							}
						}
					`;

					const result = await twentyApiRequest.call(this, 'graphql', query, { id }) as { [key: string]: { [key: string]: any } };
					returnData.push({ json: result, pairedItem: { item: i } });
				} else if (operation === 'findMany') {
					const limit = this.getNodeParameter('limit', i) as number;
					const viewId = this.getNodeParameter('viewId', i) as string;

					let where = {};

					if (viewId) {
						// If a view is selected, fetch its filters and build the 'where' clause from it
						const viewQuery = `
							query GetCoreView($id: String!) {
								getCoreView(id: $id) {
									viewFilterGroups {
										logicalOperator
										viewFilters {
											fieldApiName
											operator
											value
										}
									}
								}
							}
						`;
						try {
							const viewData = await twentyApiRequest.call(this, 'graphql', viewQuery, { id: viewId }) as { getCoreView: { viewFilterGroups: any[] } };
							const filterGroups = viewData.getCoreView.viewFilterGroups;
							
							const topLevelOperator = filterGroups[0]?.logicalOperator || 'AND';
							const conditions = filterGroups.flatMap(group => 
								group.viewFilters.map((filter: any) => ({
									[filter.fieldApiName]: { [filter.operator]: filter.value }
								}))
							);

							if (conditions.length > 0) {
								where = { [topLevelOperator]: conditions };
							}
						} catch (error) {
							this.logger.warn(`Could not fetch or process view '${viewId}'. Falling back to manual filters. Error: ${error.message}`);
						}
					} 

					if (Object.keys(where).length === 0) {
						// If no view is selected or view processing fails, use manual filters
						const filterLogic = this.getNodeParameter('filterLogic', i) as 'AND' | 'OR';
						const { filters } = this.getNodeParameter('filters', i, {}) as { filters: { key: string; operator: string; value: string }[] };
						if (filters && filters.length > 0) {
							const conditions = filters.map(filter => {
								if (['in', 'notIn'].includes(filter.operator)) {
									return { [filter.key]: { [filter.operator]: filter.value.split(',').map(s => s.trim()) } };
								}
								return { [filter.key]: { [filter.operator]: filter.value } };
							});
							where = { [filterLogic]: conditions };
						}
					}

					const queryName = `findMany${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
					const filterType = `${resource.charAt(0).toUpperCase() + resource.slice(1)}Filters!`;

					const query = `
						query ${queryName}($first: Int, $where: ${filterType}) {
							${queryName}(first: $first, where: $where) {
								edges {
									node {
										${fieldsString}
									}
								}
							}
						}
					`;

					const result = await twentyApiRequest.call(this, 'graphql', query, { first: limit, where }) as {[key: string]: { edges: { node: any }[] }};
					// Extract the nodes from the edges
					const nodes = result[queryName].edges.map((edge: { node: any }) => edge.node);
					returnData.push(...this.helpers.returnJsonArray(nodes));
				} else if (operation === 'deleteOne') {
					const id = this.getNodeParameter('id', i) as string;

					const mutationName = `deleteOne${resource.charAt(0).toUpperCase() + resource.slice(1)}`;

					const query = `
						mutation ${mutationName}($id: ID!) {
							${mutationName}(id: $id)
						}
					`;

					await twentyApiRequest.call(this, 'graphql', query, { id });
					returnData.push({ json: { success: true }, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				} else {
					throw error;
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
