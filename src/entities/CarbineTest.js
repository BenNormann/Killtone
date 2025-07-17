/**
 * KILLtONE Game Framework - Carbine Weapon Test
 * Comprehensive test suite for the Carbine weapon implementation
 */

import * as BABYLON from '@babylonjs/core';
import { Carbine } from './Carbine.js';
import { WeaponEffects } from './WeaponEffects.js';
import { AccuracySystem } from './AccuracySystem.js';
import { RaycastManager } from '../physics/RaycastManager.js';

export class CarbineTest {
    constructor() {
        this.testResults = [];
        this.scene = null;
        this.carbine = null;
        this.effectsManager = null;
        this.accuracySystem = null;
        this.raycastManager = null;
    }

    /**
     * Run all Carbine weapon tests
     */
    async runAllTests() {
        console.log('=== Starting Carbine Weapon Tests ===');
        
        try {
            // Setup test environment
            await this.setupTestEnvironment();
            
            // Run individual tests
            await this.testWeaponInitialization();
            await this.testWeaponConfiguration();
            await this.testAmmunitionSystem();
            await this.testFiringMechanism();
            await this.testReloadSystem();
            await this.testAccuracySystem();
            await this.testEffectsIntegration();
            await this.testRaycastIntegration();
            await this.testWeaponState();
            
            // Cleanup
            this.cleanup();
            
            // Report results
            this.reportResults();
            
        } catch (error) {
            console.error('Test suite failed:', error);
            this.addTestResult('Test Suite', false, `Suite failed: ${error.message}`);
        }
        
        return this.testResults;
    }

    /**
     * Setup test environment with mock scene and dependencies
     */
    async setupTestEnvironment() {
        console.log('Setting up test environment...');
        
        // Create mock canvas and engine
        const canvas = document.createElement('canvas');
        const engine = new BABYLON.NullEngine();
        
        // Create test scene
        this.scene = new BABYLON.Scene(engine);
        
        // Create test dependencies
        this.effectsManager = new WeaponEffects(this.scene);
        this.accuracySystem = new AccuracySystem();
        this.raycastManager = new RaycastManager(this.scene);
        
        // Create carbine instance
        this.carbine = new Carbine(
            this.scene,
            this.effectsManager,
            this.accuracySystem,
            this.raycastManager
        );
        
        console.log('Test environment setup complete');
    }

    /**
     * Test weapon initialization
     */
    async testWeaponInitialization() {
        console.log('Testing weapon initialization...');
        
        try {
            // Test initialization
            const initResult = await this.carbine.initialize();
            
            this.addTestResult(
                'Weapon Initialization',
                initResult === true,
                initResult ? 'Weapon initialized successfully' : 'Weapon initialization failed'
            );
            
            // Test that weapon is properly configured after initialization
            const isConfigured = this.carbine.name === 'Carbine' &&
                               this.carbine.damage === 50 &&
                               this.carbine.magazineSize === 12;
            
            this.addTestResult(
                'Post-Initialization Configuration',
                isConfigured,
                isConfigured ? 'Weapon properly configured' : 'Weapon configuration incorrect'
            );
            
        } catch (error) {
            this.addTestResult('Weapon Initialization', false, `Error: ${error.message}`);
        }
    }

    /**
     * Test weapon configuration matches requirements
     */
    async testWeaponConfiguration() {
        console.log('Testing weapon configuration...');
        
        const tests = [
            { name: 'Damage', expected: 50, actual: this.carbine.damage },
            { name: 'Fire Rate', expected: 0.15, actual: this.carbine.fireRate },
            { name: 'Magazine Size', expected: 12, actual: this.carbine.magazineSize },
            { name: 'Reload Time', expected: 3.0, actual: this.carbine.reloadTime },
            { name: 'Accuracy', expected: 0.95, actual: this.carbine.accuracy },
            { name: 'Weapon Type', expected: 'carbine', actual: this.carbine.type },
            { name: 'Firing Mode', expected: 'semi-auto', actual: this.carbine.firingMode }
        ];
        
        tests.forEach(test => {
            const passed = test.actual === test.expected;
            this.addTestResult(
                `Configuration - ${test.name}`,
                passed,
                passed ? `Correct: ${test.actual}` : `Expected: ${test.expected}, Got: ${test.actual}`
            );
        });
    }

    /**
     * Test ammunition management system
     */
    async testAmmunitionSystem() {
        console.log('Testing ammunition system...');
        
        try {
            // Test initial ammunition
            const initialAmmo = this.carbine.getCurrentAmmo();
            this.addTestResult(
                'Initial Ammunition',
                initialAmmo === 12,
                `Initial ammo: ${initialAmmo}/12`
            );
            
            // Test ammunition consumption
            this.carbine.consumeAmmo(1);
            const afterConsumption = this.carbine.getCurrentAmmo();
            this.addTestResult(
                'Ammunition Consumption',
                afterConsumption === 11,
                `After consuming 1: ${afterConsumption}/12`
            );
            
            // Test ammunition bounds
            this.carbine.consumeAmmo(20); // Try to consume more than available
            const afterOverConsumption = this.carbine.getCurrentAmmo();
            this.addTestResult(
                'Ammunition Bounds',
                afterOverConsumption === 0,
                `After over-consumption: ${afterOverConsumption}/12`
            );
            
            // Test magazine capacity check
            const isFull = this.carbine.currentAmmo >= this.carbine.magazineSize;
            const isEmpty = this.carbine.currentAmmo <= 0;
            this.addTestResult(
                'Magazine State Detection',
                isEmpty && !isFull,
                `Empty: ${isEmpty}, Full: ${isFull}`
            );
            
        } catch (error) {
            this.addTestResult('Ammunition System', false, `Error: ${error.message}`);
        }
    }

    /**
     * Test firing mechanism
     */
    async testFiringMechanism() {
        console.log('Testing firing mechanism...');
        
        try {
            // Reset ammunition for firing tests
            this.carbine.currentAmmo = 12;
            
            // Test basic firing
            const origin = new BABYLON.Vector3(0, 0, 0);
            const direction = new BABYLON.Vector3(0, 0, 1);
            
            const fireResult = this.carbine.fire(origin, direction);
            this.addTestResult(
                'Basic Firing',
                fireResult === true,
                fireResult ? 'Fire successful' : 'Fire failed'
            );
            
            // Test ammunition consumption after firing
            const ammoAfterFire = this.carbine.getCurrentAmmo();
            this.addTestResult(
                'Ammo Consumption on Fire',
                ammoAfterFire === 11,
                `Ammo after fire: ${ammoAfterFire}/12`
            );
            
            // Test fire rate limiting (semi-automatic)
            const rapidFire1 = this.carbine.fire(origin, direction);
            const rapidFire2 = this.carbine.fire(origin, direction);
            this.addTestResult(
                'Fire Rate Limiting',
                !rapidFire2, // Second shot should fail due to fire rate
                rapidFire2 ? 'Fire rate not limited' : 'Fire rate properly limited'
            );
            
            // Test firing with empty magazine
            this.carbine.currentAmmo = 0;
            const emptyFire = this.carbine.fire(origin, direction);
            this.addTestResult(
                'Empty Magazine Fire Prevention',
                !emptyFire,
                emptyFire ? 'Fired with empty magazine' : 'Correctly prevented firing with empty magazine'
            );
            
        } catch (error) {
            this.addTestResult('Firing Mechanism', false, `Error: ${error.message}`);
        }
    }

    /**
     * Test reload system
     */
    async testReloadSystem() {
        console.log('Testing reload system...');
        
        try {
            // Setup for reload test
            this.carbine.currentAmmo = 5; // Partial magazine
            this.carbine.isReloading = false;
            
            // Test reload initiation
            const reloadResult = this.carbine.reload();
            this.addTestResult(
                'Reload Initiation',
                reloadResult === true,
                reloadResult ? 'Reload started successfully' : 'Reload failed to start'
            );
            
            // Test reload state
            this.addTestResult(
                'Reload State',
                this.carbine.isCurrentlyReloading(),
                this.carbine.isCurrentlyReloading() ? 'Weapon is reloading' : 'Weapon not in reload state'
            );
            
            // Test firing prevention during reload
            const origin = new BABYLON.Vector3(0, 0, 0);
            const direction = new BABYLON.Vector3(0, 0, 1);
            const fireWhileReloading = this.carbine.canFireWeapon();
            this.addTestResult(
                'Fire Prevention During Reload',
                !fireWhileReloading,
                fireWhileReloading ? 'Can fire while reloading' : 'Correctly prevents firing while reloading'
            );
            
            // Test reload with full magazine
            this.carbine.currentAmmo = 12;
            this.carbine.isReloading = false;
            const fullMagReload = this.carbine.reload();
            this.addTestResult(
                'Full Magazine Reload Prevention',
                !fullMagReload,
                fullMagReload ? 'Reloaded full magazine' : 'Correctly prevented reloading full magazine'
            );
            
            // Simulate reload completion
            this.carbine.currentAmmo = 5;
            this.carbine.isReloading = true;
            this.carbine.finishReload();
            
            this.addTestResult(
                'Reload Completion',
                this.carbine.currentAmmo === 12 && !this.carbine.isCurrentlyReloading(),
                `After reload: ${this.carbine.currentAmmo}/12, Reloading: ${this.carbine.isCurrentlyReloading()}`
            );
            
        } catch (error) {
            this.addTestResult('Reload System', false, `Error: ${error.message}`);
        }
    }

    /**
     * Test accuracy system integration
     */
    async testAccuracySystem() {
        console.log('Testing accuracy system integration...');
        
        try {
            // Test accuracy system availability
            const hasAccuracySystem = this.carbine.accuracySystem !== null;
            this.addTestResult(
                'Accuracy System Integration',
                hasAccuracySystem,
                hasAccuracySystem ? 'Accuracy system integrated' : 'Accuracy system missing'
            );
            
            if (hasAccuracySystem) {
                // Test base accuracy
                const baseAccuracy = this.carbine.getCurrentAccuracy();
                this.addTestResult(
                    'Base Accuracy',
                    baseAccuracy === this.carbine.accuracy,
                    `Base accuracy: ${baseAccuracy}`
                );
                
                // Test movement penalty
                const mockVelocity = new BABYLON.Vector3(5, 0, 0); // Moving
                this.carbine.updateMovementPenalty(mockVelocity);
                const movingAccuracy = this.carbine.getCurrentAccuracy();
                this.addTestResult(
                    'Movement Accuracy Penalty',
                    movingAccuracy < baseAccuracy,
                    `Moving accuracy: ${movingAccuracy} (reduced from ${baseAccuracy})`
                );
                
                // Test recoil accumulation
                this.carbine.addRecoilToAccuracy();
                const recoilAccuracy = this.carbine.getCurrentAccuracy();
                this.addTestResult(
                    'Recoil Accuracy Penalty',
                    recoilAccuracy < baseAccuracy,
                    `Recoil accuracy: ${recoilAccuracy} (reduced from ${baseAccuracy})`
                );
                
                // Test accuracy reset
                this.carbine.resetAccuracy();
                const resetAccuracy = this.carbine.getCurrentAccuracy();
                this.addTestResult(
                    'Accuracy Reset',
                    resetAccuracy === this.carbine.accuracy,
                    `Reset accuracy: ${resetAccuracy}`
                );
            }
            
        } catch (error) {
            this.addTestResult('Accuracy System', false, `Error: ${error.message}`);
        }
    }

    /**
     * Test effects integration
     */
    async testEffectsIntegration() {
        console.log('Testing effects integration...');
        
        try {
            // Test effects manager availability
            const hasEffectsManager = this.carbine.effectsManager !== null;
            this.addTestResult(
                'Effects Manager Integration',
                hasEffectsManager,
                hasEffectsManager ? 'Effects manager integrated' : 'Effects manager missing'
            );
            
            if (hasEffectsManager) {
                // Test muzzle flash creation (mock)
                const origin = new BABYLON.Vector3(0, 0, 0);
                const direction = new BABYLON.Vector3(0, 0, 1);
                
                // Reset ammo and fire to test effects
                this.carbine.currentAmmo = 12;
                this.carbine.canFire = true;
                
                // Fire and check if effects manager methods would be called
                // (We can't easily test the actual effect creation without a full scene)
                const fireResult = this.carbine.fire(origin, direction);
                this.addTestResult(
                    'Effects Integration on Fire',
                    fireResult === true,
                    fireResult ? 'Fire with effects integration successful' : 'Fire with effects failed'
                );
            }
            
        } catch (error) {
            this.addTestResult('Effects Integration', false, `Error: ${error.message}`);
        }
    }

    /**
     * Test raycast integration
     */
    async testRaycastIntegration() {
        console.log('Testing raycast integration...');
        
        try {
            // Test raycast manager availability
            const hasRaycastManager = this.carbine.raycastManager !== null;
            this.addTestResult(
                'Raycast Manager Integration',
                hasRaycastManager,
                hasRaycastManager ? 'Raycast manager integrated' : 'Raycast manager missing'
            );
            
            if (hasRaycastManager) {
                // Test hit detection method exists
                const hasHitDetection = typeof this.carbine.performHitDetection === 'function';
                this.addTestResult(
                    'Hit Detection Method',
                    hasHitDetection,
                    hasHitDetection ? 'Hit detection method available' : 'Hit detection method missing'
                );
                
                // Test damage application method exists
                const hasDamageApplication = typeof this.carbine.applyDamage === 'function';
                this.addTestResult(
                    'Damage Application Method',
                    hasDamageApplication,
                    hasDamageApplication ? 'Damage application method available' : 'Damage application method missing'
                );
            }
            
        } catch (error) {
            this.addTestResult('Raycast Integration', false, `Error: ${error.message}`);
        }
    }

    /**
     * Test weapon state management
     */
    async testWeaponState() {
        console.log('Testing weapon state management...');
        
        try {
            // Test weapon info retrieval
            const weaponInfo = this.carbine.getWeaponInfo();
            const hasRequiredInfo = weaponInfo &&
                                  weaponInfo.name &&
                                  typeof weaponInfo.damage === 'number' &&
                                  typeof weaponInfo.currentAmmo === 'number' &&
                                  typeof weaponInfo.maxAmmo === 'number';
            
            this.addTestResult(
                'Weapon Info Retrieval',
                hasRequiredInfo,
                hasRequiredInfo ? 'Weapon info complete' : 'Weapon info incomplete'
            );
            
            // Test visibility control
            this.carbine.setVisible(true);
            this.carbine.setVisible(false);
            this.addTestResult(
                'Visibility Control',
                true, // Method exists and doesn't throw
                'Visibility control methods work'
            );
            
            // Test update method
            this.carbine.update(0.016); // 60 FPS delta
            this.addTestResult(
                'Update Method',
                true, // Method exists and doesn't throw
                'Update method works'
            );
            
            // Test disposal
            const originalDispose = this.carbine.dispose;
            let disposeCallCount = 0;
            this.carbine.dispose = function() {
                disposeCallCount++;
                return originalDispose.call(this);
            };
            
            this.carbine.dispose();
            this.addTestResult(
                'Disposal Method',
                disposeCallCount === 1,
                disposeCallCount === 1 ? 'Disposal method called' : 'Disposal method not called'
            );
            
        } catch (error) {
            this.addTestResult('Weapon State', false, `Error: ${error.message}`);
        }
    }

    /**
     * Add a test result
     */
    addTestResult(testName, passed, details) {
        const result = {
            name: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${testName}: ${details}`);
    }

    /**
     * Report test results summary
     */
    reportResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n=== Carbine Weapon Test Results ===');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n=== Failed Tests ===');
            this.testResults
                .filter(r => !r.passed)
                .forEach(result => {
                    console.log(`❌ ${result.name}: ${result.details}`);
                });
        }
        
        console.log('\n=== Test Suite Complete ===');
    }

    /**
     * Cleanup test environment
     */
    cleanup() {
        try {
            if (this.carbine) {
                // Don't call dispose again if already called in tests
                this.carbine = null;
            }
            
            if (this.effectsManager) {
                this.effectsManager.dispose();
                this.effectsManager = null;
            }
            
            if (this.accuracySystem) {
                this.accuracySystem.dispose();
                this.accuracySystem = null;
            }
            
            if (this.raycastManager) {
                this.raycastManager.dispose();
                this.raycastManager = null;
            }
            
            if (this.scene) {
                this.scene.dispose();
                this.scene = null;
            }
            
            console.log('Test cleanup complete');
            
        } catch (error) {
            console.warn('Error during test cleanup:', error);
        }
    }
}

// Export for use in other test files or manual testing
export default CarbineTest;

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location && window.location.search.includes('test=carbine')) {
    const test = new CarbineTest();
    test.runAllTests().then(results => {
        console.log('Carbine tests completed:', results);
    });
}