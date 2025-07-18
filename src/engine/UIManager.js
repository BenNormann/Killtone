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
}