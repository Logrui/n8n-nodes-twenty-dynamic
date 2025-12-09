import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { twentyRestApiRequest } from '../TwentyApi.client';
import { buildCreateMutation } from './create.operation';
import { buildUpdateMutation } from './update.operation';

/**
 * Execute an upsert operation - update if record exists, create if not.
 * Supports two matching modes:
 * 1. Match by Record ID (UUID)
 * 2. Match by Unique Field (e.g., email for people)
 * 
 * @param context The n8n execution context
 * @param upsertMode How to match records ('id' or 'field')
 * @param resource The resource/object name (singular)
 * @param fieldsData The field values to set
 * @param objectMetadata The object metadata from schema
 * @param options Additional options (recordIdParam, matchField, matchValue)
 * @returns Object with upserted record and action taken
 */
export async function executeUpsert(
	context: IExecuteFunctions,
	upsertMode: string,
	resource: string,
	fieldsData: Record<string, any>,
	objectMetadata: any,
	options: {
		recordIdParam?: string | { mode: string; value: string };
		matchField?: string;
		matchValue?: string;
	},q
): Promise<{ record: any; action: 'updated' | 'created' }> {
	let recordId: string | undefined;
	let recordExists = false;

	if (upsertMode === 'id') {
		// MODE 1: Match by Record ID
		recordId = extractRecordId(context, options.recordIdParam);

		// Check if the record exists using REST API
		const pluralName = objectMetadata.namePlural;
		const restPath = `/${pluralName}/${recordId}`;
		
		try {
			const checkResponse: any = await twentyRestApiRequest.call(
				context,
				'GET',
				restPath,
			);
			// If we get here without error, record exists
			recordExists = checkResponse.data?.[resource] !== undefined;
		} catch (error) {
			// Record doesn't exist or other error - we'll create it
			recordExists = false;
		}
	} else {
		// MODE 2: Match by Unique Field
		if (!options.matchField || !options.matchValue) {
			throw new NodeOperationError(
				context.getNode(),
				'Match field and match value are required for field-based upsert',
			);
		}

		const matchResult = await findRecordByField(
			context,
			resource,
			objectMetadata.namePlural,
			options.matchField,
			options.matchValue,
		);

		if (matchResult) {
			recordExists = true;
			recordId = matchResult.id;
		}
	}

	// Import twentyApiRequest here to avoid circular dependency
	const { twentyApiRequest } = await import('../TwentyApi.client');

	if (recordExists && recordId) {
		// Record exists - UPDATE it
		const { query, variables } = await buildUpdateMutation(
			context,
			resource,
			recordId,
			fieldsData,
			objectMetadata,
		);
		const response: any = await twentyApiRequest.call(
			context,
			'graphql',
			query,
			variables,
		);

		// Extract updated record from response
		const operationName = `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
		const updatedRecord = response[operationName];

		return {
			record: updatedRecord,
			action: 'updated',
		};
	} else {
		// Record doesn't exist - CREATE it
		const { query, variables } = await buildCreateMutation(
			context,
			resource,
			fieldsData,
			objectMetadata,
		);
		const response: any = await twentyApiRequest.call(
			context,
			'graphql',
			query,
			variables,
		);

		// Extract created record from response
		const operationName = `create${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
		const createdRecord = response[operationName];

		return {
			record: createdRecord,
			action: 'created',
		};
	}
}

/**
 * Extract record ID from resourceLocator parameter or plain string.
 * Handles URL extraction if needed.
 */
function extractRecordId(
	context: IExecuteFunctions,
	recordIdParam: string | { mode: string; value: string } | undefined,
): string {
	if (!recordIdParam) {
		throw new NodeOperationError(
			context.getNode(),
			'No record ID provided',
		);
	}

	// Handle both old string format (backward compatibility) and new resourceLocator format
	if (typeof recordIdParam === 'string') {
		return recordIdParam;
	}

	if (recordIdParam && typeof recordIdParam === 'object' && recordIdParam.value) {
		// ResourceLocator format
		if (recordIdParam.mode === 'url') {
			// Extract ID from URL using regex
			const urlMatch = recordIdParam.value.match(/https?:\/\/.*?\/objects\/[^\/]+\/([a-f0-9-]{36})/i);
			if (!urlMatch) {
				throw new NodeOperationError(
					context.getNode(),
					`Could not extract record ID from URL: ${recordIdParam.value}`,
				);
			}
			return urlMatch[1];
		}
		// For 'list' and 'id' modes, value is already the ID
		return recordIdParam.value;
	}

	throw new NodeOperationError(
		context.getNode(),
		'Invalid record ID parameter format',
	);
}

/**
 * Find a record by searching for a unique field value.
 * Returns the record if found, undefined otherwise.
 */
async function findRecordByField(
	context: IExecuteFunctions,
	resource: string,
	pluralName: string,
	matchField: string,
	matchValue: string,
): Promise<{ id: string } | undefined> {
	// Build REST API path
	const restPath = `/${pluralName}`;
	
	try {
		const searchResponse: any = await twentyRestApiRequest.call(
			context,
			'GET',
			restPath,
		);

		// REST API returns data in format: { data: { [resourcePlural]: [...records] } }
		const records = searchResponse.data?.[pluralName];
		
		if (records && Array.isArray(records)) {
			// Find record where matchField equals matchValue
			const matchedRecord = records.find((record: any) => {
				const fieldValue = record[matchField];
				// Handle different field types
				if (typeof fieldValue === 'object' && fieldValue !== null) {
					// For complex types, compare stringified values
					return JSON.stringify(fieldValue) === JSON.stringify(matchValue);
				}
				return fieldValue === matchValue;
			});

			if (matchedRecord && matchedRecord.id) {
				return { id: matchedRecord.id };
			}
		}
	} catch (error) {
		// Error searching - return undefined (will trigger create)
		return undefined;
	}

	return undefined;
}
