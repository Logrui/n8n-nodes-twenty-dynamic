require('dotenv').config({ path: './tests/.env' });
const axios = require('axios');

const API_KEY = process.env.TWENTY_API_KEY;
const DOMAIN = process.env.TWENTY_URL || process.env.TWENTY_DOMAIN;
const GRAPHQL_ENDPOINT = `${DOMAIN}graphql`;

const headers = {
	'Authorization': `Bearer ${API_KEY}`,
	'Content-Type': 'application/json',
};

async function introspectCompanyType() {
	console.log('=== Introspecting Company Type to Discover ALL Fields ===\n');

	try {
		// Step 1: Get ALL fields with their types via introspection
		console.log('🔍 Step 1: Introspecting Company type...');
		const introspectionQuery = `
			query IntrospectCompany {
				__type(name: "Company") {
					name
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
					}
				}
			}
		`;

		const introspectionResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: introspectionQuery,
		}, { headers });

		if (introspectionResponse.data.errors) {
			console.log('❌ Introspection failed:', introspectionResponse.data.errors);
			return;
		}

		const fields = introspectionResponse.data.data.__type.fields;
		console.log(`✅ Found ${fields.length} total fields\n`);

		// Categorize fields by type
		const scalarFields = [];
		const enumFields = [];
		const objectFields = [];
		const listFields = [];
		const connectionFields = [];

		fields.forEach(field => {
			const fieldType = field.type;
			const typeName = fieldType.name || fieldType.ofType?.name || fieldType.ofType?.ofType?.name;
			const typeKind = fieldType.kind || fieldType.ofType?.kind || fieldType.ofType?.ofType?.kind;

			// Skip __typename meta field
			if (field.name === '__typename') return;

			if (typeKind === 'SCALAR' || ['ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Date', 'Time', 'UUID'].includes(typeName)) {
				scalarFields.push({ name: field.name, type: typeName });
			} else if (typeKind === 'ENUM') {
				enumFields.push({ name: field.name, type: typeName });
			} else if (typeKind === 'OBJECT' && !typeName?.endsWith('Connection')) {
				objectFields.push({ name: field.name, type: typeName });
			} else if (typeKind === 'LIST' || fieldType.kind === 'LIST' || fieldType.ofType?.kind === 'LIST') {
				listFields.push({ name: field.name, type: typeName });
			} else if (typeName?.endsWith('Connection')) {
				connectionFields.push({ name: field.name, type: typeName });
			} else {
				console.log(`⚠️ Unknown field type: ${field.name} (${typeKind}: ${typeName})`);
			}
		});

		console.log('📊 Field Categories:');
		console.log(`- Scalar/ID fields: ${scalarFields.length}`);
		console.log(`- Enum fields: ${enumFields.length}`);
		console.log(`- Object fields: ${objectFields.length}`);
		console.log(`- List fields: ${listFields.length}`);
		console.log(`- Connection fields: ${connectionFields.length}`);

		console.log('\n📝 Scalar Fields:');
		scalarFields.forEach(f => console.log(`   ${f.name}: ${f.type}`));

		console.log('\n📝 Enum Fields:');
		enumFields.forEach(f => console.log(`   ${f.name}: ${f.type}`));

		console.log('\n📝 Object Fields (Complex):');
		objectFields.forEach(f => console.log(`   ${f.name}: ${f.type}`));

		console.log('\n📝 Connection Fields (Relations):');
		connectionFields.forEach(f => console.log(`   ${f.name}: ${f.type}`));

		// Step 2: Build a comprehensive query with ALL queryable fields
		console.log('\n🔨 Step 2: Building comprehensive query...');
		
		// For object fields, we need to know their subfields
		// Let's introspect a few common ones
		const objectFieldQueries = [];
		
		// Common subfield patterns for Twenty CRM object types
		const objectFieldPatterns = {
			'WorkspaceMember': 'id\n\t\t\t\tname { firstName lastName }',
			'Currency': 'amountMicros\n\t\t\t\tcurrencyCode',
			'Address': 'addressStreet1\n\t\t\t\taddressStreet2\n\t\t\t\taddressCity\n\t\t\t\taddressState\n\t\t\t\taddressCountry\n\t\t\t\taddressPostcode',
			'Links': 'primaryLinkUrl\n\t\t\t\tprimaryLinkLabel\n\t\t\t\tsecondaryLinks',
		};

		// Build field selections
		const allFieldSelections = [
			...scalarFields.map(f => f.name),
			...enumFields.map(f => f.name),
		];

		// Add object fields with subfield selections
		objectFields.forEach(field => {
			const pattern = objectFieldPatterns[field.type];
			if (pattern) {
				allFieldSelections.push(`${field.name} {\n\t\t\t\t${pattern}\n\t\t\t}`);
			} else {
				// For unknown object types, try to get id at minimum
				allFieldSelections.push(`${field.name} {\n\t\t\t\tid\n\t\t\t}`);
			}
		});

		// Skip connection fields for now (they need pagination)

		const fieldSelectionsStr = allFieldSelections.join('\n\t\t\t\t');

		// Step 3: Query a specific company with all fields
		console.log('\n📖 Step 3: Querying company with ALL discovered fields...');
		
		const comprehensiveQuery = `
			query GetCompanyComplete($id: UUID!) {
				companies(filter: { id: { eq: $id } }) {
					edges {
						node {
							${fieldSelectionsStr}
						}
					}
				}
			}
		`;

		console.log('\n🔍 Generated Query:');
		console.log(comprehensiveQuery.substring(0, 500) + '...\n');

		const testCompanyId = 'f0da9343-cffc-4efa-be2f-16becb74999e'; // Northwestern University

		const queryResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: comprehensiveQuery,
			variables: { id: testCompanyId },
		}, { headers });

		if (queryResponse.data.errors) {
			console.log('⚠️ Query had errors (some fields may not exist):');
			queryResponse.data.errors.forEach((err, i) => {
				console.log(`   ${i + 1}. ${err.message}`);
			});
		}

		if (queryResponse.data.data?.companies?.edges?.[0]) {
			const record = queryResponse.data.data.companies.edges[0].node;
			console.log('\n✅ Query successful!');
			console.log('Fields returned:', Object.keys(record).length);
			console.log('Non-null fields:', Object.entries(record).filter(([k, v]) => v !== null && v !== undefined).length);
			
			console.log('\n📋 Complete Record Data:');
			console.log(JSON.stringify(record, null, 2));

			// Analyze what we got
			console.log('\n📊 Analysis:');
			console.log('Fields with data:');
			Object.entries(record).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
					const preview = valueStr.length > 50 ? valueStr.substring(0, 47) + '...' : valueStr;
					console.log(`   ✓ ${key}: ${preview}`);
				}
			});

			console.log('\nFields with null:');
			Object.entries(record).forEach(([key, value]) => {
				if (value === null) {
					console.log(`   ○ ${key}`);
				}
			});
		} else {
			console.log('❌ No data returned');
		}

		// Step 4: Show what fields we're missing
		console.log('\n\n📌 Summary:');
		console.log(`Total fields available: ${fields.length}`);
		console.log(`Scalar/Enum fields: ${scalarFields.length + enumFields.length}`);
		console.log(`Complex object fields: ${objectFields.length}`);
		console.log(`Connection/Relation fields: ${connectionFields.length} (skipped - require pagination)`);

	} catch (error) {
		console.error('❌ Test failed with exception:', error.message);
		if (error.response?.data) {
			console.error('Response data:', JSON.stringify(error.response.data, null, 2));
		}
	}
}

introspectCompanyType();
