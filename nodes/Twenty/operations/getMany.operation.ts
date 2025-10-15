import { IExecuteFunctions } from 'n8n-workflow';
import { twentyRestApiRequest } from '../TwentyApi.client';

/**
 * Execute bulk get operation - retrieve multiple records by IDs.
 * Uses REST API for efficient data retrieval.
 * 
 * @param context The n8n execution context
 * @param resource The resource/object name (singular)
 * @param recordIds Array of record IDs to retrieve
 * @param objectMetadata The object metadata from schema
 * @returns Array of results with retrieved records or errors
 */
export async function executeGetMany(
	context: IExecuteFunctions,
	resource: string,
	recordIds: string[],
	objectMetadata: any,
): Promise<Array<{ success: boolean; record?: any; error?: string; id: string; index: number }>> {
	const pluralName = objectMetadata.namePlural;

	// Execute all GET requests in parallel
	const results = await Promise.allSettled(
		recordIds.map(async (recordId, index) => {
			const restPath = `/${pluralName}/${recordId}`;
			
			const response: any = await twentyRestApiRequest.call(
				context,
				'GET',
				restPath,
			);

			// REST API returns data in format: { data: { [resourceSingular]: { ...fields } } }
			const record = response.data?.[resource];
			
			if (!record) {
				throw new Error(`Record with ID "${recordId}" not found`);
			}

			return {
				success: true,
				record,
				id: recordId,
				index,
			};
		}),
	);

	// Map results to consistent format
	return results.map((result, index) => {
		if (result.status === 'fulfilled') {
			return result.value;
		} else {
			return {
				success: false,
				error: result.reason?.message || String(result.reason),
				id: recordIds[index],
				index,
			};
		}
	});
}
