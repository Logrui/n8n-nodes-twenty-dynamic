/**
 * Test Suite for Link Field Expression Validation Fix
 *
 * This test validates the bug fix for unevaluated n8n expressions in link URLs.
 *
 * Issue: When n8n expressions like {{ $json['url'] }} are not evaluated,
 * they get passed as literal strings to Twenty CRM API, causing validation errors.
 *
 * Fix: Added validation to detect unevaluated expressions and throw a clear error
 * before sending to Twenty CRM.
 */

import { transformFieldsData, IFieldData } from './nodes/Twenty/FieldTransformation';

// ANSI color codes for terminal output
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
};

interface TestCase {
	name: string;
	input: IFieldData[];
	shouldThrow: boolean;
	expectedError?: string;
	expectedResult?: Record<string, any>;
	description: string;
}

const testCases: TestCase[] = [
	// Test Case 1: Bug scenario - unevaluated expression should be caught
	{
		name: 'Detects unevaluated expression in link URL',
		description: 'Should throw error when link URL contains {{ }} markers',
		input: [
			{
				fieldName: 'website',
				fieldType: 'link',
				primaryLinkUrl: '{{ $json["companyWebsite"] }}',
				primaryLinkLabel: 'Company Site',
			},
		],
		shouldThrow: true,
		expectedError: 'Link URL contains unevaluated expression',
	},

	// Test Case 2: Valid link with evaluated expression (normal case)
	{
		name: 'Accepts properly evaluated link URL',
		description: 'Should pass through valid URLs without throwing',
		input: [
			{
				fieldName: 'website',
				fieldType: 'link',
				primaryLinkUrl: 'https://example.com',
				primaryLinkLabel: 'Example Site',
			},
		],
		shouldThrow: false,
		expectedResult: {
			website: {
				primaryLinkUrl: 'https://example.com',
				primaryLinkLabel: 'Example Site',
			},
		},
	},

	// Test Case 3: Complex expression pattern
	{
		name: 'Detects complex nested expression',
		description: 'Should catch expressions with nested paths',
		input: [
			{
				fieldName: 'linkedinLink',
				fieldType: 'link',
				primaryLinkUrl: '{{ $json.data.socialLinks.linkedin }}',
			},
		],
		shouldThrow: true,
		expectedError: 'Link URL contains unevaluated expression',
	},

	// Test Case 4: Expression with spaces
	{
		name: 'Detects expression with internal spaces',
		description: 'Should catch expressions regardless of spacing',
		input: [
			{
				fieldName: 'xLink',
				fieldType: 'link',
				primaryLinkUrl: '{{  $json["twitter_url"]  }}',
			},
		],
		shouldThrow: true,
		expectedError: 'Link URL contains unevaluated expression',
	},

	// Test Case 5: Partial expression (edge case)
	{
		name: 'Detects partial unevaluated expression',
		description: 'Should catch URLs with expression syntax mixed with text',
		input: [
			{
				fieldName: 'website',
				fieldType: 'link',
				primaryLinkUrl: 'https://example.com/{{ $json["path"] }}',
			},
		],
		shouldThrow: true,
		expectedError: 'Link URL contains unevaluated expression',
	},

	// Test Case 6: URL with curly braces but not expression
	{
		name: 'Allows URL with single curly braces',
		description: 'Should not flag URLs that happen to contain single { or }',
		input: [
			{
				fieldName: 'website',
				fieldType: 'link',
				primaryLinkUrl: 'https://example.com/path{with}braces',
			},
		],
		shouldThrow: false,
		expectedResult: {
			website: {
				primaryLinkUrl: 'https://example.com/path{with}braces',
			},
		},
	},

	// Test Case 7: Empty link URL (should not throw)
	{
		name: 'Handles empty link URL gracefully',
		description: 'Should not throw on empty/undefined URL',
		input: [
			{
				fieldName: 'website',
				fieldType: 'link',
				primaryLinkLabel: 'No URL provided',
			},
		],
		shouldThrow: false,
		expectedResult: {
			website: {
				primaryLinkLabel: 'No URL provided',
			},
		},
	},

	// Test Case 8: Multiple fields with one having unevaluated expression
	{
		name: 'Catches unevaluated expression in multi-field scenario',
		description: 'Should detect issue even when mixed with valid fields',
		input: [
			{
				fieldName: 'name',
				fieldType: 'fullName',
				firstName: 'John',
				lastName: 'Doe',
			},
			{
				fieldName: 'website',
				fieldType: 'link',
				primaryLinkUrl: '{{ $json["url"] }}',
			},
		],
		shouldThrow: true,
		expectedError: 'Link URL contains unevaluated expression',
	},

	// Test Case 9: Expression in label (should not throw - only URL is validated)
	{
		name: 'Does not validate link label for expressions',
		description: 'Validation should only apply to URL, not label',
		input: [
			{
				fieldName: 'website',
				fieldType: 'link',
				primaryLinkUrl: 'https://example.com',
				primaryLinkLabel: '{{ $json["label"] }}',
			},
		],
		shouldThrow: false,
		expectedResult: {
			website: {
				primaryLinkUrl: 'https://example.com',
				primaryLinkLabel: '{{ $json["label"] }}',
			},
		},
	},

	// Test Case 10: Real-world scenario - database field doesn't exist
	{
		name: 'Simulates missing field in input data',
		description: 'Represents actual bug scenario where field path is invalid',
		input: [
			{
				fieldName: 'domainName',
				fieldType: 'link',
				primaryLinkUrl: '{{ $json["nonexistent_field"] }}',
				primaryLinkLabel: 'Domain',
			},
		],
		shouldThrow: true,
		expectedError: 'domainName',
	},
];

// Test runner
function runTests() {
	console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
	console.log(`${colors.cyan}║  Link Field Expression Validation - Test Suite              ║${colors.reset}`);
	console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

	let passed = 0;
	let failed = 0;

	testCases.forEach((testCase, index) => {
		console.log(`${colors.blue}Test ${index + 1}/${testCases.length}: ${testCase.name}${colors.reset}`);
		console.log(`${colors.yellow}Description: ${testCase.description}${colors.reset}`);

		try {
			const result = transformFieldsData(testCase.input);

			if (testCase.shouldThrow) {
				// Test failed - should have thrown but didn't
				console.log(`${colors.red}✗ FAILED: Expected error but operation succeeded${colors.reset}`);
				console.log(`  Got result: ${JSON.stringify(result, null, 2)}`);
				failed++;
			} else {
				// Test passed - no error expected and none thrown
				if (testCase.expectedResult) {
					const resultStr = JSON.stringify(result);
					const expectedStr = JSON.stringify(testCase.expectedResult);
					if (resultStr === expectedStr) {
						console.log(`${colors.green}✓ PASSED: Result matches expected output${colors.reset}`);
						console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
						passed++;
					} else {
						console.log(`${colors.red}✗ FAILED: Result doesn't match expected${colors.reset}`);
						console.log(`  Expected: ${expectedStr}`);
						console.log(`  Got:      ${resultStr}`);
						failed++;
					}
				} else {
					console.log(`${colors.green}✓ PASSED: No error thrown${colors.reset}`);
					console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
					passed++;
				}
			}
		} catch (error: any) {
			if (testCase.shouldThrow) {
				// Check if error message contains expected text
				const errorMatches = testCase.expectedError
					? error.message.includes(testCase.expectedError)
					: true;

				if (errorMatches) {
					console.log(`${colors.green}✓ PASSED: Correctly threw error${colors.reset}`);
					console.log(`  Error: ${error.message}`);
					passed++;
				} else {
					console.log(`${colors.red}✗ FAILED: Error message doesn't match expected${colors.reset}`);
					console.log(`  Expected to include: "${testCase.expectedError}"`);
					console.log(`  Got: "${error.message}"`);
					failed++;
				}
			} else {
				// Test failed - unexpected error
				console.log(`${colors.red}✗ FAILED: Unexpected error thrown${colors.reset}`);
				console.log(`  Error: ${error.message}`);
				failed++;
			}
		}

		console.log(''); // Empty line between tests
	});

	// Summary
	console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
	console.log(`${colors.cyan}Test Results Summary${colors.reset}`);
	console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
	console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
	console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
	console.log(`Total:  ${testCases.length}`);
	console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

	// Exit with appropriate code
	process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests();
