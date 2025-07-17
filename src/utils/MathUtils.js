/**
 * MathUtils - Mathematical utility functions used across the codebase
 * Consolidates mathematical operations and calculations
 */

export class MathUtils {
    /**
     * Mathematical constants
     */
    static get PI() { return Math.PI; }
    static get TWO_PI() { return Math.PI * 2; }
    static get HALF_PI() { return Math.PI / 2; }
    static get DEG_TO_RAD() { return Math.PI / 180; }
    static get RAD_TO_DEG() { return 180 / Math.PI; }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    static degToRad(degrees) {
        return degrees * this.DEG_TO_RAD;
    }

    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    static radToDeg(radians) {
        return radians * this.RAD_TO_DEG;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    }

    /**
     * Smooth step interpolation (S-curve)
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smooth step result
     */
    static smoothStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    /**
     * Calculate distance between two 2D points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance between points
     */
    static distance2D(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate distance between two 3D points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} z1 - First point Z
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @param {number} z2 - Second point Z
     * @returns {number} Distance between points
     */
    static distance3D(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Calculate squared distance (faster than distance for comparisons)
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Squared distance
     */
    static distanceSquared2D(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    /**
     * Calculate squared distance in 3D
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} z1 - First point Z
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @param {number} z2 - Second point Z
     * @returns {number} Squared distance
     */
    static distanceSquared3D(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Normalize a 2D vector
     * @param {number} x - Vector X component
     * @param {number} y - Vector Y component
     * @returns {Object} Normalized vector {x, y}
     */
    static normalize2D(x, y) {
        const length = Math.sqrt(x * x + y * y);
        if (length === 0) return { x: 0, y: 0 };
        return { x: x / length, y: y / length };
    }

    /**
     * Normalize a 3D vector
     * @param {number} x - Vector X component
     * @param {number} y - Vector Y component
     * @param {number} z - Vector Z component
     * @returns {Object} Normalized vector {x, y, z}
     */
    static normalize3D(x, y, z) {
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        return { x: x / length, y: y / length, z: z / length };
    }

    /**
     * Calculate dot product of two 2D vectors
     * @param {number} x1 - First vector X
     * @param {number} y1 - First vector Y
     * @param {number} x2 - Second vector X
     * @param {number} y2 - Second vector Y
     * @returns {number} Dot product
     */
    static dot2D(x1, y1, x2, y2) {
        return x1 * x2 + y1 * y2;
    }

    /**
     * Calculate dot product of two 3D vectors
     * @param {number} x1 - First vector X
     * @param {number} y1 - First vector Y
     * @param {number} z1 - First vector Z
     * @param {number} x2 - Second vector X
     * @param {number} y2 - Second vector Y
     * @param {number} z2 - Second vector Z
     * @returns {number} Dot product
     */
    static dot3D(x1, y1, z1, x2, y2, z2) {
        return x1 * x2 + y1 * y2 + z1 * z2;
    }

    /**
     * Calculate cross product of two 3D vectors
     * @param {number} x1 - First vector X
     * @param {number} y1 - First vector Y
     * @param {number} z1 - First vector Z
     * @param {number} x2 - Second vector X
     * @param {number} y2 - Second vector Y
     * @param {number} z2 - Second vector Z
     * @returns {Object} Cross product vector {x, y, z}
     */
    static cross3D(x1, y1, z1, x2, y2, z2) {
        return {
            x: y1 * z2 - z1 * y2,
            y: z1 * x2 - x1 * z2,
            z: x1 * y2 - y1 * x2
        };
    }

    /**
     * Calculate angle between two 2D vectors
     * @param {number} x1 - First vector X
     * @param {number} y1 - First vector Y
     * @param {number} x2 - Second vector X
     * @param {number} y2 - Second vector Y
     * @returns {number} Angle in radians
     */
    static angleBetween2D(x1, y1, x2, y2) {
        const dot = this.dot2D(x1, y1, x2, y2);
        const mag1 = Math.sqrt(x1 * x1 + y1 * y1);
        const mag2 = Math.sqrt(x2 * x2 + y2 * y2);
        
        if (mag1 === 0 || mag2 === 0) return 0;
        
        const cosAngle = this.clamp(dot / (mag1 * mag2), -1, 1);
        return Math.acos(cosAngle);
    }

    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    static random(min = 0, max = 1) {
        return min + Math.random() * (max - min);
    }

    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    static randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }

    /**
     * Generate random point within a circle
     * @param {number} radius - Circle radius
     * @returns {Object} Random point {x, y}
     */
    static randomPointInCircle(radius = 1) {
        const angle = this.random(0, this.TWO_PI);
        const r = Math.sqrt(this.random()) * radius;
        return {
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r
        };
    }

    /**
     * Generate random point on circle circumference
     * @param {number} radius - Circle radius
     * @returns {Object} Random point {x, y}
     */
    static randomPointOnCircle(radius = 1) {
        const angle = this.random(0, this.TWO_PI);
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    }

    /**
     * Generate random point within a sphere
     * @param {number} radius - Sphere radius
     * @returns {Object} Random point {x, y, z}
     */
    static randomPointInSphere(radius = 1) {
        const u = this.random();
        const v = this.random();
        const theta = this.TWO_PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(this.random()) * radius;
        
        const sinPhi = Math.sin(phi);
        return {
            x: r * sinPhi * Math.cos(theta),
            y: r * sinPhi * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }

    /**
     * Check if a point is within a rectangle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} rx - Rectangle X
     * @param {number} ry - Rectangle Y
     * @param {number} rw - Rectangle width
     * @param {number} rh - Rectangle height
     * @returns {boolean} True if point is within rectangle
     */
    static pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }

    /**
     * Check if a point is within a circle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} radius - Circle radius
     * @returns {boolean} True if point is within circle
     */
    static pointInCircle(px, py, cx, cy, radius) {
        return this.distanceSquared2D(px, py, cx, cy) <= radius * radius;
    }

    /**
     * Round number to specified decimal places
     * @param {number} value - Number to round
     * @param {number} decimals - Number of decimal places
     * @returns {number} Rounded number
     */
    static round(value, decimals = 0) {
        const multiplier = Math.pow(10, decimals);
        return Math.round(value * multiplier) / multiplier;
    }

    /**
     * Check if two numbers are approximately equal
     * @param {number} a - First number
     * @param {number} b - Second number
     * @param {number} epsilon - Tolerance (default: 1e-6)
     * @returns {boolean} True if numbers are approximately equal
     */
    static approximately(a, b, epsilon = 1e-6) {
        return Math.abs(a - b) < epsilon;
    }

    /**
     * Map a value from one range to another
     * @param {number} value - Input value
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    static map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }
}

export default MathUtils;