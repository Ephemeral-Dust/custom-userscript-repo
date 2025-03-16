// ==UserScript==
// @name         Reddit Expanded Images ScrollSnapping Improved
// @namespace    http://tampermonkey.net/
// @description  Snaps scrolling to the closest image preview when scrolling or using arrow keys. Requires RES.
// @version      0.0.1
// @author       EphemeralDust
// @match        https://www.reddit.com/*
// @match        https://old.reddit.com/*
// @grant        GM_addStyle
// @icon         https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-57x57.png
// @run-at       document-idle
// ==/UserScript==

// Set to false to disable the toggle button
const addToggleButton = true;

const toggleButtonStyle = `
    .toggle-button {
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 9999;
        padding: 10px;
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        opacity: 0.3;
        transition: opacity 0.3s, background-color 0.3s;
    }
    .toggle-button:hover {
        opacity: 1;
        background-color: #0056b3;
    }
`;

// Add styles to the page using GM_addStyle
if (addToggleButton) {
    GM_addStyle(toggleButtonStyle);
}

(function () {
    'use strict';
    const expandedImageSelector = '.res-media-zoomable'; // Selector for expanded images
    let images = []; // Holds all the expanded images on the page
    let observerActive = false; // Flag to track if observer is active
    let currentIndex = -1; // Track the current image index
    let lastSkippedIndex = -1; // Track the last skipped index
    let scriptEnabled = true; // Flag to track if the script is enabled

    // Function to scroll smoothly to the target image element
    function scrollToImage(image) {
        console.log('Scrolling to image:', image);
        image.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    // Setup IntersectionObserver to track visible images
    const observer = new IntersectionObserver((entries) => {
        if (!scriptEnabled) return;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log('Image intersecting:', entry.target);
                // Remove 'current' class from all images, add it to the visible one
                images.forEach(img => img.classList.remove('current-image'));
                entry.target.classList.add('current-image');
                currentIndex = images.indexOf(entry.target); // Update current index
                console.log('Updated current index:', currentIndex);
            }
        });
    }, {
        rootMargin: '0px',
        threshold: 0.6 // Trigger when 60% of the image is visible
    });

    // Function to update the list of images and attach observer if images are found
    function refreshImages() {
        if (!scriptEnabled) return;
        const newImages = Array.from(document.querySelectorAll(expandedImageSelector));
        if (newImages.length !== images.length) {
            images = newImages;
            console.log('Images found:', images);
            if (images.length > 0) {
                images.forEach(img => observer.observe(img));
                observerActive = true; // Enable observer once images are found
                console.log('Observer activated');
            }
        }
        // Update current index to match the new images array
        const currentImage = document.querySelector('.current-image');
        if (currentImage) {
            currentIndex = images.indexOf(currentImage);
            console.log('Updated current index after refresh:', currentIndex);
        } else {
            currentIndex = -1;
            console.log('No current image found after refresh');
        }

        // Check if we skipped any indexes and navigate back to the last skipped index
        if (lastSkippedIndex !== -1 && lastSkippedIndex < images.length) {
            console.log('Navigating back to last skipped index:', lastSkippedIndex);
            scrollToImage(images[lastSkippedIndex]);
            currentIndex = lastSkippedIndex;
            lastSkippedIndex = -1; // Reset the last skipped index
        }
    }

    // Initial load of images with a fallback to recheck until images are found
    refreshImages();
    if (images.length === 0) {
        // Retry every second if no images are found initially
        const retryInterval = setInterval(() => {
            refreshImages();
            if (images.length > 0) {
                clearInterval(retryInterval); // Stop retrying once images are found
                console.log('Images found, stopping retry');
            }
        }, 1000);
    }

    // Monitor for dynamically loaded content
    const contentObserver = new MutationObserver(() => {
        if (!scriptEnabled) return;
        console.log('Content changed, refreshing images');
        refreshImages(); // Refresh the images on new content load
    });
    contentObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Key event listener to navigate between images
    window.addEventListener('keydown', (e) => {
        if (!scriptEnabled) return;
        console.log('Current image index:', currentIndex);
        console.log('Array length:', images.length);
        if (currentIndex === -1) return; // No current image

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault(); // Prevent default scrolling behavior
            // Move to the next image if available
            if (currentIndex + 1 < images.length) {
                console.log('Navigating to next image');
                scrollToImage(images[currentIndex + 1]);
                currentIndex++; // Update current index
            } else {
                // Scroll down the page a little to load more images
                console.log('At the last image, scrolling down to load more images');
                lastSkippedIndex = currentIndex + 1; // Track the last skipped index
                window.scrollBy(0, window.innerHeight);
                setTimeout(refreshImages, 1000); // Wait a bit and refresh images
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault(); // Prevent default scrolling behavior
            // Move to the previous image if available
            if (currentIndex - 1 >= 0) {
                console.log('Navigating to previous image');
                scrollToImage(images[currentIndex - 1]);
                currentIndex--; // Update current index
            }
        }
    });

    if (addToggleButton) {
        // Create a button to enable/disable the script
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Disable Snapping';
        toggleButton.className = 'toggle-button';
        document.body.appendChild(toggleButton);

        // Toggle script enabled/disabled state
        toggleButton.addEventListener('click', () => {
            scriptEnabled = !scriptEnabled;
            toggleButton.textContent = scriptEnabled ? 'Disable Snapping' : 'Enable Snapping';
            console.log(`Script ${scriptEnabled ? 'enabled' : 'disabled'}`);
        });
    }
})();