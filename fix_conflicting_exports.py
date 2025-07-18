#!/usr/bin/env python3
"""
Fix Conflicting Export Patterns
Removes default exports that conflict with named exports
"""

import os
import re

def fix_conflicting_exports():
    """Remove conflicting default exports from files that already have named exports"""
    
    # Files that should only have named exports (no default export)
    files_to_fix = [
        'src/utils/MathUtils.js',
        'src/utils/CommonUtils.js', 
        'src/utils/EventEmitter.js',
        'src/entities/PlayerUtils.js',
        'src/entities/RemotePlayer.js',
        'src/physics/PhysicsManager.js',
        'src/physics/RaycastManager.js',
        'src/hud/PerformanceMonitor.js',
        'src/entities/weapons/WeaponBase.js',
        'src/entities/weapons/AmmoUI.js',
        'src/entities/weapons/AmmoRegistry.js',
        'src/entities/weapons/AccuracySystem.js',
        'src/entities/Projectile.js',
        'src/mainConfig.js'  # This one is tricky - has both GameConfig named export and default
    ]
    
    fixes_applied = []
    
    for file_path in files_to_fix:
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_path}")
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Remove default export lines that conflict with named exports
            # Pattern: export default ClassName;
            content = re.sub(r'\nexport default \w+;\s*$', '', content, flags=re.MULTILINE)
            content = re.sub(r'^export default \w+;\s*\n', '', content, flags=re.MULTILINE)
            
            # Special case for mainConfig.js - keep only the named exports
            if 'mainConfig.js' in file_path:
                content = re.sub(r'\nexport default GameConfig;\s*$', '', content, flags=re.MULTILINE)
            
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                fixes_applied.append(file_path)
                print(f"✅ Fixed conflicting exports in {file_path}")
            else:
                print(f"ℹ️  No conflicting exports found in {file_path}")
                
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
    
    return fixes_applied

def main():
    print("Fixing Conflicting Export Patterns")
    print("=" * 40)
    
    fixes = fix_conflicting_exports()
    
    print(f"\n{'='*40}")
    print("SUMMARY")
    print(f"{'='*40}")
    print(f"Files fixed: {len(fixes)}")
    
    if fixes:
        print("\nFixed files:")
        for file_path in fixes:
            print(f"  • {file_path}")
        
        print("\n🎉 Conflicting export patterns have been resolved!")
        print("The 'Unexpected token export' error should now be fixed.")
    else:
        print("No conflicting exports found.")

if __name__ == "__main__":
    main()