---
description: Initialize a bug investigation by creating description.md and research.md in a new or existing bugfix folder.
---

## User Input

```text
$ARGUMENTS
```

## Goal

Initialize the documentation for a new bug investigation. This involves identifying or creating the correct bugfix folder and scaffolding the initial `description.md` and `research.md` files.

## Execution Steps

### 1. Identify Target Directory

1.  List the contents of `.docs/bugfixes` to see existing categories and the current numbering sequence.
    ```powershell
    Get-ChildItem .docs/bugfixes | Sort-Object { [int]($_.Name -split '\.')[0] } -Descending | Select-Object -First 10
    ```
2.  **Determine if this is a NEW bug category or an EXISTING one.**
    *   *New*: Create a new folder with the next incremented number (e.g., if `41. daytona...` exists, create `42. new-bug-name`).
    *   *Existing*: Use the existing folder if the bug description matches an active investigation.

### 2. Scaffold Documentation

#### A. Create `description.md`
Create or update `description.md` with:
*   **High-Level Summary**: A clear description of the bug or issue.
*   **Timestamp**: The date and time the report was initiated.
*   **Initial Context**: Any error messages or user reports provided in the arguments.

#### B. Create `research.md`
Create `research.md` to serve as a living document for the investigation. It **MUST** include:
*   **Project Structure Section**: A list of related files and their absolute paths.
*   **Initial Research Section**: A placeholder or initial findings section for the agent to populate as it investigates.

### 3. Next Steps

After creating the files, prompt the user with options to:
1.  Begin investigating the issue immediately (which will update `research.md`).
2.  Add more context to the description.