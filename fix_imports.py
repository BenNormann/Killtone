#!/usr/bin/env python3
"""
Import/Export Consistency Fixer for KILLtONE Game Framework
Automatically fixes inconsistent import/export patterns in JavaScript modules
"""

import os
import re
import json
from pathlib import Path

class ImportExportFixer:
    def __init__(self):
        # Define the correct export patterns for each module
        self.export_patterns = {
            # Named exports (should use { } in imports)
            'GameConfig': {'file': 'mainConfig.js', 'type': 'named'},
            'MathUtils': {'file': 'utils/MathUtils.js', 'type': 'named'},
            'CommonUtils': {'file': 'utils/CommonUtils.js', 'type': 'named'},
            'PlayerUtils': {'file': 'entities/PlayerUtils.js', 'type': 'named'},
            'EventEmitter': {'file': 'utils/EventEmitter.js', 'type': 'named'},
            'RemotePlayer': {'file': 'entities/RemotePlayer.js', 'type': 'named'},
        }
        
        # Track files that need fixing
        self.files_to_fix = []
        self.fixes_applied = []
        
    def scan_files(self, directory='src'):
        """Scan all JavaScript files for import/export issues"""
        print(f"Scanning {directory} for import/export inconsistencies...")
        
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.js'):
                    file_path = os.path.join(root, file)
                    self.analyze_file(file_path)
    
    def analyze_file(self, file_path):
        """Analyze a single file for import issues"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find all import statements
            import_pattern = r'import\s+([^{}\s]+)\s+from\s+[\'"]([^\'"]+)[\'"]'
            imports = re.findall(import_pattern, content)
            
            issues = []
            for import_name, import_path in imports:
                import_name = import_name.strip()
                
                # Check if this should be a named import
                if import_name in self.export_patterns:
                    expected_type = self.export_patterns[import_name]['type']
                    if expected_type == 'named':
                        issues.append({
                            'type': 'default_should_be_named',
                            'import_name': import_name,
                            'import_path': import_path,
                            'line': self.find_import_line(content, import_name, import_path)
                        })
            
            if issues:
                self.files_to_fix.append({
                    'file': file_path,
                    'issues': issues,
                    'content': content
                })
                
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")
    
    def find_import_line(self, content, import_name, import_path):
        """Find the line number of an import statement"""
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if f'import {import_name}' in line and import_path in line:
                return i + 1
        return 0
    
    def fix_files(self):
        """Apply fixes to all identified files"""
        print(f"\nFound {len(self.files_to_fix)} files with import issues")
        
        for file_info in self.files_to_fix:
            self.fix_single_file(file_info)
    
    def fix_single_file(self, file_info):
        """Fix import issues in a single file"""
        file_path = file_info['file']
        content = file_info['content']
        
        print(f"\nFixing {file_path}...")
        
        # Apply fixes
        for issue in file_info['issues']:
            if issue['type'] == 'default_should_be_named':
                old_pattern = f"import {issue['import_name']} from '{issue['import_path']}'"
                new_pattern = f"import {{ {issue['import_name']} }} from '{issue['import_path']}'"
                
                # Also try with double quotes
                old_pattern_dq = f'import {issue["import_name"]} from "{issue["import_path"]}"'
                new_pattern_dq = f'import {{ {issue["import_name"]} }} from "{issue["import_path"]}"'
                
                if old_pattern in content:
                    content = content.replace(old_pattern, new_pattern)
                    self.fixes_applied.append(f"{file_path}: {old_pattern} → {new_pattern}")
                elif old_pattern_dq in content:
                    content = content.replace(old_pattern_dq, new_pattern_dq)
                    self.fixes_applied.append(f"{file_path}: {old_pattern_dq} → {new_pattern_dq}")
        
        # Write the fixed content back to file
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed {len(file_info['issues'])} issues in {file_path}")
        except Exception as e:
            print(f"❌ Error writing {file_path}: {e}")
    
    def generate_report(self):
        """Generate a report of all fixes applied"""
        print(f"\n{'='*60}")
        print("IMPORT/EXPORT FIX REPORT")
        print(f"{'='*60}")
        print(f"Files processed: {len(self.files_to_fix)}")
        print(f"Fixes applied: {len(self.fixes_applied)}")
        
        if self.fixes_applied:
            print("\nDetailed fixes:")
            for fix in self.fixes_applied:
                print(f"  • {fix}")
        
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print("Fixed the following import patterns:")
        print("• GameConfig: default import → named import")
        print("• MathUtils: default import → named import") 
        print("• CommonUtils: default import → named import")
        print("• PlayerUtils: default import → named import")
        print("• EventEmitter: default import → named import")
        print("• RemotePlayer: default import → named import")
        print("\nAll imports now match their corresponding export patterns.")

def main():
    print("KILLtONE Import/Export Consistency Fixer")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('src'):
        print("❌ Error: 'src' directory not found. Please run this script from the project root.")
        return
    
    # Create fixer instance
    fixer = ImportExportFixer()
    
    # Scan for issues
    fixer.scan_files()
    
    if not fixer.files_to_fix:
        print("✅ No import/export inconsistencies found!")
        return
    
    # Show what will be fixed
    print(f"\nFound issues in {len(fixer.files_to_fix)} files:")
    for file_info in fixer.files_to_fix:
        print(f"  • {file_info['file']}: {len(file_info['issues'])} issues")
    
    # Ask for confirmation
    response = input("\nProceed with fixes? (y/N): ").strip().lower()
    if response != 'y':
        print("Aborted.")
        return
    
    # Apply fixes
    fixer.fix_files()
    
    # Generate report
    fixer.generate_report()
    
    print("\n🎉 Import/export consistency fixes completed!")
    print("You should now run the method catalog generator:")
    print("  python generate_method_catalog.py")

if __name__ == "__main__":
    main()