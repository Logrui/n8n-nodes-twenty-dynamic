/**
 * Twenty CRM Complex Field Type Introspection Script
 * 
 * This script introspects the Twenty GraphQL schema to discover the structure
 * of complex field types: EMAILS, PHONES, MULTI_SELECT, SELECT, and RELATION
 * 
 * Purpose: Understand the exact schema requirements for implementing these
 * field types in the n8n node.
 * 
 * Usage:
 *   1. Ensure .env file is configured with TWENTY_API_KEY and TWENTY_URL
 *   2. Run: node introspect-complex-fields.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL || process.env.TWENTY_API_URL;

if (!TWENTY_API_KEY || !TWENTY_URL) {
	console.error('❌ ERROR: Missing environment variables');
	console.error('Required: TWENTY_API_KEY, TWENTY_URL (or TWENTY_API_URL)');
	process.exit(1);
}

// Clean up URL - remove trailing slashes and /graphql
const baseUrl = TWENTY_URL.replace(/\/+$/, '').replace(/\/graphql$/, '');
const graphqlEndpoint = `${baseUrl}/graphql`;
const metadataEndpoint = `${baseUrl}/metadata`;

console.log('🔍 Twenty CRM Complex Field Type Introspection');
console.log('='.repeat(60));
console.log(`GraphQL Endpoint: ${graphqlEndpoint}`);
console.log('='.repeat(60));
console.log();

/**
 * Execute GraphQL introspection query
 */
async function introspectType(typeName) {
	const query = `
		query IntrospectType($typeName: String!) {
			__type(name: $typeName) {
				name
				kind
				description
				fields {
					name
					type {
						name
						kind
						ofType {
							name
							kind
							ofType {
								name
								kind
							}
						}
					}
					description
				}
				inputFields {
					name
					type {
						name
						kind
						ofType {
							name
							kind
							ofType {
								name
								kind
							}
						}
					}
					description
					defaultValue
				}
			}
		}
	`;

	const response = await fetch(graphqlEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${TWENTY_API_KEY}`,
		},
		body: JSON.stringify({
			query,
			variables: { typeName }
		}),
	});

	const data = await response.json();
	
	if (data.errors) {
		console.error(`❌ Error introspecting ${typeName}:`, JSON.stringify(data.errors, null, 2));
		return null;
	}

	if (!data.data || !data.data.__type) {
		// Type doesn't exist, that's okay
		return null;
	}

	return data.data.__type;
}

/**
 * Search for fields of a specific type across all objects
 */
async function findFieldsByType(fieldType) {
	const query = `
		query FindObjects {
			objects(paging: { first: 100 }) {
				edges {
					node {
						id
						nameSingular
						namePlural
						labelSingular
						fields(paging: { first: 200 }) {
							edges {
								node {
									id
									name
									label
									type
									description
									isNullable
									defaultValue
								}
							}
						}
					}
				}
			}
		}
	`;

	const response = await fetch(`${metadataEndpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${TWENTY_API_KEY}`,
		},
		body: JSON.stringify({ query }),
	});

	const data = await response.json();
	
	if (data.errors) {
		console.error(`❌ Error querying metadata:`, JSON.stringify(data.errors, null, 2));
		return [];
	}

	if (!data.data || !data.data.objects) {
		console.error(`⚠️  No objects data returned from metadata endpoint`);
		console.error(`Response:`, JSON.stringify(data, null, 2));
		return [];
	}

	const results = [];
	
	for (const edge of data.data.objects.edges) {
		const object = edge.node;
		for (const fieldEdge of object.fields.edges) {
			const field = fieldEdge.node;
			if (field.type === fieldType) {
				results.push({
					object: object.nameSingular,
					objectLabel: object.labelSingular,
					field: field.name,
					fieldLabel: field.label,
					description: field.description,
					isNullable: field.isNullable,
					defaultValue: field.defaultValue,
				});
			}
		}
	}

	return results;
}

/**
 * Get input type for mutations
 */
async function introspectInputType(typeName) {
	const typeInfo = await introspectType(typeName);
	
	if (!typeInfo) {
		console.log(`⚠️  Type ${typeName} not found`);
		return null;
	}

	console.log(`\n📦 Type: ${typeInfo.name} (${typeInfo.kind})`);
	if (typeInfo.description) {
		console.log(`   Description: ${typeInfo.description}`);
	}

	if (typeInfo.inputFields && typeInfo.inputFields.length > 0) {
		console.log('   Input Fields:');
		for (const field of typeInfo.inputFields) {
			const typeName = getTypeName(field.type);
			const required = isRequired(field.type);
			const defaultVal = field.defaultValue ? ` (default: ${field.defaultValue})` : '';
			console.log(`     - ${field.name}: ${typeName}${required ? ' [REQUIRED]' : ''}${defaultVal}`);
			if (field.description) {
				console.log(`       ${field.description}`);
			}
		}
	}

	if (typeInfo.fields && typeInfo.fields.length > 0) {
		console.log('   Output Fields:');
		for (const field of typeInfo.fields) {
			const typeName = getTypeName(field.type);
			console.log(`     - ${field.name}: ${typeName}`);
			if (field.description) {
				console.log(`       ${field.description}`);
			}
		}
	}

	return typeInfo;
}

/**
 * Helper to get type name from nested type structure
 */
function getTypeName(type) {
	if (type.kind === 'NON_NULL') {
		return getTypeName(type.ofType);
	}
	if (type.kind === 'LIST') {
		return `[${getTypeName(type.ofType)}]`;
	}
	return type.name;
}

/**
 * Helper to check if field is required
 */
function isRequired(type) {
	return type.kind === 'NON_NULL';
}

/**
 * Main execution
 */
async function main() {
	const fieldTypes = ['EMAILS', 'PHONES', 'MULTI_SELECT', 'SELECT', 'RATING', 'RELATION'];

	console.log('📋 STEP 1: Finding fields by type across all objects\n');
	
	for (const fieldType of fieldTypes) {
		console.log(`\n${'='.repeat(60)}`);
		console.log(`🔎 Searching for ${fieldType} fields...`);
		console.log('='.repeat(60));
		
		const fields = await findFieldsByType(fieldType);
		
		if (fields.length === 0) {
			console.log(`   ℹ️  No ${fieldType} fields found in metadata`);
		} else {
			console.log(`   ✅ Found ${fields.length} ${fieldType} field(s):\n`);
			for (const field of fields) {
				console.log(`   📌 ${field.object}.${field.field}`);
				console.log(`      Label: ${field.fieldLabel}`);
				if (field.description) {
					console.log(`      Description: ${field.description}`);
				}
				console.log(`      Nullable: ${field.isNullable}`);
				if (field.defaultValue) {
					console.log(`      Default: ${field.defaultValue}`);
				}
				console.log();
			}
		}
	}

	console.log(`\n${'='.repeat(60)}`);
	console.log('📋 STEP 2: Introspecting GraphQL type schemas\n');
	console.log('='.repeat(60));

	// Common type patterns to check
	const typesToIntrospect = [
		// Input types (for mutations)
		'EmailsInput',
		'EmailInput',
		'PhonesInput',
		'PhoneInput',
		'LinksInput',
		'LinkInput',
		'AddressInput',
		'CurrencyInput',
		'FullNameInput',
		
		// Output types (for queries)
		'Emails',
		'Email',
		'Phones',
		'Phone',
		'Links',
		'Link',
		'Address',
		'Currency',
		'FullName',
		
		// Relation types
		'Relation',
		
		// Enum/Select types - we'll search for these dynamically
	];

	for (const typeName of typesToIntrospect) {
		await introspectInputType(typeName);
	}

	console.log('\n' + '='.repeat(60));
	console.log('✅ Introspection complete!');
	console.log('='.repeat(60));
	console.log('\nNext steps:');
	console.log('1. Review the field structures above');
	console.log('2. Identify input field names and types');
	console.log('3. Update FieldParameters.ts with new field templates');
	console.log('4. Update FieldTransformation.ts with new transformation logic');
	console.log('5. Add new field types to the Field Type dropdown');
}

// Run the script
main().catch(console.error);
