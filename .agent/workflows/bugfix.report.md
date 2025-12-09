---
description: Document a bug fix by creating a standardized report in `.docs/bugfixes`. This ensures we have a history of issues, root causes, and resolutions.
---

## User Input

```text
$ARGUMENTS
```

## Goal

Document a bug fix by creating a standardized report in `.docs/bugfixes`. This ensures we have a history of issues, root causes, and resolutions.

## Execution Steps

### 1. Identify Target Directory

1.  List the contents of `.docs/bugfixes` to see existing categories and the current numbering sequence.
    ```powershell
    Get-ChildItem .docs/bugfixes | Sort-Object { [int]($_.Name -split '\.')[0] } -Descending | Select-Object -First 10
    ```
2.  **Determine if this is a NEW bug category or an EXISTING one.**
    *   *New*: You will need to create a new folder with the next incremented number (e.g., if `41. daytona...` exists, create `42. new-bug-name`).
    *   *Existing*: You will use the existing folder.

### 2. Create or Update Report

#### Option A: New Bug Report (Default)

1.  **Create Directory**:
    ```powershell
    # Example: New folder 42
    New-Item -ItemType Directory -Path ".docs/bugfixes/42. short-descriptive-name"
    ```
2.  **Create Report File**:
    Create a file named `BUG_REPORT_RESOLUTION.md` inside that folder using the template below.

#### Option B: Existing Bug Report

1.  **Read Existing File**: Read the `description.md` and 'research.md' in the relevant folder.
2.  **Append/Update**: Add the new findings or resolution to the existing file, maintaining a clear chronological order.

### 3. Report Template

Use the following structure for `BUG_REPORT_RESOLUTION.md`:

```markdown
# Bug Fix: [Title of the Bug]

**Date**: YYYY-MM-DD
**Status**: [Resolved/In Progress]

## 1. Issue Description
*   **Symptoms**: What was observed? (Error messages, UI glitches, etc.)
*   **Context**: When did it happen? (Environment, specific actions)

## 2. Root Cause Analysis
*   **Investigation**: How did we find the cause?
*   **The Cause**: What specifically was broken? (e.g., "The `useStream` hook was not memoized, causing re-renders.")

## 3. The Fix
*   **Changes Made**:
    *   Modified `file/path.ts`: Added `useMemo`.
    *   Updated `config.yaml`: Changed timeout.
*   **Code Snippet** (Optional):
    ```typescript
    // Before
    const x = expensive();
    
    // After
    const x = useMemo(() => expensive(), []);
    ```

## 4. Verification
*   **Test Case**: How did we verify the fix?
*   **Outcome**: Confirmation that the issue is resolved.
```

### 4. Commit (Optional)

If the user approves, you can commit the documentation along with the code changes.