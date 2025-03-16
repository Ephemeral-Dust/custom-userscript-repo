// ==UserScript==
// @name     Passmark CPU/GPU Sorter
// @namespace    http://tampermonkey.net/
// @description  Passmark CPU/GPU Table Sorter.
// @version  0.0.1
// @author   EphemeralDust
// @match    https://www.cpubenchmark.net/*
// @match    https://www.videocardbenchmark.net/*
// @grant    GM_addStyle
// @icon     https://www.cpubenchmark.net/favicon.ico
// @homepageURL  https://github.com/Ephemeral-Dust/custom-userscript-repo/tree/main
// @updateURL    https://raw.githubusercontent.com/Ephemeral-Dust/custom-userscript-repo/main/ComputerBenchmarks.js
// @downloadURL  https://raw.githubusercontent.com/Ephemeral-Dust/custom-userscript-repo/main/ComputerBenchmarks.js
// @run-at   document-end
// ==/UserScript==

const ADD_CUSTOM_COLUMN = false; // Set this to false to disable the custom column

TABLE_CONTAINER_SELECTOR = 'div.charts';
TABLE_SELECTOR = 'div.chart';
TABLE_HEADER_SELECTOR = 'div.chart_subheader > div';
TABLE_BODY_SELECTOR = 'div.chart_body';
TABLE_UNORDERED_LIST_SELECTOR = 'ul.chartlist';
TABLE_ROWS_SELECTOR = 'ul.chartlist > li';

(function () {
    console.log("Passmark CPU/GPU Table Sorter");
    GM_addStyle(`.chart_subheader > div { flex-basis: fit-content; }`);

    let table_container = document.querySelector(TABLE_CONTAINER_SELECTOR);
    if (!table_container) {
        TABLE_CONTAINER_SELECTOR = "div.main-cmps";
    }

    let currentSortColumn = null;
    let currentSortOrder = 'none'; // 'none', 'asc', 'desc'
    let currentParentTableId = null;
    const originalOrderMap = new Map();

    function addHeaderEventListeners() {
        document.querySelectorAll(TABLE_HEADER_SELECTOR).forEach(header => {
            const upIndicator = header.querySelector('.up-indicator');
            const downIndicator = header.querySelector('.down-indicator');

            if (upIndicator) {
                upIndicator.removeEventListener('click', upIndicatorClickHandler);
                upIndicator.addEventListener('click', upIndicatorClickHandler);
            }

            if (downIndicator) {
                downIndicator.removeEventListener('click', downIndicatorClickHandler);
                downIndicator.addEventListener('click', downIndicatorClickHandler);
            }
        });
    }

    function upIndicatorClickHandler(event) {
        event.stopPropagation();
        const header = event.currentTarget.parentNode;
        const headerIndex = Array.from(header.parentNode.children).indexOf(header);
        if (currentSortColumn === headerIndex && currentSortOrder === 'asc') {
            currentSortOrder = 'none';
        } else {
            currentSortColumn = headerIndex;
            currentSortOrder = 'asc';
        }
        sortTable(headerIndex);
    }

    function downIndicatorClickHandler(event) {
        event.stopPropagation();
        const header = event.currentTarget.parentNode;
        const headerIndex = Array.from(header.parentNode.children).indexOf(header);
        if (currentSortColumn === headerIndex && currentSortOrder === 'desc') {
            currentSortOrder = 'none';
        } else {
            currentSortColumn = headerIndex;
            currentSortOrder = 'desc';
        }
        sortTable(headerIndex);
    }

    function sortTable(columnIndex) {
        const table = document.querySelector(`#${currentParentTableId} ${TABLE_SELECTOR}`);
        if (!table) {
            console.error('Active table not found');
            return;
        }
        const tableId = table.parentNode.id;
        console.log(`Sorting table ${tableId} by column index: ${columnIndex}`);
        const tableBody = table.querySelector(TABLE_BODY_SELECTOR);
        const unorderedList = tableBody.querySelector(TABLE_UNORDERED_LIST_SELECTOR);
        const rows = Array.from(unorderedList.querySelectorAll(TABLE_ROWS_SELECTOR));

        console.log(`Current sort column: ${currentSortColumn}, Current sort order: ${currentSortOrder}`);
        console.log(`Number of rows: ${rows.length}`);

        // Filter out the additional `li` elements at the bottom
        const sortableRows = rows.filter(row => row.querySelector('a'));
        const nonSortableRows = rows.filter(row => !row.querySelector('a'));

        // Update header indicators
        updateHeaderIndicators(columnIndex);

        if (currentSortOrder === 'none') {
            const originalOrder = originalOrderMap.get(currentParentTableId);
            sortableRows.sort((a, b) => originalOrder.indexOf(a) - originalOrder.indexOf(b));
        } else {
            sortableRows.sort((a, b) => {
                const aContent = a.querySelector('a');
                const bContent = b.querySelector('a');
                const aSpans = aContent ? Array.from(aContent.children).filter(child => child.tagName === 'SPAN') : [];
                const bSpans = bContent ? Array.from(bContent.children).filter(child => child.tagName === 'SPAN') : [];
                const aValue = aSpans[columnIndex] ? aSpans[columnIndex].innerText.trim() : '';
                const bValue = bSpans[columnIndex] ? bSpans[columnIndex].innerText.trim() : '';

                // Handle NA values
                if (aValue === 'NA') return 1;
                if (bValue === 'NA') return -1;

                // Clean and convert price values to numbers
                const cleanAValue = parseFloat(aValue.replace(/[^0-9.-]+/g, ''));
                const cleanBValue = parseFloat(bValue.replace(/[^0-9.-]+/g, ''));

                const isANumeric = !isNaN(cleanAValue) && aValue.match(/^[0-9.,$%-]+$/);
                const isBNumeric = !isNaN(cleanBValue) && bValue.match(/^[0-9.,$%-]+$/);

                if (isANumeric && isBNumeric) {
                    // Compare as numbers
                    return currentSortOrder === 'asc' ? cleanAValue - cleanBValue : cleanBValue - cleanAValue;
                } else {
                    // Compare as strings
                    return currentSortOrder === 'asc' ?
                        aValue.localeCompare(bValue, undefined, {
                            numeric: true
                        }) :
                        bValue.localeCompare(aValue, undefined, {
                            numeric: true
                        });
                }
            });
        }

        console.log('Appending sorted rows to the unordered list');
        sortableRows.forEach(row => unorderedList.appendChild(row));
        nonSortableRows.forEach(row => unorderedList.appendChild(row));
    }

    function updateHeaderIndicators(columnIndex) {
        document.querySelectorAll(TABLE_HEADER_SELECTOR).forEach((header, index) => {
            const upIndicator = header.querySelector('.up-indicator');
            const downIndicator = header.querySelector('.down-indicator');

            if (index === columnIndex) {
                if (currentSortOrder === 'asc') {
                    upIndicator.style.color = 'green';
                    downIndicator.style.color = 'black';
                } else if (currentSortOrder === 'desc') {
                    upIndicator.style.color = 'black';
                    downIndicator.style.color = 'red';
                } else {
                    upIndicator.style.color = 'black';
                    downIndicator.style.color = 'black';
                }
            } else {
                upIndicator.style.color = 'black';
                downIndicator.style.color = 'black';
            }
        });
    }

    function storeOriginalOrder() {
        if (originalOrderMap.has(currentParentTableId)) {
            return;
        }
        const rows = Array.from(document.querySelectorAll(TABLE_ROWS_SELECTOR));
        originalOrderMap.set(currentParentTableId, rows);
        rows.forEach((row, index) => {
            row.dataset.originalIndex = index;
        });
    }

    function initialize() {
        // Find the currently visible table container
        const visibleContainer = Array.from(document.querySelectorAll(`${TABLE_CONTAINER_SELECTOR} > div`))
            .find(container => window.getComputedStyle(container).display !== 'none' && container.id && container.id !== 'notes');

        if (visibleContainer) {
            currentParentTableId = visibleContainer.id;
            console.log(`Current active table parent ID: ${currentParentTableId}`);
        } else {
            console.error('No visible table container found');
            return;
        }

        // Update selectors to target the currently visible table
        TABLE_HEADER_SELECTOR = `#${currentParentTableId} div.chart_subheader > div`;
        TABLE_BODY_SELECTOR = `#${currentParentTableId} div.chart_body`;
        TABLE_UNORDERED_LIST_SELECTOR = `#${currentParentTableId} ul.chartlist`;
        TABLE_ROWS_SELECTOR = `#${currentParentTableId} ul.chartlist > li`;

        // Add indicators to headers if not already present
        document.querySelectorAll(TABLE_HEADER_SELECTOR).forEach(header => {
            if (!header.querySelector('.up-indicator') && !header.querySelector('.down-indicator')) {
                header.innerHTML = `<span class="up-indicator" style="cursor: pointer;">▲</span> ${header.innerText} <span class="down-indicator" style="cursor: pointer;">▼</span>`;
            }
        });

        if (ADD_CUSTOM_COLUMN) {
            // Add new column header
            const headerRow = document.querySelector(TABLE_HEADER_SELECTOR).parentNode;
            const newHeader = document.createElement('div');
            newHeader.innerHTML = `<span class="up-indicator" style="cursor: pointer;">▲</span> Modified Mark/Price <span class="down-indicator" style="cursor: pointer;">▼</span>`;
            headerRow.appendChild(newHeader);
        }

        addHeaderEventListeners();
        storeOriginalOrder();
        if (ADD_CUSTOM_COLUMN) {
            addNewColumn();
        }
    }

    function addNewColumn() {
        const rows = document.querySelectorAll(TABLE_ROWS_SELECTOR);
        rows.forEach(row => {
            const spans = row.querySelectorAll('a > span');
            if (spans.length >= 2) {
                const secondToLastValue = spans[spans.length - 2].innerText.trim();
                const lastValue = spans[spans.length - 1].innerText.trim();
                let newValue = 'NA';

                if (secondToLastValue !== 'NA' && lastValue !== 'NA') {
                    const secondToLastNumber = parseFloat(secondToLastValue.replace(/[^0-9.-]+/g, ''));
                    const lastNumber = parseFloat(lastValue.replace(/[^0-9.-]+/g, ''));
                    if (!isNaN(secondToLastNumber) && !isNaN(lastNumber)) {
                        newValue = (Math.pow(secondToLastNumber, 0.8) / lastNumber).toFixed(2);
                    }
                }

                const newSpan = document.createElement('span');
                newSpan.innerText = newValue;
                row.querySelector('a').appendChild(newSpan);
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.target.querySelector(TABLE_SELECTOR)) {
                const displayStyle = window.getComputedStyle(mutation.target).display;
                if (displayStyle !== 'none') {
                    console.log('Parent container attribute mutation detected, reinitializing script');
                    console.log(mutation);
                    initialize();
                }
            }
        });
    });

    const tableContainer = document.querySelector(TABLE_CONTAINER_SELECTOR);
    if (tableContainer) {
        observer.observe(tableContainer, {
            childList: true,
            attributes: true,
            subtree: true
        });
    }

    initialize();
})();