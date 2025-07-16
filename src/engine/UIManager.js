/**
 * UIManager - Manages all user interface elements
 * Handles loading screen, main menu, settings overlay, and game HUD
 */

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
        loadingText.color = "white";
        loadingText.fontSize = 24;
        loadingText.fontFamily = "Arial";
        loadingText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        loadingText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        loadingText.top = "100px";
        this.loadingScreen.addControl(loadingText);

        // Create progress bar background
        const progressBg = new BABYLON.GUI.Rectangle("progressBg");
        progressBg.widthInPixels = 400;
        progressBg.heightInPixels = 20;
        progressBg.color = "white";
        progressBg.background = "rgba(0, 0, 0, 0.5)";
        progressBg.top = "150px";
        this.loadingScreen.addControl(progressBg);

        // Create progress bar fill
        const progressFill = new BABYLON.GUI.Rectangle("progressFill");
        progressFill.widthInPixels = 0;
        progressFill.heightInPixels = 18;
        progressFill.color = "transparent";
        progressFill.background = "#00ff00";
        progressFill.left = "-200px";
        progressFill.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        progressBg.addControl(progressFill);

        // Create progress text
        const progressText = new BABYLON.GUI.TextBlock("progressText");
        progressText.text = "0%";
        progressText.color = "white";
        progressText.fontSize = 16;
        progressText.fontFamily = "Arial";
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
     * Show main menu with LOADINGIMAGE.png background
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
        menuPanel.color = "transparent";
        menuPanel.background = "rgba(0, 0, 0, 0.85)";
        menuPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.mainMenu.addControl(menuPanel);

        // Create title
        const title = new BABYLON.GUI.TextBlock("gameTitle");
        title.text = "KILLtONE";
        title.color = "#ff0000";
        title.fontSize = 42;
        title.fontFamily = "Arial";
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
        this.settingsOverlay.background = "rgba(0, 0, 0, 0.8)";
        this.fullscreenUI.addControl(this.settingsOverlay);

        // Create right-side settings panel (1/3 of screen width)
        const settingsPanel = new BABYLON.GUI.Rectangle("settingsPanel");
        const panelWidth = Math.floor(this.engine.getRenderWidth() / 3);
        settingsPanel.widthInPixels = panelWidth;
        settingsPanel.heightInPixels = this.engine.getRenderHeight();
        settingsPanel.color = "transparent";
        settingsPanel.background = "rgba(0, 0, 0, 0.95)";
        settingsPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.settingsOverlay.addControl(settingsPanel);

        // Settings title
        const title = new BABYLON.GUI.TextBlock("settingsTitle");
        title.text = "SETTINGS";
        title.color = "#ff0000";
        title.fontSize = 32;
        title.fontFamily = "Arial";
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
        this.leaderboard.background = "rgba(0, 0, 0, 0.8)";
        this.fullscreenUI.addControl(this.leaderboard);

        // Create right-side leaderboard panel (1/3 of screen width)
        const leaderboardPanel = new BABYLON.GUI.Rectangle("leaderboardPanel");
        const panelWidth = Math.floor(this.engine.getRenderWidth() / 3);
        leaderboardPanel.widthInPixels = panelWidth;
        leaderboardPanel.heightInPixels = this.engine.getRenderHeight();
        leaderboardPanel.color = "transparent";
        leaderboardPanel.background = "rgba(0, 0, 0, 0.95)";
        leaderboardPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.leaderboard.addControl(leaderboardPanel);

        // Leaderboard title
        const title = new BABYLON.GUI.TextBlock("leaderboardTitle");
        title.text = "LEADERBOARD";
        title.color = "#ff0000";
        title.fontSize = 28;
        title.fontFamily = "Arial";
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
        headerContainer.background = "rgba(255, 0, 0, 0.3)";
        contentContainer.addControl(headerContainer);

        const rankHeader = new BABYLON.GUI.TextBlock("rankHeader");
        rankHeader.text = "RANK";
        rankHeader.color = "#ffffff";
        rankHeader.fontSize = 16;
        rankHeader.fontFamily = "Arial";
        rankHeader.fontWeight = "bold";
        rankHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        rankHeader.left = "-80px";
        headerContainer.addControl(rankHeader);

        const nameHeader = new BABYLON.GUI.TextBlock("nameHeader");
        nameHeader.text = "PLAYER";
        nameHeader.color = "#ffffff";
        nameHeader.fontSize = 16;
        nameHeader.fontFamily = "Arial";
        nameHeader.fontWeight = "bold";
        nameHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        headerContainer.addControl(nameHeader);

        const scoreHeader = new BABYLON.GUI.TextBlock("scoreHeader");
        scoreHeader.text = "KILLS";
        scoreHeader.color = "#ffffff";
        scoreHeader.fontSize = 16;
        scoreHeader.fontFamily = "Arial";
        scoreHeader.fontWeight = "bold";
        scoreHeader.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        scoreHeader.left = "80px";
        headerContainer.addControl(scoreHeader);

        // Sample leaderboard data (in real game, this would come from server)
        const sampleData = [
            { rank: 1, name: "Player1", kills: 15, deaths: 3 },
            { rank: 2, name: "Player2", kills: 12, deaths: 5 },
            { rank: 3, name: "Player3", kills: 10, deaths: 7 },
            { rank: 4, name: "Player4", kills: 8, deaths: 9 },
            { rank: 5, name: "Player5", kills: 6, deaths: 11 },
            { rank: 6, name: "Player6", kills: 4, deaths: 13 },
            { rank: 7, name: "Player7", kills: 2, deaths: 15 }
        ];

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
        crosshair.color = "white";
        crosshair.background = "white";
        this.gameHUD.addControl(crosshair);

        // Health display
        const healthText = new BABYLON.GUI.TextBlock("healthText");
        healthText.text = "Health: 100";
        healthText.color = "red";
        healthText.fontSize = 18;
        healthText.fontFamily = "Arial";
        healthText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        healthText.left = "20px";
        healthText.top = "-20px";
        this.gameHUD.addControl(healthText);

        // Ammo display
        const ammoText = new BABYLON.GUI.TextBlock("ammoText");
        ammoText.text = "Ammo: 30/90";
        ammoText.color = "white";
        ammoText.fontSize = 18;
        ammoText.fontFamily = "Arial";
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
        leftToolbar.color = "white";
        leftToolbar.background = "rgba(0, 0, 0, 0.7)";
        leftToolbar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.mapEditor.addControl(leftToolbar);

        // Right properties panel
        const rightPanel = new BABYLON.GUI.Rectangle("rightPanel");
        rightPanel.widthInPixels = 250;
        rightPanel.heightInPixels = this.engine.getRenderHeight();
        rightPanel.color = "white";
        rightPanel.background = "rgba(0, 0, 0, 0.7)";
        rightPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.mapEditor.addControl(rightPanel);

        // Editor title
        const title = new BABYLON.GUI.TextBlock("editorTitle");
        title.text = "MAP EDITOR";
        title.color = "white";
        title.fontSize = 20;
        title.fontFamily = "Arial";
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
            this.gameHUD.healthText.color = gameState.health > 50 ? "green" : 
                                           gameState.health > 25 ? "yellow" : "red";
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
        messageText.color = "#ff0000";
        messageText.fontSize = 32;
        messageText.fontFamily = "Arial";
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
        button.color = "#ffffff";
        button.background = "rgba(255, 255, 255, 0.1)";
        button.cornerRadius = 8;
        button.fontSize = 20;
        button.fontFamily = "Arial";
        button.fontWeight = "bold";
        button.thickness = 2;
        
        // Hover effects
        button.onPointerEnterObservable.add(() => {
            button.background = "rgba(255, 0, 0, 0.4)";
            button.color = "#ffffff";
            button.thickness = 3;
        });
        
        button.onPointerOutObservable.add(() => {
            button.background = "rgba(255, 255, 255, 0.1)";
            button.color = "#ffffff";
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
        button.color = "white";
        button.background = "rgba(255, 0, 0, 0.6)";
        button.cornerRadius = 5;
        button.fontSize = 18;
        button.fontFamily = "Arial";
        button.fontWeight = "bold";
        
        // Hover effects
        button.onPointerEnterObservable.add(() => {
            button.background = "rgba(255, 0, 0, 0.8)";
        });
        
        button.onPointerOutObservable.add(() => {
            button.background = "rgba(255, 0, 0, 0.6)";
        });
        
        // Click handler
        button.onPointerClickObservable.add(onClick);
        
        return button;
    }

    /**
     * Create settings section header
     * @param {BABYLON.GUI.Container} container - Parent container
     * @param {string} title - Section title
     */
    _createSettingsSection(container, title) {
        const sectionTitle = new BABYLON.GUI.TextBlock(`section_${title.toLowerCase()}`);
        sectionTitle.text = title;
        sectionTitle.color = "#ffff00";
        sectionTitle.fontSize = 20;
        sectionTitle.fontFamily = "Arial";
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
        labelText.color = "white";
        labelText.fontSize = 16;
        labelText.fontFamily = "Arial";
        labelText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        labelText.left = "-200px";
        settingContainer.addControl(labelText);

        const valueText = new BABYLON.GUI.TextBlock(`value_${label.toLowerCase()}`);
        valueText.text = defaultValue.toString();
        valueText.color = "white";
        valueText.fontSize = 16;
        valueText.fontFamily = "Arial";
        valueText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        valueText.left = "200px";
        settingContainer.addControl(valueText);

        // Note: Babylon.js GUI doesn't have a built-in slider, so we'll use a simple implementation
        // In a full implementation, you'd create a custom slider or use a third-party solution
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
        this.gameHUD = null;
        this.mapEditor = null;
        this.fullscreenUI = null;
        
        this.game = null;
        this.scene = null;
        this.engine = null;
    }
}