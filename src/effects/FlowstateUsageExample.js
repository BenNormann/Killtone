/**
 * FlowstateUsageExample - Example of how to use the integrated FlowstateAdapter
 * This shows how the existing FlowstateEffects system now integrates with the framework
 */

import Game from '../Game.js';

/**
 * Example of initializing and using the integrated Flowstate system
 */
export async function initializeFlowstateExample(canvas) {
    console.log('FlowstateUsageExample: Initializing game with Flowstate integration...');
    
    // 1. Create the game instance
    const game = new Game(canvas);
    
    // 2. Initialize the core game systems
    await game.initialize();
    
    // 3. Initialize the existing FlowstateManager
    game.initializeFlowstateManager();
    
    // 4. Initialize the FlowstateAdapter integration
    await game.initializeFlowstateIntegration();
    
    // 5. Set up event listeners for flowstate events
    if (game.flowstateAdapter) {
        // Listen for flowstate activation
        game.flowstateAdapter.on('flowstateKill', (data) => {
            console.log(`Flowstate kill! Streak: ${data.killStreak}, Intensity: ${data.intensity}`);
        });
        
        // Listen for flowstate reset
        game.flowstateAdapter.on('flowstateReset', (data) => {
            console.log(`Flowstate reset due to: ${data.reason}`);
        });
        
        // Listen for flowstate state changes
        game.flowstateAdapter.on('flowstateEnabled', () => {
            console.log('Flowstate system enabled');
        });
        
        game.flowstateAdapter.on('flowstatePaused', () => {
            console.log('Flowstate system paused');
        });
    }
    
    // 6. Start the game
    game.start();
    
    console.log('FlowstateUsageExample: Game initialized with Flowstate integration');
    return game;
}

/**
 * Example of simulating player events that trigger flowstate
 */
export function simulateFlowstateEvents(game) {
    if (!game.flowstateAdapter) {
        console.error('FlowstateAdapter not available');
        return;
    }
    
    console.log('FlowstateUsageExample: Simulating flowstate events...');
    
    // Simulate a series of kills to trigger flowstate
    setTimeout(() => {
        console.log('Simulating kill 1...');
        game.flowstateAdapter.onPlayerKill({ 
            killerId: 'player1', 
            victimId: 'enemy1',
            weapon: 'rifle' 
        });
    }, 1000);
    
    setTimeout(() => {
        console.log('Simulating kill 2...');
        game.flowstateAdapter.onPlayerKill({ 
            killerId: 'player1', 
            victimId: 'enemy2',
            weapon: 'rifle' 
        });
    }, 2000);
    
    setTimeout(() => {
        console.log('Simulating kill 3...');
        game.flowstateAdapter.onPlayerKill({ 
            killerId: 'player1', 
            victimId: 'enemy3',
            weapon: 'rifle' 
        });
    }, 3000);
    
    // Simulate player death to reset flowstate
    setTimeout(() => {
        console.log('Simulating player death...');
        game.flowstateAdapter.onPlayerDeath({ 
            playerId: 'player1',
            killerId: 'enemy4',
            weapon: 'sniper' 
        });
    }, 5000);
}

/**
 * Example of checking flowstate status
 */
export function checkFlowstateStatus(game) {
    if (!game.flowstateAdapter) {
        console.error('FlowstateAdapter not available');
        return null;
    }
    
    const status = game.flowstateAdapter.getFlowstateStatus();
    console.log('Current Flowstate Status:', status);
    
    return status;
}

/**
 * Example of manually updating player highlighting
 */
export function updatePlayerHighlighting(game) {
    if (!game.flowstateAdapter) {
        console.error('FlowstateAdapter not available');
        return;
    }
    
    console.log('Manually updating player highlighting...');
    game.flowstateAdapter.updatePlayerHighlighting();
}

/**
 * Complete usage example
 */
export async function runCompleteExample() {
    console.log('=== FlowstateUsageExample: Complete Integration Example ===');
    
    try {
        // Create a mock canvas for the example
        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 800;
        mockCanvas.height = 600;
        
        // Initialize the game with flowstate integration
        const game = await initializeFlowstateExample(mockCanvas);
        
        // Check initial status
        checkFlowstateStatus(game);
        
        // Simulate some flowstate events
        simulateFlowstateEvents(game);
        
        // Set up periodic status checks
        const statusInterval = setInterval(() => {
            checkFlowstateStatus(game);
        }, 1000);
        
        // Clean up after 10 seconds
        setTimeout(() => {
            clearInterval(statusInterval);
            console.log('FlowstateUsageExample: Cleaning up...');
            game.dispose();
            console.log('FlowstateUsageExample: Complete example finished');
        }, 10000);
        
    } catch (error) {
        console.error('FlowstateUsageExample: Example failed:', error);
    }
}

export default {
    initializeFlowstateExample,
    simulateFlowstateEvents,
    checkFlowstateStatus,
    updatePlayerHighlighting,
    runCompleteExample
};