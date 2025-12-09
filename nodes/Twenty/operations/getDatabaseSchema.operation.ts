/**
 * Get Database Schema Operation
 * 
 * Returns the schema/data model for a selected database including:
 * - Field names, labels, and types
 * - Required/optional status
 * - Read-only status
 * - Options for SELECT/MULTI_SELECT fields
 * - Optional sample records
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getCachedSchema, twentyRestApiRequest } from '../TwentyApi.client';
import type { IObjectMetadata } from '../TwentyApi.client';
import { getFormatSpec } from '../../fieldFormatSpecifications';

/**
 * Execute Get Database Schema operation
 * Returns the schema for the selected database with optional sample records and format specifications
 */
export async function executeGetDatabaseSchema(
	this: IExecuteFunctions,
	resource: string,
	objectMetadata: IObjectMetadata,
	simplify: boolean = false,
	includeFormatDetails: boolean = true,
	includeSystemFields: boolean = false,
	includeInactiveFields: boolean = false,
	includeReadOnlyFields: boolean = false,
): Promise<any> {
	// Get fresh schema metadata
	const schema = await getCachedSchema.call(this, true);
	
	// Find the object in schema
	const object = schema.objects.find(obj => obj.nameSingular === resource);
	
	if (!object) {
		throw new NodeOperationError(this.getNode(), `Database "${resource}" not found in schema`);
	}

	// Get sample records (2 records)
	let sampleRecords: any[] = [];
	try {
		const pluralName = object.namePlural;
		const restPath = `/${pluralName}?limit=2`;
		
		const response: any = await twentyRestApiRequest.call(
			this,
			'GET',
			restPath,
		);

		// Extract records from response
		const records = response.data?.[pluralName];
		if (records && Array.isArray(records)) {
			sampleRecords = records;
		}
	} catch (error) {
		// If getting samples fails, continue without them
		// This is not critical to the schema operation
	}

	// Filter fields based on parameters
	let filteredFields = object.fields;
	
	// Filter by isSystem (default: exclude system fields)
	// Only filter out fields that are explicitly marked as system fields (isSystem === true)
	// Fields without isSystem property should always be included
	if (!includeSystemFields) {
		filteredFields = filteredFields.filter(field => field.isSystem !== true);
	}
	
	// Filter by isActive (default: exclude inactive fields)
	// Only filter out fields that are explicitly marked as inactive (isActive === false)
	// Fields without isActive property should always be included
	if (!includeInactiveFields) {
		filteredFields = filteredFields.filter(field => field.isActive !== false);
	}

	// Filter by isWritable (default: exclude read-only fields)
	// Only filter out fields that are explicitly marked as read-only (isWritable === false)
	// Fields without isWritable property should always be included
	if (!includeReadOnlyFields) {
		filteredFields = filteredFields.filter(field => field.isWritable !== false);
	}

	// Build field information
	const fields = filteredFields.map(field => {
		if (simplify) {
			// Simplified output - only essential info
			const simplified: any = {
				name: field.name,
				label: field.label,
				type: field.type,
				required: !field.isNullable,
				readonly: !field.isWritable,
			};

			// Add options only for fields that have them
			if (field.options && Array.isArray(field.options) && field.options.length > 0) {
				simplified.options = field.options.map((opt: any) => ({
					label: opt.label,
					value: opt.value,
				}));
			}

			// Add format details if enabled
			if (includeFormatDetails) {
				const formatSpec = getFormatSpec(field.type);
				if (formatSpec) {
					simplified.formatDetails = {
						pattern: formatSpec.pattern,
						example: formatSpec.example,
						description: formatSpec.description,
						accepts: formatSpec.accepts,
						returns: formatSpec.returns,
						validation: formatSpec.validation,
						criticalNotes: formatSpec.criticalNotes,
						notes: formatSpec.notes,
					};
				}
			}

			return simplified;
		} else {
			// Full output - all metadata
			const fullField: any = {
				id: field.id,
				name: field.name,
				label: field.label,
				type: field.type,
				isNullable: field.isNullable,
				isWritable: field.isWritable,
				isActive: field.isActive,
				isSystem: field.isSystem,
				options: field.options,
			};

			// Add format details if enabled
			if (includeFormatDetails) {
				const formatSpec = getFormatSpec(field.type);
				if (formatSpec) {
					fullField.formatDetails = {
						pattern: formatSpec.pattern,
						example: formatSpec.example,
						description: formatSpec.description,
						accepts: formatSpec.accepts,
						returns: formatSpec.returns,
						validation: formatSpec.validation,
						criticalNotes: formatSpec.criticalNotes,
						notes: formatSpec.notes,
					};
				}
			}

			return fullField;
		}
	});

	// Build output structure
	const output: any = {
		database: object.labelSingular,
		databaseName: object.nameSingular,
		databaseNamePlural: object.namePlural,
		isCustom: object.isCustom,
		isSystem: object.isSystem,
		totalFields: fields.length,
		fields,
	};

	// Add sample data if available
	if (sampleRecords.length > 0) {
		output.sampleData = sampleRecords;
		output.sampleCount = sampleRecords.length;
	}

	// Add summary stats if not simplified
	if (!simplify) {
		const fieldTypes = fields.reduce((acc: any, field: any) => {
			const type = field.type;
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		}, {});

		output.summary = {
			totalFields: fields.length,
			requiredFields: fields.filter((f: any) => !f.isNullable).length,
			optionalFields: fields.filter((f: any) => f.isNullable).length,
			readonlyFields: fields.filter((f: any) => !f.isWritable).length,
			writableFields: fields.filter((f: any) => f.isWritable).length,
			systemFields: fields.filter((f: any) => f.isSystem).length,
			customFields: fields.filter((f: any) => !f.isSystem).length,
			fieldTypes,
		};

		// Add format details count if enabled
		if (includeFormatDetails) {
			output.summary.fieldsWithFormatDetails = fields.filter((f: any) => f.formatDetails).length;
		}
	}

	return output;
}
