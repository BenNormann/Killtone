/**
 * UIManager - Manages all user interface elements
 * Handles loading screen, main menu, settings overlay, and game HUD
 */

import { GameConfig } from '../mainConfig.js';
import { BaseManager } from './BaseManager.js';
// Dropdowns & weapon selector need weapon data
import WeaponConfigs, { WeaponConstants } from '../entities/weapons/WeaponConfig.js';

export class UIManager extends BaseManager {
    constructor(game) {
        super(game);
        this.engine = game.engine;

        // UI elements
        this.loadingScreen = null;
        this.mainMenu = null;
        this.settingsOverlay = null;
        this.leaderboard = null;
        this.gameHUD = null;
        this.mapEditor = null;

        // GUI textures
        this.fullscreenUI = null;

        // Loading state
        this.loadingProgress = 0;
        this.loadingText = 'Loading...';

        // Settings state
        this.settingsVisible = false;

        // Track which dropdown (if any) is currently open so only one is visible at a time
        this.openDropdown = null;

        // Reference to nametag input field for updates
        this.nametagInput = null;

        // Leaderboard data
        this.latestPlayerData = null;

        // Initialize GUI system
        this._initializeGUI();
        
        // Set up event listeners for name changes
        this._setupEventListeners();
    }

    /**
     * Initialize Babylon.js GUI system
     */
    _initializeGUI() {
        // Create fullscreen UI texture
        this.fullscreenUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        console.log('UIManager initialized');
    }

    /**
     * Set up event listeners for name changes
     */
    _setupEventListeners() {
        // Listen for initial name result from server
        if (this.game && this.game.on) {
            this.game.on('initialNameResult', (data) => {
                console.log('UIManager: Received initial name result:', data);
                this._updateNametagInputFromPlayer();
            });
        }
    }

    /**
     * Show loading screen with progress
     */
    async showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.isVisible = true;
            return;
        }

        // Create loading screen container
        this.loadingScreen = new BABYLON.GUI.Rectangle("loadingScreen");
        this.loadingScreen.widthInPixels = this.engine.getRenderWidth();
        this.loadingScreen.heightInPixels = this.engine.getRenderHeight();
        this.loadingScreen.color = "transparent";
        this.loadingScreen.background = "black";
        this.fullscreenUI.addControl(this.loadingScreen);

        // Load and create background image
        try {
            const backgroundImage = new BABYLON.GUI.Image("loadingBackground", "assets/Images/LoadingImage.png");
            backgroundImage.stretch = BABYLON.GUI.Image.STRETCH_UNIFORM;
            backgroundImage.widthInPixels = this.engine.getRenderWidth();
            backgroundImage.heightInPixels = this.engine.getRenderHeight();
            this.loadingScreen.addControl(backgroundImage);
        } catch (error) {
            console.warn('Could not load LoadingImage.png:', error);
        }

        // Create loading text
        const loadingText = new BABYLON.GUI.TextBlock("loadingText");
        loadingText.text = this.loadingText;
        loadingText.color = GameConfig.theme.colors.textPrimary;
        loadingText.fontSize = 24;
        loadingText.fontFamily = GameConfig.theme.fonts.primary;
        loadingText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        loadingText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        loadingText.top = "100px";
        this.loadingScreen.addControl(loadingText);

        // Create progress bar background
        const progressBg = new BABYLON.GUI.Rectangle("progressBg");
        progressBg.widthInPixels = 400;
        progressBg.heightInPixels = 20;
        progressBg.color = GameConfig.theme.colors.border;
        progressBg.background = GameConfig.theme.colors.progressBackground;
        progressBg.cornerRadius = GameConfig.theme.borderRadius.small;
        progressBg.top = "150px";
        this.loadingScreen.addControl(progressBg);

        // Create progress bar fill
        const progressFill = new BABYLON.GUI.Rectangle("progressFill");
        progressFill.widthInPixels = 0;
        progressFill.heightInPixels = 18;
        progressFill.color = "transparent";
        progressFill.background = GameConfig.theme.colors.progressBar;
        progressFill.cornerRadius = GameConfig.theme.borderRadius.small;
        progressFill.left = "-200px";
        progressFill.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        progressBg.addControl(progressFill);

        // Create progress text
        const progressText = new BABYLON.GUI.TextBlock("progressText");
        progressText.text = "0%";
        progressText.color = GameConfig.theme.colors.textPrimary;
        progressText.fontSize = 16;
        progressText.fontFamily = GameConfig.theme.fonts.primary;
        progressText.top = "180px";
        this.loadingScreen.addControl(progressText);

        // Store references for updates
        this.loadingScreen.loadingText = loadingText;
        this.loadingScreen.progressFill = progressFill;
        this.loadingScreen.progressText = progressText;

        console.log('Loading screen created');
    }

    /**
     * Update loading progress
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} text - Loading text
     */
    updateLoadingProgress(progress, text = null) {
        this.loadingProgress = Math.max(0, Math.min(100, progress));

        if (text) {
            this.loadingText = text;
        }

        if (this.loadingScreen && this.loadingScreen.isVisible) {
            // Update progress bar
            if (this.loadingScreen.progressFill) {
                this.loadingScreen.progressFill.widthInPixels = (this.loadingProgress / 100) * 400;
            }

            // Update progress text
            if (this.loadingScreen.progressText) {
                this.loadingScreen.progressText.text = `${Math.round(this.loadingProgress)}%`;
            }

            // Update loading text
            if (this.loadingScreen.loadingText && text) {
                this.loadingScreen.loadingText.text = this.loadingText;
            }
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.isVisible = false;
            console.log('Loading screen hidden');
        }
    }

    /**
     * Show main menu with LoadingImage.png background
     */
    async showMainMenu() {
        if (this.mainMenu) {
            this.mainMenu.isVisible = true;
            return;
        }

        // Create main menu container
        this.mainMenu = new BABYLON.GUI.Rectangle("mainMenu");
        this.mainMenu.widthInPixels = this.engine.getRenderWidth();
        this.mainMenu.heightInPixels = this.engine.getRenderHeight();
        this.mainMenu.color = "transparent";
        this.mainMenu.background = "transparent";
        this.fullscreenUI.addControl(this.mainMenu);

        // Load and create background image (full screen)
        try {
            const backgroundImage = new BABYLON.GUI.Image("menuBackground", "assets/Images/LoadingImage.png");
            backgroundImage.stretch = BABYLON.GUI.Image.STRETCH_UNIFORM;
            const bgWidth = Math.floor(this.engine.getRenderWidth() * 2 / 3);
            backgroundImage.widthInPixels = bgWidth;
            backgroundImage.heightInPixels = this.engine.getRenderHeight();
            backgroundImage.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            this.mainMenu.addControl(backgroundImage);
        } catch (error) {
            console.warn('Could not load LoadingImage.png for main menu:', error);
            // Fallback to black background
            this.mainMenu.background = "black";
        }

        // Create right-side menu panel (1/3 of screen width)
        const menuPanel = new BABYLON.GUI.Rectangle("menuPanel");
        const panelWidth = Math.floor(this.engine.getRenderWidth() / 3);
        menuPanel.widthInPixels = panelWidth;
        menuPanel.heightInPixels = this.engine.getRenderHeight();
        menuPanel.color = GameConfig.theme.colors.border;
        menuPanel.background = GameConfig.theme.colors.backgroundPanel;
        menuPanel.thickness = 2;
        menuPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.mainMenu.addControl(menuPanel);

        // Create title
        const title = new BABYLON.GUI.TextBlock("gameTitle");
        title.text = "KILLtONE";
        title.color = GameConfig.theme.colors.primary;
        title.fontSize = 42;
        title.fontFamily = GameConfig.theme.fonts.primary;
        title.fontWeight = "bold";
        title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        title.top = "-250px";
        menuPanel.addControl(title);

        // Create nametag input field
        const nametagContainer = new BABYLON.GUI.Rectangle("nametagContainer");
        nametagContainer.widthInPixels = panelWidth - 80;
        nametagContainer.heightInPixels = 120;
        nametagContainer.color = "transparent";
        nametagContainer.background = "transparent";
        nametagContainer.top = "-200px";
        menuPanel.addControl(nametagContainer);

        // Nametag input field
        this.nametagInput = new BABYLON.GUI.InputText("nametagInput");
        this.nametagInput.widthInPixels = panelWidth - 100;
        this.nametagInput.heightInPixels = 50;
        this.nametagInput.color = GameConfig.theme.colors.textPrimary;
        this.nametagInput.background = GameConfig.theme.colors.backgroundButton;
        this.nametagInput.focusedBackground = GameConfig.theme.colors.backgroundButtonHover;
        this.nametagInput.thickness = 2;
        this.nametagInput.cornerRadius = GameConfig.theme.borderRadius.small;
        this.nametagInput.fontSize = 16;
        this.nametagInput.fontFamily = GameConfig.theme.fonts.primary;
        this.nametagInput.maxWidth = 20; // Character limit
        this.nametagInput.top = "25px";
        
        // Set current player name in input field
        this._updateNametagInput(this.nametagInput);
        
        // Track if user has modified the input to prevent overriding their changes
        let userHasModifiedInput = false;
        
        // Input validation and character limits with real-time updates
        this.nametagInput.onTextChangedObservable.add((inputText) => {
            const text = inputText.text;
            
            // Mark that user has interacted with the input
            if (this.nametagInput.isFocused) {
                userHasModifiedInput = true;
                console.log('UIManager: User has modified input, preventing auto-updates');
            }
            
            // Enforce character limit (1-20 characters)
            if (text.length > 20) {
                inputText.text = text.substring(0, 20);
                return;
            }
            
            // Basic character filtering - allow alphanumeric, underscore, hyphen
            const validChars = /^[a-zA-Z0-9_\-]*$/;
            if (!validChars.test(text)) {
                // Remove invalid characters
                inputText.text = text.replace(/[^a-zA-Z0-9_\-]/g, '');
                return;
            }
            
            // Just validate input, don't update name on every keystroke
        });
        
        // Connect to Player.setName() method on blur/enter (final validation and update)
        this.nametagInput.onBlurObservable.add(() => {
            console.log('UIManager: Input field lost focus, updating player name with:', this.nametagInput.text);
            this._updatePlayerName(this.nametagInput.text);
        });
        
        this.nametagInput.onKeyboardEventProcessedObservable.add((evt) => {
            console.log('UIManager: Key pressed:', evt.key);
            if (evt.key === "Enter") {
                console.log('UIManager: Enter pressed, updating player name with:', this.nametagInput.text);
                this._updatePlayerName(this.nametagInput.text);
                this.nametagInput.blur();
            }
        });
        
        nametagContainer.addControl(this.nametagInput);

        // Update the input field after a short delay to ensure player is initialized
        // Only do this once when the menu is first created and user hasn't modified it
        setTimeout(() => {
            if (!userHasModifiedInput && (this.nametagInput.text === "" || this.nametagInput.text === "SteelIce")) {
                console.log('UIManager: Delayed update of nametag input');
                this._updateNametagInput(this.nametagInput);
            }
        }, 100);
        
        // Also try again after a longer delay to catch late player initialization
        setTimeout(() => {
            if (!userHasModifiedInput && this.game.player && this.game.player.getName && this.nametagInput.text !== this.game.player.getName()) {
                console.log('UIManager: Final delayed update of nametag input');
                this._updateNametagInput(this.nametagInput);
            }
        }, 500);

        // Create menu buttons container
        const buttonContainer = new BABYLON.GUI.StackPanel("buttonContainer");
        buttonContainer.widthInPixels = panelWidth - 80;
        buttonContainer.heightInPixels = 400;
        buttonContainer.spacing = 15;
        buttonContainer.top = "100px";
        menuPanel.addControl(buttonContainer);

        // Play button
        const playButton = this._createCleanMenuButton("PLAY", () => {
            // Update player name with current input value before starting game
            if (this.nametagInput && this.nametagInput.text.trim()) {
                console.log('UIManager: PLAY clicked, updating name to:', this.nametagInput.text.trim());
                this._updatePlayerName(this.nametagInput.text.trim());
                
                // Also send to server if connected
                if (this.game.networkManager && this.game.networkManager.isConnected) {
                    console.log('UIManager: PLAY clicked, sending username to server:', this.nametagInput.text.trim());
                    this.game.networkManager.emit('usernameUpdate', { username: this.nametagInput.text.trim() });
                }
            }
            
            this.game.stateManager.transitionTo('IN_GAME');
        });
        buttonContainer.addControl(playButton);

        // Map Editor button
        const editorButton = this._createCleanMenuButton("MAP EDITOR", () => {
            this.game.stateManager.transitionTo('MAP_EDITOR');
        });
        buttonContainer.addControl(editorButton);

        // Leaderboard button
        const leaderboardButton = this._createCleanMenuButton("LEADERBOARD", () => {
            this.showLeaderboard();
        });
        buttonContainer.addControl(leaderboardButton);

        // Settings button
        const settingsButton = this._createCleanMenuButton("SETTINGS", () => {
            this.showSettingsOverlay();
        });
        buttonContainer.addControl(settingsButton);

        // Exit button
        const exitButton = this._createCleanMenuButton("EXIT", () => {
            if (confirm("Are you sure you want to exit?")) {
                window.close();
            }
        });
        buttonContainer.addControl(exitButton);

        console.log('Main menu created');
    }

    /**
     * Hide main menu
     */
    hideMainMenu() {
        if (this.mainMenu) {
            this.mainMenu.isVisible = false;
            console.log('Main menu hidden');
        }
    }

    /**
     * Show settings overlay (ESC menu) - using right panel design
     */
    async showSettingsOverlay() {
        if (this.settingsOverlay) {
            this.settingsOverlay.isVisible = true;
            this.settingsVisible = true;
            return;
        }

        // Create semi-transparent overlay
        this.settingsOverlay = new BABYLON.GUI.Rectangle("settingsOverlay");
        this.settingsOverlay.widthInPixels = this.engine.getRenderWidth();
        this.settingsOverlay.heightInPixels = this.engine.getRenderHeight();
        this.settingsOverlay.color = "transparent";
        this.settingsOverlay.background = GameConfig.theme.colors.backgroundOverlay;
        this.fullscreenUI.addControl(this.settingsOverlay);
        
        // Add click-to-close on the overlay background (but not on the settings panel)
        this.settingsOverlay.onPointerClickObservable.add((evt) => {
            // Only close if clicking on the overlay itself, not on child controls
            if (evt.target === this.settingsOverlay) {
                this.hideSettingsOverlay();
            }
        });

        // Create right-side settings panel (1/3 of screen width)
        const settingsPanel = new BABYLON.GUI.Rectangle("settingsPanel");
        const panelWidth = Math.floor(this.engine.getRenderWidth() / 3);
        settingsPanel.widthInPixels = panelWidth;
        settingsPanel.heightInPixels = this.engine.getRenderHeight();
        settingsPanel.color = GameConfig.theme.colors.border;
        settingsPanel.background = GameConfig.theme.colors.backgroundPanel;
        settingsPanel.thickness = 2;
        settingsPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        settingsPanel.clipChildren = false; // allow dropdowns to overflow
        this.settingsOverlay.addControl(settingsPanel);

        // Settings title
        const title = new BABYLON.GUI.TextBlock("settingsTitle");
        title.text = "SETTINGS";
        title.color = GameConfig.theme.colors.primary;
        title.fontSize = 32;
        title.fontFamily = GameConfig.theme.fonts.primary;
        title.fontWeight = "bold";
        title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        title.top = "-300px";
        settingsPanel.addControl(title);

        // Create settings content container
        const contentContainer = new BABYLON.GUI.StackPanel("settingsContent");
        contentContainer.widthInPixels = panelWidth - 40;
        contentContainer.heightInPixels = 500;
        contentContainer.spacing = 10;
        contentContainer.top = "-50px";
        contentContainer.clipChildren = false; // allow overflow inside stackpanel
        settingsPanel.addControl(contentContainer);

        // Build revamped settings UI
        this._populateSettingsContent(contentContainer);

        // Close button
        const closeButton = this._createCleanMenuButton("CLOSE", () => {
            this.hideSettingsOverlay();
            // Transition back to IN_GAME state to restore pointer lock
            if (this.game.stateManager) {
                this.game.stateManager.transitionTo('IN_GAME');
            }
        });
        closeButton.top = "250px";
        settingsPanel.addControl(closeButton);

        this.settingsVisible = true;
        console.log('Settings overlay created');
    }

    /**
     * Hide settings overlay
     */
    hideSettingsOverlay() {
        if (this.settingsOverlay) {
            this.settingsOverlay.isVisible = false;
            this.settingsVisible = false;
            console.log('Settings overlay hidden');
        }
    }

    /**
     * Show leaderboard (TAB menu) - using right panel design
     */
    async showLeaderboard() {
        if (this.leaderboard) {
            this.leaderboard.isVisible = true;
            return;
        }

        // Create semi-transparent overlay
        this.leaderboard = new BABYLON.GUI.Rectangle("leaderboard");
        this.leaderboard.widthInPixels = this.engine.getRenderWidth();
        this.leaderboard.heightInPixels = this.engine.getRenderHeight();
        this.leaderboard.color = "transparent";
        this.leaderboard.background = GameConfig.theme.colors.backgroundOverlay;
        this.fullscreenUI.addControl(this.leaderboard);

        // Create right-side leaderboard panel (slightly wider for better column layout)
        const leaderboardPanel = new BABYLON.GUI.Rectangle("leaderboardPanel");
        const panelWidth = Math.max(350, Math.floor(this.engine.getRenderWidth() * 0.4)); // Minimum 350px or 40% of screen
        leaderboardPanel.widthInPixels = panelWidth;
        leaderboardPanel.heightInPixels = this.engine.getRenderHeight();
        leaderboardPanel.color = GameConfig.theme.colors.border;
        leaderboardPanel.background = GameConfig.theme.colors.backgroundPanel;
        leaderboardPanel.thickness = 2;
        leaderboardPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.leaderboard.addControl(leaderboardPanel);

        // Leaderboard title
        const title = new BABYLON.GUI.TextBlock("leaderboardTitle");
        title.text = "LEADERBOARD";
        title.color = GameConfig.theme.colors.primary;
        title.fontSize = 28;
        title.fontFamily = GameConfig.theme.fonts.primary;
        title.fontWeight = "bold";
        title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        title.top = "-300px";
        leaderboardPanel.addControl(title);

        // Create leaderboard content container
        const contentContainer = new BABYLON.GUI.StackPanel("leaderboardContent");
        contentContainer.widthInPixels = panelWidth - 40;
        contentContainer.heightInPixels = 500;
        contentContainer.spacing = 6; // Slightly tighter spacing for more entries
        contentContainer.top = "10px";
        leaderboardPanel.addControl(contentContainer);

        // Header row with proper column layout
        const headerContainer = new BABYLON.GUI.Rectangle("headerContainer");
        headerContainer.heightInPixels = 35;
        headerContainer.color = "transparent";
        headerContainer.background = GameConfig.theme.colors.backgroundButtonHover;
        headerContainer.cornerRadius = GameConfig.theme.borderRadius.small;
        contentContainer.addControl(headerContainer);

        // Column positioning - Player shifted right, gap reduced between name and kills
        const columnLayout = {
            player: { left: 10, width: 120 },
            kills: { left: 30, width: 35 },
            deaths: { left: 70, width: 35 }, 
            connection: { left: 140, width: 50 },
            ping: { left: 190, width: 40 }      
        };
        
        // Debug column positions
        console.log('Panel width:', panelWidth);
        console.log('Column layout:', columnLayout);

        // Player name header (first column)
        const nameHeader = new BABYLON.GUI.TextBlock("nameHeader");
        nameHeader.text = "PLAYER";
        nameHeader.color = GameConfig.theme.colors.textPrimary || "#FFFFFF";
        nameHeader.fontSize = 13;
        nameHeader.fontFamily = GameConfig.theme.fonts.primary;
        nameHeader.fontWeight = "bold";
        nameHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        nameHeader.left = `${columnLayout.player.left}px`;
        headerContainer.addControl(nameHeader);
        
        // Debug header creation
        console.log('Created PLAYER header at position:', columnLayout.player.left, 'with text:', nameHeader.text);

        // Kills header
        const killsHeader = new BABYLON.GUI.TextBlock("killsHeader");
        killsHeader.text = "K";
        killsHeader.color = GameConfig.theme.colors.textPrimary;
        killsHeader.fontSize = 13;
        killsHeader.fontFamily = GameConfig.theme.fonts.primary;
        killsHeader.fontWeight = "bold";
        killsHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        killsHeader.left = `${columnLayout.kills.left}px`;
        headerContainer.addControl(killsHeader);

        // Deaths header
        const deathsHeader = new BABYLON.GUI.TextBlock("deathsHeader");
        deathsHeader.text = "D";
        deathsHeader.color = GameConfig.theme.colors.textPrimary;
        deathsHeader.fontSize = 13;
        deathsHeader.fontFamily = GameConfig.theme.fonts.primary;
        deathsHeader.fontWeight = "bold";
        deathsHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        deathsHeader.left = `${columnLayout.deaths.left}px`;
        headerContainer.addControl(deathsHeader);

        // Connection header
        const connectionHeader = new BABYLON.GUI.TextBlock("connectionHeader");
        connectionHeader.text = "STATUS";
        connectionHeader.color = GameConfig.theme.colors.textPrimary;
        connectionHeader.fontSize = 13;
        connectionHeader.fontFamily = GameConfig.theme.fonts.primary;
        connectionHeader.fontWeight = "bold";
        connectionHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        connectionHeader.left = `${columnLayout.connection.left}px`;
        headerContainer.addControl(connectionHeader);

        // Ping header
        const pingHeader = new BABYLON.GUI.TextBlock("pingHeader");
        pingHeader.text = "PING";
        pingHeader.color = GameConfig.theme.colors.textPrimary;
        pingHeader.fontSize = 13;
        pingHeader.fontFamily = GameConfig.theme.fonts.primary;
        pingHeader.fontWeight = "bold";
        pingHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        pingHeader.left = `${columnLayout.ping.left}px`;
        headerContainer.addControl(pingHeader);

        // Get leaderboard data (sample data for now, in real game this would come from server)
        const sampleData = this._getLeaderboardData();
        console.log('Leaderboard data being used:', sampleData);

        // Create leaderboard entries
        sampleData.forEach((player, index) => {
            this._createLeaderboardEntry(contentContainer, player, index === 0); // Highlight first place
        });


        console.log('Leaderboard created');
    }

    /**
     * Hide leaderboard
     */
    hideLeaderboard() {
        if (this.leaderboard) {
            this.leaderboard.isVisible = false;
            console.log('Leaderboard hidden');
        }
    }

    /**
     * Show game HUD
     */
    async showGameHUD() {
        if (this.gameHUD) {
            this.gameHUD.isVisible = true;
            return;
        }

        // Create HUD container
        this.gameHUD = new BABYLON.GUI.Rectangle("gameHUD");
        this.gameHUD.widthInPixels = this.engine.getRenderWidth();
        this.gameHUD.heightInPixels = this.engine.getRenderHeight();
        this.gameHUD.color = "transparent";
        this.gameHUD.background = "transparent";
        this.fullscreenUI.addControl(this.gameHUD);

        // Crosshair
        const crosshair = new BABYLON.GUI.Ellipse("crosshair");
        crosshair.widthInPixels = 4;
        crosshair.heightInPixels = 4;
        crosshair.color = GameConfig.theme.colors.primary;
        crosshair.background = GameConfig.theme.colors.primary;
        this.gameHUD.addControl(crosshair);

        // Health display
        const healthText = new BABYLON.GUI.TextBlock("healthText");
        healthText.text = "Health: 100";
        healthText.color = GameConfig.theme.colors.healthHigh;
        healthText.fontSize = 18;
        healthText.fontFamily = GameConfig.theme.fonts.primary;
        healthText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        healthText.left = "20px";
        healthText.top = "-20px";
        this.gameHUD.addControl(healthText);

        // Ammo display
        const ammoText = new BABYLON.GUI.TextBlock("ammoText");
        ammoText.text = "Ammo: 30/90";
        ammoText.color = GameConfig.theme.colors.textPrimary;
        ammoText.fontSize = 18;
        ammoText.fontFamily = GameConfig.theme.fonts.primary;
        ammoText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        ammoText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        ammoText.left = "-20px";
        ammoText.top = "-20px";
        this.gameHUD.addControl(ammoText);

        // Store references for updates
        this.gameHUD.healthText = healthText;
        this.gameHUD.ammoText = ammoText;

        console.log('Game HUD created');
    }

    /**
     * Hide game HUD
     */
    hideGameHUD() {
        if (this.gameHUD) {
            this.gameHUD.isVisible = false;
            console.log('Game HUD hidden');
        }
    }

    /**
     * Show map editor UI
     */
    async showMapEditor() {
        if (this.mapEditor) {
            this.mapEditor.isVisible = true;
            return;
        }

        // Create editor UI container
        this.mapEditor = new BABYLON.GUI.Rectangle("mapEditor");
        this.mapEditor.widthInPixels = this.engine.getRenderWidth();
        this.mapEditor.heightInPixels = this.engine.getRenderHeight();
        this.mapEditor.color = "transparent";
        this.mapEditor.background = "transparent";
        this.fullscreenUI.addControl(this.mapEditor);

        // Left toolbar
        const leftToolbar = new BABYLON.GUI.Rectangle("leftToolbar");
        leftToolbar.widthInPixels = 200;
        leftToolbar.heightInPixels = this.engine.getRenderHeight();
        leftToolbar.color = GameConfig.theme.colors.border;
        leftToolbar.background = GameConfig.theme.colors.backgroundPanel;
        leftToolbar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.mapEditor.addControl(leftToolbar);

        // Right properties panel
        const rightPanel = new BABYLON.GUI.Rectangle("rightPanel");
        rightPanel.widthInPixels = 250;
        rightPanel.heightInPixels = this.engine.getRenderHeight();
        rightPanel.color = GameConfig.theme.colors.border;
        rightPanel.background = GameConfig.theme.colors.backgroundPanel;
        rightPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.mapEditor.addControl(rightPanel);

        // Editor title
        const title = new BABYLON.GUI.TextBlock("editorTitle");
        title.text = "MAP EDITOR";
        title.color = GameConfig.theme.colors.primary;
        title.fontSize = 20;
        title.fontFamily = GameConfig.theme.fonts.primary;
        title.top = "20px";
        leftToolbar.addControl(title);

        // Add keybinds display in bottom right
        const keybindsPanel = new BABYLON.GUI.Rectangle("keybindsPanel");
        keybindsPanel.widthInPixels = 300;
        keybindsPanel.heightInPixels = 200;
        keybindsPanel.color = GameConfig.theme.colors.border;
        keybindsPanel.background = GameConfig.theme.colors.backgroundPanel;
        keybindsPanel.thickness = 1;
        keybindsPanel.cornerRadius = 5;
        keybindsPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        keybindsPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        keybindsPanel.leftInPixels = -20;
        keybindsPanel.topInPixels = -20;
        this.mapEditor.addControl(keybindsPanel);

        // Keybinds title
        const keybindsTitle = new BABYLON.GUI.TextBlock("keybindsTitle");
        keybindsTitle.text = "CONTROLS";
        keybindsTitle.color = GameConfig.theme.colors.primary;
        keybindsTitle.fontSize = 16;
        keybindsTitle.fontFamily = GameConfig.theme.fonts.primary;
        keybindsTitle.fontWeight = "bold";
        keybindsTitle.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        keybindsTitle.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        keybindsTitle.topInPixels = 10;
        keybindsPanel.addControl(keybindsTitle);

        // Keybinds list
        const keybindsList = new BABYLON.GUI.StackPanel("keybindsList");
        keybindsList.widthInPixels = 280;
        keybindsList.heightInPixels = 160;
        keybindsList.spacing = 3;
        keybindsList.topInPixels = 15;
        keybindsPanel.addControl(keybindsList);

        // Add individual keybinds
        const keybinds = [
            "WASD - Move camera",
            "Mouse - Look around",
            "E - Place object",
            "R - Rotate object",
            "T - Scale object",
            "G - Move object",
            "X - Delete object",
            "Ctrl+S - Save map",
            "Ctrl+L - Load map",
            "Ctrl+Z - Undo",
            "ESC - Exit editor"
        ];

        keybinds.forEach(keybind => {
            const keybindText = new BABYLON.GUI.TextBlock();
            keybindText.text = keybind;
            keybindText.color = GameConfig.theme.colors.textSecondary;
            keybindText.fontSize = 12;
            keybindText.fontFamily = GameConfig.theme.fonts.monospace;
            keybindText.heightInPixels = 14;
            keybindText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            keybindsList.addControl(keybindText);
        });

        console.log('Map editor UI created');
    }

    /**
     * Hide map editor UI
     */
    hideMapEditor() {
        if (this.mapEditor) {
            this.mapEditor.isVisible = false;
            console.log('Map editor UI hidden');
        }
    }

    /**
     * Update HUD elements
     * @param {Object} gameState - Current game state
     */
    updateHUD(playerState) {
        if (!this.gameHUD || !this.gameHUD.isVisible) return;

        // Update health
        if (this.gameHUD.healthText && playerState.health !== undefined) {
            this.gameHUD.healthText.text = `Health: ${playerState.health}`;
            this.gameHUD.healthText.color = playerState.health > 50 ? GameConfig.theme.colors.healthHigh :
                playerState.health > 25 ? GameConfig.theme.colors.healthMedium : GameConfig.theme.colors.healthLow;
        }

        // Update ammo
        if (this.gameHUD.ammoText && playerState.currentAmmo !== undefined && playerState.maxAmmo !== undefined) {
            this.gameHUD.ammoText.text = `Ammo: ${playerState.currentAmmo}/${playerState.maxAmmo}`;
        }
    }

    /**
     * Per-frame update for UIManager. Call this every frame from the game loop.
     * Includes HUD updates and any other UI elements that need to be updated constantly.
     * @param {Object} gameState - Current game state (optional, for HUD)
     */
    update(playerState) {
        // Update HUD elements if visible
        if (playerState) {
            this.updateHUD(playerState);
        }
        // Add other per-frame UI updates here as needed
        // e.g., animations, timers, notifications, etc.
    }

    /**
     * Show flowstate message (kill-streak notification)
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds
     */
    showFlowstateMessage(message, duration = 3000) {
        // Create temporary message
        const messageText = new BABYLON.GUI.TextBlock("flowstateMessage");
        messageText.text = message;
        messageText.color = GameConfig.theme.colors.primary;
        messageText.fontSize = 32;
        messageText.fontFamily = GameConfig.theme.fonts.primary;
        messageText.fontWeight = "bold";
        messageText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        messageText.top = "-100px";

        this.fullscreenUI.addControl(messageText);

        // Animate and remove
        setTimeout(() => {
            this.fullscreenUI.removeControl(messageText);
        }, duration);
    }

    /**
     * Create a clean menu button for the right panel
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @returns {BABYLON.GUI.Button} Button control
     */
    _createCleanMenuButton(text, onClick) {
        const button = BABYLON.GUI.Button.CreateSimpleButton(`btn_${text.toLowerCase().replace(' ', '_')}`, text);
        button.widthInPixels = 280;
        button.heightInPixels = 55;
        button.color = GameConfig.theme.colors.textPrimary;
        button.background = GameConfig.theme.colors.backgroundButton;
        button.cornerRadius = GameConfig.theme.borderRadius.medium;
        button.fontSize = 20;
        button.fontFamily = GameConfig.theme.fonts.primary;
        button.fontWeight = "bold";
        button.thickness = 2;

        // Hover effects
        button.onPointerEnterObservable.add(() => {
            button.background = GameConfig.theme.colors.backgroundButtonHover;
            button.color = GameConfig.theme.colors.textPrimary;
            button.thickness = 3;
        });

        button.onPointerOutObservable.add(() => {
            button.background = GameConfig.theme.colors.backgroundButton;
            button.color = GameConfig.theme.colors.textPrimary;
            button.thickness = 2;
        });

        // Click handler
        button.onPointerClickObservable.add(onClick);

        return button;
    }

    /**
     * Create a menu button (legacy method for settings)
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @returns {BABYLON.GUI.Button} Button control
     */
    _createMenuButton(text, onClick) {
        const button = BABYLON.GUI.Button.CreateSimpleButton(`btn_${text.toLowerCase()}`, text);
        button.widthInPixels = 200;
        button.heightInPixels = 45;
        button.color = GameConfig.theme.colors.textPrimary;
        button.background = GameConfig.theme.colors.backgroundButtonHover;
        button.cornerRadius = GameConfig.theme.borderRadius.small;
        button.fontSize = 18;
        button.fontFamily = GameConfig.theme.fonts.primary;
        button.fontWeight = "bold";

        // Hover effects
        button.onPointerEnterObservable.add(() => {
            button.background = GameConfig.theme.colors.primary;
        });

        button.onPointerOutObservable.add(() => {
            button.background = GameConfig.theme.colors.backgroundButtonHover;
        });

        // Click handler
        button.onPointerClickObservable.add(onClick);

        return button;
    }

    /**
     * Create clean settings section header
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {string} title - Section title
     */
    _createCleanSettingsSection(container, title) {
        const sectionTitle = new BABYLON.GUI.TextBlock(`section_${title.toLowerCase()}`);
        sectionTitle.text = title;
        sectionTitle.color = GameConfig.theme.colors.primary;
        sectionTitle.fontSize = 18;
        sectionTitle.fontFamily = GameConfig.theme.fonts.primary;
        sectionTitle.fontWeight = "bold";
        sectionTitle.heightInPixels = 35;
        sectionTitle.paddingTop = "10px";
        sectionTitle.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.addControl(sectionTitle);
    }

    /**
     * Create clean slider setting
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {string} label - Setting label
     * @param {number} defaultValue - Default value
     * @param {Function} onChange - Change handler
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     */
    _createCleanSliderSetting(container, label, defaultValue, onChange, min = 0, max = 1) {
        const settingContainer = new BABYLON.GUI.Rectangle(`setting_${label.toLowerCase().replace(' ', '_')}`);
        settingContainer.heightInPixels = 40;
        settingContainer.color = "transparent";
        settingContainer.background = "transparent";
        container.addControl(settingContainer);

        const labelText = new BABYLON.GUI.TextBlock(`label_${label.toLowerCase().replace(' ', '_')}`);
        labelText.text = label;
        labelText.color = GameConfig.theme.colors.textPrimary;
        labelText.fontSize = 14;
        labelText.fontFamily = GameConfig.theme.fonts.primary;
        labelText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        labelText.left = "-100px";
        labelText.top = "-10px";
        settingContainer.addControl(labelText);

        const valueText = new BABYLON.GUI.TextBlock(`value_${label.toLowerCase().replace(' ', '_')}`);
        valueText.text = defaultValue.toString();
        valueText.color = GameConfig.theme.colors.primary;
        valueText.fontSize = 14;
        valueText.fontFamily = GameConfig.theme.fonts.primary;
        valueText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        valueText.left = "100px";
        valueText.top = "-10px";
        settingContainer.addControl(valueText);

        // Simple slider representation (Babylon.js GUI doesn't have built-in sliders)
        const sliderBg = new BABYLON.GUI.Rectangle(`slider_bg_${label.toLowerCase().replace(' ', '_')}`);
        sliderBg.widthInPixels = 150;
        sliderBg.heightInPixels = 4;
        sliderBg.color = GameConfig.theme.colors.border;
        sliderBg.background = GameConfig.theme.colors.progressBackground;
        sliderBg.top = "10px";
        settingContainer.addControl(sliderBg);

        const sliderFill = new BABYLON.GUI.Rectangle(`slider_fill_${label.toLowerCase().replace(' ', '_')}`);
        const fillWidth = ((defaultValue - min) / (max - min)) * 150;
        sliderFill.widthInPixels = fillWidth;
        sliderFill.heightInPixels = 4;
        sliderFill.color = "transparent";
        sliderFill.background = GameConfig.theme.colors.primary;
        sliderFill.left = `-${(150 - fillWidth) / 2}px`;
        sliderFill.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        sliderBg.addControl(sliderFill);

        // Note: In a full implementation, you'd add mouse interaction for the slider
        // For now, this is a visual representation
    }

    /**
     * Create settings section header (legacy)
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {string} title - Section title
     */
    _createSettingsSection(container, title) {
        const sectionTitle = new BABYLON.GUI.TextBlock(`section_${title.toLowerCase()}`);
        sectionTitle.text = title;
        sectionTitle.color = GameConfig.theme.colors.secondary;
        sectionTitle.fontSize = 20;
        sectionTitle.fontFamily = GameConfig.theme.fonts.primary;
        sectionTitle.fontWeight = "bold";
        sectionTitle.heightInPixels = 30;
        sectionTitle.paddingTop = "10px";
        container.addControl(sectionTitle);
    }

    /**
     * Create slider setting
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {string} label - Setting label
     * @param {number} defaultValue - Default value
     * @param {Function} onChange - Change handler
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     */
    _createSliderSetting(container, label, defaultValue, onChange, min = 0, max = 1) {
        const settingContainer = new BABYLON.GUI.Rectangle(`setting_${label.toLowerCase()}`);
        settingContainer.heightInPixels = 40;
        settingContainer.color = "transparent";
        settingContainer.background = "transparent";
        container.addControl(settingContainer);

        const labelText = new BABYLON.GUI.TextBlock(`label_${label.toLowerCase()}`);
        labelText.text = label;
        labelText.color = GameConfig.theme.colors.textPrimary;
        labelText.fontSize = 16;
        labelText.fontFamily = GameConfig.theme.fonts.primary;
        labelText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        labelText.left = "-200px";
        settingContainer.addControl(labelText);

        const valueText = new BABYLON.GUI.TextBlock(`value_${label.toLowerCase()}`);
        valueText.text = defaultValue.toString();
        valueText.color = GameConfig.theme.colors.textAccent;
        valueText.fontSize = 16;
        valueText.fontFamily = GameConfig.theme.fonts.primary;
        valueText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        valueText.left = "200px";
        settingContainer.addControl(valueText);

        // Note: Babylon.js GUI doesn't have a built-in slider, so we'll use a simple implementation
        // In a full implementation, you'd create a custom slider or use a third-party solution
    }

    /**
     * Create clean settings section header with theme colors
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {string} title - Section title
     */
    _createCleanSettingsSection(container, title) {
        const sectionTitle = new BABYLON.GUI.TextBlock(`section_${title.toLowerCase()}`);
        sectionTitle.text = title;
        sectionTitle.color = GameConfig.theme.colors.secondary;
        sectionTitle.fontSize = 20;
        sectionTitle.fontFamily = GameConfig.theme.fonts.primary;
        sectionTitle.fontWeight = "bold";
        sectionTitle.heightInPixels = 30;
        sectionTitle.paddingTop = "10px";
        container.addControl(sectionTitle);
    }

    /**
     * Create clean slider setting with theme colors
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {string} label - Setting label
     * @param {number} defaultValue - Default value
     * @param {Function} onChange - Change handler
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     */
    _createCleanSliderSetting(container, label, defaultValue, onChange, min = 0, max = 1) {
        const settingContainer = new BABYLON.GUI.Rectangle(`setting_${label.toLowerCase().replace(' ', '_')}`);
        settingContainer.heightInPixels = 40;
        settingContainer.color = "transparent";
        settingContainer.background = "transparent";
        container.addControl(settingContainer);

        const labelText = new BABYLON.GUI.TextBlock(`label_${label.toLowerCase().replace(' ', '_')}`);
        labelText.text = label;
        labelText.color = GameConfig.theme.colors.textPrimary;
        labelText.fontSize = 16;
        labelText.fontFamily = GameConfig.theme.fonts.primary;
        labelText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        labelText.left = "-100px";
        settingContainer.addControl(labelText);

        const valueText = new BABYLON.GUI.TextBlock(`value_${label.toLowerCase().replace(' ', '_')}`);
        valueText.text = defaultValue.toString();
        valueText.color = GameConfig.theme.colors.textAccent;
        valueText.fontSize = 16;
        valueText.fontFamily = GameConfig.theme.fonts.primary;
        valueText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        valueText.left = "100px";
        settingContainer.addControl(valueText);

        // Note: Babylon.js GUI doesn't have a built-in slider, so we'll use a simple implementation
        // In a full implementation, you'd create a custom slider or use a third-party solution
    }

    /**
     * Update leaderboard with new data (for real-time updates)
     * @param {Array} playerData - Array of player data objects
     */
    updateLeaderboardData(playerData) {
        if (!this.leaderboard || !this.leaderboard.isVisible) return;

        // Store the latest player data
        this.latestPlayerData = playerData;
        
        // Recreate the leaderboard with new data
        this.hideLeaderboard();
        this.showLeaderboard();
    }

    /**
     * Get leaderboard data with comprehensive player statistics
     * @returns {Array} Array of player data objects
     */
    _getLeaderboardData() {
        // Use real network data if available
        if (this.latestPlayerData && this.latestPlayerData.length > 0) {
            return this.latestPlayerData.map(player => ({
                id: player.id,
                name: player.username || 'Unknown',
                kills: player.kills || 0,
                deaths: player.deaths || 0,
                assists: 0, // TODO: Track assists in the future
                score: player.score || 0,
                ping: player.ping || 0,
                isLocal: player.isLocal,
                rank: player.rank || 1,
                kdr: player.kdr || '0.00',
                isAlive: player.isAlive !== false
            }));
        }

        // Get data from NetworkManager if available
        if (this.game.networkManager && this.game.networkManager.getAllPlayerStats) {
            const networkStats = this.game.networkManager.getAllPlayerStats();
            if (networkStats && networkStats.length > 0) {
                return networkStats.map(player => ({
                    id: player.id,
                    name: player.username || 'Unknown',
                    kills: player.kills || 0,
                    deaths: player.deaths || 0,
                    assists: 0, // TODO: Track assists in the future
                    score: player.score || 0,
                    ping: player.ping || 0,
                    isLocal: player.isLocal,
                    rank: player.rank || 1,
                    kdr: player.kdr || '0.00',
                    isAlive: player.isAlive !== false
                }));
            }
        }

        // Fallback to local player data if no network data
        const localPlayerData = [];
        if (this.game.player) {
            localPlayerData.push({
                id: 'local',
                name: this.game.player.getName() || 'YOU',
                kills: this.game.player.kills || 0,
                deaths: this.game.player.deaths || 0,
                assists: 0,
                score: (this.game.player.kills || 0) * 15 - (this.game.player.deaths || 0) * 5,
                ping: 0,
                isLocal: true,
                rank: 1,
                kdr: this.game.player.deaths > 0 ? 
                    (this.game.player.kills / this.game.player.deaths).toFixed(2) : 
                    (this.game.player.kills || 0).toFixed(2),
                isAlive: this.game.player.health > 0
            });
        }

        return localPlayerData;
    }

    /**
     * Create enhanced leaderboard entry with proper column alignment
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {Object} player - Player data
     * @param {boolean} isFirst - Whether this is first place
     */
    _createLeaderboardEntry(container, player, isFirst = false) {
        const entryContainer = new BABYLON.GUI.Rectangle(`entry_${player.rank}`);
        entryContainer.heightInPixels = 40;
        entryContainer.color = "transparent";
        entryContainer.background = isFirst ? GameConfig.theme.colors.backgroundButtonHover :
            player.isLocal ? 'rgba(253, 52, 43, 0.2)' : "transparent";
        entryContainer.cornerRadius = GameConfig.theme.borderRadius.small;
        container.addControl(entryContainer);

        // Use the same column layout as headers - Player shifted right, gap reduced between name and kills
        const columnLayout = {
            player: { left: 10, width: 120 },
            kills: { left: 30, width: 35 },
            deaths: { left: 70, width: 35 }, 
            connection: { left: 140, width: 50 },
            ping: { left: 190, width: 40 }  
        };

        // Determine colors based on rank and local player
        const primaryColor = isFirst ? GameConfig.theme.colors.primary :
            player.isLocal ? GameConfig.theme.colors.primary : GameConfig.theme.colors.textPrimary;
        const secondaryColor = isFirst ? GameConfig.theme.colors.primary :
            player.isLocal ? GameConfig.theme.colors.primary : GameConfig.theme.colors.textSecondary;
        const fontWeight = isFirst || player.isLocal ? "bold" : "normal";

        // Player name column - first column, more space now, truncate if too long
        const nameText = new BABYLON.GUI.TextBlock(`name_${player.rank || player.id}`);
        const maxNameLength = 18; // Increased since we have more space without rank column
        const displayName = (player.name && player.name.length > maxNameLength) ? `${player.name.substring(0, maxNameLength - 3)}...` : (player.name || 'Unknown Player');
        nameText.text = displayName;
        nameText.color = primaryColor || "#FFFFFF";
        nameText.fontSize = 14;
        nameText.fontFamily = GameConfig.theme.fonts.primary;
        nameText.fontWeight = fontWeight;
        nameText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        nameText.left = `${columnLayout.player.left}px`;
        entryContainer.addControl(nameText);
        
        // Debug log to see what data we're getting
        console.log('Creating player name text:', { 
            originalName: player.name, 
            displayName: displayName, 
            textContent: nameText.text,
            leftPosition: columnLayout.player.left,
            color: nameText.color,
            kills: player.kills, 
            deaths: player.deaths,
            isLocal: player.isLocal,
            rank: player.rank
        });

        // Kills column
        const killsText = new BABYLON.GUI.TextBlock(`kills_${player.rank}`);
        killsText.text = player.kills.toString();
        killsText.color = primaryColor;
        killsText.fontSize = 14;
        killsText.fontFamily = GameConfig.theme.fonts.primary;
        killsText.fontWeight = fontWeight;
        killsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        killsText.left = `${columnLayout.kills.left}px`;
        entryContainer.addControl(killsText);

        // Deaths column
        const deathsText = new BABYLON.GUI.TextBlock(`deaths_${player.rank}`);
        deathsText.text = player.deaths.toString();
        deathsText.color = secondaryColor;
        deathsText.fontSize = 14;
        deathsText.fontFamily = GameConfig.theme.fonts.primary;
        deathsText.fontWeight = fontWeight;
        deathsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        deathsText.left = `${columnLayout.deaths.left}px`;
        entryContainer.addControl(deathsText);

        // Connection status column
        const connectionText = new BABYLON.GUI.TextBlock(`connection_${player.rank}`);
        let connectionStatus, connectionColor;
        
        if (player.isLocal) {
            connectionStatus = "LOCAL";
            connectionColor = GameConfig.theme.colors.textSuccess || "#00ff00";
        } else if (player.isAlive !== false) {
            connectionStatus = "ONLINE";
            connectionColor = GameConfig.theme.colors.textSuccess || "#00ff00";
        } else {
            connectionStatus = "DISC";
            connectionColor = GameConfig.theme.colors.textDanger || "#ff0000";
        }
        
        connectionText.text = connectionStatus;
        connectionText.color = connectionColor;
        connectionText.fontSize = 11;
        connectionText.fontFamily = GameConfig.theme.fonts.primary;
        connectionText.fontWeight = "normal";
        connectionText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        connectionText.left = `${columnLayout.connection.left}px`;
        entryContainer.addControl(connectionText);

        // Ping column
        const pingText = new BABYLON.GUI.TextBlock(`ping_${player.rank}`);
        if (player.isLocal) {
            pingText.text = "-";
            pingText.color = GameConfig.theme.colors.textSecondary;
        } else {
            pingText.text = `${player.ping}`;
            pingText.color = player.ping < 50 ? (GameConfig.theme.colors.textSuccess || "#00ff00") :
                player.ping < 100 ? (GameConfig.theme.colors.textWarning || "#ffff00") : 
                (GameConfig.theme.colors.textDanger || "#ff0000");
        }
        pingText.fontSize = 11;
        pingText.fontFamily = GameConfig.theme.fonts.primary;
        pingText.fontWeight = "normal";
        pingText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        pingText.left = `${columnLayout.ping.left}px`;
        entryContainer.addControl(pingText);
    }

    /**
     * Handle game state changes to control cursor visibility
     * @param {string} newState - The new game state
     */
    onStateChange(newState) {
        // Control cursor visibility based on game state
        const body = document.body;
        
        if (newState === 'IN_GAME') {
            // Hide cursor during gameplay
            body.classList.add('in-game');
        } else {
            // Show cursor in menus
            body.classList.remove('in-game');
        }
        
        console.log(`Cursor visibility updated for state: ${newState}`);
    }

    /**
     * Handle window resize
     */
    onResize() {
        if (this.fullscreenUI) {
            // Update UI elements for new screen size
            const width = this.engine.getRenderWidth();
            const height = this.engine.getRenderHeight();

            // Update loading screen
            if (this.loadingScreen) {
                this.loadingScreen.widthInPixels = width;
                this.loadingScreen.heightInPixels = height;
            }

            // Update main menu
            if (this.mainMenu) {
                this.mainMenu.widthInPixels = width;
                this.mainMenu.heightInPixels = height;
            }

            // Update settings overlay
            if (this.settingsOverlay) {
                this.settingsOverlay.widthInPixels = width;
                this.settingsOverlay.heightInPixels = height;
            }

            // Update leaderboard
            if (this.leaderboard) {
                this.leaderboard.widthInPixels = width;
                this.leaderboard.heightInPixels = height;
            }

            // Update game HUD
            if (this.gameHUD) {
                this.gameHUD.widthInPixels = width;
                this.gameHUD.heightInPixels = height;
            }

            // Update map editor
            if (this.mapEditor) {
                this.mapEditor.widthInPixels = width;
                this.mapEditor.heightInPixels = height;
            }
        }
    }

    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error('UIManager Error:', message);
        // For now, just log the error. Could implement a proper error UI later.
        // TODO: Implement proper error overlay UI
    }

    /**
     * Cleanup resources
     */
    _doDispose() {
        if (this.fullscreenUI) {
            this.fullscreenUI.dispose();
        }

        this.loadingScreen = null;
        this.mainMenu = null;
        this.settingsOverlay = null;
        this.leaderboard = null;
        this.gameHUD = null;
        this.mapEditor = null;
        this.fullscreenUI = null;

        this.engine = null;
    }

    /**
     * Add a section title inside the settings panel
     * @param {BABYLON.GUI.Container} container
     * @param {string} title
     */
    _addSectionTitle(container, title) {
        const sectionTitle = new BABYLON.GUI.TextBlock(`section_${title.toLowerCase().replace(/\s/g, '_')}`);
        sectionTitle.text = title;
        sectionTitle.color = GameConfig.theme.colors.primary;
        sectionTitle.fontSize = 18;
        sectionTitle.fontFamily = GameConfig.theme.fonts.primary;
        sectionTitle.fontWeight = "bold";
        sectionTitle.heightInPixels = 35;
        sectionTitle.paddingTop = "10px";
        sectionTitle.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.addControl(sectionTitle);
    }

    /**
     * Add an interactive slider setting row
     * @param {BABYLON.GUI.Container} container
     * @param {string} label
     * @param {number} defaultValue
     * @param {Function} onChange
     * @param {number} min
     * @param {number} max
     */
    _addSliderSetting(container, label, defaultValue, onChange, min = 0, max = 1) {
        const row = new BABYLON.GUI.StackPanel(`slider_${label.toLowerCase().replace(/\s/g, '_')}`);
        row.isVertical = false;
        row.heightInPixels = 45;
        row.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.addControl(row);

        // Label
        const labelText = new BABYLON.GUI.TextBlock();
        labelText.text = label;
        labelText.color = GameConfig.theme.colors.textPrimary;
        labelText.fontSize = 14;
        labelText.fontFamily = GameConfig.theme.fonts.primary;
        labelText.widthInPixels = 110;
        labelText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        row.addControl(labelText);

        // Slider
        const slider = new BABYLON.GUI.Slider();
        slider.minimum = min;
        slider.maximum = max;
        slider.value = defaultValue;
        slider.height = "20px";
        slider.width = "150px";
        slider.color = GameConfig.theme.colors.primary;
        slider.background = GameConfig.theme.colors.progressBackground;
        slider.paddingLeft = "10px";
        slider.paddingRight = "10px";
        row.addControl(slider);

        // Value text
        const valueText = new BABYLON.GUI.TextBlock();
        valueText.text = defaultValue.toFixed(2);
        valueText.color = GameConfig.theme.colors.primary;
        valueText.fontSize = 14;
        valueText.fontFamily = GameConfig.theme.fonts.primary;
        valueText.widthInPixels = 50;
        valueText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        row.addControl(valueText);

        // Change handler
        slider.onValueChangedObservable.add((v) => {
            valueText.text = v.toFixed(2);
            if (onChange) onChange(v);
        });
    }

    /**
     * Generic dropdown setting builder
     * @param {BABYLON.GUI.Container} container
     * @param {string} label
     * @param {Array<{label: string, value: any}>} options
     * @param {number} defaultIndex
     * @param {Function} onSelect  (selectedOption) => void
     */
    _createDropdownSetting(container, label, options, defaultIndex = 0, onSelect) {
        // Guard against empty options array
        if (!options || options.length === 0) return;

        // Outer container that will grow/shrink as the menu opens/closes
        const dropdownContainer = new BABYLON.GUI.StackPanel(`dropdown_${label.toLowerCase().replace(/\s/g, '_')}`);
        dropdownContainer.isVertical = true;
        dropdownContainer.heightInPixels = 55; // Label (20) + selector (35)
        dropdownContainer.clipChildren = false; // allow menu to overflow
        container.addControl(dropdownContainer);

        // Label
        const labelText = new BABYLON.GUI.TextBlock();
        labelText.text = label;
        labelText.color = GameConfig.theme.colors.textPrimary;
        labelText.fontSize = 14;
        labelText.fontFamily = GameConfig.theme.fonts.primary;
        labelText.heightInPixels = 20;
        labelText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        labelText.paddingLeft = "10px";
        dropdownContainer.addControl(labelText);

        // Selector rectangle
        const selectorRect = new BABYLON.GUI.Rectangle(`selector_${label.toLowerCase().replace(/\s/g, '_')}`);
        selectorRect.widthInPixels = 200;
        selectorRect.heightInPixels = 33;
        selectorRect.color = GameConfig.theme.colors.border;
        selectorRect.background = GameConfig.theme.colors.backgroundButton;
        selectorRect.thickness = 1;
        selectorRect.cornerRadius = GameConfig.theme.borderRadius.small;
        selectorRect.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        selectorRect.top = "5px";
        selectorRect.clipChildren = false;
        dropdownContainer.addControl(selectorRect);

        // Selected option text
        const selectedText = new BABYLON.GUI.TextBlock();
        selectedText.text = options[defaultIndex].label;
        selectedText.color = GameConfig.theme.colors.textPrimary;
        selectedText.fontSize = 14;
        selectedText.fontFamily = GameConfig.theme.fonts.primary;
        selectedText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        selectedText.paddingLeft = "10px";
        selectorRect.addControl(selectedText);

        // Arrow text (▼ / ▲)
        const arrowText = new BABYLON.GUI.TextBlock();
        arrowText.text = "▼";
        arrowText.color = GameConfig.theme.colors.textPrimary;
        arrowText.fontSize = 14;
        arrowText.fontFamily = GameConfig.theme.fonts.primary;
        arrowText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        arrowText.paddingRight = "10px";
        selectorRect.addControl(arrowText);

        // Options container (hidden by default) - positioned absolutely to avoid layout issues
        const optionsContainer = new BABYLON.GUI.Rectangle(`options_${label.toLowerCase().replace(/\s/g, '_')}`);
        optionsContainer.widthInPixels = 200;
        optionsContainer.heightInPixels = options.length * 35;
        optionsContainer.color = GameConfig.theme.colors.border;
        optionsContainer.background = GameConfig.theme.colors.backgroundPanel;
        optionsContainer.thickness = 1;
        optionsContainer.isVisible = false;
        optionsContainer.clipChildren = false;
        optionsContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        optionsContainer.top = "40px"; // Position directly below selector (20px label + 5px gap + 15px selector height)
        optionsContainer.zIndex = 10000;
        dropdownContainer.addControl(optionsContainer);

        // Build option rows with proper positioning
        options.forEach((opt, idx) => {
            const optRect = new BABYLON.GUI.Rectangle(`opt_${label.toLowerCase().replace(/\s/g, '_')}_${idx}`);
            optRect.widthInPixels = 200;
            optRect.heightInPixels = 33;
            optRect.color = "transparent";
            optRect.background = "transparent";
            optRect.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            optRect.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
            optRect.topInPixels = idx * 35; // Position each option at its correct offset
            optRect.zIndex = 10000;

            // Option text
            const optText = new BABYLON.GUI.TextBlock();
            optText.text = opt.label;
            optText.color = GameConfig.theme.colors.textPrimary;
            optText.fontSize = 14;
            optText.fontFamily = GameConfig.theme.fonts.primary;
            optText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            optText.paddingLeft = "10px";
            optText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            optRect.addControl(optText);

            // Hover effects
            optRect.onPointerEnterObservable.add(() => {
                optRect.background = GameConfig.theme.colors.backgroundButtonHover;
            });
            optRect.onPointerOutObservable.add(() => {
                optRect.background = "transparent";
            });

            // Selection handler
            optRect.onPointerClickObservable.add(() => {
                selectedText.text = opt.label;
                if (onSelect) onSelect(opt);
                toggleMenu(false);
            });

            optionsContainer.addControl(optRect);
        });

        // Toggle helper
        let isOpen = false;
        const closedHeight = dropdownContainer.heightInPixels; // 55
        const openHeight = closedHeight + optionsContainer.heightInPixels + 5;

        const toggleMenu = (forceState = null) => {
            const newState = forceState !== null ? forceState : !isOpen;

            // Close previously open dropdown if it's different
            if (newState && this.openDropdown && this.openDropdown !== toggleMenu) {
                this.openDropdown(false);
            }

            isOpen = newState;
            optionsContainer.isVisible = isOpen;
            arrowText.text = isOpen ? "▲" : "▼";
            selectorRect.background = isOpen ? GameConfig.theme.colors.backgroundButtonHover : GameConfig.theme.colors.backgroundButton;
            dropdownContainer.heightInPixels = isOpen ? openHeight : closedHeight;

            // Track globally
            this.openDropdown = isOpen ? toggleMenu : null;
        };

        // Selector interactions
        selectorRect.onPointerEnterObservable.add(() => {
            if (!isOpen) selectorRect.background = GameConfig.theme.colors.backgroundButtonHover;
        });
        selectorRect.onPointerOutObservable.add(() => {
            if (!isOpen) selectorRect.background = GameConfig.theme.colors.backgroundButton;
        });
        selectorRect.onPointerClickObservable.add(() => {
            toggleMenu();
        });

        return toggleMenu; // in case caller wants to manage it
    }

    /**
     * Build weapon selector dropdown (primary weapons only)
     * @param {BABYLON.GUI.Container} container
     */
    _createWeaponSelector(container) {
        const weaponOptions = WeaponConstants.PRIMARY_WEAPONS.map(type => ({
            label: WeaponConfigs[type].name,
            value: type
        }));

        // By default select the first weapon
        const defaultIndex = 0;

        this._createDropdownSetting(container, "Primary Weapon", weaponOptions, defaultIndex, async (opt) => {
            // Update player's weapon if possible
            try {
                if (this.game && this.game.player && typeof this.game.player.setWeapon === 'function') {
                    this.game.player.setWeapon(opt.value, WeaponConfigs[opt.value]);
                } else if (this.game && this.game.player && this.game.player.weapons) {
                    // Create new weapon and replace the primary weapon
                    const WeaponBaseModule = await import('../entities/weapons/WeaponBase.js');
                    const WeaponBase = WeaponBaseModule.WeaponBase;

                    const weaponBase = new WeaponBase(
                        WeaponConfigs[opt.value],
                        this.game.scene,
                        this.game.particleManager,
                        null,
                        this.game
                    );
                    await weaponBase.initialize();

                    // Replace the primary weapon
                    this.game.player.weapons.set('primary', weaponBase);
                    
                    // If primary is currently equipped, re-equip it to show the new weapon
                    if (this.game.player.currentWeaponSlot === 0) {
                        this.game.player.equipWeapon('primary');
                    }
                    
                    console.log(`Switched primary weapon to: ${opt.label}`);
                }
            } catch (err) {
                console.warn('Failed to switch weapon:', err);
            }
        });
    }

    /**
     * Build the revamped settings content
     * @param {BABYLON.GUI.Container} container
     */
    _populateSettingsContent(container) {
        // Audio Section
        this._addSectionTitle(container, "AUDIO");
        const masterVol = (this.game.audioSystem && this.game.audioSystem.getSettings) ? (this.game.audioSystem.getSettings().masterVolume || 1.0) : 1.0;
        this._addSliderSetting(container, "Master Volume", masterVol, (v) => {
            if (this.game.audioSystem) this.game.audioSystem.setMasterVolume(v);
        }, 0, 1);

        // Music Choice Section
        this._addSectionTitle(container, "MUSIC CHOICE");
        const trackPaths = this.game.audioSystem && this.game.audioSystem.getAvailableTracks ? this.game.audioSystem.getAvailableTracks() : [];
        const trackOptions = trackPaths.map(p => ({ label: p.split('/').pop().replace('.mp3', ''), value: p }));
        if (trackOptions.length > 0) {
            this._createDropdownSetting(container, "Music Track", trackOptions, 0, (opt) => {
                if (this.game.audioSystem) this.game.audioSystem.setFlowstateTrack(opt.value);
            });
        }

        // Main Weapon Section
        this._addSectionTitle(container, "MAIN WEAPON");
        this._createWeaponSelector(container);
    }

    /**
     * Update player name with validation
     * @param {string} newName - New name to set
     */
    _updatePlayerName(newName) {
        console.log('UIManager: _updatePlayerName called with:', newName);
        
        if (!this.game.player || !this.game.player.setName) {
            console.warn('Player not available for name update, storing in localStorage');
            // Store the name in localStorage for when player is created
            try {
                const trimmedName = newName.trim();
                if (trimmedName) {
                    localStorage.setItem('playerName', trimmedName);
                    console.log('UIManager: Stored name in localStorage:', trimmedName);
                }
            } catch (error) {
                console.warn('Failed to store name in localStorage:', error);
            }
            return;
        }

        const trimmedName = newName.trim();
        console.log('UIManager: Trimmed name:', trimmedName);
        
        // Handle empty names - don't clear existing name
        if (!trimmedName) {
            console.log('Empty name provided, keeping current name');
            // Restore the input field to show current name
            if (this.nametagInput) {
                this.nametagInput.text = this.game.player.getName() || "";
            }
            return;
        }
        
        // Don't update if name is unchanged
        const currentName = this.game.player.getName();
        console.log('UIManager: Current player name:', currentName);
        if (trimmedName === currentName) {
            console.log('UIManager: Name unchanged, skipping update');
            return;
        }

        console.log('UIManager: Attempting to update player name from', currentName, 'to:', trimmedName);
        const result = this.game.player.setName(trimmedName);
        console.log('UIManager: setName result:', result);
        
        if (!result.success) {
            console.warn('Failed to update player name:', result.error);
            // Revert the input field to show current valid name
            if (this.nametagInput) {
                this.nametagInput.text = this.game.player.getName() || "";
            }
        } else {
            console.log('Player name successfully updated to:', trimmedName);
            // Update the input field to show the accepted name
            if (this.nametagInput) {
                this.nametagInput.text = this.game.player.getName() || "";
            }
        }
    }

    /**
     * Update nametag input field with current player name
     * @param {BABYLON.GUI.InputText} nametagInput - The nametag input field
     */
    _updateNametagInput(nametagInput) {
        if (!nametagInput) return;
        
        // Store reference to input field for later updates
        this.nametagInput = nametagInput;
        
        // Try to get player name from multiple sources
        let playerName = "";
        
        // First try from initialized player
        if (this.game.player && this.game.player.getName) {
            playerName = this.game.player.getName() || "";
            console.log('UIManager: Got player name from player object:', playerName);
        }
        
        // If no player name, try from localStorage
        if (!playerName) {
            try {
                playerName = localStorage.getItem('playerName') || "";
                console.log('UIManager: Got player name from localStorage:', playerName);
            } catch (error) {
                console.warn('Failed to load player name from storage:', error);
            }
        }
        
        // If still no name, generate a random one
        if (!playerName) {
            console.log('UIManager: No name found, will wait for player initialization');
        }
        
        // Set the input field text
        nametagInput.text = playerName;
        
        console.log('Nametag input updated with name:', playerName);
    }

    /**
     * Update nametag input field from current player name
     * Updates the input field to reflect the current player name
     */
    _updateNametagInputFromPlayer() {
        if (!this.nametagInput) return;
        
        // Don't update if user is currently editing the field or has focus
        if (this.nametagInput.isFocused) {
            console.log('UIManager: Skipping name update - input field is focused');
            return;
        }
        
        // Don't update if user has typed something different from stored name
        // This prevents overriding user input that hasn't been saved yet
        if (this.game.player && this.game.player.getName) {
            const currentName = this.game.player.getName();
            const inputText = this.nametagInput.text;
            
            // Only update if the input is empty or matches the stored name exactly
            if (inputText === "" || inputText === currentName) {
                if (currentName && currentName !== inputText) {
                    this.nametagInput.text = currentName;
                    console.log('Nametag input updated from player:', currentName);
                }
            } else {
                console.log('UIManager: Skipping name update - user has modified input');
            }
        }
    }
}