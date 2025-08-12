# Yenta Project - Gemini Agent Readme

This document serves as a quick reference for the Gemini agent working on the Yenta project.

## Project Overview
Yenta is an AI-powered matchmaker application, consisting of a React frontend (`client/`) and a Node.js/Express backend (`server/`). It facilitates vendor intake, prospect management, and AI-driven matching.

## Development Roadmap
For a detailed breakdown of outstanding tasks, required credentials, and the path to a functional application, please see the [TODO.md](TODO.md) file.

## Current Project Status

### Backend (`server/`)
- **Tests**:
    - `ai-extraction.test.js`: **PASSING**
    - `multi-auth.test.js`: **PASSING**
    - `admin.test.js`: **PASSING**
    - `linkedin-auth.test.js`: **PASSING**
    - `vendors.test.js`: **PASSING**
    - `auth.test.js`: **PASSING**
    - `prospects.test.js`: **PASSING**
    - `vendor-intake.test.js`: **PASSING**
    - `enhanced-vetting.test.js`: **FAILING** (All tests failing with 404 errors, likely unimplemented routes)
    - `payments.test.js`: **FAILING** (Multiple failures including 500 errors, TypeError, and timeouts)

### Frontend (`client/`)
- Tests have not been run recently by the agent.

## How to Interact with the Project (as Gemini Agent)

### Running Tests
- **Backend Tests**:
    ```bash
    npm test --prefix server
    ```
- **Frontend Tests**:
    ```bash
t    npm test --prefix client
    ```
    *(Note: Frontend tests have not been run by the agent yet.)*

### File System Operations
- Use `read_file(absolute_path='...')` to view file contents.
- Use `write_file(file_path='...', content='...')` to create or overwrite files.
- Use `replace(file_path='...', old_string='...', new_string='...')` for targeted text replacement.
- Use `glob(pattern='...')` to find files matching patterns.
- Use `search_file_content(pattern='...')` to search within file contents.

### Shell Commands
- Use `run_shell_command(command='...')` for general shell operations. Be mindful of the current working directory.

## Agent Capabilities
- Can read and understand code in JavaScript/TypeScript, Python, and other common languages.
- Can refactor code, fix bugs, and implement new features.
- Can analyze test failures and propose solutions.
- Can interact with the file system and run shell commands.
- Prioritizes adhering to existing project conventions and coding styles.
- Will ask for clarification if a request is ambiguous.
