import { exec, spawn, toast } from "./assets/kernelsu.js";

let scriptOnly = false;
let shellRunning = false;
let initialPinchDistance = null;
let currentFontSize = 14;
let model = null, product = null;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;

const repository = 'KOWX712/PlayIntegrityFix';
const branch = 'inject_s';
const moddir = '/data/adb/modules/playintegrityfix';

const spoofConfig = [
    { config: 'spoofBuild', label: 'Spoof Build' },
    { config: 'spoofVendingBuild', label: 'Spoof Build (Play Store)' },
    { config: 'spoofProps', label: 'Spoof Props' },
    { config: 'spoofProvider', label: 'Spoof Provider' },
    { config: 'spoofSignature', label: 'Spoof Signature' },
    { config: 'spoofVendingSdk', label: 'Spoof Sdk (Play Store)' }
];

// Append spoofConfig buttons
function appendSpoofConfigToggles() {
    const buttonBox = document.querySelector('.button-box');
    if (!buttonBox) return;

    spoofConfig.forEach((item) => {
        const { config, label } = item;
        const container = document.createElement('label');
        container.className = 'spoof-option';
        container.id = `${config}-container`;
        container.innerHTML = `${label}<md-switch id="${config}-toggle"></md-switch><md-ripple></md-ripple>`;

        buttonBox.appendChild(container);
    });

    applyButtonEventListeners();
}

// Apply button event listeners
function applyButtonEventListeners() {
    const fetchBtn = document.getElementById('fetch');
    const autopifBtn = document.getElementById('autopif');
    const viewBtn = document.getElementById('view');
    const securityPatchBtn = document.getElementById('security-patch');
    const scriptOnlyBtn = document.getElementById('script-only');
    const clearButton = document.getElementById('clear-terminal');
    const terminal = document.querySelector('.output-terminal-content');
    const selectDeviceDialog = document.getElementById('select-device-dialog');
    const confirmFetchBtn = document.getElementById('confirm-fetch');
    const githubBtn = document.getElementById('github-btn');
    const helpBtn = document.getElementById('help-btn');

    fetchBtn.onclick = () => selectDeviceDialog.show();

    autopifBtn.onclick = runAction;

    viewBtn.onclick = async () => {
        const result = await exec(`
            if [ -f /data/adb/pif.prop ]; then
                cat /data/adb/pif.prop
            else
                cat ${moddir}/pif.prop
            fi
        `);
        if (result.errno === 0) {
            const lines = result.stdout.split('\n').filter(line => line.trim() !== '');
            lines.forEach(line => appendToOutput(line));
            appendToOutput("");
        } else {
            appendToOutput(`[!] Failed to read pif.prop: ${result.stderr}`, true);
        }
    }

    securityPatchBtn.onclick = async () => {
        await exec(`sh ${moddir}/security_patch.sh --${securityPatchBtn.selected ? 'enable' : 'disable'}`);
        await loadAutoSecurityPatchConfig();
        appendToOutput(`[+] ${securityPatchBtn.selected ? 'Enabled' : 'Disbled'} auto security patch.`);
    }

    scriptOnlyBtn.onclick = async () => {
        await exec(`${scriptOnly ? 'rm -rf /data/adb/pif_script_only' : 'touch /data/adb/pif_script_only'} || true`);
        killGms();
        loadScriptOnlyConfig();
        appendToOutput(`[+] ${scriptOnly ? 'Disabled' : 'Enabled'} script only mode.`);
    }

    confirmFetchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const deviceList = document.getElementById('device-list');
        deviceList.querySelectorAll('md-radio').forEach(item => {
            if (!item.checked) return;
            product = item.value;
            model = item.getAttribute('data-model');
            fetchPifProp();
            selectDeviceDialog.close();
        })
    });

    clearButton.onclick = () => {
        terminal.innerHTML = '';
        currentFontSize = 14;
        updateFontSize(currentFontSize);
    }

    terminal.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });
    terminal.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            
            if (initialPinchDistance === null) {
                initialPinchDistance = currentDistance;
                return;
            }

            const scale = currentDistance / initialPinchDistance;
            const newFontSize = currentFontSize * scale;
            updateFontSize(newFontSize);
            initialPinchDistance = currentDistance;
        }
    }, { passive: false });
    terminal.addEventListener('touchend', () => {
        initialPinchDistance = null;
    });
    
    githubBtn.onclick = () => linkRedirect(`https://github.com/${repository}/releases/latest`);
    helpBtn.onclick = () => linkRedirect(`https://github.com/${repository}#options`);
}

function linkRedirect(link) {
    toast("Redirecting to " + link);
    setTimeout(() => {
        exec(`am start -a android.intent.action.VIEW -d ${link}`)
            .then(({ errno }) => {
                if (errno !== 0) window.open(link, "_blank");
            });
    }, 100);
}

// Function to load the version from module.prop
function loadVersionFromModuleProp() {
    const versionElement = document.getElementById('version-text');
    exec(`grep '^version=' ${moddir}/module.prop | cut -d'=' -f2`)
        .then((result) => {
            if (result.errno !== 0) return;
            versionElement.textContent = result.stdout.trim();
            checkDescription();
        });
}

// Check description
async function checkDescription() {
    const unofficialDialog = document.getElementById('unofficial-warning');
    const { errno } = await exec(`grep -q 'tampered' ${moddir}/module.prop`);
    if (typeof ksu !== 'undefined' && errno === 0) unofficialDialog.show();
}

// Function to load spoof config
async function loadSpoofConfig() {
    try {
        const { errno, stdout, stderr } = await exec(`test -f /data/adb/pif.prop && cat /data/adb/pif.prop || cat ${moddir}/pif.prop`);
        if (errno !== 0) throw new Error(stderr);

        const pifMap = parsePropToMap(stdout);
        spoofConfig.forEach(item => {
            const toggle = document.getElementById(`${item.config}-toggle`);
            toggle.selected = pifMap[item.config];
        });

        if (model === null) model = pifMap.MODEL;
    } catch (error) {
        appendToOutput(`[!] Failed to load spoof config: ${error}`, true);
        appendToOutput('[!] Warning: Do not use third party tools to fetch pif.prop');
        resetPifProp();
    }
}

// Reset pif.prop to default
function resetPifProp() {
    fetch(`https://raw.githubusercontent.com/${repository}/${branch}/module/pif.prop`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.text();
        })
        .catch(error => {
            return fetch(`https://raw.gitmirror.com/${repository}/${branch}/module/pif.prop`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.text();
                });
        })
        .then(async text => {
            const pifProp = text.trim();
            const { errno, stderr } = await exec(`
                echo '${pifProp}' > ${moddir}/pif.prop
                rm -f /data/adb/pif.prop || true
            `);
            if (errno === 0) {
                appendToOutput(`[+] Successfully reset pif.prop`);
            } else {
                appendToOutput(`[!] Failed to reset pif.prop: ${stderr}`, true);
            }
        })
        .catch(error => {
            appendToOutput(`[!] Failed to reset pif.prop: ${error.message}`);
        });
}

// Function to setup spoof config button
function setupSpoofConfigButton() {
    spoofConfig.forEach(item => {
        const toggle = document.getElementById(`${item.config}-toggle`);

        toggle.addEventListener('change', () => {
            if (shellRunning) return;
            let pifFile = '';
            const result = spawn(`
                [ ! -f ${moddir}/pif.prop ] || echo "${moddir}/pif.prop"
                [ ! -f /data/adb/pif.prop ] || echo "/data/adb/pif.prop"
            `);
            result.stdout.on('data', (data) => pifFile += data + '\n');
            result.stderr.on('data', (data) => appendToOutput(`[!] Failed to find pif.prop: ` + data, true));
            result.on('exit',  (code) => {
                if (code !== 0) return;
                updateSpoofConfig(toggle, item.config, pifFile);
                killGms();
            });
        });
    });
}

function killGms() {
    spawn('kill', ['-9', '$(busybox pidof com.google.android.gms.unstable com.android.vending)'],
        { env: { PATH: "$PATH:/data/adb/ap/bin:/data/adb/ksu/bin:/data/adb/magisk" } });
}

/**
 * Update pif.prop
 * @param {HTMLInputElement} toggle - config toggle of pif.prop
 * @param {string} type - prop key to change
 * @param {string} pifFile - Path of pif.prop list
 * @returns {void}
 */
function updateSpoofConfig(toggle, type, pifFile) {
    let reminded = false, prompted = false;
    const files = pifFile.split('\n').filter(line => line.trim() !== '');

    for (const pifFile of files) {
        try {
            let stdout = '';

            // read
            const read = spawn(`cat ${pifFile}`);
            read.stdout.on('data', (data) => stdout += data + '\n');
            read.on('exit', async () => {
                const pifMap = parsePropToMap(stdout);

                // update field
                pifMap[type] = toggle.selected;
                const prop = parseMapToProp(pifMap);

                // write
                const write = spawn(`echo '${prop}' > ${pifFile}`);
                write.on('exit', (code) => {
                    if (code === 0) {
                        if (prompted) return;
                        prompted = true;
                        appendToOutput(`[+] ${toggle.selected ? "Enabled" : "Disabled"} ${type}`);
                    } else {
                        throw new Error('Failed to write ' + pifFile);
                    }
                });

                // reminder
                if (!reminded && (type === "spoofVendingBuild" || type === "spoofVendingSdk") && pifMap.spoofVendingBuild && pifMap.spoofVendingSdk) {
                    appendToOutput('[!] spoofVendingSdk will not take effect when spoofVendingBuild is enabled.');
                    reminded = true;
                }

                // reminder
                if (!reminded && type === "spoofSignature") {
                    reminded = true;
                    const signature = await exec('unzip -l /system/etc/security/otacerts.zip | grep -oE "testkey|releasekey"');
                    if (signature.errno === 0) {
                        if (signature.stdout.trim() === "testkey" && !pifMap.spoofSignature) {
                            appendToOutput('[!] Unsigned ROM detected, enable spoofSignature to fix.');
                        } else if (signature.stdout.trim() === "releasekey" && pifMap.spoofSignature) {
                            appendToOutput('[+] Signed ROM detected, enabling spoofSignature might not be useful.');
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`Failed to update ${pifFile}:`, error);
            appendToOutput(`[!] Failed to ${toggle.selected ? "enable" : "disable"} ${item.config}`);
        }
    }
}

// Function to append element in output terminal
function appendToOutput(content, error = false) {
    const output = document.querySelector('.output-terminal-content');
    if (content.trim() === "") {
        const lineBreak = document.createElement('br');
        output.appendChild(lineBreak);
    } else {
        const line = document.createElement('p');
        line.className = 'output-content';
        line.innerHTML = content;
        if (error) line.style.color = 'red';
        output.appendChild(line);
    }
    output.scrollTop = output.scrollHeight;
}

// Function to run the script and display its output
function runAction() {
    if (shellRunning) return;
    muteToggle(true);
    let opts = {};
    if (model && product) opts = { env: { MODEL: `"${model}"`, PRODUCT: `"${product}"`} };
    const scriptOutput = spawn("sh", [`${moddir}/autopif.sh`], opts);
    scriptOutput.stdout.on('data', (data) => appendToOutput(data));
    scriptOutput.stderr.on('data', (data) => appendToOutput(`[!] Error executing autopif.sh: ${data}`, true));
    scriptOutput.on('exit', () => {
        appendToOutput("");
        muteToggle(false);
    });
    scriptOutput.on('error', () => {
        appendToOutput("[!] Error: Fail to execute autopif.sh", true);
        appendToOutput("");
        muteToggle(false);
    });
}

function updateAutopif() {
    muteToggle(true);
    const scriptOutput = spawn("sh", [`${moddir}/autopif_ota.sh`]);
    scriptOutput.stdout.on('data', (data) => appendToOutput(data));
    scriptOutput.stderr.on('data', (data) => appendToOutput(`[!] Error executing autopif_ota.sh: ${data}`, true));
    scriptOutput.on('exit', () => muteToggle(false));
    scriptOutput.on('error', () => {
        appendToOutput("[!] Error: Fail to execute autopif_ota.sh", true);
        appendToOutput("");
        muteToggle(false);
    });
}

function muteToggle(mute, scriptOnly = null) {
    shellRunning = mute;
    document.querySelectorAll('md-switch, md-assist-chip, md-filter-chip, md-ripple').forEach(item => {
        if (item.id === 'script-only' || item.hasAttribute('unsupported') || (scriptOnly === null && item.hasAttribute('scrip-only'))) return;
        if (scriptOnly) scriptOnly ? item.setAttribute('scrip-only', '') : item.removeAttribute('scrip-only');
        item.disabled = mute
    });
}

/**
 * Parse prop to map
 * @param {string} prop - prop string
 * @returns {Object} - map of prop
 */
function parsePropToMap(prop) {
    const map = {};
    if (!prop || typeof prop !== 'string') return map;
    const lines = prop.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if (value === 'true' || value === 'false') value = value === 'true';
        else if (/^\d+$/.test(value)) value = parseInt(value, 10);
        else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
        map[key] = value;
    }
    return map;
}

/**
 * Parse map to prop
 * @param {Object} map - map of prop
 * @returns {string} - prop string
 */
function parseMapToProp(map) {
    if (!map || typeof map !== 'object') return '';
    return Object.entries(map)
        .map(([key, value]) => {
            if (typeof value === 'boolean') return `${key}=${value ? 'true' : 'false'}`;
            return `${key}=${value}`;
        })
        .join('\n');
}

// Function to check if running in MMRL
async function checkMMRL() {
    if (typeof ksu !== 'undefined' && ksu.mmrl) {
        // Set status bars theme based on device theme
        try {
            $playintegrityfix.setLightStatusBars(!window.matchMedia('(prefers-color-scheme: dark)').matches)
        } catch (error) {
            console.log("Error setting status bars theme:", error)
        }
    }
}

async function loadAutoSecurityPatchConfig() {
    const btn = document.getElementById('security-patch');
    await exec('[ -d "/data/adb/modules/tricky_store" ] && [ ! -e "/data/adb/modules/tricky_store/disable" ]')
        .then(async (ts) => {
            if (ts.errno !== 0) {
                btn.setAttribute('unsupported', '');
                btn.disabled = true;
            } else {
                await exec('[ -e "/data/adb/tricky_store/pif_auto_security_patch" ]').then((enable) => {
                    btn.selected = enable.errno === 0;
                });
            }
        });
}

function loadScriptOnlyConfig() {
    exec('[ -e "/data/adb/pif_script_only" ]')
        .then(({ errno }) => {
            scriptOnly = errno === 0;
            document.getElementById('script-only').selected = scriptOnly;
            muteToggle(scriptOnly, scriptOnly);
        });
}

function fetchPifProp() {
    appendToOutput("[+] Fetching pif.prop from GitHub...");
    appendToOutput("");
    fetch(`https://raw.githubusercontent.com/${repository}/bot/device_prop/${product}.prop`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.text();
        })
        .catch(error => {
            return fetch(`https://raw.gitmirror.com/${repository}/bot/device_prop/${product}.prop`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.text();
                });
        })
        .then(async (pifProp) => {
            const { stdout } = await exec(`cat ${moddir}/pif.prop`);
            let pifMap = parsePropToMap(stdout);
            const newPifMap = parsePropToMap(pifProp);
            pifMap = { ...pifMap, ...newPifMap };
            const newPifProp = parseMapToProp(pifMap);
            exec(`
cat <<EOF | tee /data/adb/pif.prop
${newPifProp}
EOF

echo ""
echo "- new pif.prop saved to /data/adb/pif.prop"

if [ -e "/data/adb/tricky_store/pif_auto_security_patch" ]; then
	sh "${moddir}/security_patch.sh"
fi
            `).then((result) => {
                if (result.errno === 0) {
                    result.stdout.split('\n').forEach(line => appendToOutput(line));
                } else {
                    appendToOutput("[!] Failed to write /data/adb/pif.prop: " + result.stderr, true);
                }
                killGms();
            });
        })
        .catch(error => {
            appendToOutput('[!] Failed to fetch pif.prop: ' + error, true);
        });
}

// Render available device list to select menu
function setupDeviceList() {
    const list = document.getElementById('device-list');

    fetch(`https://raw.githubusercontent.com/${repository}/bot/device_list.json`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .catch(error => {
            return fetch(`https://raw.gitmirror.com/${repository}/bot/device_list.json`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                });
        })
        .then(devices => {
            if (!Array.isArray(devices)) throw new Error('Invalid device list format');
            list.innerHTML = '';
            devices.forEach(device => {
                if (device.model && device.product) {
                    const label = document.createElement('label');
                    label.className = 'device-list-option';
                    label.innerHTML = `
                    <md-radio name="device" value="${device.product}" data-model="${device.model}"></md-radio>
                    <span aria-hidden="true">${device.model}</span>
                    `;

                    label.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            model = device.model;
                            product = device.product;
                        }
                    });

                    if (model && model === device.model) {
                        product = device.product;
                        label.querySelector('md-radio').setAttribute('checked', '');
                    }

                    list.appendChild(label);
                }
            });
        })
        .catch(error => {
            list.innerHTML = '<div>Failed to load device list</div>';
            document.getElementById('confirm-fetch').disabled = true;
        });
}

function checkSeLinuxStatus() {
    exec('getenforce').then((result) => {
        if (result.errno !== 0) return;
        if (result.stdout.trim() === 'Permissive') {
            appendToOutput("[!] SELinux status is permissive.", true)
        }
    });
}

function getDistance(touch1, touch2) {
    return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
    );
}

function updateFontSize(newSize) {
    currentFontSize = Math.min(Math.max(newSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
    const terminal = document.querySelector('.output-terminal-content');
    terminal.style.fontSize = `${currentFontSize}px`;
}

document.addEventListener('DOMContentLoaded', async () => {
    checkMMRL();
    appendSpoofConfigToggles();
    loadVersionFromModuleProp();
    await loadSpoofConfig();
    setupSpoofConfigButton();
    loadAutoSecurityPatchConfig();
    loadScriptOnlyConfig();
    setupDeviceList();
    updateAutopif();
    checkSeLinuxStatus();

    document.querySelectorAll('[unresolved]').forEach(el => el.removeAttribute('unresolved'));
});
