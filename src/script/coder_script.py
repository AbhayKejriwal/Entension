#!/usr/bin/env python3
"""
Coder & Documentation Bot script.
This script generates unit tests and/or documentation based on source directory.
"""

import sys
import time
import os
import argparse
import glob

def main():
    parser = argparse.ArgumentParser(description='Generate tests and documentation from source directory.')
    parser.add_argument('source_dir', help='Path to the source directory')
    parser.add_argument('output_prefix', help='Prefix for output files')
    parser.add_argument('--unit-test', action='store_true', help='Generate unit tests')
    parser.add_argument('--docs', action='store_true', help='Generate documentation')
    
    # Parse command line arguments
    args = parser.parse_args()
    
    try:
        # Verify source directory exists
        if not os.path.isdir(args.source_dir):
            print(f"Error: Source directory does not exist: {args.source_dir}")
            return 1
            
        print(f"Processing source directory: {args.source_dir}")
        print(f"Selected options: Unit Tests: {args.unit_test}, Docs: {args.docs}")
        
        # Find all Python files in the source directory (recursive)
        python_files = glob.glob(os.path.join(args.source_dir, "**", "*.py"), recursive=True)
        python_files += glob.glob(os.path.join(args.source_dir, "**", "*.js"), recursive=True)
        python_files += glob.glob(os.path.join(args.source_dir, "**", "*.ts"), recursive=True)
        
        if not python_files:
            print(f"No source files found in {args.source_dir}")
            return 1
            
        print(f"Found {len(python_files)} source files to process")
        
        # Create outputs based on selected options
        outputs = []
        
        if args.unit_test:
            print("Generating unit tests...")
            test_output = generate_tests_from_dir(args.source_dir, python_files)
            test_file = f"{args.output_prefix}_tests.py"
            with open(test_file, 'w') as file:
                file.write(test_output)
            outputs.append(('tests', test_file))
                
        if args.docs:
            print("Generating documentation...")
            docs_output = generate_docs_from_dir(args.source_dir, python_files)
            docs_file = f"{args.output_prefix}_docs.md"
            with open(docs_file, 'w') as file:
                file.write(docs_output)
            outputs.append(('documentation', docs_file))
                
        # For demonstration, add a small delay to simulate processing
        time.sleep(2)
        
        # Print output summary
        print("\nGeneration complete!")
        for output_type, file_path in outputs:
            print(f"- Generated {output_type}: {file_path}")
            
        return 0
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

def generate_tests_from_dir(source_dir, source_files):
    """Generate unit tests based on source files in directory."""
    # This is a dummy implementation
    file_list = '\n'.join([f"- {os.path.relpath(f, source_dir)}" for f in source_files[:10]])
    if len(source_files) > 10:
        file_list += f"\n- ... and {len(source_files) - 10} more files"
    
    return f"""#!/usr/bin/env python3
# Generated unit tests
# Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}
# Source directory: {source_dir}

import unittest

class TestGeneratedFromSourceDir(unittest.TestCase):
    def setUp(self):
        self.source_dir = "{source_dir}"
    
    def test_sample(self):
        # This is a placeholder test
        self.assertTrue(True, "Sample test passes")
        
    def test_source_dir_exists(self):
        import os
        self.assertTrue(os.path.exists(self.source_dir), 
                       f"Source directory exists: {{self.source_dir}}")
        
    # The following tests would be generated based on the analyzed source files:
    # Files analyzed:
{file_list}

if __name__ == '__main__':
    unittest.main()
"""

def generate_docs_from_dir(source_dir, source_files):
    """Generate documentation based on source files in directory."""
    # This is a dummy implementation
    file_list = '\n'.join([f"- {os.path.relpath(f, source_dir)}" for f in source_files[:10]])
    if len(source_files) > 10:
        file_list += f"\n- ... and {len(source_files) - 10} more files"
    
    return f"""# Documentation Generated from Source Directory

Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}

## Overview

This documentation covers the code in the source directory: `{source_dir}`

## Files Analyzed

The following files were analyzed to generate this documentation:

{file_list}

## Code Structure

This section would contain documentation about the code structure, classes, and functions.

## Usage Examples

This section would contain usage examples extracted from the code.

## Dependencies

This section would list dependencies detected in the code.

"""

if __name__ == "__main__":
    sys.exit(main())
