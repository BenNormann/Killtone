/**
 * KILLtONE Game Framework - Player Utilities
 * Shared utility functions for Player and RemotePlayer classes
 */

export class PlayerUtils {
    /**
     * Get player position from a player instance
     * @param {Object} player - Player or RemotePlayer instance
     * @returns {BABYLON.Vector3} Cloned position vector
     */
    static getPosition(player) {
        if (!player || !player.position) {
            console.warn('PlayerUtils.getPosition: Invalid player or missing position');
            return new BABYLON.Vector3(0, 0, 0);
        }
        return player.position.clone();
    }

    /**
     * Check if a player is alive
     * @param {Object} player - Player or RemotePlayer instance
     * @returns {boolean} True if player is alive
     */
    static isPlayerAlive(player) {
        if (!player) {
            console.warn('PlayerUtils.isPlayerAlive: Invalid player');
            return false;
        }
        return player.isAlive === true;
    }

    /**
     * Calculate distance between two players
     * @param {Object} player1 - First player instance
     * @param {Object} player2 - Second player instance
     * @returns {number} Distance between players
     */
    static getDistanceBetweenPlayers(player1, player2) {
        if (!player1 || !player2) {
            console.warn('PlayerUtils.getDistanceBetweenPlayers: Invalid players');
            return Infinity;
        }

        const pos1 = PlayerUtils.getPosition(player1);
        const pos2 = PlayerUtils.getPosition(player2);

        return BABYLON.Vector3.Distance(pos1, pos2);
    }

    /**
     * Get player health percentage
     * @param {Object} player - Player instance
     * @returns {number} Health percentage (0-1)
     */
    static getHealthPercentage(player) {
        if (!player || typeof player.health !== 'number' || typeof player.maxHealth !== 'number') {
            console.warn('PlayerUtils.getHealthPercentage: Invalid player or health data');
            return 0;
        }
        return Math.max(0, Math.min(1, player.health / player.maxHealth));
    }

    /**
     * Check if player is at low health
     * @param {Object} player - Player instance
     * @param {number} threshold - Health threshold (default 0.3)
     * @returns {boolean} True if player health is below threshold
     */
    static isLowHealth(player, threshold = 0.3) {
        return PlayerUtils.getHealthPercentage(player) < threshold;
    }

    /**
     * Validate player data structure
     * @param {Object} player - Player instance to validate
     * @returns {boolean} True if player has required properties
     */
    static validatePlayer(player) {
        if (!player) return false;

        const requiredProps = ['position', 'isAlive', 'health'];
        return requiredProps.every(prop => player.hasOwnProperty(prop));
    }

    /**
     * Get player display name
     * @param {Object} player - Player instance
     * @returns {string} Display name for the player
     */
    static getDisplayName(player) {
        if (!player) return 'Unknown Player';

        // For RemotePlayer, use username
        if (player.username) {
            return player.username;
        }

        // For local Player, use a default name or ID
        if (player.id) {
            return `Player ${player.id.slice(-4)}`;
        }

        return 'Local Player';
    }

    /**
     * Check if player is within interaction range of a position
     * @param {Object} player - Player instance
     * @param {BABYLON.Vector3} targetPosition - Target position
     * @param {number} maxDistance - Maximum interaction distance
     * @returns {boolean} True if player is within range
     */
    static isWithinRange(player, targetPosition, maxDistance = 5.0) {
        if (!player || !targetPosition) return false;

        const playerPos = PlayerUtils.getPosition(player);
        const distance = BABYLON.Vector3.Distance(playerPos, targetPosition);

        return distance <= maxDistance;
    }

    /**
     * Get player's forward direction vector
     * @param {Object} player - Player instance
     * @returns {BABYLON.Vector3} Forward direction vector
     */
    static getForwardDirection(player) {
        if (!player) {
            return new BABYLON.Vector3(0, 0, 1);
        }

        // For local Player with camera
        if (player.camera && player.camera.getForwardRay) {
            return player.camera.getForwardRay().direction.clone();
        }

        // For RemotePlayer with rotation
        if (player.rotation) {
            // Convert rotation to forward vector
            const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
                player.rotation.y,
                player.rotation.x,
                player.rotation.z
            );
            return BABYLON.Vector3.TransformCoordinates(
                new BABYLON.Vector3(0, 0, 1),
                rotationMatrix
            );
        }

        // Default forward direction
        return new BABYLON.Vector3(0, 0, 1);
    }
}

export default PlayerUtils;