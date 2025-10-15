import { IExecuteFunctions } from 'n8n-workflow';
import { twentyRestApiRequest } from '../TwentyApi.client';

/**
 * Execute bulk delete operation - delete multiple records by IDs.
 * Uses REST API for efficient deletion.
 * 
 * @param context The n8n execution context
 * @param resource The resource/object name (singular)
 * @param recordIds Array of record IDs to delete
 * @param objectMetadata The object metadata from schema
 * @returns Array of results with deletion status
 */
export async function executeDeleteMany(
	context: IExecuteFunctions,
	resource: string,
	recordIds: string[],
	objectMetadata: any,
): Promise<Array<{ success: boolean; id: string; error?: string; index: number }>> {
	const pluralName = objectMetadata.namePlural;

	// Execute all DELETE requests in parallel
	const results = await Promise.allSettled(
		recordIds.map(async (recordId, index) => {
			const restPath = `/${pluralName}/${recordId}`;
			
			const response: any = await twentyRestApiRequest.call(
				context,
				'DELETE',
				restPath,
			);

			// REST API DELETE can return different formats
			let deletedRecord;
			
			if (response.data) {
				// Check if it's nested under resource name
				deletedRecord = response.data[resource] || response.data[objectMetadata.nameSingular] || response.data;
			} else {
				// Response might be the record itself
				deletedRecord = response;
			}
			
			// If we got a valid response, consider it successful
			const resultId = deletedRecord?.id || recordId;

			return {
				success: true,
				id: resultId,
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
