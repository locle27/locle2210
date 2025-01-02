/* eslint-disable no-unused-vars */
// content.js

// Listen for double-click events to capture the selected word and send it to the background script
document.addEventListener('dblclick', (event) => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
        chrome.storage.local.get({ vocabularyList: [] }, (result) => {
            const vocabularyList = result.vocabularyList || [];
            
            // Nếu từ chưa tồn tại, thêm vào danh sách
            if (!vocabularyList.includes(selectedText)) {
                vocabularyList.push(selectedText);
                chrome.storage.local.set({ vocabularyList }, () => {
                    // Gửi thông báo tới popup.js hoặc background.js để cập nhật giao diện
                    chrome.runtime.sendMessage({ action: 'updateVocabularyList', words: vocabularyList });
                    // Gửi danh sách từ hiện tại tới backend
                    sendWordsToBackend(vocabularyList);
                });
            } else {
                // Nếu từ đã tồn tại, chỉ gửi danh sách hiện tại tới backend
                sendWordsToBackend(vocabularyList);
            }
        });
    }
});

// Function to send the vocabulary list to the backend
function sendWordsToBackend(words) {
    if (!Array.isArray(words) || words.length === 0) {
        console.error("Danh sách từ trống. Không gửi tới backend.");
        return;
    }

    console.log("Sending vocabularyList to backend:", words); // Thêm log

    fetch('http://localhost:3005/api/processVocabulary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vocabularyList: words }) // Gửi danh sách từ dưới dạng JSON
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Backend returned an error: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Backend processed words:", data);
        // Gửi thông báo tới popup.js hoặc background.js để cập nhật giao diện
        chrome.runtime.sendMessage({ action: 'backendSuccess', message: "Words processed successfully!" });
    })
    .catch(error => {
        console.error("Error sending words to backend:", error);
        // Gửi thông báo tới popup.js hoặc background.js để hiển thị lỗi
        chrome.runtime.sendMessage({ action: 'backendError', message: "Failed to send words to backend. Please try again later." });
    });
}

// Hàm hiện thị nút "Add"
let addButton = null;

function showTemporaryNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
    notification.style.color = 'white';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    notification.style.zIndex = '10000';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease-in-out';

    document.body.appendChild(notification);

    // Hiển thị thông báo
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 100);

    // Ẩn thông báo sau 3 giây
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

function createAddButton(word, rect) {
    removeAddButton(); // Loại bỏ nút hiện tại nếu có

    addButton = document.createElement('button');
    addButton.innerHTML = `
        <span style="margin-right: 5px;">➕</span>Add
    `; // Thêm icon vào nút
    addButton.className = 'add-button show'; // Thêm class để áp dụng hiệu ứng
    addButton.style.position = 'absolute';
    addButton.style.top = `${rect.top - 30 + window.scrollY}px`; // Vị trí trên
    addButton.style.left = `${rect.left + window.scrollX}px`; // Vị trí trái
    addButton.style.padding = '5px 10px';
    addButton.style.backgroundColor = '#4CAF50';
    addButton.style.color = 'white';
    addButton.style.border = 'none';
    addButton.style.borderRadius = '3px';
    addButton.style.cursor = 'pointer';
    addButton.style.zIndex = '10000';
    addButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    addButton.style.fontSize = '12px';
    addButton.style.opacity = '0';
    addButton.style.transition = 'opacity 0.3s ease-in-out';

    // Sử dụng setTimeout để áp dụng hiệu ứng sau khi nút được thêm vào DOM
    setTimeout(() => {
        addButton.style.opacity = '1';
    }, 100);

    addButton.addEventListener('click', () => {
        if (word) {
            let trimmedWord = word.trim();
            if (trimmedWord === "") {
                showTemporaryNotification("Word cannot be empty.", true);
                return;
            }
            // Có thể thêm các bước kiểm tra thêm nếu cần thiết
            chrome.runtime.sendMessage({ action: 'addWord', word: trimmedWord }, (response) => {
                if (response && response.success) {
                    console.log(`Word "${trimmedWord}" added to vocabulary list.`);
                    showTemporaryNotification(`Word "${trimmedWord}" đã được thêm thành công!`);
                } else {
                    console.warn(`Failed to add word "${trimmedWord}": ${response.message}`);
                    showTemporaryNotification(response.message || `Failed to add word "${trimmedWord}".`, true);
                }
            });
        }
        removeAddButton();
    });

    document.body.appendChild(addButton);
}

function removeAddButton() {
    if (addButton) {
        addButton.remove();
        addButton = null;
    }
}

// Lắng nghe sự kiện thay đổi lựa chọn
let debounceTimer;
const debounceDelay = 300; // milliseconds

document.addEventListener('selectionchange', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        handleSelectionChange();
    }, debounceDelay);
});

function handleSelectionChange() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
        removeAddButton();
        return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.split(/\s+/).length !== 1) { // Chỉ hiển thị khi chọn một từ duy nhất
        removeAddButton();
        return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        removeAddButton();
        return;
    }

    const word = selectedText;
    createAddButton(word, rect);
}

// Loại bỏ nút khi nhấp vào bất cứ đâu khác
document.addEventListener('click', (event) => {
    if (addButton && !addButton.contains(event.target)) {
        removeAddButton();
    }
});

// Listen for messages from the background script to display the word details
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "displayWordDetails") {
        const parsedData = request.data;
        console.log("Parsed Data From API:", parsedData);

        if (!parsedData) {
            // Không thể cập nhật trực tiếp từ content script, nên gửi tin nhắn tới popup.js hoặc background.js
            chrome.runtime.sendMessage({ action: 'displayError', word: request.word });
            return;
        }

        // Gửi dữ liệu tới popup.js hoặc background.js để hiển thị
        chrome.runtime.sendMessage({ action: 'displayWordDetails', data: parsedData, word: request.word });
    }

    if (request.action === "scanWords") {
        const words = [];
        const textNodes = document.body.innerText.match(/\b[A-Za-z]{4,}\b/g); // Lọc từ >= 4 ký tự
        if (textNodes) words.push(...new Set(textNodes)); // Loại bỏ từ trùng lặp
        sendResponse({ words });
    }
});
/* eslint-enable no-unused-vars */
