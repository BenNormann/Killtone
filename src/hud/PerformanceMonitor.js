/**
 * KILLtONE Game Framework - Performance Monitor
 * Tracks performance metrics and automatically adjusts quality settings
 */

import { GameConfig } from '../mainConfig.js';

export class PerformanceMonitor {
    constructor(game) {
        this.game = game;
        this.engine = game.engine;
        this.scene = game.scene;
        
        // Performance metrics
        this.fps = 0;
        this.frameTime = 0;
        this.memoryUsage = 0;
        this.drawCalls = 0;
        this.triangleCount = 0;
        
        // FPS tracking
        this.fpsHistory = [];
        this.fpsHistorySize = 60; // Track last 60 frames
        this.lastFrameTime = performance.now();
        
        // Memory tracking
        this.memoryHistory = [];
        this.memoryHistorySize = 30; // Track last 30 seconds
        this.lastMemoryCheck = performance.now();
        this.memoryCheckInterval = 1000; // Check memory every second
        
        // Performance thresholds
        this.targetFPS = GameConfig.performance.targetFPS;
        this.minFPS = this.targetFPS * 0.8; // 80% of target FPS
        this.maxMemoryMB = GameConfig.performance.memoryLimit;
        
        // Quality adjustment
        this.adaptiveQuality = GameConfig.performance.adaptiveQuality;
        this.currentQuality = GameConfig.graphics.quality;
        this.qualityLevels = ['low', 'medium', 'high', 'ultra'];
        this.lastQualityAdjustment = 0;
        this.qualityAdjustmentCooldown = 5000; // 5 seconds between adjustments
        
        // Performance warnings
        this.performanceWarnings = [];
        this.maxWarnings = 10;
        
        // Babylon.js instrumentation
        this.sceneInstrumentation = null;
        this.engineInstrumentation = null;
        
        // Event callbacks
        this.onPerformanceWarning = null;
        this.onQualityAdjustment = null;
        this.onMemoryWarning = null;
        
        // Debug display
        this.debugDisplay = null;
        this.showDebugInfo = GameConfig.debug.showFPS || GameConfig.debug.showMemory;
        
        this.initialize();
    }
    
    initialize() {
        // Initialize Babylon.js instrumentation
        if (this.scene && BABYLON.SceneInstrumentation) {
            this.sceneInstrumentation = new BABYLON.SceneInstrumentation(this.scene);
            this.sceneInstrumentation.captureFrameTime = true;
            this.sceneInstrumentation.captureRenderTime = true;
            this.sceneInstrumentation.captureInterFrameTime = true;
        }
        
        if (this.engine && BABYLON.EngineInstrumentation) {
            this.engineInstrumentation = new BABYLON.EngineInstrumentation(this.engine);
            this.engineInstrumentation.captureGPUFrameTime = true;
        }
        
        // Create debug display if needed
        if (this.showDebugInfo) {
            this.createDebugDisplay();
        }
        
        console.log('PerformanceMonitor initialized');
    }
    
    update(deltaTime) {
        const now = performance.now();
        
        // Update FPS
        this.updateFPS(now, deltaTime);
        
        // Update memory usage (less frequently)
        if (now - this.lastMemoryCheck > this.memoryCheckInterval) {
            this.updateMemoryUsage();
            this.lastMemoryCheck = now;
        }
        
        // Update render statistics
        this.updateRenderStats();
        
        // Check for performance issues
        this.checkPerformance();
        
        // Update debug display
        if (this.debugDisplay) {
            this.updateDebugDisplay();
        }
    }
    
    updateFPS(now, deltaTime) {
        // Calculate current FPS
        this.frameTime = deltaTime * 1000; // Convert to milliseconds
        this.fps = deltaTime > 0 ? 1 / deltaTime : 0;
        
        // Add to history
        this.fpsHistory.push(this.fps);
        if (this.fpsHistory.length > this.fpsHistorySize) {
            this.fpsHistory.shift();
        }
        
        this.lastFrameTime = now;
    }
    
    updateMemoryUsage() {
        // Get memory usage if available
        if (performance.memory) {
            const memoryInfo = performance.memory;
            this.memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
            
            // Add to history
            this.memoryHistory.push(this.memoryUsage);
            if (this.memoryHistory.length > this.memoryHistorySize) {
                this.memoryHistory.shift();
            }
        }
    }
    
    updateRenderStats() {
        if (this.scene) {
            // Get render statistics from Babylon.js
            this.drawCalls = this.scene.getEngine().drawCalls;
            this.triangleCount = this.scene.getEngine().drawCallsPerfCounter ? 
                this.scene.getEngine().drawCallsPerfCounter.current : 0;
        }
    }
    
    checkPerformance() {
        const now = performance.now();
        
        // Check FPS performance
        if (this.fpsHistory.length >= 30) { // Need at least 30 frames for reliable average
            const avgFPS = this.getAverageFPS();
            
            if (avgFPS < this.minFPS && this.adaptiveQuality) {
                this.handleLowFPS(avgFPS);
            }
        }
        
        // Check memory usage
        if (this.memoryUsage > this.maxMemoryMB * 0.9) { // 90% of limit
            this.handleHighMemoryUsage();
        }
        
        // Check for frame time spikes
        if (this.frameTime > 50) { // Frame took longer than 50ms (20 FPS)
            this.addPerformanceWarning('Frame time spike', this.frameTime);
        }
    }
    
    handleLowFPS(avgFPS) {
        const now = performance.now();
        
        // Cooldown check
        if (now - this.lastQualityAdjustment < this.qualityAdjustmentCooldown) {
            return;
        }
        
        // Try to reduce quality
        const currentIndex = this.qualityLevels.indexOf(this.currentQuality);
        if (currentIndex > 0) {
            const newQuality = this.qualityLevels[currentIndex - 1];
            this.adjustQuality(newQuality, `Low FPS detected: ${avgFPS.toFixed(1)}`);
            this.lastQualityAdjustment = now;
        } else {
            // Already at lowest quality, add warning
            this.addPerformanceWarning('Low FPS at minimum quality', avgFPS);
        }
    }
    
    handleHighMemoryUsage() {
        this.addPerformanceWarning('High memory usage', this.memoryUsage);
        
        // Trigger memory cleanup if callback is set
        if (this.onMemoryWarning) {
            this.onMemoryWarning(this.memoryUsage);
        }
        
        // Suggest garbage collection
        if (window.gc) {
            window.gc();
        }
    }
    
    adjustQuality(newQuality, reason) {
        const oldQuality = this.currentQuality;
        this.currentQuality = newQuality;
        
        // Update game config
        GameConfig.graphics.quality = newQuality;
        
        // Apply quality settings
        this.applyQualitySettings(newQuality);
        
        console.log(`Quality adjusted from ${oldQuality} to ${newQuality}: ${reason}`);
        
        // Trigger callback
        if (this.onQualityAdjustment) {
            this.onQualityAdjustment(oldQuality, newQuality, reason);
        }
    }
    
    applyQualitySettings(quality) {
        if (!this.scene) return;
        
        const settings = this.getQualitySettings(quality);
        
        // Apply render settings
        if (this.engine) {
            this.engine.setHardwareScalingLevel(settings.renderScale);
        }
        
        // Apply particle settings
        const particleSystems = this.scene.particleSystems;
        particleSystems.forEach(system => {
            if (system.emitRate) {
                system.emitRate = system.emitRate * settings.particleScale;
            }
        });
        
        // Apply shadow settings
        const lights = this.scene.lights;
        lights.forEach(light => {
            if (light.shadowGenerator) {
                light.shadowGenerator.mapSize = settings.shadowMapSize;
            }
        });
        
        // Apply post-processing settings
        if (settings.postProcessing === false) {
            // Disable post-processing effects
            const cameras = this.scene.cameras;
            cameras.forEach(camera => {
                if (camera.postProcesses) {
                    camera.postProcesses.forEach(pp => pp.setEnabled(false));
                }
            });
        }
    }
    
    getQualitySettings(quality) {
        const settings = {
            low: {
                renderScale: 0.75,
                particleScale: 0.5,
                shadowMapSize: 512,
                postProcessing: false,
                antialiasing: false
            },
            medium: {
                renderScale: 0.85,
                particleScale: 0.75,
                shadowMapSize: 1024,
                postProcessing: true,
                antialiasing: false
            },
            high: {
                renderScale: 1.0,
                particleScale: 1.0,
                shadowMapSize: 2048,
                postProcessing: true,
                antialiasing: true
            },
            ultra: {
                renderScale: 1.0,
                particleScale: 1.5,
                shadowMapSize: 4096,
                postProcessing: true,
                antialiasing: true
            }
        };
        
        return settings[quality] || settings.medium;
    }
    
    addPerformanceWarning(type, value) {
        const warning = {
            type,
            value,
            timestamp: performance.now()
        };
        
        this.performanceWarnings.push(warning);
        
        // Keep only recent warnings
        if (this.performanceWarnings.length > this.maxWarnings) {
            this.performanceWarnings.shift();
        }
        
        // Trigger callback
        if (this.onPerformanceWarning) {
            this.onPerformanceWarning(warning);
        }
        
        console.warn(`Performance warning: ${type} - ${value}`);
    }
    
    createDebugDisplay() {
        if (!this.scene || !BABYLON.GUI) return;
        
        // Create GUI texture
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("PerformanceDebug");
        
        // Create container
        const container = new BABYLON.GUI.Rectangle();
        container.widthInPixels = 300;
        container.heightInPixels = 150;
        container.cornerRadius = 10;
        container.color = GameConfig.theme.colors.border;
        container.thickness = 2;
        container.background = GameConfig.theme.colors.backgroundPanel;
        container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        container.topInPixels = 10;
        container.rightInPixels = 10;
        
        // Create text block
        const textBlock = new BABYLON.GUI.TextBlock();
        textBlock.text = "Performance Monitor";
        textBlock.color = GameConfig.theme.colors.textPrimary;
        textBlock.fontSize = 14;
        textBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        textBlock.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        textBlock.paddingTopInPixels = 10;
        textBlock.paddingLeftInPixels = 10;
        
        container.addControl(textBlock);
        advancedTexture.addControl(container);
        
        this.debugDisplay = {
            container,
            textBlock,
            advancedTexture
        };
    }
    
    updateDebugDisplay() {
        if (!this.debugDisplay) return;
        
        const avgFPS = this.getAverageFPS();
        const memoryMB = this.memoryUsage.toFixed(1);
        const frameTimeMs = this.frameTime.toFixed(1);
        
        let debugText = `FPS: ${avgFPS.toFixed(1)} (${this.targetFPS} target)\n`;
        debugText += `Frame Time: ${frameTimeMs}ms\n`;
        debugText += `Memory: ${memoryMB}MB / ${this.maxMemoryMB}MB\n`;
        debugText += `Quality: ${this.currentQuality}\n`;
        debugText += `Draw Calls: ${this.drawCalls}\n`;
        
        if (this.performanceWarnings.length > 0) {
            const recentWarning = this.performanceWarnings[this.performanceWarnings.length - 1];
            debugText += `Warning: ${recentWarning.type}`;
        }
        
        this.debugDisplay.textBlock.text = debugText;
    }
    
    // Public API methods
    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 0;
        const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
        return sum / this.fpsHistory.length;
    }
    
    getAverageMemoryUsage() {
        if (this.memoryHistory.length === 0) return 0;
        const sum = this.memoryHistory.reduce((a, b) => a + b, 0);
        return sum / this.memoryHistory.length;
    }
    
    getCurrentMetrics() {
        return {
            fps: this.fps,
            averageFPS: this.getAverageFPS(),
            frameTime: this.frameTime,
            memoryUsage: this.memoryUsage,
            averageMemoryUsage: this.getAverageMemoryUsage(),
            drawCalls: this.drawCalls,
            triangleCount: this.triangleCount,
            quality: this.currentQuality,
            warnings: this.performanceWarnings.length
        };
    }
    
    forceQualityLevel(quality) {
        if (this.qualityLevels.includes(quality)) {
            this.adjustQuality(quality, 'Manual quality adjustment');
        }
    }
    
    enableAdaptiveQuality(enabled = true) {
        this.adaptiveQuality = enabled;
        console.log(`Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    setTargetFPS(fps) {
        this.targetFPS = fps;
        this.minFPS = fps * 0.8;
        console.log(`Target FPS set to ${fps}`);
    }
    
    clearWarnings() {
        this.performanceWarnings = [];
    }
    
    dispose() {
        // Clean up instrumentation
        if (this.sceneInstrumentation) {
            this.sceneInstrumentation.dispose();
        }
        
        if (this.engineInstrumentation) {
            this.engineInstrumentation.dispose();
        }
        
        // Clean up debug display
        if (this.debugDisplay) {
            this.debugDisplay.advancedTexture.dispose();
        }
        
        // Clear arrays
        this.fpsHistory = [];
        this.memoryHistory = [];
        this.performanceWarnings = [];
        
        console.log('PerformanceMonitor disposed');
    }
}

export default PerformanceMonitor;