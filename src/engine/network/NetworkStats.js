/**
 * NetworkStats - Handles network statistics and diagnostics
 * Tracks ping, packet loss, bandwidth usage, and connection quality
 */

export class NetworkStats {
    constructor() {
        // Statistics
        this.stats = {
            ping: 0,
            packetLoss: 0,
            bytesReceived: 0,
            bytesSent: 0,
            messagesReceived: 0,
            messagesSent: 0,
            lastPingTime: 0,
            connectionTime: 0,
            uptime: 0
        };
        
        // Ping monitoring
        this.pingInterval = null;
        this.pingHistory = [];
        this.maxPingHistory = 100;
        
        // Packet loss tracking
        this.sentPackets = new Map();
        this.packetTimeout = 5000; // 5 seconds
        
        // Bandwidth tracking
        this.bandwidthSamples = [];
        this.maxBandwidthSamples = 60; // 1 minute at 1 sample per second
        this.lastBandwidthUpdate = 0;
        
        // Connection quality
        this.connectionQuality = 'unknown'; // 'excellent', 'good', 'fair', 'poor', 'unknown'
    }

    /**
     * Start ping monitoring
     * @param {Function} sendPing - Function to send ping messages
     * @param {number} interval - Ping interval in milliseconds (default: 5000)
     */
    startPingMonitoring(sendPing, interval = 5000) {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            const timestamp = Date.now();
            sendPing({ timestamp });
            
            // Track sent packet for packet loss calculation
            this.trackSentPacket(`ping_${timestamp}`, timestamp);
        }, interval);
        
        console.log('Ping monitoring started');
    }

    /**
     * Stop ping monitoring
     */
    stopPingMonitoring() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        console.log('Ping monitoring stopped');
    }

    /**
     * Handle pong response
     * @param {Object} data - Pong data with timestamp
     */
    handlePong(data) {
        const now = Date.now();
        const ping = now - data.timestamp;
        
        this.stats.ping = ping;
        this.stats.lastPingTime = now;
        
        // Add to ping history
        this.pingHistory.push({
            ping: ping,
            timestamp: now
        });
        
        // Limit history size
        if (this.pingHistory.length > this.maxPingHistory) {
            this.pingHistory.shift();
        }
        
        // Mark packet as received
        this.trackReceivedPacket(`ping_${data.timestamp}`);
        
        // Update connection quality
        this.updateConnectionQuality();
    }

    /**
     * Track a sent packet for packet loss calculation
     * @param {string} packetId - Unique packet identifier
     * @param {number} timestamp - Send timestamp
     */
    trackSentPacket(packetId, timestamp) {
        this.sentPackets.set(packetId, timestamp);
        this.stats.messagesSent++;
    }

    /**
     * Track a received packet
     * @param {string} packetId - Unique packet identifier
     */
    trackReceivedPacket(packetId) {
        if (this.sentPackets.has(packetId)) {
            this.sentPackets.delete(packetId);
            this.stats.messagesReceived++;
        }
    }

    /**
     * Update bandwidth statistics
     * @param {number} bytesReceived - Bytes received since last update
     * @param {number} bytesSent - Bytes sent since last update
     */
    updateBandwidth(bytesReceived = 0, bytesSent = 0) {
        const now = Date.now();
        
        this.stats.bytesReceived += bytesReceived;
        this.stats.bytesSent += bytesSent;
        
        // Sample bandwidth every second
        if (now - this.lastBandwidthUpdate >= 1000) {
            const sample = {
                timestamp: now,
                bytesReceived: bytesReceived,
                bytesSent: bytesSent,
                totalReceived: this.stats.bytesReceived,
                totalSent: this.stats.bytesSent
            };
            
            this.bandwidthSamples.push(sample);
            
            // Limit sample history
            if (this.bandwidthSamples.length > this.maxBandwidthSamples) {
                this.bandwidthSamples.shift();
            }
            
            this.lastBandwidthUpdate = now;
        }
    }

    /**
     * Calculate packet loss percentage
     * @returns {number} Packet loss percentage (0-100)
     */
    calculatePacketLoss() {
        const now = Date.now();
        let lostPackets = 0;
        let totalPackets = this.stats.messagesSent;
        
        // Count timed out packets
        for (const [packetId, timestamp] of this.sentPackets) {
            if (now - timestamp > this.packetTimeout) {
                lostPackets++;
                this.sentPackets.delete(packetId); // Clean up old packets
            }
        }
        
        if (totalPackets === 0) return 0;
        
        const packetLoss = (lostPackets / totalPackets) * 100;
        this.stats.packetLoss = Math.min(packetLoss, 100);
        
        return this.stats.packetLoss;
    }

    /**
     * Get average ping from history
     * @param {number} samples - Number of recent samples to average (default: 10)
     * @returns {number} Average ping in milliseconds
     */
    getAveragePing(samples = 10) {
        if (this.pingHistory.length === 0) return 0;
        
        const recentPings = this.pingHistory.slice(-samples);
        const sum = recentPings.reduce((total, entry) => total + entry.ping, 0);
        
        return Math.round(sum / recentPings.length);
    }

    /**
     * Get current bandwidth usage
     * @returns {Object} Bandwidth information
     */
    getBandwidthUsage() {
        if (this.bandwidthSamples.length < 2) {
            return {
                downloadSpeed: 0,
                uploadSpeed: 0,
                totalDownload: this.stats.bytesReceived,
                totalUpload: this.stats.bytesSent
            };
        }
        
        const recent = this.bandwidthSamples.slice(-10); // Last 10 seconds
        const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
        
        if (timeSpan === 0) return { downloadSpeed: 0, uploadSpeed: 0 };
        
        const downloadBytes = recent[recent.length - 1].totalReceived - recent[0].totalReceived;
        const uploadBytes = recent[recent.length - 1].totalSent - recent[0].totalSent;
        
        return {
            downloadSpeed: Math.round((downloadBytes / timeSpan) * 1000), // bytes per second
            uploadSpeed: Math.round((uploadBytes / timeSpan) * 1000), // bytes per second
            totalDownload: this.stats.bytesReceived,
            totalUpload: this.stats.bytesSent
        };
    }

    /**
     * Update connection quality based on current metrics
     */
    updateConnectionQuality() {
        const ping = this.stats.ping;
        const packetLoss = this.calculatePacketLoss();
        
        if (ping < 50 && packetLoss < 1) {
            this.connectionQuality = 'excellent';
        } else if (ping < 100 && packetLoss < 3) {
            this.connectionQuality = 'good';
        } else if (ping < 200 && packetLoss < 5) {
            this.connectionQuality = 'fair';
        } else {
            this.connectionQuality = 'poor';
        }
    }

    /**
     * Get connection quality
     * @returns {string} Connection quality rating
     */
    getConnectionQuality() {
        return this.connectionQuality;
    }

    /**
     * Get comprehensive network statistics
     * @returns {Object} Complete network statistics
     */
    getStats() {
        const bandwidth = this.getBandwidthUsage();
        
        return {
            ...this.stats,
            averagePing: this.getAveragePing(),
            packetLoss: this.calculatePacketLoss(),
            connectionQuality: this.connectionQuality,
            bandwidth: bandwidth,
            uptime: this.stats.connectionTime ? Date.now() - this.stats.connectionTime : 0
        };
    }

    /**
     * Set connection start time
     * @param {number} timestamp - Connection timestamp
     */
    setConnectionTime(timestamp) {
        this.stats.connectionTime = timestamp;
    }

    /**
     * Reset all statistics
     */
    reset() {
        this.stats = {
            ping: 0,
            packetLoss: 0,
            bytesReceived: 0,
            bytesSent: 0,
            messagesReceived: 0,
            messagesSent: 0,
            lastPingTime: 0,
            connectionTime: 0,
            uptime: 0
        };
        
        this.pingHistory = [];
        this.sentPackets.clear();
        this.bandwidthSamples = [];
        this.connectionQuality = 'unknown';
    }

    /**
     * Update method called from game loop
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Clean up old sent packets
        const now = Date.now();
        for (const [packetId, timestamp] of this.sentPackets) {
            if (now - timestamp > this.packetTimeout * 2) {
                this.sentPackets.delete(packetId);
            }
        }
        
        // Update uptime
        if (this.stats.connectionTime) {
            this.stats.uptime = now - this.stats.connectionTime;
        }
    }

    /**
     * Dispose of the stats tracker
     */
    dispose() {
        this.stopPingMonitoring();
        this.reset();
    }
}