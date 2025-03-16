// ==UserScript==
// @name         Congress Bill Summarizer
// @namespace    http://tampermonkey.net/
// @description  A simple summary tool for bills on congress.gov using OpenAI's GPT-4 API.
// @version      0.0.1
// @author       EphemeralDust
// @match        https://www.congress.gov/bill/*
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

/*
Notes:
I may in the future rework this to be a more general purpose tool for summarizing any text on a page.
*/

const OPENAI_API_KEY = "OPENAI_API_KEY";
// Use the ID of the GPT-4 assistant you want to use. See bottom of file for my assistant instructions.
const ASSISTANT_ID = "ASSISTANT_ID";

const BILL_CONTAINER_SELECTOR = "div.generated-html-container";

// Add styles for the button and modal
GM_addStyle(`
    #billSummaryButton {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 15px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        z-index: 1000;
    }

    #billSummaryModal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        max-height: 80%;
        overflow-y: auto;
        background: white;
        padding: 15px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        border-radius: 8px;
        z-index: 1001;
        display: none;
        color: black;
    }

    #billSummaryModal button {
        margin-top: 10px;
        padding: 5px 10px;
        background: red;
        color: white;
        border: none;
        cursor: pointer;
        float: right;
    }

    @keyframes ellipsis {
        0% { content: "."; }
        33% { content: ".."; }
        66% { content: "..."; }
    }

    #billSummaryContent.loading::after {
        content: "";
        animation: ellipsis steps(1,end) 1s infinite;
    }

    #billSummaryContent {
        color: black;
    }

    #billSummaryContent.h2 {
        color: black;
    }
`);

(function () {
    'use strict';
    let summaryFetched = false;
    let summaryContent = "";

    console.log("Congress Bill Summarizer loaded.");
    // Create and add the button
    const button = document.createElement("button");
    button.id = "billSummaryButton";
    button.innerText = "Summarize Bill";
    document.body.appendChild(button);

    // Create and add the modal
    const modal = document.createElement("div");
    modal.id = "billSummaryModal";
    modal.innerHTML = `
    <p id="billSummaryContent">Fetching summary...</p>
    <button id="closeModal">Close</button>
`;
    document.body.appendChild(modal);

    // Button click event
    button.addEventListener("click", async () => {
        if (summaryFetched) {
            document.getElementById("billSummaryContent").innerHTML = summaryContent;
            modal.style.display = "block";
            return;
        }

        const billContent = document.querySelector(BILL_CONTAINER_SELECTOR)?.innerText || "No bill content found.";

        if (billContent === "No bill content found.") {
            document.getElementById("billSummaryContent").innerText = billContent;
            modal.style.display = "block";
            return;
        }

        // Show modal while fetching
        modal.style.display = "block";
        document.getElementById("billSummaryContent").classList.add("loading");
        document.getElementById("billSummaryContent").innerText = "Fetching summary";

        // Request a summary
        startBillSummaryProcess(billContent);
    });

    // Close modal event
    document.getElementById("closeModal").addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Step 1: Create a thread with bill text
    function startBillSummaryProcess(billText) {
        GM.xmlHttpRequest({
            method: "POST",
            url: "https://api.openai.com/v1/threads",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "assistants=v2"
            },
            data: JSON.stringify({
                messages: [{
                    role: "user",
                    content: `Summarize the following bill: ${billText}`
                }]
            }),
            onload: function (response) {
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    const threadId = data.id;
                    console.log("Thread created:", threadId);
                    startRun(threadId);
                } else {
                    document.getElementById("billSummaryContent").innerText = "Error creating thread.";
                }
            },
            onerror: function () {
                document.getElementById("billSummaryContent").innerText = "Request failed.";
            }
        });
    }

    // Step 2: Start a run on the created thread
    function startRun(threadId) {
        GM.xmlHttpRequest({
            method: "POST",
            url: `https://api.openai.com/v1/threads/${threadId}/runs`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "assistants=v2"
            },
            data: JSON.stringify({
                assistant_id: ASSISTANT_ID
            }),
            onload: function (response) {
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    const runId = data.id;
                    console.log("Run started:", runId);
                    pollRunStatus(threadId, runId);
                } else {
                    document.getElementById("billSummaryContent").innerText = "Error starting run.";
                }
            },
            onerror: function () {
                document.getElementById("billSummaryContent").innerText = "Request failed.";
            }
        });
    }

    // Step 3: Poll the run status until it completes
    function pollRunStatus(threadId, runId) {
        const checkStatus = () => {
            GM.xmlHttpRequest({
                method: "GET",
                url: `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "OpenAI-Beta": "assistants=v2"
                },
                onload: function (response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        console.log("Run status:", data.status);

                        if (data.status === "completed") {
                            getSummaryFromThread(threadId);
                        } else if (["queued", "in_progress"].includes(data.status)) {
                            setTimeout(checkStatus, 2000); // Poll every 2 seconds
                        } else {
                            document.getElementById("billSummaryContent").innerText = "Error processing request.";
                        }
                    } else {
                        document.getElementById("billSummaryContent").innerText = "Error checking status.";
                    }
                },
                onerror: function () {
                    document.getElementById("billSummaryContent").innerText = "Request failed.";
                }
            });
        };

        checkStatus();
    }

    // Step 4: Retrieve summary from thread messages
    function getSummaryFromThread(threadId) {
        GM.xmlHttpRequest({
            method: "GET",
            url: `https://api.openai.com/v1/threads/${threadId}/messages`,
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "assistants=v2"
            },
            onload: function (response) {
                document.getElementById("billSummaryContent").classList.remove("loading");
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    console.log("Thread messages:", data.data);
                    const messages = data.data;
                    const assistantMessage = messages.reverse().find(msg => msg.role === "assistant");
                    summaryContent = assistantMessage?.content || "No summary available.";
                    summaryFetched = true;
                    if (summaryContent === "No summary available.") {
                        document.getElementById("billSummaryContent").innerText = summaryContent;
                    } else {
                        document.getElementById("billSummaryContent").innerHTML = summaryContent?.[0]?.text?.value || "No summary available.";
                    }
                } else {
                    document.getElementById("billSummaryContent").innerText = "Error fetching summary.";
                }
            },
            onerror: function () {
                document.getElementById("billSummaryContent").classList.remove("loading");
                document.getElementById("billSummaryContent").innerText = "Request failed.";
            }
        });
    }
})();

// My GPT-4 assistant instructions if you want to create a similar one to mine.
// Mine uses the gpt-4o-mini model and it works pretty good.
/*
You will be provided the text of a proposed bill by congress. You are to provide a fair and accurate summary of the bill and it's purpose. You will then also provide a unbiased and fair analysis if the bill is structured in a way that would accomplish it's goal in a tangible way, include any praise or critiques of the bill as well.  Finally you will give give a review of the bill in few short words.

Please provide the response in a HTML element with three sections the Summary, the Analysis and the Review.  Do not wrap the response in markdown only return the HTML.
*/