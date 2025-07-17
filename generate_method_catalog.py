#!/usr/bin/env python3
"""
Method Catalog Generator

Scans JavaScript files for functions and their JSDoc comments to generate
a comprehensive method catalog with descriptions.
"""

import os
import re
import json
from pathlib import Path

class MethodCatalogGenerator:
    def __init__(self, source_dirs=None):
        self.source_dirs = source_dirs or ['src', 'assets']
        self.catalog = {}
        
    def extract_jsdoc_comment(self, lines, function_line_index):
        """Extract JSDoc comment above a function"""
        comment_lines = []
        i = function_line_index - 1
        
        # Look backwards for JSDoc comment
        while i >= 0:
            line = lines[i].strip()
            if line.endswith('*/'):
                # Found end of JSDoc comment, collect it
                comment_lines.insert(0, line)
                i -= 1
                while i >= 0:
                    line = lines[i].strip()
                    comment_lines.insert(0, line)
                    if line.startswith('/**'):
                        break
                    i -= 1
                break
            elif line == '' or line.startswith('//'):
                # Skip empty lines and single-line comments
                i -= 1
                continue
            else:
                # Hit non-comment code, no JSDoc found
                break
                
        if comment_lines:
            # Clean up JSDoc comment
            description = []
            for line in comment_lines:
                line = line.strip()
                if line.startswith('/**') or line.startswith('*/'):
                    continue
                if line.startswith('*'):
                    line = line[1:].strip()
                if line:
                    description.append(line)
            return ' '.join(description)
        
        return None
    
    def extract_functions_from_file(self, file_path):
        """Extract all functions and their descriptions from a JavaScript file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return []
        
        functions = []
        
        # Regex patterns for different function types
        patterns = [
            # Method definitions: methodName() {
            r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
            # Function declarations: function methodName() {
            r'^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
            # Arrow functions: methodName = () => {
            r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*\{',
            # Class methods: async methodName() {
            r'^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
        ]
        
        for i, line in enumerate(lines):
            for pattern in patterns:
                match = re.search(pattern, line)
                if match:
                    function_name = match.group(1)
                    
                    # Skip common non-function matches
                    if function_name in ['if', 'for', 'while', 'switch', 'catch', 'else']:
                        continue
                    
                    # Extract JSDoc comment
                    description = self.extract_jsdoc_comment(lines, i)
                    
                    functions.append({
                        'name': function_name,
                        'description': description or 'No description available',
                        'file': str(file_path),
                        'line': i + 1
                    })
                    break
        
        return functions
    
    def scan_directory(self, directory):
        """Recursively scan directory for JavaScript files"""
        js_files = []
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.js'):
                    js_files.append(os.path.join(root, file))
        return js_files
    
    def generate_catalog(self):
        """Generate the complete method catalog"""
        print("Generating method catalog...")
        
        all_files = []
        for source_dir in self.source_dirs:
            if os.path.exists(source_dir):
                all_files.extend(self.scan_directory(source_dir))
            else:
                print(f"Warning: Directory '{source_dir}' not found")
        
        for file_path in all_files:
            print(f"Processing: {file_path}")
            functions = self.extract_functions_from_file(file_path)
            
            if functions:
                relative_path = os.path.relpath(file_path)
                self.catalog[relative_path] = functions
        
        return self.catalog
    
    def save_catalog(self, output_file='method_catalog.json'):
        """Save catalog to JSON file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.catalog, f, indent=2, ensure_ascii=False)
        print(f"Catalog saved to {output_file}")
    
    def print_summary(self):
        """Print a summary of the catalog"""
        total_files = len(self.catalog)
        total_functions = sum(len(functions) for functions in self.catalog.values())
        
        print(f"\n=== Method Catalog Summary ===")
        print(f"Files processed: {total_files}")
        print(f"Functions found: {total_functions}")
        print(f"\nFiles with functions:")
        
        for file_path, functions in self.catalog.items():
            print(f"  {file_path}: {len(functions)} functions")
            for func in functions[:3]:  # Show first 3 functions
                desc = func['description'][:50] + "..." if len(func['description']) > 50 else func['description']
                print(f"    - {func['name']}: {desc}")
            if len(functions) > 3:
                print(f"    ... and {len(functions) - 3} more")

def main():
    generator = MethodCatalogGenerator()
    catalog = generator.generate_catalog()
    generator.save_catalog()
    generator.print_summary()

if __name__ == "__main__":
    main()