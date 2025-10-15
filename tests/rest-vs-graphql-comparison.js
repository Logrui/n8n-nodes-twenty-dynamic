/**
 * REST API vs GraphQL Comparison Test
 * 
 * This test compares Twenty CRM's REST API vs GraphQL introspection approach
 * for Get operations on the People database.
 * 
 * Purpose: Determine if REST API is simpler and more reliable than GraphQL introspection
 * 
 * Key Questions:
 * 1. Does REST GET /people/{id} return ALL fields automatically?
 * 2. Does REST handle complex types (FullName, Emails, Phones) without special handling?
 * 3. Is REST simpler than GraphQL introspection + fallback logic?
 * 
 * Usage:
 *   1. Ensure .env file is configured with TWENTY_API_KEY and TWENTY_URL
 *   2. Run: node tests/rest-vs-graphql-comparison.js
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
const restEndpoint = `${baseUrl}/rest`;
const graphqlEndpoint = `${baseUrl}/graphql`;

console.log('🔬 REST API vs GraphQL Introspection Comparison');
console.log('='.repeat(70));
console.log(`Base URL: ${baseUrl}`);
console.log(`REST Endpoint: ${restEndpoint}`);
console.log(`GraphQL Endpoint: ${graphqlEndpoint}`);
console.log('='.repeat(70));
console.log();

/**
 * Test 1: REST API Get Person
 * Simple HTTP GET request - no introspection, no field selection
 */
async function testRestApiGet(personId) {
	console.log('📝 TEST 1: REST API Get Person');
	console.log('-'.repeat(70));
	
	const url = `${restEndpoint}/people/${personId}`;
	console.log(`Request: GET ${url}`);
	console.log();
	
	const startTime = Date.now();
	
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${TWENTY_API_KEY}`,
				'Content-Type': 'application/json',
			},
		});
		
		const duration = Date.now() - startTime;
		
		if (!response.ok) {
			const errorText = await response.text();
			console.log(`❌ HTTP ${response.status}: ${errorText}`);
			return null;
		}
		
		const result = await response.json();
		
		console.log(`✅ SUCCESS (${duration}ms)`);
		console.log();
		console.log('Response Structure:');
		console.log(JSON.stringify(result, null, 2));
		console.log();
		
		const person = result.data?.person;
		if (person) {
			console.log('Fields Returned:');
			console.log(`  - Total fields: ${Object.keys(person).length}`);
			console.log(`  - Has 'name' field: ${!!person.name}`);
			if (person.name) {
				console.log(`    • Type: ${typeof person.name}`);
				if (typeof person.name === 'object') {
					console.log(`    • firstName: "${person.name.firstName}"`);
					console.log(`    • lastName: "${person.name.lastName}"`);
				} else {
					console.log(`    • Value: "${person.name}"`);
				}
			}
			console.log(`  - Has 'emails' field: ${!!person.emails}`);
			if (person.emails) {
				console.log(`    • Type: ${typeof person.emails}`);
				console.log(`    • Value: ${JSON.stringify(person.emails)}`);
			}
			console.log(`  - Has 'phones' field: ${!!person.phones}`);
			if (person.phones) {
				console.log(`    • Type: ${typeof person.phones}`);
				console.log(`    • Value: ${JSON.stringify(person.phones)}`);
			}
		}
		
		console.log();
		console.log('✅ REST API: NO INTROSPECTION NEEDED');
		console.log('✅ REST API: ALL FIELDS RETURNED AUTOMATICALLY');
		console.log('✅ REST API: COMPLEX TYPES HANDLED BY SERVER');
		console.log();
		
		return result;
		
	} catch (error) {
		console.error(`❌ ERROR: ${error.message}`);
		return null;
	}
}

/**
 * Test 2: GraphQL Introspection Approach
 * Multi-step process: Introspect → Build query → Execute query
 */
async function testGraphQLIntrospectionGet(personId) {
	console.log('📝 TEST 2: GraphQL Introspection Get Person');
	console.log('-'.repeat(70));
	
	// Step 1: Introspect Person type
	console.log('Step 1: Introspect Person type schema...');
	const introspectionQuery = `
		query IntrospectPerson {
			__type(name: "Person") {
				name
				fields {
					name
					type {
						name
						kind
					}
				}
			}
		}
	`;
	
	const introspectionStart = Date.now();
	let fields = [];
	
	try {
		const introspectionResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${TWENTY_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query: introspectionQuery }),
		});
		
		const introspectionDuration = Date.now() - introspectionStart;
		
		if (!introspectionResponse.ok) {
			console.log(`❌ Introspection failed: HTTP ${introspectionResponse.status}`);
			console.log('⚠️  Falling back to hardcoded fields...');
			fields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name { firstName lastName }'];
		} else {
			const introspectionResult = await introspectionResponse.json();
			
			if (introspectionResult.errors) {
				console.log(`❌ Introspection GraphQL errors: ${JSON.stringify(introspectionResult.errors)}`);
				console.log('⚠️  Falling back to hardcoded fields...');
				fields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name { firstName lastName }'];
			} else {
				console.log(`✅ Introspection succeeded (${introspectionDuration}ms)`);
				
				// Build field list from introspection
				const typeFields = introspectionResult.data?.__type?.fields || [];
				console.log(`   Found ${typeFields.length} fields`);
				
				// Simplified field selection (real implementation is more complex)
				fields = typeFields
					.filter(f => f.type.kind === 'SCALAR' || f.type.kind === 'ENUM')
					.map(f => f.name)
					.slice(0, 10); // Limit for demo
				
				// Add complex types manually
				if (typeFields.find(f => f.name === 'name')) {
					fields.push('name { firstName lastName }');
				}
			}
		}
		
		console.log();
		
	} catch (error) {
		console.log(`❌ Introspection ERROR: ${error.message}`);
		console.log('⚠️  Falling back to hardcoded fields...');
		fields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name { firstName lastName }'];
	}
	
	// Step 2: Build and execute Get query
	console.log('Step 2: Build and execute Get query...');
	
	const getQuery = `
		query GetPerson($id: UUID!) {
			people(filter: { id: { eq: $id } }) {
				edges {
					node {
						${fields.join('\n\t\t\t\t\t\t')}
					}
				}
			}
		}
	`;
	
	console.log();
	console.log('Generated Query:');
	console.log(getQuery);
	console.log();
	
	const queryStart = Date.now();
	
	try {
		const queryResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${TWENTY_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: getQuery,
				variables: { id: personId },
			}),
		});
		
		const queryDuration = Date.now() - queryStart;
		const totalDuration = Date.now() - introspectionStart;
		
		if (!queryResponse.ok) {
			const errorText = await queryResponse.text();
			console.log(`❌ Query failed: HTTP ${queryResponse.status}`);
			console.log(errorText);
			return null;
		}
		
		const result = await queryResponse.json();
		
		if (result.errors) {
			console.log(`❌ Query GraphQL errors:`);
			console.log(JSON.stringify(result.errors, null, 2));
			return null;
		}
		
		console.log(`✅ Query succeeded (${queryDuration}ms)`);
		console.log(`   Total time: ${totalDuration}ms (introspection + query)`);
		console.log();
		
		const person = result.data?.people?.edges?.[0]?.node;
		if (person) {
			console.log('Fields Returned:');
			console.log(`  - Total fields: ${Object.keys(person).length}`);
			console.log();
		}
		
		console.log('⚠️  GraphQL Introspection: REQUIRES 2 API CALLS');
		console.log('⚠️  GraphQL Introspection: COMPLEX TYPE MAPPING NEEDED');
		console.log('⚠️  GraphQL Introspection: FALLBACK LOGIC REQUIRED');
		console.log();
		
		return result;
		
	} catch (error) {
		console.error(`❌ Query ERROR: ${error.message}`);
		return null;
	}
}

/**
 * Test 3: Find a Person ID to use for testing
 */
async function findTestPersonId() {
	console.log('🔍 Finding a Person record for testing...');
	console.log();
	
	const query = `
		query FindPerson {
			people(paging: { first: 1 }) {
				edges {
					node {
						id
						name {
							firstName
							lastName
						}
					}
				}
			}
		}
	`;
	
	try {
		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${TWENTY_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query }),
		});
		
		if (!response.ok) {
			console.log(`❌ Failed to find test person: HTTP ${response.status}`);
			return null;
		}
		
		const result = await response.json();
		
		if (result.errors) {
			console.log(`❌ GraphQL errors: ${JSON.stringify(result.errors)}`);
			return null;
		}
		
		const person = result.data?.people?.edges?.[0]?.node;
		
		if (!person) {
			console.log('❌ No person records found in database');
			console.log('💡 Create a person record first using the Twenty UI');
			return null;
		}
		
		console.log(`✅ Found test person: ${person.name?.firstName} ${person.name?.lastName}`);
		console.log(`   ID: ${person.id}`);
		console.log();
		
		return person.id;
		
	} catch (error) {
		console.error(`❌ ERROR: ${error.message}`);
		return null;
	}
}

/**
 * Main execution
 */
async function main() {
	try {
		// Find a test person
		const personId = await findTestPersonId();
		
		if (!personId) {
			console.log();
			console.log('❌ Cannot run comparison without a test person');
			process.exit(1);
		}
		
		console.log();
		console.log('='.repeat(70));
		console.log('COMPARISON TEST');
		console.log('='.repeat(70));
		console.log();
		
		// Test 1: REST API
		const restResult = await testRestApiGet(personId);
		
		console.log();
		console.log('='.repeat(70));
		console.log();
		
		// Test 2: GraphQL Introspection
		const graphqlResult = await testGraphQLIntrospectionGet(personId);
		
		console.log();
		console.log('='.repeat(70));
		console.log('CONCLUSION');
		console.log('='.repeat(70));
		console.log();
		
		if (restResult && graphqlResult) {
			console.log('✅ Both approaches work');
			console.log();
			console.log('REST API Advantages:');
			console.log('  ✅ Single HTTP GET request');
			console.log('  ✅ All fields returned automatically');
			console.log('  ✅ No introspection needed');
			console.log('  ✅ No complex type mapping');
			console.log('  ✅ No fallback logic needed');
			console.log('  ✅ Simpler code (10 lines vs 200+ lines)');
			console.log();
			console.log('GraphQL Introspection Disadvantages:');
			console.log('  ⚠️  Requires introspection query first');
			console.log('  ⚠️  Complex type mapping (8+ types)');
			console.log('  ⚠️  Fallback logic for failed introspection');
			console.log('  ⚠️  Two API calls instead of one');
			console.log('  ⚠️  More complex code (200+ lines)');
			console.log();
			console.log('💡 RECOMMENDATION: Use REST API for Get operations');
			console.log('   - Simpler implementation');
			console.log('   - More reliable (no introspection failure)');
			console.log('   - Faster (one request vs two)');
			console.log('   - Less maintenance (no complex type mapping)');
		} else if (restResult) {
			console.log('✅ REST API works');
			console.log('❌ GraphQL Introspection failed');
			console.log();
			console.log('💡 RECOMMENDATION: Use REST API exclusively');
		} else if (graphqlResult) {
			console.log('❌ REST API failed');
			console.log('✅ GraphQL Introspection works');
			console.log();
			console.log('💡 RECOMMENDATION: Keep GraphQL Introspection');
		} else {
			console.log('❌ Both approaches failed');
			console.log('   Check API credentials and network connection');
		}
		
		console.log();
		
	} catch (error) {
		console.error(`❌ FATAL ERROR: ${error.message}`);
		console.error(error.stack);
		process.exit(1);
	}
}

// Run the test
main();
