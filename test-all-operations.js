require('dotenv').config({ path: './tests/.env' });
const axios = require('axios');

const API_KEY = process.env.TWENTY_API_KEY;
const DOMAIN = process.env.TWENTY_URL || process.env.TWENTY_DOMAIN;
const GRAPHQL_ENDPOINT = `${DOMAIN}graphql`;

const headers = {
	'Authorization': `Bearer ${API_KEY}`,
	'Content-Type': 'application/json',
};

async function testAllOperations() {
	console.log('=== Testing All Operations with Comprehensive Field Queries ===\n');

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
					title
					label
					fullName
					displayName
					firstName
					lastName
					description
					body
					content
					notes
					subject
					email
					phone
					phoneNumber
					position
					employees
					idealCustomerProfile
					hasCvc
					intakeStatus
					searchVector
					accountOwnerId
					ownerId
					assigneeId
					status
					stage
					priority
					isActive
					isArchived
					isDeleted
					startDate
					endDate
					dueDate
					completedAt
					amount
					quantity
					total
					score
					isPublic
					isPrivate
					isFavorite
					isCompleted
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
		} else {
			const created = createResponse.data.data.createCompany;
			createdRecordId = created.id;
			console.log('✅ Create successful!');
			console.log('Record ID:', createdRecordId);
			console.log('Fields returned:', Object.keys(created).length);
			console.log('Non-null fields:', Object.entries(created).filter(([k, v]) => v !== null).length);
			console.log('Sample data:', {
				id: created.id,
				name: created.name,
				employees: created.employees,
				idealCustomerProfile: created.idealCustomerProfile,
				createdAt: created.createdAt,
			});
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
							title
							label
							fullName
							displayName
							firstName
							lastName
							description
							body
							content
							notes
							subject
							email
							phone
							phoneNumber
							position
							employees
							idealCustomerProfile
							hasCvc
							intakeStatus
							searchVector
							accountOwnerId
							ownerId
							assigneeId
							status
							stage
							priority
							isActive
							isArchived
							isDeleted
							startDate
							endDate
							dueDate
							completedAt
							amount
							quantity
							total
							score
							isPublic
							isPrivate
							isFavorite
							isCompleted
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
				console.log('Non-null fields:', Object.entries(record).filter(([k, v]) => v !== null).length);
				console.log('Sample data:', {
					id: record.id,
					name: record.name,
					employees: record.employees,
					idealCustomerProfile: record.idealCustomerProfile,
				});
			}
		}

		// Test 3: List Operation
		console.log('\n📋 Test 3: List Operation');
		console.log('Listing first 5 companies...');
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
							title
							label
							fullName
							displayName
							firstName
							lastName
							description
							body
							content
							notes
							subject
							email
							phone
							phoneNumber
							position
							employees
							idealCustomerProfile
							hasCvc
							intakeStatus
							searchVector
							accountOwnerId
							ownerId
							assigneeId
							status
							stage
							priority
							isActive
							isArchived
							isDeleted
							startDate
							endDate
							dueDate
							completedAt
							amount
							quantity
							total
							score
							isPublic
							isPrivate
							isFavorite
							isCompleted
						}
					}
				}
			}
		`;

		const listVars = { limit: 5 };

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
				const firstRecord = edges[0].node;
				console.log('Fields per record:', Object.keys(firstRecord).length);
				console.log('Non-null fields (first record):', Object.entries(firstRecord).filter(([k, v]) => v !== null).length);
				console.log('Sample data (first record):', {
					id: firstRecord.id,
					name: firstRecord.name,
					employees: firstRecord.employees,
				});
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
					title
					label
					fullName
					displayName
					firstName
					lastName
					description
					body
					content
					notes
					subject
					email
					phone
					phoneNumber
					position
					employees
					idealCustomerProfile
					hasCvc
					intakeStatus
					searchVector
					accountOwnerId
					ownerId
					assigneeId
					status
					stage
					priority
					isActive
					isArchived
					isDeleted
					startDate
					endDate
					dueDate
					completedAt
					amount
					quantity
					total
					score
					isPublic
					isPrivate
					isFavorite
					isCompleted
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
		} else {
			const updated = updateResponse.data.data.updateCompany;
			console.log('✅ Update successful!');
			console.log('Fields returned:', Object.keys(updated).length);
			console.log('Non-null fields:', Object.entries(updated).filter(([k, v]) => v !== null).length);
			console.log('Updated data:', {
				id: updated.id,
				name: updated.name,
				employees: updated.employees,
				updatedAt: updated.updatedAt,
			});
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

		// Verify deletion
		console.log('\n🔍 Verifying deletion...');
		const verifyResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: getQuery,
			variables: getVars,
		}, { headers });

		if (verifyResponse.data.errors) {
			console.log('Verification query failed');
		} else {
			const edges = verifyResponse.data.data.companies.edges;
			if (edges.length === 0) {
				console.log('✅ Deletion verified - record not found');
			} else {
				console.log('⚠️ Record still exists (may be soft-deleted)');
			}
		}

		console.log('\n=== All Tests Complete ===');

	} catch (error) {
		console.error('❌ Test failed with exception:', error.message);
		if (error.response) {
			console.error('Response data:', error.response.data);
		}
	}
}

testAllOperations();
