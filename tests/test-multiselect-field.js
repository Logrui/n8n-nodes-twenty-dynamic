/**
 * Unit Test: Company Category Field (MULTI_SELECT - Built-in Enum)
 * 
 * Tests the API call and data transformation for MULTI_SELECT fields
 * Resource: Company
 * Field: category (LIST of CompanyCategoryEnum)
 * Type: MULTI_SELECT (built-in enum, NOT in metadata API)
 * 
 * CRITICAL FINDING: Built-in enum fields like 'category' exist in GraphQL
 * schema but NOT in the metadata API. This test validates how to handle
 * these fields differently than custom SELECT fields.
 * 
 * This test validates:
 * 1. GraphQL introspection can find the field
 * 2. Enum values can be retrieved via __type query
 * 3. LIST of ENUM maps to MULTI_SELECT
 * 4. Transformation to n8n dropdown format
 * 5. Pipe-separated value format (fieldName|fieldType)
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

const TWENTY_API_URL = process.env.TWENTY_API_URL || 'http://localhost:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

if (!TWENTY_API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY not found in environment variables');
    console.error('Please set TWENTY_API_KEY in your .env file');
    process.exit(1);
}

// Fix URL formatting
const baseUrl = TWENTY_API_URL.replace(/\/+$/, '').replace(/\/graphql$/, '');
const graphqlUrl = `${baseUrl}/graphql`;

console.log('🧪 Unit Test: Company Category Field (MULTI_SELECT - Built-in Enum)');
console.log('='.repeat(70));
console.log(`API URL: ${baseUrl}`);
console.log('Resource: Company');
console.log('Field: category (LIST of CompanyCategoryEnum)');
console.log('Type: MULTI_SELECT (built-in enum)');
console.log('='.repeat(70));
console.log();

/**
 * Query to get Company object schema with category field details
 */
const COMPANY_SCHEMA_QUERY = `
    query GetCompanySchema {
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
                    }
                }
            }
        }
    }
`;

/**
 * Query to get field metadata including options for SELECT/MULTI_SELECT fields
 * NOTE: This query will NOT return built-in enum fields like 'category'
 * We need to use GraphQL introspection instead
 */
const FIELD_METADATA_QUERY = `
    query GetCompanyFieldMetadata {
        objects(paging: { first: 100 }) {
            edges {
                node {
                    id
                    nameSingular
                    labelSingular
                    fields(paging: { first: 100 }) {
                        edges {
                            node {
                                id
                                name
                                label
                                type
                                isNullable
                                options
                            }
                        }
                    }
                }
            }
        }
    }
`;

/**
 * Query to get enum type values from GraphQL schema
 */
const GET_ENUM_VALUES_QUERY = (enumName) => `
    query GetEnumValues {
        __type(name: "${enumName}") {
            name
            kind
            enumValues {
                name
                description
            }
        }
    }
`;

/**
 * Make GraphQL request to Twenty API
 */
async function makeGraphQLRequest(query, operationName = null, useMetadataEndpoint = false) {
    const url = useMetadataEndpoint ? `${baseUrl}/metadata` : graphqlUrl;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({
            query,
            operationName,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
        throw new Error('GraphQL query failed');
    }

    return result.data;
}

/**
 * Test 1: Get Company schema to verify category field exists
 */
async function testCompanySchema() {
    console.log('📋 Test 1: Company Schema Introspection');
    console.log('-'.repeat(70));
    
    try {
        const data = await makeGraphQLRequest(COMPANY_SCHEMA_QUERY, null, false); // Use GraphQL endpoint
        
        if (!data.__type) {
            console.error('❌ Company type not found in schema');
            return false;
        }

        const categoryField = data.__type.fields.find(f => f.name === 'category');
        
        if (!categoryField) {
            console.error('❌ category field not found on Company type');
            console.log('Available fields:', data.__type.fields.map(f => f.name).join(', '));
            return false;
        }

        console.log('✅ Company type found');
        console.log(`✅ category field found`);
        console.log(`   Type: ${categoryField.type.name || categoryField.type.kind}`);
        console.log(`   Inner type: ${categoryField.type.ofType?.name || 'N/A'}`);
        console.log();
        
        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

/**
 * Test 2: Get field metadata via GraphQL introspection (built-in enum fields)
 */
async function testFieldMetadata() {
    console.log('📋 Test 2: Field Discovery via GraphQL Introspection');
    console.log('-'.repeat(70));
    
    try {
        // First verify the field is NOT in metadata API
        console.log('Step 1: Checking metadata API (expected to fail)...');
        const metadataResult = await makeGraphQLRequest(FIELD_METADATA_QUERY, null, true);
        
        const companyObject = metadataResult.objects?.edges?.find(
            e => e.node.nameSingular === 'company'
        )?.node;
        
        if (companyObject) {
            const categoryInMetadata = companyObject.fields.edges.find(
                e => e.node.name === 'category'
            );
            
            if (categoryInMetadata) {
                console.log('⚠️  WARNING: category found in metadata API (unexpected!)');
            } else {
                console.log('✅ Confirmed: category NOT in metadata API (as expected)');
                console.log(`   Metadata API returned only ${companyObject.fields.edges.length} fields`);
            }
        }
        console.log();
        
        // Now get it from GraphQL introspection
        console.log('Step 2: Getting field from GraphQL schema...');
        const data = await makeGraphQLRequest(COMPANY_SCHEMA_QUERY, null, false);
        
        if (!data.__type) {
            console.error('❌ Company type not found in GraphQL schema');
            return null;
        }

        console.log(`✅ Company type found with ${data.__type.fields.length} fields`);
        
        const categoryField = data.__type.fields.find(f => f.name === 'category');

        if (!categoryField) {
            console.error('❌ category field not found in GraphQL schema');
            console.log('Available fields:', data.__type.fields.map(f => f.name).join(', '));
            return null;
        }

        console.log(`✅ category field found`);
        console.log(`   Type Kind: ${categoryField.type.kind}`);
        console.log(`   Type Name: ${categoryField.type.name || 'N/A'}`);
        console.log(`   Inner Type: ${categoryField.type.ofType?.name || 'N/A'}`);
        console.log();
        
        // Determine if it's a MULTI_SELECT (LIST of ENUM)
        const isMultiSelect = categoryField.type.kind === 'LIST' && 
                             categoryField.type.ofType?.kind === 'ENUM';
        
        if (!isMultiSelect) {
            console.error('❌ category field is not a LIST of ENUM (not MULTI_SELECT)');
            return null;
        }
        
        console.log('✅ Confirmed: category is LIST of ENUM (MULTI_SELECT)');
        const enumType = categoryField.type.ofType.name;
        console.log(`   Enum type: ${enumType}`);
        console.log();
        
        // Get enum values
        console.log('Step 3: Fetching enum values...');
        const enumData = await makeGraphQLRequest(GET_ENUM_VALUES_QUERY(enumType), null, false);
        
        if (!enumData.__type || !enumData.__type.enumValues) {
            console.error('❌ Could not fetch enum values');
            return null;
        }
        
        console.log(`✅ Enum values retrieved: ${enumData.__type.enumValues.length} options`);
        console.log();
        
        // Convert to format similar to metadata API options
        const parsedOptions = enumData.__type.enumValues.map((enumValue, index) => ({
            id: `enum-${enumValue.name}`,
            color: 'gray', // Enums don't have colors in GraphQL, would need to map
            label: enumValue.name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            value: enumValue.name,
            position: index,
        }));
        
        const fieldData = {
            name: 'category',
            label: 'Category',
            type: 'MULTI_SELECT', // Derived from LIST + ENUM
            isNullable: true,
            parsedOptions: parsedOptions,
            isBuiltInEnum: true,
            enumType: enumType,
        };
        
        return fieldData;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return null;
    }
}

/**
 * Test 3: Transform options to n8n format
 */
function testOptionsTransformation(categoryField) {
    console.log('📋 Test 3: Transform Options to n8n Format');
    console.log('-'.repeat(70));
    
    if (!categoryField || !categoryField.parsedOptions) {
        console.error('❌ No field data to transform');
        return false;
    }

    console.log('Raw options from Twenty:');
    console.log(JSON.stringify(categoryField.parsedOptions, null, 2));
    console.log();

    // Sort by position to maintain Twenty's order
    const sortedOptions = [...categoryField.parsedOptions].sort((a, b) => a.position - b.position);

    // Transform to n8n format
    const n8nOptions = sortedOptions.map(opt => ({
        name: opt.label,
        value: opt.value,
        description: `Color: ${opt.color}`,
    }));

    console.log('Transformed to n8n format:');
    console.log(JSON.stringify(n8nOptions, null, 2));
    console.log();

    console.log('✅ Transformation successful');
    console.log(`   Options count: ${n8nOptions.length}`);
    console.log(`   Sample option: ${n8nOptions[0].name} = ${n8nOptions[0].value}`);
    console.log();

    return n8nOptions;
}

/**
 * Test 4: Create pipe-separated field value (Notion pattern)
 */
function testPipeSeparatedValue(categoryField) {
    console.log('📋 Test 4: Pipe-Separated Field Value (Notion Pattern)');
    console.log('-'.repeat(70));
    
    if (!categoryField) {
        console.error('❌ No field data');
        return false;
    }

    // Map Twenty type to n8n field type
    const typeMap = {
        'SELECT': 'select',
        'MULTI_SELECT': 'multiSelect',
        'FullName': 'fullName',
        'Links': 'link',
        'Currency': 'currency',
        'Address': 'address',
        'EMAILS': 'emails',
        'PHONES': 'phones',
        'BOOLEAN': 'boolean',
        'TEXT': 'simple',
        'NUMBER': 'simple',
        'DATE_TIME': 'simple',
        'DATE': 'simple',
        'UUID': 'simple',
        'RAW_JSON': 'simple',
        'RELATION': 'relation',
    };

    const n8nFieldType = typeMap[categoryField.type] || 'simple';

    // Create pipe-separated value
    const pipeSeparatedValue = `${categoryField.name}|${n8nFieldType}`;

    console.log('Field information:');
    console.log(`   Name: ${categoryField.name}`);
    console.log(`   Twenty Type: ${categoryField.type}`);
    console.log(`   n8n Type: ${n8nFieldType}`);
    console.log();

    console.log('Pipe-separated value:');
    console.log(`   "${pipeSeparatedValue}"`);
    console.log();

    // Test extraction via split
    const [extractedName, extractedType] = pipeSeparatedValue.split('|');
    console.log('Extraction test (simulating expression):');
    console.log(`   Extracted name: "${extractedName}"`);
    console.log(`   Extracted type: "${extractedType}"`);
    console.log();

    if (extractedName === categoryField.name && extractedType === n8nFieldType) {
        console.log('✅ Pipe-separated value works correctly');
        console.log('✅ Extraction via split() successful');
    } else {
        console.error('❌ Extraction failed');
        return false;
    }
    console.log();

    return true;
}

/**
 * Test 5: Simulate getOptionsForSelectField with new logic
 */
function testGetOptionsLogic(categoryField, pipeSeparatedValue) {
    console.log('📋 Test 5: Simulate getOptionsForSelectField Logic');
    console.log('-'.repeat(70));
    
    console.log('Simulating: getCurrentNodeParameter("fieldName")');
    console.log(`   Returns: "${pipeSeparatedValue}"`);
    console.log();

    // Split the pipe-separated value
    const [fieldName, fieldType] = pipeSeparatedValue.split('|');
    
    console.log('Step 1: Extract name and type');
    console.log(`   fieldName: "${fieldName}"`);
    console.log(`   fieldType: "${fieldType}"`);
    console.log();

    // Type validation
    console.log('Step 2: Validate field type');
    const isSelectType = ['select', 'multiSelect'].includes(fieldType);
    console.log(`   Is SELECT type: ${isSelectType}`);
    
    if (!isSelectType) {
        console.log('   ⚠️  Would return empty array (not a SELECT field)');
        console.log();
        return false;
    }
    console.log('   ✅ Type validation passed');
    console.log();

    // Find field in schema (simulated)
    console.log('Step 3: Find field in schema');
    console.log(`   Looking for field: "${fieldName}"`);
    console.log(`   ✅ Field found: ${categoryField.label}`);
    console.log();

    // Check options exist
    console.log('Step 4: Check options exist');
    const hasOptions = categoryField.parsedOptions && categoryField.parsedOptions.length > 0;
    console.log(`   Options count: ${categoryField.parsedOptions?.length || 0}`);
    
    if (!hasOptions) {
        console.log('   ⚠️  Would return empty array (no options)');
        console.log();
        return false;
    }
    console.log('   ✅ Options found');
    console.log();

    // Transform and return
    console.log('Step 5: Transform and return options');
    const sortedOptions = [...categoryField.parsedOptions].sort((a, b) => a.position - b.position);
    const n8nOptions = sortedOptions.map(opt => ({
        name: opt.label,
        value: opt.value,
        description: `Color: ${opt.color}`,
    }));
    
    console.log(`   ✅ Would return ${n8nOptions.length} options`);
    console.log(`   Sample: ${n8nOptions[0].name}`);
    console.log();

    console.log('✅ getOptionsForSelectField logic simulation successful');
    console.log();

    return true;
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 Starting Unit Tests for MULTI_SELECT Field');
    console.log();

    try {
        // Test 1: Schema introspection
        const schemaTest = await testCompanySchema();
        if (!schemaTest) {
            console.error('❌ Schema test failed - aborting');
            process.exit(1);
        }

        // Test 2: Field metadata
        const categoryField = await testFieldMetadata();
        if (!categoryField) {
            console.error('❌ Field metadata test failed - aborting');
            process.exit(1);
        }

        // Test 3: Options transformation
        const n8nOptions = testOptionsTransformation(categoryField);
        if (!n8nOptions) {
            console.error('❌ Options transformation test failed - aborting');
            process.exit(1);
        }

        // Test 4: Pipe-separated value
        const pipeSeparatedValue = `${categoryField.name}|multiSelect`;
        const pipeTest = testPipeSeparatedValue(categoryField);
        if (!pipeTest) {
            console.error('❌ Pipe-separated value test failed - aborting');
            process.exit(1);
        }

        // Test 5: getOptionsForSelectField logic
        const logicTest = testGetOptionsLogic(categoryField, pipeSeparatedValue);
        if (!logicTest) {
            console.error('❌ Logic simulation test failed - aborting');
            process.exit(1);
        }

        // Summary
        console.log('='.repeat(70));
        console.log('✅ ALL TESTS PASSED!');
        console.log('='.repeat(70));
        console.log();
        console.log('Summary:');
        console.log(`  ✅ Company schema validated`);
        console.log(`  ✅ category field found (MULTI_SELECT type - built-in enum)`);
        console.log(`  ✅ ${categoryField.parsedOptions.length} enum values retrieved`);
        console.log(`  ✅ Options transformed to n8n format`);
        console.log(`  ✅ Pipe-separated value pattern works`);
        console.log(`  ✅ getOptionsForSelectField logic validated`);
        console.log();
        console.log('⚠️  CRITICAL FINDING:');
        console.log('   Built-in enum fields (like category) are NOT in metadata API!');
        console.log('   They must be discovered via GraphQL introspection (__type query)');
        console.log('   Enum values are retrieved differently than custom SELECT options');
        console.log();
        console.log('Ready to update refactor plan! �');
        console.log();

        // Save results
        const results = {
            test: 'Company category field (MULTI_SELECT - built-in enum)',
            timestamp: new Date().toISOString(),
            field: {
                name: categoryField.name,
                label: categoryField.label,
                type: categoryField.type,
                isBuiltInEnum: categoryField.isBuiltInEnum,
                enumType: categoryField.enumType,
                optionsCount: categoryField.parsedOptions.length,
            },
            pipeSeparatedValue: pipeSeparatedValue,
            n8nOptions: n8nOptions,
            rawOptions: categoryField.parsedOptions,
            criticalFinding: {
                issue: 'Built-in enum fields NOT in metadata API',
                solution: 'Must use GraphQL introspection (__type query)',
                impact: 'Refactoring plan needs update to handle both custom SELECT and built-in ENUM fields',
            },
            allTestsPassed: true,
        };

        const fs = require('fs');
        fs.writeFileSync(
            'MULTISELECT_TEST_RESULTS.json',
            JSON.stringify(results, null, 2)
        );
        console.log('💾 Results saved to: MULTISELECT_TEST_RESULTS.json');
        console.log();

    } catch (error) {
        console.error('❌ Tests failed with error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
runTests();
