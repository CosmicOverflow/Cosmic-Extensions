// Name: Keys+ V3
// ID: CosmicKeysPlusV3
// Description: Even more powerful, flexible and optimized key sensing extension.
// By: CosmicOverflow <https://github.com/CosmicOverflow>
// License: MPL-2.0

// Future Update Plans:
//   - Improve handling of 'any' and tags in multiple key input blocks.
//   - Improve input system and overall handling of keys in multiple key input blocks.
//   - Add a layout system for better compatibility for different keyboard layouts.
//   - Key Logger.

// Credits to Ender-Studio for creating Keys+ V1 & 2
(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed) throw new Error("Keys+ V3 must run unsandboxed!");

    const {
        vm: {runtime, extensionManager},
        BlockType, ArgumentType,
        // Cast: {
        //     toString,
        //     toNumber,
        //     toBoolean
        // }
    } = Scratch;

    const createLabel = (text, hide) => ({blockType: BlockType.LABEL, text: text, hideFromPalette: hide});

    if (Scratch.gui) {
        // Credits to SharkPool for the regenerating reporters.
        Scratch.gui.getBlockly().then(SB => {
            const SBUtils = SB.scratchBlocksUtils, originalCheck = SBUtils.isShadowArgumentReporter;
            SBUtils.isShadowArgumentReporter = function (block) {
                if (originalCheck(block)) {
                    return true;
                }
                return block.isShadow() && block.type === "CosmicKeysPlusV3_pressedKeyName";
            };
        });
    }

    const mappings = {
        "Space": "space",
        "ArrowUp": "up arrow",
        "ArrowDown": "down arrow",
        "ArrowLeft": "left arrow",
        "ArrowRight": "right arrow",
        "Backspace": "backspace",
        "Enter": "enter",
        "Any": "any",
        "ShiftLeft": "left shift",
        "ShiftRight": "right shift",
        "ControlLeft": "left control",
        "ControlRight": "right control",
        "AltLeft": "left alt",
        "AltRight": "right alt",
        "MetaRight": "right meta",
        "MetaLeft": "left meta",
        "ContextMenu": "context menu",
        "Escape": "escape",
        "Tab": "tab",
        "KeyA": "a",
        "KeyB": "b",
        "KeyC": "c",
        "KeyD": "d",
        "KeyE": "e",
        "KeyF": "f",
        "KeyG": "g",
        "KeyH": "h",
        "KeyI": "i",
        "KeyJ": "j",
        "KeyK": "k",
        "KeyL": "l",
        "KeyM": "m",
        "KeyN": "n",
        "KeyO": "o",
        "KeyP": "p",
        "KeyQ": "q",
        "KeyR": "r",
        "KeyS": "s",
        "KeyT": "t",
        "KeyU": "u",
        "KeyV": "v",
        "KeyW": "w",
        "KeyX": "x",
        "KeyY": "y",
        "KeyZ": "z",
        "Digit0": "0",
        "Digit1": "1",
        "Digit2": "2",
        "Digit3": "3",
        "Digit4": "4",
        "Digit5": "5",
        "Digit6": "6",
        "Digit7": "7",
        "Digit8": "8",
        "Digit9": "9",
        "Backquote": "backquote",
        "Minus": "minus",
        "Equal": "equal",
        "BracketLeft": "left bracket",
        "BracketRight": "right bracket",
        "Backslash": "backslash",
        "Semicolon": "semicolon",
        "Quote": "quote",
        "Comma": "comma",
        "Period": "period",
        "Slash": "slash",
        "F1": "F1",
        "F2": "F2",
        "F3": "F3",
        "F4": "F4",
        "F5": "F5",
        "F6": "F6",
        "F7": "F7",
        "F8": "F8",
        "F9": "F9",
        "F10": "F10",
        "F11": "F11",
        "F12": "F12",
        "CapsLock": "caps lock",
        "ScrollLock": "scroll lock",
        "NumLock": "num lock",
        "Insert": "insert",
        "Delete": "delete",
        "Home": "home",
        "End": "end",
        "PageUp": "page up",
        "PageDown": "page down",
        "NumpadDivide": "numpad:  divide",
        "NumpadMultiply": "numpad:  multiply",
        "NumpadSubtract": "numpad:  subtract",
        "NumpadAdd": "numpad:  add",
        "Numpad0": "numpad:  0",
        "Numpad1": "numpad:  1",
        "Numpad2": "numpad:  2",
        "Numpad3": "numpad:  3",
        "Numpad4": "numpad:  4",
        "Numpad5": "numpad:  5",
        "Numpad6": "numpad:  6",
        "Numpad7": "numpad:  7",
        "Numpad8": "numpad:  8",
        "Numpad9": "numpad:  9",
        "NumpadDecimal": "numpad:  decimal",
        "NumpadEnter": "numpad: enter"
    };

    function startHats(trigger) {
        runtime.startHats("CosmicKeysPlusV3_eventIsKeyX", {TRIGGER: trigger});
        runtime.startHats("CosmicKeysPlusV3_eventIsKeysX", {TRIGGER: trigger});
        runtime.startHats("CosmicKeysPlusV3_eventIsKeybindX", {TRIGGER: trigger});
    }

    function createExtendableTimeout(callback, duration) {
        let id = setTimeout(callback, duration),
            expiry = Date.now() + duration;
        return {
            tryExtend(newExpiry) {
                if (newExpiry > expiry) {
                    clearTimeout(id);
                    expiry = newExpiry;
                    id = setTimeout(callback, expiry - Date.now());
                }
            },
            expiry() {
                return (expiry - Date.now()) / 1000;
            }
        };
    }

    class KeysPlusV3API {
        // For those wondering, this is separated from the extension class as it is more readable and easier to modifier this way.
        constructor() {
            this.keysPressed = new Map();
            this.blockedKeys = new Set();
            this.timeSinceLastPress = {};
            this.simulatedKeyData = {};
            this.keybindings = {};
            this.keyValues = {};
            this.tags = {
                "#digits": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9",],
                "#shift": ["left shift", "right shift"],
                "#alt": ["left alt", "right alt"],
                "#control": ["left control", "right control"],
                "#windowsKey": ["left meta", "right meta"],
                "#functionKeys": ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
                "#navigationKeys": ["up arrow", "down arrow", "left arrow", "right arrow", "home", "end", "page up", "page down", "insert", "delete"],
                "#numpad": ["numpad: divide", "numpad: multiply", "numpad: subtract", "numpad: add", "numpad: 0", "numpad: 1", "numpad: 2", "numpad: 3", "numpad: 4", "numpad: 5", "numpad: 6", "numpad: 7", "numpad: 8", "numpad: 9", "numpad: decimal", "numpad: enter"]
            };

            this.totalKeysPressed = 0;
            this.currentKeyPressed = "None";
            this.lastKeyPressed = "";
            this.lastKeyReleased = "";

            this.clearOnBlur = true;
            this.sensitivity = 0.03;
            this.errorMsgs = {
                notSimulated: "Key is Not Simulated",
                notYetInitialized: "Key is Not Initialized",
            }

            this.listeners = {
                keyup: [],
                keydown: []
            }

            runtime.on("BEFORE_EXECUTE", () => startHats("while"));

            window.addEventListener("keydown", ({code, key}) => this.__handleKeyDown__(code, false, {code, key}));
            window.addEventListener("keyup", ({code}) => this.__handleKeyUp__(code));
            window.addEventListener("blur", () => {
                if (this.clearOnBlur) this.keysPressed.clear();
            });
        }

        // Event Handlers
        // NOTE: The key 'any' is bound to the current key pressed
        __handleKeyDown__(keyName, simulated = false, attribs) {
            const key = this.formatKey(keyName);
            if (this.blockedKeys.has(key)) return;

            if (this.keysPressed.has(key)) {
                const keyPressed = this.keysPressed.get(key);
                if (simulated) {
                    keyPressed.isSimulated = true;
                } else {
                    keyPressed.isTrulyPressed = true;
                }
            } else {
                this.keyValues[key] = attribs.key;

                const timeStarted = Date.now();

                this.currentKeyPressed = key;
                this.lastKeyPressed = key;
                this.totalKeysPressed++;

                if (!this.keysPressed.has("any")) {
                    this.keysPressed.set("any", {
                        timeStarted, boundTo: key
                    });
                }
                this.keysPressed.set(key, {
                    timeStarted,
                    isSimulated: simulated,
                    isTrulyPressed: !simulated,
                    ...attribs
                });

                this.executeListeners("keydown", key);
                startHats("when");
                runtime.startHats("CosmicKeysPlusV3_eventKeyPressed")
                    .map(thread => thread.CosmicKeysPlusV3 = {_keyPressed: key});
            }
        }

        __handleKeyUp__(keyName, simulated) {
            const key = this.formatKey(keyName);
            if (this.blockedKeys.has(key)) return;

            const pressed = this.keysPressed.get(key);

            if (simulated) {
                pressed.isSimulated = false;
                if (pressed.isTrulyPressed) return;
            } else {
                pressed.isTrulyPressed = false;
                if (pressed.isSimulated) return;
            }

            this.timeSinceLastPress[key] = Date.now();
            this.lastKeyReleased = key;

            startHats("after");
            this.executeListeners("keyup", key);

            this.keysPressed.delete(key);

            if (--this.totalKeysPressed === 0) {
                this.currentKeyPressed = "None";
                this.keysPressed.delete("any");
            } else {
                const current = this.listKeysPressed().at(-1);
                if (this.currentKeyPressed === key) {
                    this.currentKeyPressed = current;
                }
                this.keysPressed.get("any").boundTo = current;
            }
        }

        executeListeners(event, args) {
            if (event === "keydown" || event === "keyup") {
                const listeners = this.listeners[event];
                for (const listener of listeners) {
                    try {
                        listener(args);
                    } catch (error) {
                        console.log(`unexpected error: ${error}`);
                    }
                }
            } else {
                console.log(`event '{event}' is not recognized`);
            }
        }

        addListener(event, callback) {
            if (event === "keyup" || event === "keydown") {
                this.listeners[event].push(callback);
            } else {
                console.log(`event '{event}' is not recognized`);
            }
        }

        // Helper Functions
        formatKey(key) {
            // Previously there was a format key names setting, but was later removed due to the conflicts with the tag system.
            // Might get added back if there would be bugs caused by different keys with the same formatted value. (which won't probably happen)
            return mappings[key]
                ? mappings[key]
                // Just a backup so that keys that weren't listed which the browser supports still get a similar format.
                : mappings[key] = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
        }

        /**
         * @param {string|array} keyList
         * @param {boolean} search
         * @return string[]
         * */
        parseKeyList(keyList, search = false) {
            // Might do caching, but I don't think it's necessary for now.
            const keys = Array.isArray(keyList)
                ? keyList.map(key => String(key))
                : String(keyList).split(",").map(key => key.trim());
            return search ? keys.map(key => this.searchKey(key)) : keys;
        }

        searchKey(keyOrTag) {
            // I can't allow tags in tags because it will cause an issue when the tags have circular references.
            // it can be easily solved but im a little bit lazy today.
            const str = String(keyOrTag);
            if (str[0] === "#") {
                let name, time = Infinity;
                for (const key of this.tags[str] ?? []) {
                    const keyData = this.keysPressed.get(key);
                    if (keyData && keyData.timeStarted < time) {
                        time = keyData.timeStarted;
                        name = key;
                    }
                }
                return name;
            }
            return str;
        }

        #doLater(key, callback, duration, wait) {
            if (this.simulatedKeyData.hasOwnProperty(key)) {
                this.simulatedKeyData[key].tryExtend(Date.now() + duration);
            } else {
                this.simulatedKeyData[key] = createExtendableTimeout(callback, duration);
            }
            if (wait) {
                // We can't use the extendable timeout here because it would make the block wait till the simulation ends.
                return new Promise(resolve => {
                    setTimeout(resolve, duration);
                });
            }
        }

        //
        isKeysPressed(keyList, ordered) {
            const keys = this.parseKeyList(keyList, true);
            if (ordered) {
                const keysPressed = [...this.keysPressed.keys()]
                    .filter(key => keys.includes(key));
                return keys.every((key, idx) =>
                    key === keysPressed[idx]
                );
            }
            return keys.every(key => this.isKeyPressed(key));
        }

        isKeyPressed(key) {
            return this.keysPressed.has(this.searchKey(key));
        }

        isKeyHit(key) {
            const time = this.timeKeyPressed(key);
            return time !== 0 && time <= this.sensitivity;
        }

        isKeyReleased(key) {
            const time = this.timeSinceKeyPressed(key, 0);
            return time !== 0 && time <= this.sensitivity;
        }

        isAnyOfKeysPressed(keys) {
            return this.parseKeyList(keys).some(key => this.isKeyPressed(key));
        }

        isAnyOfKeysHit(keys) {
            return this.parseKeyList(keys).some(key => this.isKeyHit(key));
        }

        isAnyOfKeysReleased(keys) {
            return this.parseKeyList(keys).some(key => this.isKeyReleased(key));
        }

        //
        listKeysPressed() {
            return [...this.keysPressed.keys()];
        }

        //
        timeKeysPressed(keyList, ordered) {
            const keys = this.parseKeyList(keyList);
            if (ordered) {
                return this.isKeysPressed(keyList, ordered) ? this.timeKeyPressed(keys.at(-1)) : 0;
            }
            return Math.min(...keys.map(key => this.timeKeyPressed(key)));
        }

        timeKeyPressed(keyName) {
            const key = this.keysPressed.get(this.searchKey(keyName));
            return key ? (Date.now() - key.timeStarted) / 1000 : 0;
        }

        timeSinceKeyPressed(keyName, error) {
            const key = this.searchKey(keyName),
                timeSince = this.timeSinceLastPress[key];
            if (this.keysPressed.has(key))
                return 0;
            if (key && timeSince)
                return (Date.now() - timeSince) / 1000;
            return error ?? this.errorMsgs.notYetInitialized;
        }

        /* --- Extras --- */

        // Keybindings
        isKeybindTriggered(keybind) {
            const keybinding = this.keybindings[keybind];
            if (!keybinding) return false;
            if (keybinding.type === "multiple") {
                return this.isKeysPressed(keybinding.keys, keybinding.ordered);
            } else {
                return this.isKeyPressed(keybinding.keys[0]);
            }
        }

        timeKeybindTriggered(keybind) {
            const keybinding = this.keybindings[keybind];
            if (!keybinding) return 0;
            if (keybinding.type === "multiple") {
                return this.timeKeysPressed(keybinding.keys, keybinding.ordered);
            } else {
                return this.timeKeyPressed(keybinding.keys[0]);
            }
        }

        bindKeys(keybind, keys, ordered) {
            this.keybindings[String(keybind)] = {
                type: "multiple",
                keys: this.parseKeyList(keys),
                ordered
            };
        }

        bindKey(keybind, key) {
            this.keybindings[String(keybind)] = {
                type: "single",
                keys: [String(key)]
            };
        }

        resetKeybind(keybind) {
            delete this.keybindings[keybind];
        }

        resetAllKeybinds() {
            this.keybindings = {};
        }

        keysBoundTo(keybind) {
            const keybinding = this.keybindings[keybind];
            return keybinding ? keybinding.keys : [];
        }

        listKeybinds() {
            return Object.keys(this.keybindings);
        }

        listActiveKeybinds() {
            const active = [];
            for (const keybind in this.keybindings) {
                if (this.isKeybindTriggered(keybind)) {
                    active.push(keybind);
                }
            }
            return active;
        }

        // Key Simulation
        simulateKeyPress(keyName, duration, wait) {
            const key = String(keyName);

            this.__handleKeyDown__(key, true);
            return this.#doLater(key, () => {
                delete this.simulatedKeyData[key];
                this.__handleKeyUp__(key, true);
            }, duration * 1000, wait);
        }

        isKeySimulated(keyName) {
            const key = this.keysPressed.get(this.searchKey(keyName));
            return key ? key.isSimulated : false;
        }

        isKeyTrulyPressed(keyName) {
            const key = this.keysPressed.get(this.searchKey(keyName));
            return key ? key.isTrulyPressed : false;
        }

        timeUntilSimEnds(keyName) {
            const keyData = this.simulatedKeyData[this.searchKey(keyName)];
            return keyData ? keyData.expiry() : this.errorMsgs.notSimulated;
        }

        // Tags
        setTagValue(id, keys) {
            const tag = `#${id}`;
            if (tag.length > 1) {
                this.tags[tag] = this.parseKeyList(keys);
            }
        }

        valueOfTag(id) {
            return this.tags[`#${id}`] ?? [];
        }

        listTags() {
            return Object.keys(this.tags);
        }

        // Key Detection
        blockKey(key) {
            this.blockedKeys.add(String(key));
        }

        unblockKey(key) {
            this.blockedKeys.delete(key);
        }

        isKeyBlocked(key) {
            return this.blockedKeys.has(key);
        }
    }

    const KeysPlusAPI = new KeysPlusV3API();

    class CosmicKeysPlusV3 {
        constructor() {
            if (!runtime.cosmic) runtime.cosmic = {};
            runtime.cosmic.KeysPlusV3 = { api: KeysPlusV3API, version: "3.0.0" };

            this.hideExtras = true;

            this.keyList = [
                "space", "up arrow", "down arrow", "left arrow", "right arrow", "backspace", "enter", "any", "left shift", "right shift",
                "left control", "right control", "left alt", "right alt", "right meta", "left meta", "context menu", "escape", "tab",
                "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
                "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
                "backquote", "minus", "equal", "left bracket", "right bracket", "backslash", "semicolon", "quote", "comma", "period", "slash",
                "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
                "caps lock", "scroll lock", "num lock",
                "insert", "delete", "home", "end", "page up", "page down",
                "numpad:  divide", "numpad:  multiply", "numpad:  subtract", "numpad:  add",
                "numpad:  0", "numpad:  1", "numpad:  2", "numpad:  3", "numpad:  4", "numpad:  5", "numpad:  6", "numpad:  7", "numpad:  8", "numpad:  9",
                "numpad:  decimal", "numpad: enter"
            ];
        }

        getInfo() {
            return {
                id: "CosmicKeysPlusV3",
                name: "Keys+ V3",
                color1: "#647970",
                color2: "#4D5E56",
                blocks: [
                    createLabel("Keys"),
                    {
                        opcode: "eventKeyPressed",
                        blockType: BlockType.EVENT,
                        text: "when a key is pressed [KEY_NAME]",
                        arguments: {
                            KEY_NAME: {},
                        },
                        isEdgeActivated: false,
                        hideFromPalette: true
                    },
                    {
                        opcode: "pressedKeyName",
                        blockType: BlockType.REPORTER,
                        text: "key name",
                        hideFromPalette: true
                    },
                    {
                        blockType: Scratch.BlockType.XML,
                        xml: `
                            <block type="CosmicKeysPlusV3_eventKeyPressed">
                                <value name="KEY_NAME"><shadow type="CosmicKeysPlusV3_pressedKeyName"></shadow></value>
                            </block>
                        `
                    },
                    {
                        opcode: "eventIsKeysX",
                        blockType: BlockType.HAT,
                        text: "[TRIGGER] [KEYS] keys are pressed [isORDERED]",
                        isEdgeActivated: false,
                        arguments: {
                            TRIGGER: {type: ArgumentType.STRING, menu: "whenWhileAfter"},
                            KEYS: {type: ArgumentType.STRING, defaultValue: "a, b, c"},
                            isORDERED: {type: ArgumentType.STRING, menu: "isOrdered"}
                        }
                    },
                    {
                        opcode: "eventIsKeyX",
                        blockType: BlockType.HAT,
                        text: "[TRIGGER] [KEY] key is pressed",
                        isEdgeActivated: false,
                        arguments: {
                            TRIGGER: {type: ArgumentType.STRING, menu: "whenWhileAfter"},
                            KEY: {type: ArgumentType.STRING, menu: "keys"}
                        }
                    },
                    "---",
                    {
                        opcode: "isKeysPressed",
                        blockType: BlockType.BOOLEAN,
                        text: "are [KEYS] keys pressed [isORDERED]?",
                        arguments: {
                            KEYS: {type: ArgumentType.STRING, defaultValue: 'a, b, c'},
                            isORDERED: {type: ArgumentType.STRING, menu: "isOrdered"}
                        }
                    },
                    {
                        opcode: "isKeyX",
                        blockType: BlockType.BOOLEAN,
                        text: "is [KEY] key [ACTION]?",
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"},
                            ACTION: {type: ArgumentType.STRING, menu: "keyAction"}
                        }
                    },
                    "---",
                    {
                        opcode: "isAnyOfKeysX",
                        blockType: BlockType.BOOLEAN,
                        text: "is any of [KEYS] keys [ACTION]?",
                        arguments: {
                            KEYS: {type: ArgumentType.STRING, defaultValue: 'a, b, c'},
                            ACTION: {type: ArgumentType.STRING, menu: "keyAction"}
                        }
                    },
                    "---",
                    {
                        opcode: "numOfKeysPressed",
                        blockType: BlockType.REPORTER,
                        text: "# of keys pressed"
                    },
                    {
                        opcode: "keysPressed",
                        blockType: BlockType.REPORTER,
                        text: "current keys pressed"
                    },
                    {
                        opcode: "keyPressed",
                        blockType: BlockType.REPORTER,
                        text: "current key pressed"
                    },
                    {
                        opcode: "keyPressedAttrib",
                        blockType: BlockType.REPORTER,
                        text: "current key [ATTRIB]",
                        arguments: {
                            ATTRIB: {type: ArgumentType.STRING, menu: "keyAttributes"}
                        }
                    },
                    "---",
                    {
                        opcode: "keysPressedAsValue",
                        blockType: BlockType.REPORTER,
                        text: "current keys pressed as value"
                    },
                    "---",
                    {
                        opcode: "lastKeyPressed",
                        blockType: BlockType.REPORTER,
                        text: "last key pressed"
                    },
                    {
                        opcode: "lastKeyReleased",
                        blockType: BlockType.REPORTER,
                        text: "last key released"
                    },
                    "---",
                    {
                        opcode: "timeKeysPressed",
                        blockType: BlockType.REPORTER,
                        text: "time [KEYS] keys is pressed [isORDERED]",
                        disableMonitor: true,
                        arguments: {
                            KEYS: {type: ArgumentType.STRING, defaultValue: "a, b, c"},
                            isORDERED: {type: ArgumentType.STRING, menu: "isOrdered"},
                        }
                    },
                    {
                        opcode: "timeKeyPressed",
                        blockType: BlockType.REPORTER,
                        text: "time [KEY] key is pressed",
                        disableMonitor: true,
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"},
                        }
                    },
                    {
                        opcode: "timeSinceKeyPressed",
                        blockType: BlockType.REPORTER,
                        text: "time since [KEY] key was last pressed",
                        disableMonitor: true,
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"},
                        }
                    },
                    "---",
                    {
                        blockType: BlockType.BUTTON,
                        text: `${this.hideExtras ? "Show" : "Hide"} Extras`,
                        func: "toggleExtras"
                    },
                    createLabel("Keybindings", this.hideExtras),
                    {
                        opcode: "eventIsKeybindX",
                        blockType: BlockType.HAT,
                        text: "[TRIGGER] [KEYBIND] keybind is triggered",
                        isEdgeActivated: false,
                        arguments: {
                            TRIGGER: {type: ArgumentType.STRING, menu: "whenWhileAfter"},
                            KEYBIND: {type: ArgumentType.STRING, defaultValue: "keybind"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "isKeybindTriggered",
                        blockType: BlockType.BOOLEAN,
                        text: "is [KEYBIND] keybind triggered",
                        arguments: {
                            KEYBIND: {type: ArgumentType.STRING, defaultValue: "keybind"},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    "---",
                    {
                        opcode: "timeKeybindTriggered",
                        blockType: BlockType.REPORTER,
                        text: "time [KEYBIND] keybind is triggered",
                        arguments: {
                            KEYBIND: {type: ArgumentType.STRING, defaultValue: "keybind"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "keysBoundTo",
                        blockType: BlockType.REPORTER,
                        text: "list keys bound to [KEYBIND]",
                        arguments: {
                            KEYBIND: {type: ArgumentType.STRING, defaultValue: "keybind"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    "---",
                    {
                        opcode: "bindKeys",
                        blockType: BlockType.COMMAND,
                        text: "bind [KEYS] keys [isORDERED] to [KEYBIND]",
                        arguments: {
                            KEYBIND: {type: ArgumentType.STRING, defaultValue: "keybind"},
                            isORDERED: {type: ArgumentType.STRING, menu: "isOrdered"},
                            KEYS: {type: ArgumentType.STRING, defaultValue: "a, b, c"},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "bindKey",
                        blockType: BlockType.COMMAND,
                        text: "bind [KEY] key to [KEYBIND]",
                        arguments: {
                            KEYBIND: {type: ArgumentType.STRING, defaultValue: "keybind"},
                            KEY: {type: ArgumentType.STRING, defaultValue: "space"},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    "---",
                    {
                        opcode: "resetKeybind",
                        blockType: BlockType.COMMAND,
                        text: "reset binds of [KEYBIND]",
                        arguments: {
                            KEYBIND: {type: ArgumentType.STRING, defaultValue: "keybind"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "resetAllKeybinds",
                        blockType: BlockType.COMMAND,
                        text: "reset all keybindings",
                        hideFromPalette: this.hideExtras
                    },
                    "---",
                    {
                        opcode: "listKeybinds",
                        blockType: BlockType.REPORTER,
                        text: "list all keybindings",
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "listActiveKeybinds",
                        blockType: BlockType.REPORTER,
                        text: "list active keybindings",
                        hideFromPalette: this.hideExtras
                    },
                    createLabel("Key Simulation", this.hideExtras),
                    {
                        opcode: "isKeySimulated",
                        blockType: BlockType.BOOLEAN,
                        text: "is [KEY] [isSIMULATED]?",
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"},
                            isSIMULATED: {type: ArgumentType.STRING, menu: "isSimulated"},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "timeUntilSimEnds",
                        blockType: BlockType.REPORTER,
                        text: "time until simulation of [KEY] ends",
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "simulateKeyPress",
                        blockType: BlockType.COMMAND,
                        text: "press [KEY] for [DURATION] seconds and [WAIT]",
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"},
                            DURATION: {type: ArgumentType.NUMBER, defaultValue: 0.5},
                            WAIT: {type: ArgumentType.STRING, menu: "waitOrContinue"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    createLabel("Tags", this.hideExtras),
                    {
                        opcode: "setTagValue",
                        blockType: BlockType.COMMAND,
                        text: "set value of tag #[TAG] to [KEYS]",
                        arguments: {
                            TAG: {type: ArgumentType.STRING, defaultValue: "abc"},
                            KEYS: {type: ArgumentType.STRING, defaultValue: '"a", "b", "c"'},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "valueOfTag",
                        blockType: BlockType.REPORTER,
                        text: "value of tag #[TAG]",
                        arguments: {
                            TAG: {type: ArgumentType.STRING, defaultValue: "abc"},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "listTags",
                        blockType: BlockType.REPORTER,
                        text: "list all tags",
                        hideFromPalette: this.hideExtras
                    },
                    createLabel("Key Detection", this.hideExtras),
                    {
                        opcode: "blockKey",
                        blockType: BlockType.COMMAND,
                        text: "block [KEY] key from detection",
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "unblockKey",
                        blockType: BlockType.COMMAND,
                        text: "unblock [KEY] key from detection",
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "isKeyBlocked",
                        blockType: BlockType.BOOLEAN,
                        text: "is [KEY] key blocked?",
                        arguments: {
                            KEY: {type: ArgumentType.STRING, menu: "keys"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "listBlockedKeys",
                        blockType: BlockType.REPORTER,
                        text: "list blocked keys",
                        hideFromPalette: this.hideExtras
                    },
                    createLabel("Settings", this.hideExtras),
                    {
                        blockType: BlockType.BUTTON,
                        text: "Whats This?",
                        func: "infoSettings",
                        hideFromPalette: this.hideExtras
                    },
                    "---",
                    {
                        opcode: "toggleSetting",
                        blockType: BlockType.COMMAND,
                        text: "set [SETTING] to [VALUE]",
                        arguments: {
                            SETTING: {type: ArgumentType.STRING, menu: "listOfSettings"},
                            VALUE: {type: ArgumentType.STRING, defaultValue: "true"},
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "getSettingValue",
                        blockType: BlockType.REPORTER,
                        text: "value of setting [SETTING]",
                        disableMonitor: true,
                        arguments: {
                            SETTING: {type: ArgumentType.STRING, menu: "listOfSettings"}
                        },
                        hideFromPalette: this.hideExtras
                    },
                    {
                        opcode: "revertSettings",
                        blockType: BlockType.COMMAND,
                        text: "revert settings to default",
                        hideFromPalette: this.hideExtras
                    }
                ],
                menus: {
                    keys: {items: "_generateKeysMenu", acceptReporters: true},
                    keyAction: ["hit", "pressed", "released"],

                    whenWhileAfter: ["when", "while", "after"],

                    waitOrContinue: ["wait", "continue"],
                    toggleMode: ["enabled", "disabled"],

                    keyAttributes: [
                        "code",
                        "value",
                        "formatted name",
                        "time pressed",
                        "is simulated?",
                        "is truly pressed?"
                    ],

                    isSimulated: [
                        {text: "simulated", value: "true"},
                        {text: "truly pressed", value: "false"},
                    ],
                    isOrdered: [
                        {text: "in order", value: "true"},
                        {text: "without order", value: "false"}
                    ],

                    listOfSettings: [
                        "clear on blur",
                        "detection sensitivity",
                        "error message - not simulated",
                        "error message - not yet initialized"
                    ]
                }
            };
        }

        toggleExtras() {
            this.hideExtras = !this.hideExtras;
            extensionManager.refreshBlocks();
        }

        // Extension Blocks
        /* --- Main --- */
        pressedKeyName(_, util) {
            return util.thread.CosmicKeysPlusV3?._keyPressed ?? "";
        }

        eventIsKeysX(args) {
            return KeysPlusAPI.isKeysPressed(args.KEYS, args.isORDERED === "true");
        }

        eventIsKeyX(args) {
            return KeysPlusAPI.isKeyPressed(args.KEY);
        }

        isKeysPressed(args) {
            return KeysPlusAPI.isKeysPressed(args.KEYS, args.isORDERED === "true");
        }

        isKeyX(args) {
            switch (args.ACTION) {
                case "hit":
                    return KeysPlusAPI.isKeyHit(args.KEY);
                case "released":
                    return KeysPlusAPI.isKeyReleased(args.KEY);
                default:
                    return KeysPlusAPI.isKeyPressed(args.KEY);
            }
        }

        isAnyOfKeysX(args) {
            switch (args.ACTION) {
                case "hit":
                    return KeysPlusAPI.isAnyOfKeysHit(args.KEYS);
                case "released":
                    return KeysPlusAPI.isAnyOfKeysReleased(args.KEYS);
                default:
                    return KeysPlusAPI.isAnyOfKeysPressed(args.KEYS);
            }
        }

        numOfKeysPressed() {
            return KeysPlusAPI.totalKeysPressed;
        }

        keysPressed() {
            return JSON.stringify(KeysPlusAPI.listKeysPressed());
        }

        keyPressed() {
            return KeysPlusAPI.currentKeyPressed;
        }

        keyPressedAttrib(args) {
            const keyName = KeysPlusAPI.currentKeyPressed
            const key = KeysPlusAPI.keysPressed.get(keyName) ?? {
                code: "", key: "", isSimulated: false, isTrulyPressed: false
            };
            switch (args.ATTRIB) {
                case "code":
                    return key.code;
                case "value":
                    return key.key;
                case "formatted name":
                    return key.code ? KeysPlusAPI.formatKey(key.code, true) : "";
                case "time pressed":
                    return KeysPlusAPI.timeKeyPressed(keyName);
                case "is simulated?":
                    return key.isSimulated;
                default:
                    return key.isTrulyPressed;
            }
        }

        keysPressedAsValue() {
            return JSON.stringify(KeysPlusAPI.listKeysPressed().map((key) => {
                return KeysPlusAPI.keyValues[key] ?? key;
            }))
        }

        lastKeyPressed() {
            return KeysPlusAPI.lastKeyPressed;
        }

        lastKeyReleased() {
            return KeysPlusAPI.lastKeyReleased;
        }

        timeKeysPressed(args) {
            return KeysPlusAPI.timeKeysPressed(args.KEYS, args.isORDERED === "true");
        }

        timeKeyPressed(args) {
            return KeysPlusAPI.timeKeyPressed(args.KEY);
        }

        timeSinceKeyPressed(args) {
            return KeysPlusAPI.timeSinceKeyPressed(args.KEY);
        }

        /* --- Extras --- */

        // Keybindings
        eventIsKeybindX(args) {
            return KeysPlusAPI.isKeybindTriggered(args.KEYBIND);
        }

        isKeybindTriggered(args) {
            return KeysPlusAPI.isKeybindTriggered(args.KEYBIND);
        }

        timeKeybindTriggered(args) {
            return KeysPlusAPI.timeKeybindTriggered(args.KEYBIND);
        }

        keysBoundTo(args) {
            return JSON.stringify(KeysPlusAPI.keysBoundTo(args.KEYBIND));
        }

        bindKeys(args) {
            KeysPlusAPI.bindKeys(args.KEYBIND, args.KEYS, args.isORDERED === "true");
        }

        bindKey(args) {
            KeysPlusAPI.bindKey(args.KEYBIND, args.KEY);
        }

        resetKeybind(args) {
            KeysPlusAPI.resetKeybind(args.KEYBIND)
        }

        resetAllKeybinds() {
            KeysPlusAPI.resetAllKeybinds();
        }

        listKeybinds() {
            return JSON.stringify(KeysPlusAPI.listKeybinds());
        }

        listActiveKeybinds() {
            return JSON.stringify(KeysPlusAPI.listActiveKeybinds());
        }

        // Key Simulation
        simulateKeyPress(args) {
            return KeysPlusAPI.simulateKeyPress(args.KEY, args.DURATION, args.WAIT === "wait");
        }

        isKeySimulated(args) {
            if (args.isSIMULATED === "true") {
                return KeysPlusAPI.isKeySimulated(args.KEY);
            }
            return KeysPlusAPI.isKeyTrulyPressed(args.KEY);
        }

        timeUntilSimEnds(args) {
            return KeysPlusAPI.timeUntilSimEnds(args.KEY);
        }

        // Tags
        setTagValue(args) {
            KeysPlusAPI.setTagValue(args.TAG, args.KEYS);
        }

        valueOfTag(args) {
            return JSON.stringify(KeysPlusAPI.valueOfTag(args.TAG));
        }

        listTags() {
            return JSON.stringify(KeysPlusAPI.listTags());
        }

        // Key Detection
        blockKey(args) {
            KeysPlusAPI.blockKey(args.KEY);
        }

        unblockKey(args) {
            KeysPlusAPI.unblockKey(args.KEY);
        }

        isKeyBlocked(args) {
            return KeysPlusAPI.isKeyBlocked(args.KEY);
        }

        listBlockedKeys() {
            return JSON.stringify([...KeysPlusAPI.blockedKeys]);
        }

        // Settings
        infoSettings() {
            const lines = [
                "Whats This?",
                "\n   This area contains blocks that allow you to customize/tweak some of the extension's behavior. Take note changes made aren't saved automatically, thus requiring you to set the values on your project's initialization.",
                "\n       1.) clear on blur (true/false): Enabling this will clear the list of keys pressed everytime focus is lost (ex. window minimized).",
                "\n       2.) detection sensitivity (number): Decides how long (in seconds) until a key press/release is no longer considered a key hit/release.",
                "\n       3.) error message - not simulated (any): indicates the value to be returned by the 'time until simulation ends' block when the key isn't being simulated.",
                "\n       3.) error message - not yet initialized (any): indicates the value to be returned by the 'time since key last pressed' block when the key hasn't been pressed at least once."
            ]
            alert(lines.join("\n"));
        }

        toggleSetting(args) {
            // Might add new settings and something to show their description.
            switch (args.SETTING) {
                case "clear on blur":
                    return KeysPlusAPI.clearOnBlur = Boolean(args.VALUE);
                case "detection sensitivity":
                    return KeysPlusAPI.sensitivity = Number(args.VALUE) || 0.028;
                case "error message - not simulated":
                    return KeysPlusAPI.errorMsgs.notSimulated = args.VALUE;
                case "error message - not yet initialized":
                    return KeysPlusAPI.errorMsgs.notYetInitialized = args.VALUE;
            }
        }

        getSettingValue(args) {
            switch (args.SETTING) {
                case "clear on blur":
                    return KeysPlusAPI.clearOnBlur;
                case "detection sensitivity":
                    return KeysPlusAPI.sensitivity;
                case "error message - not simulated":
                    return KeysPlusAPI.errorMsgs.notSimulated;
                case "error message - not yet initialized":
                    return KeysPlusAPI.errorMsgs.notYetInitialized;
            }
        }

        revertSettings() {
            KeysPlusAPI.sensitivity = 0.028;
            KeysPlusAPI.clearOnBlur = true;
            KeysPlusAPI.errorMsgs = {
                notSimulated: "Key is Not Simulated",
                notYetInitialized: "Key is Not Initialized"
            };
        }

        // Menus
        _generateKeysMenu() {
            return [...this.keyList, ...KeysPlusAPI.listTags()];
        }
    }

    Scratch.extensions.register(new CosmicKeysPlusV3());
})(Scratch);
