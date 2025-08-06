/**
 * NameGenerator - Utility class for generating random player names
 * Generates unique names like "ShadowKiller", "DeathStrike", etc.
 */

export class NameGenerator {
    /**
     * Name parts for generating random combinations
     */
    static NAME_PARTS = {
        prefixes: [
            "Shadow", "Death", "Dark", "Blood", "Steel", "Fire", "Ice", "Storm",
            "Night", "Ghost", "Void", "Frost", "Rage", "Venom", "Thunder", "Crimson",
            "Silent", "Swift", "Brutal", "Savage", "Phantom", "Demon", "Angel", "Cyber"
        ],
        suffixes: [
            "Killer", "Strike", "Blade", "Wolf", "Hawk", "Viper", "Reaper", "Hunter",
            "Warrior", "Slayer", "Assassin", "Sniper", "Destroyer", "Phantom", "Beast", "Fury",
            "Shadow", "Storm", "Fire", "Ice", "Death", "Rage", "Venom", "Thunder"
        ]
    };

    /**
     * Maximum name length allowed
     */
    static MAX_NAME_LENGTH = 20;

    /**
     * Minimum name length allowed
     */
    static MIN_NAME_LENGTH = 1;

    /**
     * Generate a random name by combining prefix and suffix
     * @returns {string} Generated random name
     */
    static generateRandomName() {
        const prefixes = this.NAME_PARTS.prefixes;
        const suffixes = this.NAME_PARTS.suffixes;
        
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return randomPrefix + randomSuffix;
    }

    /**
     * Check if a name is available (not in the used names list)
     * @param {string} name - Name to check
     * @param {Array<string>} usedNames - Array of already used names
     * @returns {boolean} True if name is available
     */
    static isNameAvailable(name, usedNames = []) {
        if (!name || typeof name !== 'string') {
            return false;
        }
        
        // Convert to lowercase for case-insensitive comparison
        const normalizedName = name.toLowerCase().trim();
        const normalizedUsedNames = usedNames.map(usedName => 
            typeof usedName === 'string' ? usedName.toLowerCase().trim() : ''
        );
        
        return !normalizedUsedNames.includes(normalizedName);
    }

    /**
     * Validate a name according to game rules
     * @param {string} name - Name to validate
     * @returns {Object} Validation result with isValid boolean and error message
     */
    static validateName(name) {
        // Check if name exists
        if (!name || typeof name !== 'string') {
            return {
                isValid: false,
                error: 'Name is required'
            };
        }

        const trimmedName = name.trim();

        // Check length constraints
        if (trimmedName.length < this.MIN_NAME_LENGTH) {
            return {
                isValid: false,
                error: `Name must be at least ${this.MIN_NAME_LENGTH} character long`
            };
        }

        if (trimmedName.length > this.MAX_NAME_LENGTH) {
            return {
                isValid: false,
                error: `Name must be no more than ${this.MAX_NAME_LENGTH} characters long`
            };
        }

        // Check for valid characters (alphanumeric and basic symbols)
        const validCharacterPattern = /^[a-zA-Z0-9_-]+$/;
        if (!validCharacterPattern.test(trimmedName)) {
            return {
                isValid: false,
                error: 'Name can only contain letters, numbers, underscores, and hyphens'
            };
        }

        return {
            isValid: true,
            error: null
        };
    }

    /**
     * Generate a unique random name that's not in the used names list
     * @param {Array<string>} usedNames - Array of already used names
     * @param {number} maxAttempts - Maximum attempts to generate unique name
     * @returns {string} Unique generated name
     */
    static generateUniqueRandomName(usedNames = [], maxAttempts = 50) {
        let attempts = 0;
        let generatedName;

        do {
            generatedName = this.generateRandomName();
            attempts++;
        } while (!this.isNameAvailable(generatedName, usedNames) && attempts < maxAttempts);

        // If we couldn't generate a unique name, append a number
        if (!this.isNameAvailable(generatedName, usedNames)) {
            let counter = 1;
            let baseName = generatedName;
            
            do {
                generatedName = `${baseName}${counter}`;
                counter++;
            } while (!this.isNameAvailable(generatedName, usedNames) && counter < 1000);
        }

        return generatedName;
    }

    /**
     * Get all available name parts for external use
     * @returns {Object} Object containing prefixes and suffixes arrays
     */
    static getNameParts() {
        return {
            prefixes: [...this.NAME_PARTS.prefixes],
            suffixes: [...this.NAME_PARTS.suffixes]
        };
    }

    /**
     * Get random name parts for custom name generation
     * @returns {Object} Object with random prefix and suffix
     */
    static getRandomNameParts() {
        const prefixes = this.NAME_PARTS.prefixes;
        const suffixes = this.NAME_PARTS.suffixes;
        
        return {
            prefix: prefixes[Math.floor(Math.random() * prefixes.length)],
            suffix: suffixes[Math.floor(Math.random() * suffixes.length)]
        };
    }

    /**
     * Validate and sanitize a name for use in the game
     * @param {string} name - Name to sanitize
     * @param {Array<string>} usedNames - Array of already used names
     * @returns {Object} Result with sanitized name and validation info
     */
    static sanitizeAndValidateName(name, usedNames = []) {
        if (!name || typeof name !== 'string') {
            return {
                isValid: false,
                sanitizedName: null,
                error: 'Name is required'
            };
        }

        // Basic sanitization
        const sanitizedName = name.trim();

        // Validate the sanitized name
        const validation = this.validateName(sanitizedName);
        if (!validation.isValid) {
            return {
                isValid: false,
                sanitizedName: null,
                error: validation.error
            };
        }

        // Check availability
        if (!this.isNameAvailable(sanitizedName, usedNames)) {
            return {
                isValid: false,
                sanitizedName: null,
                error: 'Name is already in use'
            };
        }

        return {
            isValid: true,
            sanitizedName: sanitizedName,
            error: null
        };
    }
}