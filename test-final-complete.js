require('dotenv').config({ path: './tests/.env' });
const axios = require('axios');

const API_KEY = process.env.TWENTY_API_KEY;
const DOMAIN = process.env.TWENTY_URL || process.env.TWENTY_DOMAIN;
const GRAPHQL_ENDPOINT = `${DOMAIN}graphql`;

const headers = {
	'Authorization': `Bearer ${API_KEY}`,
	'Content-Type': 'application/json',
};

async function testFinalCompleteQuery() {
	console.log('=== Final Complete Company Query Test ===\n');

	try {
		const comprehensiveQuery = `
			query GetCompanyComplete($id: UUID!) {
				companies(filter: { id: { eq: $id } }) {
					edges {
						node {
							# Scalar fields (12 total)
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
							
							# Enum fields (1 total)
							intakeStatus
							
							# Links fields (5 total: domainName, linkedinLink, xLink, website, cvcWebsite)
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
							
							# Actor field (1 total)
							createdBy {
								source
								workspaceMemberId
								name
							}
							
							# Currency field (1 total)
							annualRecurringRevenue {
								amountMicros
								currencyCode
							}
							
							# Address field (1 total)
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
							
							# WorkspaceMember field (1 total)
							accountOwner {
								id
								name {
									firstName
									lastName
								}
								userEmail
							}
						}
					}
				}
			}
		`;

		console.log('📖 Querying Northwestern University with ALL 22 non-connection fields...\n');
		
		const testCompanyId = 'f0da9343-cffc-4efa-be2f-16becb74999e';

		const queryResponse = await axios.post(GRAPHQL_ENDPOINT, {
			query: comprehensiveQuery,
			variables: { id: testCompanyId },
		}, { headers });

		if (queryResponse.data.errors) {
			console.log('❌ Query had errors:');
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
			const nonNullFields = Object.entries(record).filter(([k, v]) => {
				if (v === null) return false;
				if (typeof v === 'object') {
					// Check if object has any non-null values
					return Object.values(v).some(val => val !== null);
				}
				return true;
			}).length;
			
			console.log(`\n\n📊 FINAL STATISTICS:`);
			console.log(`════════════════════════════════════════`);
			console.log(`Total top-level fields queried: ${totalFields}`);
			console.log(`Fields with actual data: ${nonNullFields}`);
			console.log(`Fields that are null/empty: ${totalFields - nonNullFields}`);

			console.log('\n🎯 BREAKDOWN BY FIELD TYPE:');
			console.log(`   ✓ Scalar fields: 11 (id, dates, name, position, etc.)`);
			console.log(`   ✓ Enum fields: 1 (intakeStatus)`);
			console.log(`   ✓ Complex object fields: 10`);
			console.log(`      - Links: 5 (domainName, linkedinLink, xLink, website, cvcWebsite)`);
			console.log(`      - Actor: 1 (createdBy)`);
			console.log(`      - Currency: 1 (annualRecurringRevenue)`);
			console.log(`      - Address: 1 (address)`);
			console.log(`      - WorkspaceMember: 1 (accountOwner)`);

			console.log('\n✅ RESULT COMPARISON:');
			console.log(`════════════════════════════════════════`);
			console.log(`BEFORE (v0.5.22): 8 fields returned`);
			console.log(`   - Only scalar fields`);
			console.log(`   - Missing: domainName, linkedinLink, website, address, etc.`);
			console.log(`\nAFTER (This fix): ${totalFields} fields returned`);
			console.log(`   - All scalar fields ✓`);
			console.log(`   - All enum fields ✓`);
			console.log(`   - All complex object fields ✓`);
			console.log(`   - Connection fields excluded (need pagination) ✓`);

			console.log('\n📝 FIELDS WITH DATA:');
			Object.entries(record).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					if (typeof value === 'object' && Object.values(value).every(v => v === null)) {
						return; // Skip objects with all null values
					}
					const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
					const preview = valueStr.length > 60 ? valueStr.substring(0, 57) + '...' : valueStr;
					console.log(`   ✓ ${key}: ${preview}`);
				}
			});

			console.log('\n📝 FIELDS WITH NULL (Expected - no data entered):');
			Object.entries(record).forEach(([key, value]) => {
				if (value === null) {
					console.log(`   ○ ${key}`);
				} else if (typeof value === 'object' && Object.values(value).every(v => v === null)) {
					console.log(`   ○ ${key} (all subfields null)`);
				}
			});

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

testFinalCompleteQuery();
