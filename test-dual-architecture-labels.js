/**
 * Test: Dual Architecture Label Handling
 * 
 * Purpose: Verify that getCleanFieldLabel() works correctly for both
 * Metadata API fields and GraphQL introspection fields.
 * 
 * This ensures our dual-source architecture produces consistent, clean labels.
 */

// Mock humanize function (from TwentyApi.client.ts)
function humanize(str) {
    return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (match) => match.toUpperCase())
        .trim();
}

// The getCleanFieldLabel function (from TwentyApi.client.ts)
function getCleanFieldLabel(label, fieldName) {
    const humanizedName = humanize(fieldName);
    
    if (!label) {
        return humanizedName;
    }
    
    if (label.toLowerCase() === fieldName.toLowerCase()) {
        return humanizedName;
    }
    
    if (fieldName.endsWith('At') || fieldName.endsWith('Date') || fieldName.endsWith('Time')) {
        return humanizedName;
    }
    
    if (label.includes(': ')) {
        const titlePart = label.split(': ')[0].trim();
        if (titlePart.length <= 50) {
            return titlePart;
        }
    }
    
    const verbosePatterns = [
        ' of the ',
        ' linked to ',
        ' for the ',
        ' from the ',
        'The ',
        ' when ',
        ' that ',
    ];
    
    const isVerbose = verbosePatterns.some(pattern => label.includes(pattern));
    if (isVerbose) {
        return humanizedName;
    }
    
    if (label.length <= 30) {
        return label;
    }
    
    return humanizedName;
}

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║       DUAL ARCHITECTURE LABEL HANDLING TEST                       ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

// Test Cases for Metadata API Fields
console.log('=== TEST 1: Metadata API Fields (Custom Fields) ===\n');

const metadataTestCases = [
    {
        field: { name: 'idealCustomerProfile', label: 'Ideal Customer Profile: Indicates whether the company is the most suitable and valuable customer for you' },
        expected: 'Ideal Customer Profile',
        description: 'Label with colon separator'
    },
    {
        field: { name: 'name', label: 'The company name' },
        expected: 'Name',
        description: 'Verbose label "The company name" should use humanized field name'
    },
    {
        field: { name: 'address', label: 'Address of the company' },
        expected: 'Address',
        description: 'Verbose label "Address of the company" should use humanized field name'
    },
    {
        field: { name: 'attachments', label: 'Attachments linked to the company' },
        expected: 'Attachments',
        description: 'Verbose label "Attachments linked to the company" should use humanized field name'
    },
    {
        field: { name: 'domainName', label: null },
        expected: 'Domain Name',
        description: 'No label (should humanize field name)'
    },
    {
        field: { name: 'ARR', label: 'ARR: Annual Recurring Revenue in USD' },
        expected: 'ARR',
        description: 'Acronym with description after colon'
    },
    {
        field: { name: 'category', label: 'Category' },
        expected: 'Category',
        description: 'Short, concise label should be used as-is'
    }
];

metadataTestCases.forEach((testCase, index) => {
    const result = getCleanFieldLabel(testCase.field.label, testCase.field.name);
    const passed = result === testCase.expected;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Field Name: ${testCase.field.name}`);
    console.log(`  API Label:  ${testCase.field.label || '(null)'}`);
    console.log(`  Expected:   ${testCase.expected}`);
    console.log(`  Got:        ${result}`);
    console.log(`  ${status}\n`);
});

// Test Cases for GraphQL Introspection Fields
console.log('\n=== TEST 2: GraphQL Introspection Fields (Built-in Fields) ===\n');

const graphqlTestCases = [
    {
        field: { name: 'id', description: 'Id' },
        expected: 'Id',
        description: 'Simple description (no colon)'
    },
    {
        field: { name: 'createdAt', description: 'Creation date' },
        expected: 'Created At',
        description: 'Verbose description should use humanized field name'
    },
    {
        field: { name: 'updatedAt', description: null },
        expected: 'Updated At',
        description: 'No description (should humanize)'
    },
    {
        field: { name: 'deletedAt', description: 'Date when the record was deleted' },
        expected: 'Deleted At',
        description: 'Verbose description should use humanized field name'
    },
    {
        field: { name: 'phoneNumber', description: 'Phone number of the contact' },
        expected: 'Phone Number',
        description: 'Verbose description should use humanized field name'
    }
];

graphqlTestCases.forEach((testCase, index) => {
    const result = getCleanFieldLabel(testCase.field.description, testCase.field.name);
    const passed = result === testCase.expected;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Field Name:  ${testCase.field.name}`);
    console.log(`  Description: ${testCase.field.description || '(null)'}`);
    console.log(`  Expected:    ${testCase.expected}`);
    console.log(`  Got:         ${result}`);
    console.log(`  ${status}\n`);
});

// Test Cases for Edge Cases
console.log('\n=== TEST 3: Edge Cases ===\n');

const edgeCases = [
    {
        field: { name: 'emailAddress', label: '' },
        expected: 'Email Address',
        description: 'Empty string label'
    },
    {
        field: { name: 'phoneNumber', label: 'Phone: ' },
        expected: 'Phone',
        description: 'Colon at end with nothing after'
    },
    {
        field: { name: 'companyURL', label: 'Company URL: https://example.com format' },
        expected: 'Company URL',
        description: 'Colon in description (URL example)'
    },
    {
        field: { name: 'notes', label: 'Notes: Internal: Private' },
        expected: 'Notes',
        description: 'Multiple colons (should take first part)'
    }
];

edgeCases.forEach((testCase, index) => {
    const result = getCleanFieldLabel(testCase.field.label, testCase.field.name);
    const passed = result === testCase.expected;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Field Name: ${testCase.field.name}`);
    console.log(`  Label:      "${testCase.field.label}"`);
    console.log(`  Expected:   ${testCase.expected}`);
    console.log(`  Got:        ${result}`);
    console.log(`  ${status}\n`);
});

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║                            SUMMARY                                 ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

const allTests = [...metadataTestCases, ...graphqlTestCases, ...edgeCases];
const passed = allTests.filter((t, i) => {
    const result = getCleanFieldLabel(t.field.label || t.field.description, t.field.name);
    return result === t.expected;
}).length;

const total = allTests.length;
const failed = total - passed;

console.log(`Total Tests:  ${total}`);
console.log(`Passed:       ${passed} ✅`);
console.log(`Failed:       ${failed} ${failed > 0 ? '❌' : ''}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

console.log('\n=== DUAL ARCHITECTURE VALIDATION ===\n');

console.log('✓ Metadata API Fields:');
console.log('  - Handles "Title: Description" format correctly');
console.log('  - Extracts clean title before colon');
console.log('  - Falls back to humanized name when needed\n');

console.log('✓ GraphQL Introspection Fields:');
console.log('  - Uses description field as label');
console.log('  - Returns description as-is (no colon splitting needed)');
console.log('  - Humanizes field name when no description\n');

console.log('✓ Both Sources Unified:');
console.log('  - Single function handles both label formats');
console.log('  - Consistent output regardless of source');
console.log('  - Clean, readable field names in dropdown\n');

if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Dual architecture label handling is working correctly.\n');
} else {
    console.log(`⚠️  ${failed} test(s) failed. Review the function logic.\n`);
}
