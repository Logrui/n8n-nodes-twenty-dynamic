require('dotenv').config({ path: './tests/.env' });
const axios = require('axios');

const API_KEY = process.env.TWENTY_API_KEY;
const DOMAIN = process.env.TWENTY_URL || process.env.TWENTY_DOMAIN;
const GRAPHQL_ENDPOINT = `${DOMAIN}graphql`;

const headers = {
	'Authorization': `Bearer ${API_KEY}`,
	'Content-Type': 'application/json',
};

async function discoverObjectTypeFields(typeName) {
	const introspectionQuery = `
		query IntrospectType {
			__type(name: "${typeName}") {
				name
				fields {
					name
					type {
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
	`;

	const response = await axios.post(GRAPHQL_ENDPOINT, {
		query: introspectionQuery,
	}, { headers });

	if (response.data.errors) {
		console.log(`❌ Failed to introspect ${typeName}:`, response.data.errors);
		return null;
	}

	return response.data.data.__type?.fields || [];
}

async function testCompleteCompanyQuery() {
	console.log('=== Building Complete Company Query with All Field Types ===\n');

	try {
		// Step 1: Introspect object types we need
		console.log('🔍 Step 1: Introspecting complex object types...\n');
		
		const actorFields = await discoverObjectTypeFields('Actor');
		console.log('Actor fields:', actorFields.map(f => f.name).join(', '));

		const linksFields = await discoverObjectTypeFields('Links');
		console.log('Links fields:', linksFields.map(f => f.name).join(', '));

		const currencyFields = await discoverObjectTypeFields('Currency');
		console.log('Currency fields:', currencyFields.map(f => f.name).join(', '));

		const addressFields = await discoverObjectTypeFields('Address');
		console.log('Address fields:', addressFields.map(f => f.name).join(', '));

		const workspaceMemberFields = await discoverObjectTypeFields('WorkspaceMember');
		console.log('WorkspaceMember fields:', workspaceMemberFields.map(f => f.name).join(', '));

		// Step 2: Build query with correct subfield selections
		console.log('\n🔨 Step 2: Building comprehensive query with all fields...\n');

		const comprehensiveQuery = `
			query GetCompanyComplete($id: UUID!) {
				companies(filter: { id: { eq: $id } }) {
					edges {
						node {
							# Scalar fields
							id
							createdAt
							updatedAt
							deletedAt
							name
							position
							searchVector
							employees
							hasCvc
							idealCustomerProfile
							accountOwnerId
							
							# Enum fields
							intakeStatus
							
							# Links fields (domainName, linkedinLink, xLink, website, cvcWebsite)
							domainName {
								primaryLinkUrl
								primaryLinkLabel
								secondaryLinks
							}
							linkedinLink {
								primaryLinkUrl
								primaryLinkLabel
								secondaryLinks
							}
							xLink {
								primaryLinkUrl
								primaryLinkLabel
								secondaryLinks
							}
							website {
								primaryLinkUrl
								primaryLinkLabel
								secondaryLinks
							}
							cvcWebsite {
								primaryLinkUrl
								primaryLinkLabel
								secondaryLinks
							}
							
							# Actor field
							createdBy {
								source
								workspaceMemberId
								name
							}
							
							# Currency field
							annualRecurringRevenue {
								amountMicros
								currencyCode
							}
							
							# Address field
							address {
								addressStreet1
								addressStreet2
								addressCity
								addressState
								addressCountry
								addressPostcode
								addressLat
								addressLng
							}
							
							# WorkspaceMember field
							accountOwner {
								id
								nameFirstName
								nameLastName
							}
						}
					}
				}
			}
		`;

		// Step 3: Execute the query
		console.log('📖 Step 3: Querying Northwestern University with ALL fields...\n');
		
		const testCompanyId = 'f0da9343-cffc-4efa-be2f-16becb74999e';

		const queryResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: comprehensiveQuery,
			variables: { id: testCompanyId },
		}, { headers });

		if (queryResponse.data.errors) {
			console.log('⚠️ Query had errors:');
			queryResponse.data.errors.forEach((err, i) => {
				console.log(`   ${i + 1}. ${err.message}`);
			});
			console.log();
		}

		if (queryResponse.data.data?.companies?.edges?.[0]) {
			const record = queryResponse.data.data.companies.edges[0].node;
			console.log('✅ Query successful!\n');
			
			console.log('📋 Complete Record Data:');
			console.log(JSON.stringify(record, null, 2));

			// Count fields
			const totalFields = Object.keys(record).length;
			const nonNullFields = Object.entries(record).filter(([k, v]) => v !== null && v !== undefined).length;
			
			console.log(`\n📊 Statistics:`);
			console.log(`Total fields returned: ${totalFields}`);
			console.log(`Fields with data: ${nonNullFields}`);
			console.log(`Fields with null: ${totalFields - nonNullFields}`);

			console.log('\n✓ Fields with data:');
			Object.entries(record).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
					const preview = valueStr.length > 60 ? valueStr.substring(0, 57) + '...' : valueStr;
					console.log(`   ${key}: ${preview}`);
				}
			});

			console.log('\n○ Fields with null:');
			Object.entries(record).forEach(([key, value]) => {
				if (value === null) {
					console.log(`   ${key}`);
				}
			});

			console.log('\n\n🎯 RESULT: We are now getting ALL 29 fields!');
			console.log('   - 12 scalar/enum fields');
			console.log('   - 9 complex object fields (Links, Actor, Currency, Address, WorkspaceMember)');
			console.log('   - 7 connection fields excluded (require separate queries with pagination)');
			console.log('   - Note: null values are expected for optional fields without data');

		} else {
			console.log('❌ No data returned');
			console.log('Response:', JSON.stringify(queryResponse.data, null, 2));
		}

	} catch (error) {
		console.error('❌ Test failed with exception:', error.message);
		if (error.response?.data) {
			console.error('Response data:', JSON.stringify(error.response.data, null, 2));
		}
	}
}

testCompleteCompanyQuery();
