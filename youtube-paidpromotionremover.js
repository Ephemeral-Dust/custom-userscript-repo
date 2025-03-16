// ==UserScript==
// @name         Remove YouTube Paid Promotion Overlay
// @namespace    http://tampermonkey.net/
// @description  Removes the paid promotion overlay from YouTube videos.
// @version      0.0.1
// @author       EphemeralDust
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    const paidContentClasses = ['ytp-paid-content-overlay', 'ytmPaidContentOverlayHost'];

    // Function to check and remove paid content overlays
    function removePaidContent(node) {
        paidContentClasses.forEach(className => {
            if (node?.classList?.contains(className)) {
                console.log('Removing paid content overlay:', node);
                node.remove();
            }
        });
    }

    // Recursive function to search within a parent node
    function searchAndRemovePaidContent(parent) {
        if (parent.nodeType !== Node.ELEMENT_NODE) return;
        // Check the parent itself
        removePaidContent(parent);
        // Check all its children
        paidContentClasses.forEach(className => {
            parent.querySelectorAll(`.${className}`).forEach(removePaidContent);
        });
    }

    // New MutationObserver to monitor for changes
    const paidContentObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            // Check added nodes
            mutation.addedNodes.forEach(node => {
                searchAndRemovePaidContent(node);
            });
        });
    });

    // Start observing the document body for new nodes
    paidContentObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
})();