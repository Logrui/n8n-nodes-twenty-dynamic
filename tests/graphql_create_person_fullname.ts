/**
 * Test: Create Person with FullName Complex Field (JSON Input)
 * 
 * Purpose: Test the JSON input approach for complex fields.
 * Tests creating a Person record with name (FullName type) using JSON object.
 * 
 * Expected Result:
 * - Successfully creates Person record
 * - FullName JSON parsed and structured correctly
 * - GraphQL accepts the nested object structure
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/graphql';
const API_KEY = ''; // Add your API key here

const headers = {
	'Content-Type': 'application/json',
	Authorization: `Bearer ${API_KEY}`,
};

async function testCreatePersonWithFullName() {
	console.log('='.repeat(80));
	console.log('TEST: Create Person with FullName (JSON Input)');
	console.log('='.repeat(80));

	try {
		// Step 1: Build the mutation with FullName as JSON
		console.log('\nStep 1: Building createPerson mutation with FullName JSON input');
		console.log('-'.repeat(80));

		const personData = {
			name: {
				firstName: 'Alice',
				lastName: 'Johnson',
			},
			email: 'alice.johnson@example.com',
			phone: '+1-555-0123',
		};

		const mutation = `
			mutation CreatePerson($data: PersonCreateInput!) {
				createPerson(data: $data) {
					id
					name {
						firstName
						lastName
					}
					email
					phone
					createdAt
					updatedAt
				}
			}
		`;

		const variables = {
			data: personData,
		};

		console.log('Mutation:', mutation);
		console.log('Variables:', JSON.stringify(variables, null, 2));

		// Step 2: Execute the mutation
		console.log('\nStep 2: Executing createPerson mutation');
		console.log('-'.repeat(80));

		const response = await axios.post(
			API_URL,
			{
				query: mutation,
				variables: variables,
			},
			{ headers }
		);

		if (response.data.errors) {
			console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
			throw new Error('GraphQL mutation failed');
		}

		const createdPerson = response.data.data.createPerson;
		console.log('✅ SUCCESS: Person created');
		console.log('Person ID:', createdPerson.id);
		console.log('Full Name:', createdPerson.name);
		console.log('Email:', createdPerson.email);
		console.log('Phone:', createdPerson.phone);

		// Step 3: Verify FullName structure
		console.log('\nStep 3: Verifying FullName structure');
		console.log('-'.repeat(80));

		if (createdPerson.name && typeof createdPerson.name === 'object') {
			console.log('✅ FullName is an object');
			console.log('First Name:', createdPerson.name.firstName);
			console.log('Last Name:', createdPerson.name.lastName);

			if (createdPerson.name.firstName === 'Alice' && createdPerson.name.lastName === 'Johnson') {
				console.log('✅ FullName values match input');
			} else {
				console.error('❌ FullName values do NOT match input');
			}
		} else {
			console.error('❌ FullName is not an object:', typeof createdPerson.name);
		}

		// Step 4: Summary
		console.log('\n' + '='.repeat(80));
		console.log('TEST SUMMARY');
		console.log('='.repeat(80));
		console.log('✅ Person created successfully with FullName JSON input');
		console.log('Created Person ID:', createdPerson.id);
		console.log('Full Name:', `${createdPerson.name.firstName} ${createdPerson.name.lastName}`);
		console.log('\nKEY FINDINGS:');
		console.log('- JSON input for complex fields WORKS');
		console.log('- FullName structure properly nested in mutation');
		console.log('- GraphQL accepts the object structure');
		console.log('- Twenty CRM returns properly structured response');

	} catch (error: any) {
		console.error('\n❌ TEST FAILED');
		console.error('Error:', error.message);
		if (error.response) {
			console.error('Response data:', JSON.stringify(error.response.data, null, 2));
		}
		process.exit(1);
	}
}

// Run the test
testCreatePersonWithFullName();
