#!/usr/bin/env python3
"""
Duplicate Method Analyzer

Analyzes the method catalog to find duplicated methods and suggest refactoring opportunities.
"""

import json
from collections import defaultdict
import re

def load_catalog():
    """Load the method catalog"""
    with open('method_catalog.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_duplicates(catalog):
    """Analyze the catalog for duplicate method names and similar functionality"""
    
    # Group methods by name
    methods_by_name = defaultdict(list)
    
    for file_path, methods in catalog.items():
        for method in methods:
            methods_by_name[method['name']].append({
                'file': file_path,
                'description': method['description'],
                'line': method['line']
            })
    
    # Find duplicates
    duplicates = {}
    for method_name, occurrences in methods_by_name.items():
        if len(occurrences) > 1:
            duplicates[method_name] = occurrences
    
    return duplicates

def analyze_similar_functionality(catalog):
    """Find methods with similar functionality based on descriptions"""
    
    # Common patterns that suggest similar functionality
    patterns = {
        'initialization': ['initialize', 'init', 'setup', 'create'],
        'disposal': ['dispose', 'cleanup', 'destroy', 'remove'],
        'update': ['update', 'tick', 'refresh'],
        'audio': ['play', 'sound', 'audio', 'music'],
        'player': ['player', 'spawn', 'death', 'kill'],
        'weapon': ['weapon', 'fire', 'shoot', 'reload'],
        'effects': ['effect', 'particle', 'visual', 'animation'],
        'manager': ['manager', 'handle', 'process']
    }
    
    similar_groups = defaultdict(list)
    
    for file_path, methods in catalog.items():
        for method in methods:
            method_info = {
                'name': method['name'],
                'file': file_path,
                'description': method['description'],
                'line': method['line']
            }
            
            # Check against patterns
            for category, keywords in patterns.items():
                if any(keyword.lower() in method['name'].lower() or 
                      keyword.lower() in method['description'].lower() 
                      for keyword in keywords):
                    similar_groups[category].append(method_info)
    
    return similar_groups

def print_duplicates(duplicates):
    """Print duplicate methods analysis"""
    print("=== DUPLICATE METHOD NAMES ===\n")
    
    for method_name, occurrences in duplicates.items():
        print(f"Method: {method_name} ({len(occurrences)} occurrences)")
        for occ in occurrences:
            print(f"  - {occ['file']}:{occ['line']} - {occ['description'][:80]}...")
        print()

def print_similar_functionality(similar_groups):
    """Print similar functionality analysis"""
    print("\n=== SIMILAR FUNCTIONALITY GROUPS ===\n")
    
    for category, methods in similar_groups.items():
        if len(methods) > 3:  # Only show categories with multiple methods
            print(f"Category: {category.upper()} ({len(methods)} methods)")
            for method in methods[:10]:  # Show first 10
                print(f"  - {method['name']} in {method['file']}")
            if len(methods) > 10:
                print(f"  ... and {len(methods) - 10} more")
            print()

def analyze_file_structure(catalog):
    """Analyze file structure and suggest improvements"""
    print("\n=== FILE STRUCTURE ANALYSIS ===\n")
    
    file_stats = {}
    for file_path, methods in catalog.items():
        file_stats[file_path] = {
            'method_count': len(methods),
            'methods': [m['name'] for m in methods]
        }
    
    # Find files with many methods (potential for splitting)
    large_files = [(f, stats) for f, stats in file_stats.items() if stats['method_count'] > 15]
    
    print("Large files (>15 methods) that might benefit from splitting:")
    for file_path, stats in sorted(large_files, key=lambda x: x[1]['method_count'], reverse=True):
        print(f"  - {file_path}: {stats['method_count']} methods")
    
    print()

def main():
    catalog = load_catalog()
    
    # Analyze duplicates
    duplicates = analyze_duplicates(catalog)
    print_duplicates(duplicates)
    
    # Analyze similar functionality
    similar_groups = analyze_similar_functionality(catalog)
    print_similar_functionality(similar_groups)
    
    # Analyze file structure
    analyze_file_structure(catalog)
    
    # Summary
    total_files = len(catalog)
    total_methods = sum(len(methods) for methods in catalog.values())
    duplicate_methods = len(duplicates)
    
    print(f"\n=== SUMMARY ===")
    print(f"Total files: {total_files}")
    print(f"Total methods: {total_methods}")
    print(f"Duplicate method names: {duplicate_methods}")
    print(f"Duplication rate: {duplicate_methods/total_methods*100:.1f}%")

if __name__ == "__main__":
    main()