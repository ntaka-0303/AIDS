#!/usr/bin/env python3
"""
Schema Validation Script for Project State Files

This script performs basic schema validation on project_state YAML files.
It is triggered by Claude Code hooks when YAML files are modified.

Usage:
    python scripts/validate_schema.py <target_file>
"""

import sys
import os
import yaml
import re
from pathlib import Path
from datetime import datetime

# ANSI color codes
RED = '\033[91m'
YELLOW = '\033[93m'
GREEN = '\033[92m'
BLUE = '\033[94m'
RESET = '\033[0m'

class SchemaValidator:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.schemas_dir = self.project_root / "project_state" / "schemas"
        self.errors = []
        self.warnings = []

    def load_schema(self, schema_name):
        """Load schema YAML file"""
        schema_path = self.schemas_dir / f"{schema_name}.schema.yaml"
        if not schema_path.exists():
            return None

        with open(schema_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def load_target_file(self, file_path):
        """Load target YAML file"""
        if not file_path.exists():
            self.errors.append(f"Target file does not exist: {file_path}")
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def validate_field_format(self, field_name, value, field_def):
        """Validate field format (pattern, enum, type)"""
        # Type check
        field_type = field_def.get('type')
        if field_type == 'string' and not isinstance(value, str):
            self.errors.append(f"Field '{field_name}' must be string, got {type(value).__name__}")
            return False

        # Pattern check
        pattern = field_def.get('pattern')
        if pattern and isinstance(value, str):
            if not re.match(pattern, value):
                self.errors.append(f"Field '{field_name}' value '{value}' does not match pattern '{pattern}'")
                return False

        # Enum check
        enum_values = field_def.get('enum')
        if enum_values and value not in enum_values:
            self.errors.append(f"Field '{field_name}' value '{value}' not in allowed values {enum_values}")
            return False

        # Max length check
        max_length = field_def.get('max_length')
        if max_length and isinstance(value, str) and len(value) > max_length:
            self.warnings.append(f"Field '{field_name}' exceeds max_length {max_length} (current: {len(value)})")

        return True

    def validate_required_fields(self, entry, fields_def, entry_id=""):
        """Validate required fields"""
        for field_name, field_def in fields_def.items():
            if field_def.get('required', False):
                if field_name not in entry or entry[field_name] is None:
                    self.errors.append(f"[{entry_id}] Required field '{field_name}' is missing")

    def validate_date_format(self, field_name, value, entry_id=""):
        """Validate date format (YYYY-MM-DD)"""
        if not isinstance(value, str):
            return

        date_pattern = r'^\d{4}-\d{2}-\d{2}$'
        if not re.match(date_pattern, value):
            self.errors.append(f"[{entry_id}] Field '{field_name}' has invalid date format: {value} (expected: YYYY-MM-DD)")
        else:
            # Try parsing to validate actual date
            try:
                datetime.strptime(value, '%Y-%m-%d')
            except ValueError:
                self.errors.append(f"[{entry_id}] Field '{field_name}' has invalid date: {value}")

    def validate_entry(self, entry, schema, entry_index=0):
        """Validate a single entry against schema"""
        fields_def = schema.get('fields', {})
        entry_id = entry.get('id', f"entry_{entry_index}")

        # Required fields check
        self.validate_required_fields(entry, fields_def, entry_id)

        # Field format check
        for field_name, value in entry.items():
            if field_name in fields_def:
                field_def = fields_def[field_name]

                # Skip None values for optional fields
                if value is None and not field_def.get('required', False):
                    continue

                # Format validation
                self.validate_field_format(field_name, value, field_def)

                # Date format validation
                if field_def.get('format') == 'YYYY-MM-DD':
                    self.validate_date_format(field_name, value, entry_id)

    def validate_file(self, file_path):
        """Main validation function"""
        # Determine schema name from file name
        file_name = file_path.name
        schema_name = file_name.replace('.yaml', '')

        # Load schema
        schema = self.load_schema(schema_name)
        if not schema:
            print(f"{YELLOW}⚠ No schema found for {file_name}, skipping validation{RESET}")
            return True

        # Load target file
        data = self.load_target_file(file_path)
        if data is None:
            return False

        # Get root key from schema
        root_key = schema.get('schema', {}).get('root_key')
        if not root_key or root_key not in data:
            self.warnings.append(f"Root key '{root_key}' not found in data")
            return True

        entries = data[root_key]
        if not isinstance(entries, list):
            self.errors.append(f"Root key '{root_key}' must be a list")
            return False

        # Validate each entry
        for i, entry in enumerate(entries):
            self.validate_entry(entry, schema, i)

        # ID uniqueness check
        ids = [entry.get('id') for entry in entries if 'id' in entry]
        if len(ids) != len(set(ids)):
            duplicates = [id for id in ids if ids.count(id) > 1]
            self.errors.append(f"Duplicate IDs found: {set(duplicates)}")

        return len(self.errors) == 0

    def print_results(self, file_path):
        """Print validation results"""
        print(f"\n{BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
        print(f"{BLUE}Schema Validation Report{RESET}")
        print(f"{BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
        print(f"Target: {file_path.relative_to(self.project_root)}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        if not self.errors and not self.warnings:
            print(f"{GREEN}✓ All checks passed{RESET}")
            return

        if self.errors:
            print(f"{RED}✗ Critical Errors: {len(self.errors)}{RESET}")
            for error in self.errors:
                print(f"  {RED}[CRITICAL]{RESET} {error}")
            print()

        if self.warnings:
            print(f"{YELLOW}⚠ Warnings: {len(self.warnings)}{RESET}")
            for warning in self.warnings:
                print(f"  {YELLOW}[WARNING]{RESET} {warning}")
            print()

        print(f"{BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")

        if self.errors:
            print(f"\n{RED}⚠ Validation failed. Please fix critical errors before proceeding.{RESET}")
            print(f"{YELLOW}💡 Run schema-validator agent for detailed validation and fix suggestions.{RESET}")

def main():
    if len(sys.argv) < 2:
        print(f"{RED}Error: No target file specified{RESET}")
        print(f"Usage: {sys.argv[0]} <target_file>")
        sys.exit(1)

    target_file = Path(sys.argv[1])

    # Check if target file is in project_state/
    if 'project_state' not in target_file.parts:
        print(f"{YELLOW}⚠ File is not in project_state/, skipping validation{RESET}")
        sys.exit(0)

    # Skip schema files themselves
    if 'schemas' in target_file.parts:
        print(f"{YELLOW}⚠ Skipping schema file validation{RESET}")
        sys.exit(0)

    # Skip markdown files
    if target_file.suffix != '.yaml':
        print(f"{YELLOW}⚠ Not a YAML file, skipping validation{RESET}")
        sys.exit(0)

    # Find project root (directory containing project_state/)
    project_root = target_file
    while project_root.parent != project_root:
        if (project_root / 'project_state').exists():
            break
        project_root = project_root.parent

    if not (project_root / 'project_state').exists():
        print(f"{RED}Error: Could not find project_state/ directory{RESET}")
        sys.exit(1)

    # Run validation
    validator = SchemaValidator(project_root)
    success = validator.validate_file(target_file)
    validator.print_results(target_file)

    # Exit with error code if validation failed
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
