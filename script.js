// ==UserScript==
// @name         Bomber Script
// @namespace    http://tampermonkey.net/
// @version      2025-06-23
// @description  try to take over the world!
// @author       You
// @match        gameofbombs.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

// Global variables for script control
let active = true; // General toggle state for the bot
let isToggling = false; // Flag to prevent duplicate toggling
let lastFlashTime = 0; // Track the last time a button was flashed
const FLASH_COOLDOWN = 300; // Minimum time between UI flashes in milliseconds
let minimized = false; // Track UI state
let activeKeys = new Set(); // Track currently pressed keys to prevent stuck keys

// Key mapping for easy reference
const KEY_MAP = {
    87: "W",
    65: "A",
    83: "S",
    68: "D",
    75: "K",
    32: "Space",
    82: "R",
    37: "←",
    38: "↑",
    39: "→",
    40: "↓"
};

// Define key codes
const ee = {
    up: { keyCode: 87, key: "w" },
    left: { keyCode: 65, key: "a" },
    down: { keyCode: 83, key: "s" },
    right: { keyCode: 68, key: "d" },
    upLeft: { keys: [87, 65] },
    upRight: { keys: [87, 68] },
    downLeft: { keys: [83, 65] },
    downRight: { keys: [83, 68] }
};

// Initialization queue for features that need to wait for DOM/addon manager
let initQueue = [];
let addonManagerReady = false;

// Create UI for visual feedback
function createVisualUI() {
    // Remove any existing UI first (prevents duplicates on re-initialization)
    const existingUI = document.getElementById('bot-ui-container');
    if (existingUI) {
        existingUI.remove();
    }

    // Inject CSS styles for better animations and effects
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 15px rgba(76, 175, 80, 0.3); }
            50% { box-shadow: 0 0 25px rgba(76, 175, 80, 0.6); }
        }

        @keyframes glow {
            0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
            50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
        }

        .bot-ui-glass {
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .bot-ui-button-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .bot-ui-scroll::-webkit-scrollbar {
            width: 6px;
        }

        .bot-ui-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }

        .bot-ui-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
        }

        .bot-ui-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }
    `;
    document.head.appendChild(style);

    // Create container for the UI
    const uiContainer = document.createElement('div');
    uiContainer.id = 'bot-ui-container';
    uiContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 100px;
        width: 240px;
        background: linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(40, 40, 60, 0.95));
        color: #ffffff;
        padding: 0;
        border-radius: 16px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        z-index: 9999;
        user-select: none;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: slideIn 0.3s ease-out;
        transition: all 0.3s ease;
    `;
    uiContainer.classList.add('bot-ui-glass');

    // Create header with gradient background
    const header = document.createElement('div');
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 12px; height: 12px; background: linear-gradient(45deg, #4CAF50, #45a049); border-radius: 50%; animation: pulse 2s infinite;"></div>
            <span style="font-weight: 600; font-size: 16px;">Бомбер Скрипты</span>
        </div>
    `;
    header.style.cssText = `
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(56, 142, 60, 0.2));
        padding: 16px 20px;
        border-radius: 16px 16px 0 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
    `;
    uiContainer.appendChild(header);

    // Create content area
    const contentArea = document.createElement('div');
    contentArea.id = 'bot-content-area';
    contentArea.style.cssText = `
        padding: 16px 20px;
    `;

    // Activity log removed

    // Add emergency key release button with enhanced styling
    const emergencyButton = document.createElement('button');
    emergencyButton.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="font-size: 14px;">⚠️</span>
            <span>Фикс на заевшие клавишы</span>
        </div>
    `;
    emergencyButton.style.cssText = `
        background: linear-gradient(135deg, #ff4757, #ff3838);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 12px 16px;
        margin-top: 16px;
        cursor: pointer;
        width: 100%;
        font-weight: 600;
        font-size: 13px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
    `;
    emergencyButton.classList.add('bot-ui-button-hover');
    emergencyButton.addEventListener('click', () => {
        releaseAllKeysEmergency();
        logActivity('🚨 Emergency key release triggered!');
        // Add feedback animation
        emergencyButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            emergencyButton.style.transform = '';
        }, 150);
    });
    contentArea.appendChild(emergencyButton);

    uiContainer.appendChild(contentArea);

    // Add minimize/maximize button with better styling
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = '−';
    toggleButton.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        width: 28px;
        height: 28px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        color: #ffffff;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
    `;

    toggleButton.addEventListener('mouseenter', () => {
        toggleButton.style.background = 'rgba(255, 255, 255, 0.2)';
        toggleButton.style.transform = 'scale(1.1)';
    });

    toggleButton.addEventListener('mouseleave', () => {
        toggleButton.style.background = 'rgba(255, 255, 255, 0.1)';
        toggleButton.style.transform = 'scale(1)';
    });

    toggleButton.addEventListener('click', () => {
        minimized = !minimized;
        const contentArea = document.getElementById('bot-content-area');

        if (contentArea) {
            if (minimized) {
                contentArea.style.display = 'none';
                uiContainer.style.width = '200px';
                toggleButton.innerHTML = '+';
            } else {
                contentArea.style.display = 'block';
                uiContainer.style.width = '240px';
                toggleButton.innerHTML = '−';
            }
        }

        // Add click animation
        toggleButton.style.transform = 'scale(0.9)';
        setTimeout(() => {
            toggleButton.style.transform = minimized ? 'scale(1)' : 'scale(1)';
        }, 100);
    });

    uiContainer.appendChild(toggleButton);

    // Add the container to the document
    document.body.appendChild(uiContainer);

    console.log('UI Container created and added to document');
}

// Update UI status for a feature with enhanced visual feedback
function updateStatus(id, active, text = null) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text || (active ? 'ON' : 'OFF');
        element.style.color = active ? '#4CAF50' : '#FF5252';
        element.style.textShadow = active ? '0 0 8px rgba(76, 175, 80, 0.5)' : 'none';

        // Add subtle animation
        element.style.transform = 'scale(1.05)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }
}

// Improved flash function with better visual effects
function flashButtonStatus(id, color = '#FFD700', duration = 200) {
    const now = Date.now();
    if (now - lastFlashTime >= FLASH_COOLDOWN) {
        const element = document.getElementById(id);
        if (element) {
            const originalStyles = {
                backgroundColor: element.style.backgroundColor,
                boxShadow: element.style.boxShadow,
                transform: element.style.transform
            };

            // Enhanced flash effect
            element.style.backgroundColor = color;
            element.style.boxShadow = `0 0 15px ${color}`;
            element.style.transform = 'scale(1.05)';

            setTimeout(() => {
                element.style.backgroundColor = originalStyles.backgroundColor;
                element.style.boxShadow = originalStyles.boxShadow;
                element.style.transform = originalStyles.transform;
            }, duration);
        }
        lastFlashTime = now;
    }
}

// Add message to the log with better formatting
function logActivity(message) {
    const logElement = document.getElementById('bot-log');
    if (logElement) {
        const timestamp = new Date().toLocaleTimeString();
        const logItem = document.createElement('div');
        logItem.style.cssText = `
            padding: 4px 0;
            border-left: 2px solid rgba(76, 175, 80, 0.5);
            padding-left: 8px;
            margin-bottom: 4px;
            background: rgba(76, 175, 80, 0.05);
            border-radius: 4px;
            animation: slideIn 0.3s ease-out;
        `;
        logItem.innerHTML = `
            <div style="color: #4CAF50; font-size: 10px; margin-bottom: 2px;">[${timestamp}]</div>
            <div style="color: #E0E0E0;">${message}</div>
        `;
        logElement.prepend(logItem);

        // Limit number of log items
        if (logElement.children.length > 10) {
            logElement.removeChild(logElement.lastChild);
        }
    }
    console.log(message); // Still log to console as well
}

// Enhanced key simulation functions that track key state
function simulateKeyDown(direction) {
    if (typeof direction === 'number') {
        // Handle single keyCode input
        document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: direction }));
        activeKeys.add(direction); // Add to active keys set
        return;
    }

    if (direction.keys) {
        direction.keys.forEach(keyCode => {
            document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: keyCode }));
            activeKeys.add(keyCode); // Add to active keys set
        });
    } else {
        document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: direction.keyCode, key: direction.key }));
        activeKeys.add(direction.keyCode); // Add to active keys set
    }
}

function simulateKeyUp(direction) {
    if (typeof direction === 'number') {
        // Handle single keyCode input
        document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: direction }));
        activeKeys.delete(direction); // Remove from active keys
        return;
    }

    if (direction.keys) {
        direction.keys.forEach(keyCode => {
            document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: keyCode }));
            activeKeys.delete(keyCode); // Remove from active keys
        });
    } else {
        document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: direction.keyCode, key: direction.key }));
        activeKeys.delete(direction.keyCode); // Remove from active keys
    }
}

// Emergency function to release ALL keys (for stuck keys)
function releaseAllKeysEmergency() {
    // Release all common game keys
    [65, 68, 75, 82, 83, 87, 32, 37, 38, 39, 40].forEach(keyCode => {
        document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: keyCode }));
    });

    // Also release any keys tracked in our activeKeys set
    activeKeys.forEach(keyCode => {
        document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: keyCode }));
    });

    // Clear the active keys set
    activeKeys.clear();

    logActivity("🔄 All keys released - reset complete");

    // Call registered cleanup functions if any exist
    if (typeof window.gameBotCleanupFunctions === 'object') {
        window.gameBotCleanupFunctions.forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error("Error in cleanup function:", e);
            }
        });
    }
}

// Function to add feature display to the UI with enhanced styling
function addFeatureToUI(id, label, initialActive) {
    const contentArea = document.getElementById('bot-content-area');
    if (!contentArea) return false; // UI not initialized yet

    // Check if feature already exists
    if (document.getElementById(id)) return false;

    // Create feature container with enhanced styling
    const featureContainer = document.createElement('div');
    featureContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
    `;

    // Add hover effect
    featureContainer.addEventListener('mouseenter', () => {
        featureContainer.style.background = 'rgba(255, 255, 255, 0.08)';
        featureContainer.style.transform = 'translateX(2px)';
    });

    featureContainer.addEventListener('mouseleave', () => {
        featureContainer.style.background = 'rgba(255, 255, 255, 0.05)';
        featureContainer.style.transform = 'translateX(0)';
    });

    const featureLabel = document.createElement('span');
    featureLabel.textContent = label;
    featureLabel.style.cssText = `
        font-weight: 500;
        font-size: 13px;
        color: #E0E0E0;
    `;

    const status = document.createElement('span');
    status.id = id;
    status.textContent = initialActive ? 'ON' : 'OFF';
    status.style.cssText = `
        font-weight: 600;
        font-size: 11px;
        color: ${initialActive ? '#4CAF50' : '#FF5252'};
        background: ${initialActive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 82, 82, 0.2)'};
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid ${initialActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 82, 82, 0.3)'};
        transition: all 0.2s ease;
        text-shadow: ${initialActive ? '0 0 8px rgba(76, 175, 80, 0.5)' : 'none'};
        min-width: 32px;
        text-align: center;
    `;

    featureContainer.appendChild(featureLabel);
    featureContainer.appendChild(status);

    // Insert at the beginning of content area
    const firstChild = contentArea.firstChild;
    if (firstChild) {
        contentArea.insertBefore(featureContainer, firstChild);
    } else {
        contentArea.appendChild(featureContainer);
    }

    return true;
}

// Initialize addon manager with proper queue handling
window.gameBotAddonManager = {
    // Feature registry
    features: {},

    // Function to register a new feature/addon
    registerFeature: function(id, options) {
        if (this.features[id]) {
            console.warn(`Feature ${id} is already registered`);
            return false;
        }

        this.features[id] = {
            id: id,
            label: options.label || id,
            active: options.initialActive || false,
            initialize: options.initialize || function() {},
            cleanup: options.cleanup || function() {},
            onKeyDown: options.onKeyDown || function() {},
            onKeyUp: options.onKeyUp || function() {}
        };

        // Register cleanup function
        if (!window.gameBotCleanupFunctions) {
            window.gameBotCleanupFunctions = [];
        }
        window.gameBotCleanupFunctions.push(this.features[id].cleanup);

        // Initialize UI for the feature
        addFeatureToUI(id, this.features[id].label, this.features[id].active);

        // Initialize the feature
        try {
            this.features[id].initialize();
            console.log(`Feature ${id} registered and initialized successfully`);
        } catch (e) {
            console.error(`Error initializing feature ${id}:`, e);
        }

        return true;
    }
};

// Process initialization queue
function processInitQueue() {
    initQueue.forEach(initFunc => {
        try {
            initFunc();
        } catch (e) {
            console.error("Error processing init queue item:", e);
        }
    });
    initQueue = [];
    addonManagerReady = true;
}

// Add global document key event handlers
document.addEventListener("keydown", (event) => {
    // Call registered feature keydown handlers
    for (const id in window.gameBotAddonManager.features) {
        try {
            window.gameBotAddonManager.features[id].onKeyDown(event);
        } catch (e) {
            console.error(`Error in ${id} keydown handler:`, e);
        }
    }
});

document.addEventListener("keyup", (event) => {
    // Call registered feature keyup handlers
    for (const id in window.gameBotAddonManager.features) {
        try {
            window.gameBotAddonManager.features[id].onKeyUp(event);
        } catch (e) {
            console.error(`Error in ${id} keyup handler:`, e);
        }
    }
});

// Handle UI visibility restoration when window/tab becomes active again
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && minimized) {
        // If the page was hidden and becomes visible again while UI is minimized
        const contentArea = document.getElementById('bot-content-area');
        if (contentArea) {
            contentArea.style.display = 'none';
        }
    }
});

// Handle any cleanup needed when the window is closing
window.addEventListener('beforeunload', () => {
    // Make sure we clean up by releasing all keys
    releaseAllKeysEmergency();
});

// Function to fix/reload the bot UI and functionality
window.fixGameBot = function() {
    // Release all keys to fix any stuck keys
    releaseAllKeysEmergency();

    // Re-create the UI
    createVisualUI();

    // Re-initialize all registered features
    for (const id in window.gameBotAddonManager.features) {
        const feature = window.gameBotAddonManager.features[id];
        // Add the feature to the UI
        addFeatureToUI(id, feature.label, feature.active);
        // Reinitialize the feature
        try {
            feature.initialize();
        } catch (e) {
            console.error(`Error reinitializing ${id}:`, e);
        }
    }

    console.log("Game bot fixed and restarted!");
    return "Game bot UI and functionality restored.";
};

// Add periodic key state verification to prevent stuck keys
setInterval(() => {
    // If we have movement keys recorded as active for over 5 seconds,
    // something might be wrong - check and possibly release them
    if (activeKeys.size > 0) {
        logActivity("🔍 Periodic key check - ensuring no stuck keys");
    }
}, 5000); // Check every 5 seconds

// Initialize t
