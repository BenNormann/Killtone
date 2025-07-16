/**
 * UIManager - Manages all user interface elements
 * Handles loading screen, main menu, settings overlay, and game HUD
 */

import { GameConfig } from '../mainConfig.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
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
        
        // Initialize GUI system
        this._initializeGUI();
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
            backgroundImage.widthInPixels = this.engine.getRenderWidth();
            backgroundImage.heightInPixels = this.engine.getRenderHeight();
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

        // Create menu buttons container
        const buttonContainer = new BABYLON.GUI.StackPanel("buttonContainer");
        buttonContainer.widthInPixels = panelWidth - 80;
        buttonContainer.heightInPixels = 400;
        buttonContainer.spacing = 15;
        menuPanel.addControl(buttonContainer);

        // Play button
        const playButton = this._createCleanMenuButton("PLAY", () => {
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

        // Create right-side settings panel (1/3 of screen width)
        const settingsPanel = new BABYLON.GUI.Rectangle("settingsPanel");
        const panelWidth = Math.floor(this.engine.getRenderWidth() / 3);
        settingsPanel.widthInPixels = panelWidth;
        settingsPanel.heightInPixels = this.engine.getRenderHeight();
        settingsPanel.color = GameConfig.theme.colors.border;
        settingsPanel.background = GameConfig.theme.colors.backgroundPanel;
        settingsPanel.thickness = 2;
        settingsPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
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
        settingsPanel.addControl(contentContainer);

        // Audio settings section
        this._createCleanSettingsSection(contentContainer, "AUDIO");
        this._createCleanSliderSetting(contentContainer, "Master Volume", 1.0, (value) => {
            if (this.game.audioManager) {
                this.game.audioManager.setMasterVolume(value);
            }
        });
        this._createCleanSliderSetting(contentContainer, "Music Volume", 0.8, (value) => {
            if (this.game.audioManager) {
                this.game.audioManager.setMusicVolume(value);
            }
        });
        this._createCleanSliderSetting(contentContainer, "Effects Volume", 1.0, (value) => {
            if (this.game.audioManager) {
                this.game.audioManager.setEffectsVolume(value);
            }
        });

        // Graphics settings section
        this._createCleanSettingsSection(contentContainer, "GRAPHICS");
        this._createCleanSliderSetting(contentContainer, "FOV", 90, (value) => {
            if (this.game.player && this.game.player.camera) {
                this.game.player.camera.fov = (value * Math.PI) / 180;
            }
        }, 60, 120);

        // Controls settings section
        this._createCleanSettingsSection(contentContainer, "CONTROLS");
        this._createCleanSliderSetting(contentContainer, "Mouse Sensitivity", 1.0, (value) => {
            if (this.game.inputManager) {
                this.game.inputManager.mouseSensitivity = value;
            }
        }, 0.1, 3.0);

        // Close button
        const closeButton = this._createCleanMenuButton("CLOSE", () => {
            this.hideSettingsOverlay();
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

        // Create right-side leaderboard panel (1/3 of screen width)
        const leaderboardPanel = new BABYLON.GUI.Rectangle("leaderboardPanel");
        const panelWidth = Math.floor(this.engine.getRenderWidth() / 3);
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
        contentContainer.spacing = 8;
        contentContainer.top = "-50px";
        leaderboardPanel.addControl(contentContainer);

        // Header row
        const headerContainer = new BABYLON.GUI.Rectangle("headerContainer");
        headerContainer.heightInPixels = 35;
        headerContainer.color = "transparent";
        headerContainer.background = GameConfig.theme.colors.backgroundButtonHover;
        contentContainer.addControl(headerContainer);

        const rankHeader = new BABYLON.GUI.TextBlock("rankHeader");
        rankHeader.text = "#";
        rankHeader.color = GameConfig.theme.colors.textPrimary;
        rankHeader.fontSize = 14;
        rankHeader.fontFamily = GameConfig.theme.fonts.primary;
        rankHeader.fontWeight = "bold";
        rankHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        rankHeader.left = "-110px";
        headerContainer.addControl(rankHeader);

        const nameHeader = new BABYLON.GUI.TextBlock("nameHeader");
        nameHeader.text = "PLAYER";
        nameHeader.color = GameConfig.theme.colors.textPrimary;
        nameHeader.fontSize = 14;
        nameHeader.fontFamily = GameConfig.theme.fonts.primary;
        nameHeader.fontWeight = "bold";
        nameHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        nameHeader.left = "-60px";
        headerContainer.addControl(nameHeader);

        const killsHeader = new BABYLON.GUI.TextBlock("killsHeader");
        killsHeader.text = "KILLS";
        killsHeader.color = GameConfig.theme.colors.textPrimary;
        killsHeader.fontSize = 14;
        killsHeader.fontFamily = GameConfig.theme.fonts.primary;
        killsHeader.fontWeight = "bold";
        killsHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        killsHeader.left = "100px";
        headerContainer.addControl(killsHeader);

        // Get leaderboard data (sample data for now, in real game this would come from server)
        const sampleData = this._getLeaderboardData();

        // Create leaderboard entries
        sampleData.forEach((player, index) => {
            this._createLeaderboardEntry(contentContainer, player, index === 0); // Highlight first place
        });

        // Close button
        const closeButton = this._createCleanMenuButton("CLOSE", () => {
            this.hideLeaderboard();
        });
        closeButton.top = "250px";
        leaderboardPanel.addControl(closeButton);

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
    updateHUD(gameState) {
        if (!this.gameHUD || !this.gameHUD.isVisible) return;

        // Update health
        if (this.gameHUD.healthText && gameState.health !== undefined) {
            this.gameHUD.healthText.text = `Health: ${gameState.health}`;
            this.gameHUD.healthText.color = gameState.health > 50 ? GameConfig.theme.colors.healthHigh : 
                                           gameState.health > 25 ? GameConfig.theme.colors.healthMedium : GameConfig.theme.colors.healthLow;
        }

        // Update ammo
        if (this.gameHUD.ammoText && gameState.ammo !== undefined) {
            this.gameHUD.ammoText.text = `Ammo: ${gameState.ammo.current}/${gameState.ammo.reserve}`;
        }
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
        
        // In a real implementation, this would update the existing leaderboard entries
        // For now, we'll hide and recreate the leaderboard
        this.hideLeaderboard();
        this.showLeaderboard();
    }

    /**
     * Get leaderboard data with comprehensive player statistics
     * @returns {Array} Array of player data objects
     */
    _getLeaderboardData() {
        // Sample multiplayer leaderboard data structure
        // In a real game, this would come from the server/NetworkManager
        const players = [
            { 
                id: 'player1', 
                name: "CyberKiller", 
                kills: 24, 
                deaths: 8, 
                assists: 12, 
                score: 360,
                ping: 45,
                isLocal: false
            },
            { 
                id: 'player2', 
                name: "NeonAssassin", 
                kills: 21, 
                deaths: 12, 
                assists: 8, 
                score: 315,
                ping: 32,
                isLocal: false
            },
            { 
                id: 'player3', 
                name: "RedPhantom", 
                kills: 18, 
                deaths: 9, 
                assists: 15, 
                score: 285,
                ping: 67,
                isLocal: false
            },
            { 
                id: 'player4', 
                name: "YOU", 
                kills: 16, 
                deaths: 11, 
                assists: 9, 
                score: 255,
                ping: 0,
                isLocal: true
            },
            { 
                id: 'player5', 
                name: "PurpleStorm", 
                kills: 14, 
                deaths: 13, 
                assists: 7, 
                score: 225,
                ping: 89,
                isLocal: false
            },
            { 
                id: 'player6', 
                name: "PinkViper", 
                kills: 12, 
                deaths: 15, 
                assists: 11, 
                score: 195,
                ping: 54,
                isLocal: false
            },
            { 
                id: 'player7', 
                name: "ElectroHunter", 
                kills: 9, 
                deaths: 18, 
                assists: 6, 
                score: 150,
                ping: 123,
                isLocal: false
            },
            { 
                id: 'player8', 
                name: "NightRider", 
                kills: 7, 
                deaths: 20, 
                assists: 4, 
                score: 115,
                ping: 76,
                isLocal: false
            }
        ];

        // Sort by score (kills * 15 + assists * 5 - deaths * 5)
        players.sort((a, b) => b.score - a.score);
        
        // Add rank based on sorted position
        players.forEach((player, index) => {
            player.rank = index + 1;
            player.kdr = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
        });

        return players;
    }

    /**
     * Create enhanced leaderboard entry with kill/death statistics
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {Object} player - Player data
     * @param {boolean} isFirst - Whether this is first place
     */
    _createLeaderboardEntry(container, player, isFirst = false) {
        const entryContainer = new BABYLON.GUI.Rectangle(`entry_${player.rank}`);
        entryContainer.heightInPixels = 45;
        entryContainer.color = "transparent";
        entryContainer.background = isFirst ? GameConfig.theme.colors.backgroundButtonHover : 
                                   player.isLocal ? 'rgba(253, 52, 43, 0.2)' : "transparent";
        entryContainer.cornerRadius = GameConfig.theme.borderRadius.small;
        container.addControl(entryContainer);

        // Rank
        const rankText = new BABYLON.GUI.TextBlock(`rank_${player.rank}`);
        rankText.text = `#${player.rank}`;
        rankText.color = isFirst ? GameConfig.theme.colors.primary : 
                        player.isLocal ? GameConfig.theme.colors.primary : GameConfig.theme.colors.textSecondary;
        rankText.fontSize = 16;
        rankText.fontFamily = GameConfig.theme.fonts.primary;
        rankText.fontWeight = isFirst || player.isLocal ? "bold" : "normal";
        rankText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        rankText.left = "-110px";
        rankText.top = "-8px";
        entryContainer.addControl(rankText);

        // Player name
        const nameText = new BABYLON.GUI.TextBlock(`name_${player.rank}`);
        nameText.text = player.name;
        nameText.color = isFirst ? GameConfig.theme.colors.primary : 
                        player.isLocal ? GameConfig.theme.colors.primary : GameConfig.theme.colors.textPrimary;
        nameText.fontSize = 15;
        nameText.fontFamily = GameConfig.theme.fonts.primary;
        nameText.fontWeight = isFirst || player.isLocal ? "bold" : "normal";
        nameText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        nameText.left = "-60px";
        nameText.top = "-8px";
        entryContainer.addControl(nameText);

        // Kills
        const killsText = new BABYLON.GUI.TextBlock(`kills_${player.rank}`);
        killsText.text = player.kills.toString();
        killsText.color = isFirst ? GameConfig.theme.colors.primary : 
                         player.isLocal ? GameConfig.theme.colors.primary : GameConfig.theme.colors.textSecondary;
        killsText.fontSize = 15;
        killsText.fontFamily = GameConfig.theme.fonts.primary;
        killsText.fontWeight = isFirst || player.isLocal ? "bold" : "normal";
        killsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        killsText.left = "100px";
        killsText.top = "-8px";
        entryContainer.addControl(killsText);

        // K/D Ratio and Deaths (smaller text below main info)
        const statsText = new BABYLON.GUI.TextBlock(`stats_${player.rank}`);
        statsText.text = `${player.deaths}D • ${player.kdr} K/D • ${player.assists}A`;
        statsText.color = GameConfig.theme.colors.textSecondary;
        statsText.fontSize = 11;
        statsText.fontFamily = GameConfig.theme.fonts.primary;
        statsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        statsText.left = "-60px";
        statsText.top = "8px";
        entryContainer.addControl(statsText);

        // Ping (for multiplayer)
        if (!player.isLocal) {
            const pingText = new BABYLON.GUI.TextBlock(`ping_${player.rank}`);
            pingText.text = `${player.ping}ms`;
            pingText.color = player.ping < 50 ? GameConfig.theme.colors.textSuccess : 
                           player.ping < 100 ? GameConfig.theme.colors.textWarning : GameConfig.theme.colors.textDanger;
            pingText.fontSize = 11;
            pingText.fontFamily = GameConfig.theme.fonts.primary;
            pingText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
            pingText.left = "100px";
            pingText.top = "8px";
            entryContainer.addControl(pingText);
        }
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
     * Cleanup resources
     */
    dispose() {
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
        
        this.game = null;
        this.scene = null;
        this.engine = null;
    }
}