// Purpose of this script is to troubleshoot issues with extensions.
// It captures the current state of the extensions and stores them in variables.
// It then performs a binary search to enable and disable extensions to see if the issue can be isolated to a specific extension.
// This script is intended to be run in the browser console.

const startingDisabledExtensions = document.querySelectorAll('div.card.addon[active="false"]');
const startingEnabledExtensions = document.querySelectorAll('div.card.addon[active="true"]');

var issuePersisting = null;
var problematicExtension = null;

var status_text_box = null;

// Function to toggle the state of an extension
function toggleExtension(extension) {
    const toggleButton = extension.querySelector('moz-toggle.extension-enable-button');
    if (toggleButton) {
        toggleButton.click();
    }
}

// Function to re-enable all extensions except the problematic one
function reenableAllExtensionsExcept() {
    if (!problematicExtension) {
        startingEnabledExtensions.forEach(extension => {
            const toggleButton = extension.querySelector('moz-toggle.extension-enable-button');
            if (toggleButton && !toggleButton.hasAttribute('pressed')) {
                toggleButton.click();
            }
        });
    } else {
        startingEnabledExtensions.forEach(extension => {
            if (extension !== problematicExtension) {
                const toggleButton = extension.querySelector('moz-toggle.extension-enable-button');
                if (toggleButton && !toggleButton.hasAttribute('pressed')) {
                    toggleButton.click();
                }
            }
        });
    }
}

function saveElementsToCookies(extensionElements) {
    document.cookie = `disabledExtensions=${JSON.stringify(extensionElements)}; path=/; max-age=31536000`; // 1 year
    console.log("Disabled extensions saved to cookies:", extensionElements);
}

function loadElementsFromCookies() {
    const name = "disabledExtensions=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return JSON.parse(c.substring(name.length, c.length));
        }
    }
    return [];
}

function saveElementsToLocalStorage(extensionElements) {
    saveElementsToCookies(extensionElements);
}

function loadElementsFromLocalStorage() {
    return new Promise((resolve) => {
        resolve(loadElementsFromCookies());
    });
}

function enableAllExtensions() {
    loadElementsFromLocalStorage().then((disabledExtensions) => {
        var allDisabledToggles = document.querySelectorAll('moz-toggle.extension-enable-button:not([pressed])');
        allDisabledToggles.forEach(toggle => {
            let extensionName = toggle.closest('div.addon-name-container').querySelector('h3.addon-name').textContent.replace(" (disabled)", "").trim();
            if (!disabledExtensions.includes(extensionName)) {
                toggle.click();
            }
        });
    });
}

function disableAllExtensions() {
    var allDisabledToggles = document.querySelectorAll('moz-toggle.extension-enable-button:not([pressed])');
    let extensionNames = [];
    allDisabledToggles.forEach(toggle => {
        let extensionName = toggle.closest('div.addon-name-container').querySelector('h3.addon-name').textContent.replace(" (disabled)", "").trim();
        if (extensionName) {
            extensionNames.push(extensionName);
        }
    });

    console.log("Already disabled extensions:", extensionNames);
    saveElementsToLocalStorage(extensionNames);

    var allEnabledToggles = document.querySelectorAll('moz-toggle.extension-enable-button[pressed]');
    allEnabledToggles.forEach(toggle => {
        toggle.click();
    });
}

// Function to perform binary search to isolate the problematic extension
async function binarySearchExtensions(extensions, start, end) {
    if (start === end) {
        var extensionName = extensions[start].querySelector('h3').textContent;
        console.log("Problematic extension found:", extensions[start], "\nExtension name:", extensionName);
        status_text_box.value = `Problematic extension found: ${extensionName}`;
        problematicExtension = extensions[start];
        reenableAllExtensionsExcept();
        return;
    }

    const mid = Math.floor((start + end) / 2);

    // Disable the first half of the extensions
    for (let i = start; i <= mid; i++) {
        toggleExtension(extensions[i]);
    }

    status_text_box.value = `Disabling first half of extensions... extensions left to check: ${mid - start + 1}\nTest the issue with the extensions disabled and click the appropriate button below.`;

    // Wait for the user to set issuePersisting manually
    await new Promise(resolve => {
        const interval = setInterval(() => {
            if (issuePersisting === true || issuePersisting === false) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });

    if (issuePersisting) {
        // If the issue persists, the problematic extension is in the second half
        for (let i = start; i <= mid; i++) {
            toggleExtension(extensions[i]); // Re-enable the first half
        }
        status_text_box.value = `Issue persists. Checking second half... extensions left to check: ${end - mid}\nRepeat the test with the extensions disabled and click the appropriate button below.`;
        // Reset issuePersisting for the next iteration
        issuePersisting = null;
        await binarySearchExtensions(extensions, mid + 1, end);
    } else {
        // If the issue does not persist, the problematic extension is in the first half
        for (let i = mid + 1; i <= end; i++) {
            toggleExtension(extensions[i]); // Re-enable the second half
        }
        status_text_box.value = `Issue resolved. Checking first half... extensions left to check: ${mid - start + 1}\nRepeat the test with the extensions disabled and click the appropriate button below.`;
        // Reset issuePersisting for the next iteration
        issuePersisting = null;
        await binarySearchExtensions(extensions, start, mid);
    }
}


// Common CSS text for fixed elements
const fixedElementStyle = `
    position: flex;
    color: #023047 !important;
    border-radius: 15px;
    text-align: center;
    z-index: 9999;
    display: inline-block;
    border: 1px solid #219ebc;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    text-decoration: none;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;
// Specific CSS text for buttons
const fixedButtonStyle = `
    ${fixedElementStyle}
    background-color: #023047;
    color: #fff !important;
    cursor: pointer;
    line-height: 24px;
    font-size: 18px;
    padding: 12px 20px;
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
`;
// Create a <style> element for the hover effect
const highlightStyleElement = document.createElement('style');
highlightStyleElement.textContent = `
    .fixed-button:hover {
        background-color: #8ecae6 !important;
        box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15) !important;
    }
`;
document.head.appendChild(highlightStyleElement);
// Specific CSS text for the text box
const fixedTextBoxStyle = `
    ${fixedElementStyle}
    background-color: #f8f8f8;
    color: #333 !important;
    line-height: 1;
    font-size: 16px;
    padding: 5px;
    width: 320px;
    height: 120px;
    white-space: pre-wrap;
    resize: none;
    overflow: hidden;
    border: 1px solid #d1d1d1;
    justify-content: center;
    align-items: center;
`;

// Put button on page, and start the script.
var add_button = setInterval(function () {
    clearInterval(add_button);

    // Create a container for the buttons
    var button_container = document.createElement('div');
    button_container.style.cssText = `
        position: fixed;
        right: 70px;
        top: 70px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 9999;
    `;
    document.body.appendChild(button_container);

    // Create the start troubleshooting button
    var start_troubleshoot_button = document.createElement('button');
    start_troubleshoot_button.innerText = "Start Extension Troubleshooting";
    start_troubleshoot_button.className = "fixed-button";
    start_troubleshoot_button.onclick = async function () {
        console.log("Starting extension troubleshooting...");
        start_troubleshoot_button.innerText = "Troubleshooting in progress...";
        // Start the binary search with the enabled extensions
        set_issue_false_button.style.display = "inline-block";
        set_issue_true_button.style.display = "inline-block";
        status_text_box.style.display = "inline-block";
        await binarySearchExtensions(Array.from(startingEnabledExtensions), 0, startingEnabledExtensions.length - 1);
    };
    start_troubleshoot_button.style.cssText = fixedButtonStyle;
    button_container.appendChild(start_troubleshoot_button);

    // Create the text box to display status
    status_text_box = document.createElement('textarea');
    status_text_box.readOnly = true;
    status_text_box.wrap = "soft"; // Ensure text wrapping
    status_text_box.style.cssText = fixedTextBoxStyle;
    button_container.appendChild(status_text_box);

    // Create the button to set issuePersisting to true
    var set_issue_true_button = document.createElement('button');
    set_issue_true_button.innerText = "Issue is still persisting";
    set_issue_true_button.className = "fixed-button";
    set_issue_true_button.onclick = function () {
        issuePersisting = true;
        console.log("Issue Persisting set to true.");
    };
    set_issue_true_button.style.cssText = fixedButtonStyle;
    button_container.appendChild(set_issue_true_button);

    // Create the button to set issuePersisting to false
    var set_issue_false_button = document.createElement('button');
    set_issue_false_button.innerText = "Issue is no longer persisting";
    set_issue_false_button.className = "fixed-button";
    set_issue_false_button.onclick = function () {
        issuePersisting = false;
        console.log("Issue Persisting set to false.");
    };
    set_issue_false_button.style.cssText = fixedButtonStyle;
    button_container.appendChild(set_issue_false_button);

    // Create the reset extensions button
    var reset_extensions_button = document.createElement('button');
    reset_extensions_button.innerText = "Reset Extensions";
    reset_extensions_button.className = "fixed-button";
    reset_extensions_button.onclick = function () {
        reenableAllExtensionsExcept();
        status_text_box.value = "All extensions reset except the problematic one.";
        console.log("All extensions reset except the problematic one.");
    };
    reset_extensions_button.style.cssText = fixedButtonStyle;
    button_container.appendChild(reset_extensions_button);

    // Create the enable all extensions button
    var enable_extensions_button = document.createElement('button');
    enable_extensions_button.innerText = "Enable all Extensions";
    enable_extensions_button.className = "fixed-button";
    enable_extensions_button.onclick = function () {
        enableAllExtensions();
        status_text_box.value = "All extensions are enabled.";
        console.log("All extensions are enabled.");
    };
    enable_extensions_button.style.cssText = fixedButtonStyle;
    button_container.appendChild(enable_extensions_button);

    // Create the disable all extensions button
    var disable_extensions_button = document.createElement('button');
    disable_extensions_button.innerText = "Disable all Extensions";
    disable_extensions_button.className = "fixed-button";
    disable_extensions_button.onclick = function () {
        disableAllExtensions();
        status_text_box.value = "All extensions are disabled.";
        console.log("All extensions are disabled.");
    };
    disable_extensions_button.style.cssText = fixedButtonStyle;
    button_container.appendChild(disable_extensions_button);

    set_issue_false_button.style.display = "none";
    set_issue_true_button.style.display = "none";
    status_text_box.style.display = "none";
}, 100);