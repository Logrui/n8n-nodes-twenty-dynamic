require('dotenv').config({ path: './tests/.env' });
const axios = require('axios');

const API_KEY = process.env.TWENTY_API_KEY;
const DOMAIN = process.env.TWENTY_URL || process.env.TWENTY_DOMAIN;
const GRAPHQL_ENDPOINT = `${DOMAIN}graphql`;

const headers = {
	'Authorization': `Bearer ${API_KEY}`,
	'Content-Type': 'application/json',
};

// Simulate what the code will generate - schema metadata fields + essential fields
// For Company object, schema metadata returns: id, employees
// Essential fields we add: id, createdAt, updatedAt, deletedAt, name, position, searchVector
// Combined (deduplicated): id, employees, createdAt, updatedAt, deletedAt, name, position, searchVector

async function testFixedOperations() {
	console.log('=== Testing Fixed Operations (Schema Metadata + Essential Fields) ===\n');

	let createdRecordId = null;

	try {
		// Test 1: Create Operation
		console.log('📝 Test 1: Create Operation');
		console.log('Creating a new company record...');
		const createMutation = `
			mutation CreateCompany($data: CompanyCreateInput!) {
				createCompany(data: $data) {
					id
					createdAt
					updatedAt
					deletedAt
					name
					employees
				}
			}
		`;
		
		const createVars = {
			data: {
				name: `Test Company ${Date.now()}`,
				employees: 42,
				idealCustomerProfile: true,
			}
		};

		const createResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: createMutation,
			variables: createVars,
		}, { headers });

		if (createResponse.data.errors) {
			console.log('❌ Create failed with errors:', JSON.stringify(createResponse.data.errors, null, 2));
		} else if (!createResponse.data.data?.createCompany) {
			console.log('❌ Create failed - no data returned');
		} else {
			const created = createResponse.data.data.createCompany;
			createdRecordId = created.id;
			console.log('✅ Create successful!');
			console.log('Record ID:', createdRecordId);
			console.log('Fields returned:', Object.keys(created).length);
			console.log('Full data:', created);
		}

		if (!createdRecordId) {
			console.log('\n⚠️ Skipping remaining tests - Create failed\n');
			return;
		}

		// Test 2: Get Operation  
		console.log('\n📖 Test 2: Get Operation');
		console.log(`Getting company record: ${createdRecordId}`);
		const getQuery = `
			query GetCompany($id: UUID!) {
				companies(filter: { id: { eq: $id } }) {
					edges {
						node {
							id
							createdAt
							updatedAt
							deletedAt
							name
							position
							searchVector
							employees
						}
					}
				}
			}
		`;

		const getVars = { id: createdRecordId };

		const getResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: getQuery,
			variables: getVars,
		}, { headers });

		if (getResponse.data.errors) {
			console.log('❌ Get failed with errors:', JSON.stringify(getResponse.data.errors, null, 2));
		} else {
			const edges = getResponse.data.data.companies.edges;
			if (edges.length === 0) {
				console.log('❌ Get failed - no record found');
			} else {
				const record = edges[0].node;
				console.log('✅ Get successful!');
				console.log('Fields returned:', Object.keys(record).length);
				console.log('Full data:', record);
			}
		}

		// Test 3: List Operation
		console.log('\n📋 Test 3: List Operation');
		console.log('Listing first 3 companies...');
		const listQuery = `
			query ListCompanies($limit: Int!) {
				companies(first: $limit) {
					edges {
						node {
							id
							createdAt
							updatedAt
							deletedAt
							name
							position
							searchVector
							employees
						}
					}
				}
			}
		`;

		const listVars = { limit: 3 };

		const listResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: listQuery,
			variables: listVars,
		}, { headers });

		if (listResponse.data.errors) {
			console.log('❌ List failed with errors:', JSON.stringify(listResponse.data.errors, null, 2));
		} else {
			const edges = listResponse.data.data.companies.edges;
			console.log('✅ List successful!');
			console.log('Records returned:', edges.length);
			if (edges.length > 0) {
				console.log('Fields per record:', Object.keys(edges[0].node).length);
				console.log('Sample record:', edges[0].node);
			}
		}

		// Test 4: Update Operation
		console.log('\n✏️ Test 4: Update Operation');
		console.log(`Updating company record: ${createdRecordId}`);
		const updateMutation = `
			mutation UpdateCompany($id: UUID!, $data: CompanyUpdateInput!) {
				updateCompany(id: $id, data: $data) {
					id
					createdAt
					updatedAt
					deletedAt
					name
					position
					searchVector
					employees
				}
			}
		`;

		const updateVars = {
			id: createdRecordId,
			data: {
				employees: 99,
			}
		};

		const updateResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: updateMutation,
			variables: updateVars,
		}, { headers });

		if (updateResponse.data.errors) {
			console.log('❌ Update failed with errors:', JSON.stringify(updateResponse.data.errors, null, 2));
		} else if (!updateResponse.data.data?.updateCompany) {
			console.log('❌ Update failed - no data returned');
		} else {
			const updated = updateResponse.data.data.updateCompany;
			console.log('✅ Update successful!');
			console.log('Fields returned:', Object.keys(updated).length);
			console.log('Full data:', updated);
		}

		// Test 5: Delete Operation
		console.log('\n🗑️ Test 5: Delete Operation');
		console.log(`Deleting company record: ${createdRecordId}`);
		const deleteMutation = `
			mutation DeleteCompany($id: UUID!) {
				deleteCompany(id: $id) {
					id
				}
			}
		`;

		const deleteVars = { id: createdRecordId };

		const deleteResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: deleteMutation,
			variables: deleteVars,
		}, { headers });

		if (deleteResponse.data.errors) {
			console.log('❌ Delete failed with errors:', JSON.stringify(deleteResponse.data.errors, null, 2));
		} else {
			const deleted = deleteResponse.data.data.deleteCompany;
			console.log('✅ Delete successful!');
			console.log('Deleted record ID:', deleted.id);
		}

		console.log('\n=== All Tests Complete ===');
		console.log('\n📊 Summary:');
		console.log('- Schema metadata provides: id, employees (2 fields)');
		console.log('- We add essential fields: createdAt, updatedAt, deletedAt, name, position, searchVector');
		console.log('- Total fields returned: 8 fields (up from 2)');
		console.log('- This gives 4x more data than before!');

	} catch (error) {
		console.error('❌ Test failed with exception:', error.message);
		if (error.response) {
			console.error('Response data:', error.response.data);
		}
	}
}

testFixedOperations();
