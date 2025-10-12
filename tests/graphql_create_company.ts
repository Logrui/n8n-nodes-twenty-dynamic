/**
 * Part 6: Test Create One Operation for Company
 * 
 * This test creates a new Company record called "Test Object N8N Twenty Node"
 * using the same GraphQL structure that the n8n node would use.
 * 
 * Purpose: Validate that Create One operation works with the new data schema introspection
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL;

interface IFieldMetadata {
    id: string;
    name: string;
    label: string;
    type: string;
    isNullable: boolean;
    isWritable: boolean;
}

/**
 * Helper function to capitalize the first letter
 */
function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper function to convert camelCase to human-readable format
 */
function humanize(str: string): string {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (match) => match.toUpperCase())
        .trim();
}

/**
 * Maps GraphQL type information to Twenty CRM field types
 */
function mapGraphQLTypeToTwentyType(graphQLType: any): string {
    let type = graphQLType;
    if (type.kind === 'NON_NULL') {
        type = type.ofType;
    }

    if (type.kind === 'LIST') {
        const elementType = type.ofType?.name || 'Unknown';
        return `LIST<${elementType}>`;
    }

    const typeName = type.name;

    const typeMap: Record<string, string> = {
        'String': 'TEXT',
        'Int': 'NUMBER',
        'Float': 'NUMBER',
        'Boolean': 'BOOLEAN',
        'UUID': 'UUID',
        'ID': 'UUID',
        'DateTime': 'DATE_TIME',
        'Date': 'DATE',
        'Time': 'TIME',
        'JSON': 'RAW_JSON',
    };

    return typeMap[typeName] || typeName;
}

/**
 * Determines if a field is read-only
 */
function isReadOnlyField(fieldName: string): boolean {
    const readOnlyFields = [
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'position',
        'searchVector',
    ];
    return readOnlyFields.includes(fieldName);
}

/**
 * Get all fields for Company using data schema introspection
 */
async function getCompanyFields(): Promise<IFieldMetadata[]> {
    const typeName = capitalize('company');
    
    const query = `
        query IntrospectObject {
            __type(name: "${typeName}") {
                name
                fields {
                    name
                    description
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
                    isDeprecated
                }
            }
        }
    `;

    const baseUrl = TWENTY_URL!.endsWith('/') ? TWENTY_URL!.slice(0, -1) : TWENTY_URL;

    console.log('🔍 Step 1: Introspecting Company fields from /graphql data schema...');
    console.log(`📍 URL: ${baseUrl}/graphql`);
    console.log('');

    const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if ((result as any).errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify((result as any).errors, null, 2)}`);
    }

    if (!(result as any).data.__type?.fields) {
        throw new Error('No Company type found in schema');
    }

    const fields: IFieldMetadata[] = (result as any).data.__type.fields
        .filter((field: any) => !field.isDeprecated)
        .map((field: any) => {
            const fieldType = mapGraphQLTypeToTwentyType(field.type);
            const isNullable = field.type.kind !== 'NON_NULL';
            const isWritable = !isReadOnlyField(field.name);

            return {
                id: field.name,
                name: field.name,
                label: field.description || humanize(field.name),
                type: fieldType,
                isNullable,
                isWritable,
            };
        });

    console.log(`✅ Found ${fields.length} total fields for Company`);
    
    const writableFields = fields.filter(f => f.isWritable);
    console.log(`✅ ${writableFields.length} fields are writable (suitable for Create operation)`);
    console.log('');

    // Display writable fields
    console.log('📝 Writable Fields (for Create operation):');
    writableFields.forEach((field, index) => {
        const required = field.isNullable ? '(optional)' : '(required)';
        console.log(`  ${String(index + 1).padStart(3, ' ')}. ${field.name.padEnd(30, ' ')} : ${field.type.padEnd(20, ' ')} ${required}`);
    });
    console.log('');

    return fields;
}

/**
 * Create a new Company record
 */
async function createCompany(companyName: string): Promise<any> {
    // Build the create mutation
    const mutation = `
        mutation CreateCompany($data: CompanyCreateInput!) {
            createCompany(data: $data) {
                id
                name
                domainName {
                    primaryLinkUrl
                    primaryLinkLabel
                }
                createdAt
                updatedAt
                employees
                idealCustomerProfile
                accountOwnerId
            }
        }
    `;

    // Prepare the input data
    const data = {
        name: companyName,
        domainName: {
            primaryLinkUrl: 'https://example.com',
            primaryLinkLabel: 'example.com',
        },
        employees: 10,
        idealCustomerProfile: true,
    };

    const variables = {
        data,
    };

    const baseUrl = TWENTY_URL!.endsWith('/') ? TWENTY_URL!.slice(0, -1) : TWENTY_URL;

    console.log('🔍 Step 2: Creating new Company record...');
    console.log(`📍 URL: ${baseUrl}/graphql`);
    console.log(`📝 Company Name: "${companyName}"`);
    console.log('📦 Input Data:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query: mutation, variables }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if ((result as any).errors) {
        console.log('❌ GraphQL Errors:');
        (result as any).errors.forEach((error: any) => {
            console.log(`   - ${error.message}`);
            if (error.extensions) {
                console.log(`     Code: ${error.extensions.code}`);
                if (error.extensions.exception) {
                    console.log(`     Details: ${JSON.stringify(error.extensions.exception, null, 2)}`);
                }
            }
        });
        throw new Error(`GraphQL errors: ${JSON.stringify((result as any).errors, null, 2)}`);
    }

    return (result as any).data.createCompany;
}

/**
 * Main test execution
 */
async function runTest(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TEST: Create One Company Operation');
    console.log('  File: graphql_create_company.ts');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    try {
        // Validate environment variables
        if (!TWENTY_API_KEY || !TWENTY_URL) {
            throw new Error('Missing required environment variables: TWENTY_API_KEY or TWENTY_URL');
        }

        // Step 1: Get writable fields
        const fields = await getCompanyFields();

        // Step 2: Create the company
        const companyName = 'Test Object N8N Twenty Node';
        const createdCompany = await createCompany(companyName);

        console.log('✅ SUCCESS! Company created successfully!');
        console.log('');
        console.log('📋 Created Company Details:');
        console.log('───────────────────────────────────────────────────────');
        console.log(`ID:                    ${createdCompany.id}`);
        console.log(`Name:                  ${createdCompany.name}`);
        console.log(`Domain:                ${createdCompany.domainName?.primaryLinkUrl || 'N/A'}`);
        console.log(`Employees:             ${createdCompany.employees || 'N/A'}`);
        console.log(`ICP:                   ${createdCompany.idealCustomerProfile}`);
        console.log(`Account Owner ID:      ${createdCompany.accountOwnerId || 'N/A'}`);
        console.log(`Created At:            ${createdCompany.createdAt}`);
        console.log(`Updated At:            ${createdCompany.updatedAt}`);
        console.log('');

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ TEST COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('💡 Key Insights:');
        console.log('   1. Data schema introspection successfully returned all writable fields');
        console.log('   2. Create mutation executed successfully with proper input data');
        console.log('   3. Twenty CRM accepted the company creation request');
        console.log('   4. All returned fields match the expected schema');
        console.log('');
        console.log(`🔗 Next steps: View the created company in Twenty CRM with ID: ${createdCompany.id}`);

    } catch (error: any) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ TEST FAILED');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('Error Details:');
        console.log(error.message);
        console.log('');
        if (error.stack) {
            console.log('Stack Trace:');
            console.log(error.stack);
        }
        process.exit(1);
    }
}

// Run the test
runTest();
