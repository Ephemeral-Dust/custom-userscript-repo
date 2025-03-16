// ==UserScript==
// @name         Ebay Item Price Checker
// @namespace    http://tampermonkey.net/
// @description  Searches the price of the item recently sold on ebay.
// @version      0.0.1
// @author       EphemeralDust
// @match        http*://*/*
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

/*
Performs a simple fetch request to ebay search results page to get the price of the item.
*/

// Editable hotkeys.
const HOTKEY_SEARCH = {
    key: 'e',
    ctrl: true,
    shift: false,
    alt: false
};
const HOTKEY_EDIT_SEARCH = {
    key: 'E',
    ctrl: true,
    shift: true,
    alt: false
};


// eBay search URL components
const BASE_URL = "https://www.ebay.com/sch/i.html?_nkw=";
const PARAMETERS_URL = "&_sacat=0&_from=R40&LH_Sold=1&LH_Complete=1&rt=nc&LH_ItemCondition=3000&_ipg=240";

GM_addStyle(`
    #priceCheckerPanel {
        position: fixed;
        top: 15%;
        left: 50%;
        transform: translateX(-50%);
        background-color: #d0e2f5;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 600px;
        width: 100%;
        font-family: 'Roboto', Arial, sans-serif;
        color: #333;
        line-height: 1.6;
        overflow-y: auto;
        max-height: 80vh;
        border: 2px solid #5d7287;
    }

    #priceCheckerPanel h2 {
        margin-top: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #333;
        text-align: center;
    }

    #priceCheckerPanel p {
        margin: 10px 0;
        font-size: 1rem;
    }

    #priceCheckerPanel strong {
        font-weight: 700;
        color: #444;
    }

    #priceCheckerPanel a {
        color: #0073e6;
        text-decoration: none;
        font-weight: 500;
    }

    #priceCheckerPanel a:hover {
        text-decoration: underline;
        color: #005bb5;
    }

    .metrics-container {
        display: flex;
        justify-content: space-between;
        gap: 20px;
    }

    .metrics-column {
        width: 48%;
    }

    .metrics-column h3 {
        font-size: 1.2rem;
        font-weight: 600;
        color: #333;
    }

    .metrics-column p {
        font-size: 1rem;
    }

    #priceCheckerPanel button {
        margin-top: 20px;
        padding: 10px 15px;
        background-color: #0073e6;
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1rem;
        width: 100%;
        transition: background-color 0.3s ease;
    }

    #priceCheckerPanel button:hover {
        background-color: #005bb5;
    }

    #priceCheckerPanel button:focus {
        outline: none;
    }

    @media screen and (max-width: 700px) {
        #priceCheckerPanel {
            padding: 15px;
            max-width: 90%;
            font-size: 0.9rem;
        }

        .metrics-container {
            flex-direction: column;
            gap: 10px;
        }

        .metrics-column {
            width: 100%;
        }

        #priceCheckerPanel button {
            font-size: 0.9rem;
        }
    }
`);


(function () {
    'use strict';

    document.addEventListener('keydown', function (e) {
        if (e.key.toLowerCase() === HOTKEY_SEARCH.key.toLowerCase() &&
            e.ctrlKey === HOTKEY_SEARCH.ctrl &&
            e.shiftKey === HOTKEY_SEARCH.shift &&
            e.altKey === HOTKEY_SEARCH.alt) {
            const panel = document.getElementById('priceCheckerPanel');
            if (panel) {
                document.body.removeChild(panel);
            }
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                const searchUrl = BASE_URL + encodeURIComponent(selectedText) + PARAMETERS_URL;
                fetchEbayData(searchUrl, selectedText);
            }
        } else if (e.key.toLowerCase() === HOTKEY_EDIT_SEARCH.key.toLowerCase() &&
            e.ctrlKey === HOTKEY_EDIT_SEARCH.ctrl &&
            e.shiftKey === HOTKEY_EDIT_SEARCH.shift &&
            e.altKey === HOTKEY_EDIT_SEARCH.alt) {
            const panel = document.getElementById('priceCheckerPanel');
            if (panel) {
                document.body.removeChild(panel);
            }
            const selectedText = window.getSelection().toString().trim();
            const input = prompt("Edit your search query:", selectedText);
            if (input) {
                const searchUrl = BASE_URL + encodeURIComponent(input) + PARAMETERS_URL;
                fetchEbayData(searchUrl, input);
            }
        }
    });

    function fetchEbayData(url, query) {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');
                    const resultsContainer = doc.querySelector('.srp-results.srp-list.clearfix');
                    if (resultsContainer) {
                        const items = Array.from(resultsContainer.querySelectorAll('.s-item'))
                            .map(item => {
                                const priceElement = item.querySelector('.s-item__price');
                                const linkElement = item.querySelector('.s-item__link');
                                const price = priceElement ? parseFloat(priceElement.textContent.replace(/[^0-9.]/g, '')) : NaN;
                                const link = linkElement ? linkElement.href : '';
                                return {
                                    price,
                                    link
                                };
                            })
                            .filter(item => !isNaN(item.price));

                        if (items.length > 0) {
                            processEbayData(items, query, url);
                        } else {
                            alert('No prices found.');
                        }
                    } else {
                        alert('No results container found.');
                    }
                } else {
                    alert('Failed to fetch data from eBay.');
                }
            }
        });
    }

    function processEbayData(items, query, searchUrl) {
        items.sort((a, b) => a.price - b.price);
        const itemCount = items.length;
        const lowestPriceItem = items[0];
        const highestPriceItem = items[items.length - 1];
        const prices = items.map(item => item.price);
        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        // Median calculation: sort the prices first
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

        // Calculate standard deviation
        const mean = averagePrice;
        const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);

        // Filter out items more than 2 standard deviations from the mean
        const filteredItems = items.filter(item => Math.abs(item.price - mean) <= 2 * stdDev);
        const filteredPrices = filteredItems.map(item => item.price);

        let filteredAveragePrice = 0;
        let filteredMedianPrice = 0;
        let lowestFilteredPriceItem = null;
        let highestFilteredPriceItem = null;

        if (filteredPrices.length > 0) {
            filteredAveragePrice = filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length;

            // Sort filtered prices for median calculation
            const sortedFilteredPrices = [...filteredPrices].sort((a, b) => a - b);
            filteredMedianPrice = sortedFilteredPrices[Math.floor(sortedFilteredPrices.length / 2)];

            // Identify the lowest and highest filtered items
            lowestFilteredPriceItem = filteredItems[0];
            highestFilteredPriceItem = filteredItems[filteredItems.length - 1];
        }

        showResultsPanel(query, itemCount, searchUrl, lowestPriceItem.price, highestPriceItem.price, averagePrice, medianPrice, lowestPriceItem.link, highestPriceItem.link, filteredAveragePrice, filteredMedianPrice, lowestFilteredPriceItem, highestFilteredPriceItem);
    }

    function showResultsPanel(query, itemCount, searchUrl, lowestPrice, highestPrice, averagePrice, medianPrice, lowestPriceLink, highestPriceLink, filteredAveragePrice, filteredMedianPrice, lowestFilteredPriceItem, highestFilteredPriceItem) {
        const panel = document.createElement('div');
        panel.id = 'priceCheckerPanel';

        panel.innerHTML = `
            <h2>eBay Price Checker</h2>
            <p><strong>Search Query:</strong> ${query}</p>
            <p><strong>Number of Items:</strong> ${itemCount}</p>

            <div class="metrics-container">
                <div class="metrics-column">
                    <h3>Raw Metrics</h3>
                    <p><strong>Lowest Price:</strong> $${lowestPrice.toFixed(2)} <a href="${lowestPriceLink}" target="_blank">View Item</a></p>
                    <p><strong>Highest Price:</strong> $${highestPrice.toFixed(2)} <a href="${highestPriceLink}" target="_blank">View Item</a></p>
                    <p><strong>Average Price:</strong> $${averagePrice.toFixed(2)}</p>
                    <p><strong>Median Price:</strong> $${medianPrice.toFixed(2)}</p>
                </div>
                <div class="metrics-column">
                    <h3>Filtered Metrics (within 2 std dev)</h3>
                    <p><strong>Lowest Price:</strong> ${lowestFilteredPriceItem ? `$${lowestFilteredPriceItem.price.toFixed(2)}` : 'N/A'} ${lowestFilteredPriceItem ? `<a href="${lowestFilteredPriceItem.link}" target="_blank">View Item</a>` : ''}</p>
                    <p><strong>HighestPrice:</strong> ${highestFilteredPriceItem ? `$${highestFilteredPriceItem.price.toFixed(2)}` : 'N/A'} ${highestFilteredPriceItem ? `<a href="${highestFilteredPriceItem.link}" target="_blank">View Item</a>` : ''}</p>
                    <p><strong>Average Price:</strong> $${filteredAveragePrice.toFixed(2)}</p>
                    <p><strong>Median Price:</strong> $${filteredMedianPrice.toFixed(2)}</p>
                </div>
            </div>

            <p><a href="${searchUrl}" target="_blank">View Search Results</a></p>
            <button id="closePriceCheckerPanel">Close</button>
        `;

        document.body.appendChild(panel);

        document.getElementById('closePriceCheckerPanel').addEventListener('click', function () {
            document.body.removeChild(panel);
        });
    }
})();