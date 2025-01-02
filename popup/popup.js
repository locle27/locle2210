// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const vocabularyListDiv = document.getElementById('vocabularyList');
    const searchInput = document.getElementById('searchInput');
    const actionSelector = document.getElementById('actionSelector');
    const executeAction = document.getElementById('executeAction');
    const copyPromptButton = document.getElementById('copyPrompt');
    const createBlankCsvButton = document.getElementById('createBlankCsv');
    const detailsDiv = document.getElementById('detailsContent');
    const detailsContainer = document.getElementById('wordDetails');
    const notificationDiv = document.getElementById('notification'); // Thêm phần tử thông báo
    const serverStatusDiv = document.getElementById('serverStatus'); // Phần tử hiển thị trạng thái server

    // Kiểm tra tất cả các phần tử
    if (!vocabularyListDiv || !searchInput || !actionSelector || !executeAction || !copyPromptButton || !createBlankCsvButton || !detailsDiv || !detailsContainer || !notificationDiv || !serverStatusDiv) {
        console.error("Một hoặc nhiều phần tử DOM không được tìm thấy trong popup!");
        return;
    }

    function isVocabularyEmpty(vocabularyList) {
        return !vocabularyList || vocabularyList.length === 0;
    }

    function showNotification(message, isError = false) {
        const notificationDiv = document.getElementById('notification');
        notificationDiv.textContent = message;
        if (isError) {
            notificationDiv.classList.add('error');
        } else {
            notificationDiv.classList.remove('error');
        }
        notificationDiv.classList.add('show');
        notificationDiv.style.display = 'block';
        // Tự động ẩn sau 3 giây
        setTimeout(() => {
            notificationDiv.classList.remove('show');
            notificationDiv.style.display = 'none';
        }, 3000);
    }

    function displayVocabularyList(filter = '') {
        chrome.storage.local.get({ vocabularyList: [] }, (result) => {
            const vocabularyList = result.vocabularyList || [];
            vocabularyListDiv.innerHTML = '';

            if (isVocabularyEmpty(vocabularyList)) {
                vocabularyListDiv.innerHTML = `<p style="text-align: center; color: #aaa;">No vocabulary added yet</p>`;
                return;
            }

            vocabularyList
                .filter(word => word.toLowerCase().includes(filter))
                .forEach((word, index) => {
                    const div = document.createElement('div');
                    div.className = 'vocab-item';
                    div.innerHTML = `
                        <span class="word-item" data-word="${word}">${word}</span>
                        <button class="delete-btn" data-index="${index}">Delete</button>
                    `;
                    vocabularyListDiv.appendChild(div);
                });

            vocabularyListDiv.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    removeVocabulary(idx);
                });
            });

            vocabularyListDiv.querySelectorAll('.word-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const word = e.target.getAttribute('data-word');
                    fetchWordDetails(word);
                });
            });
        });
    }

    function removeVocabulary(index) {
        chrome.storage.local.get({ vocabularyList: [] }, (result) => {
            const vocabularyList = result.vocabularyList || [];
            if (index >= 0 && index < vocabularyList.length) {
                const removedWord = vocabularyList.splice(index, 1)[0];
                chrome.storage.local.set({ vocabularyList }, () => {
                    displayVocabularyList(searchInput.value.toLowerCase());
                    showNotification(`Đã xóa từ "${removedWord}" thành công!`);
                    // Gửi thông báo tới background.js để tạo thông báo trên desktop
                    chrome.runtime.sendMessage({ action: 'updateVocabularyList' });
                });
            }
        });
    }

    function fetchWordDetails(word) {
        console.log(`Fetching details for word: ${word}`); // Log từ đang xử lý

        if (!detailsDiv || !detailsContainer) {
            console.error("Element 'detailsContent' hoặc 'wordDetails' không tìm thấy!");
            return;
        }

        detailsDiv.innerHTML = `<p style="color: blue;">Đang tải thông tin cho từ "${word}"...</p>`;
        detailsContainer.style.display = 'block';

        chrome.runtime.sendMessage({ action: "fetchWordDetails", word: word }, (response) => { // Đã sửa hành động
            console.log("Phản hồi từ sendMessage:", response);

            if (response.error) {
                displayErrorMessage(response.error, word);
                showNotification(`Lỗi: ${response.error}`, true);
                return;
            }

            if (!response.data) {
                detailsDiv.innerHTML = `<p style="color: red;">Không có thông tin chi tiết cho từ "${word}".</p>`;
                showNotification(`Không tìm thấy thông tin cho từ "${word}".`, true);
                return;
            }

            const parsedData = response.data; // Đã nhận đúng dữ liệu JSON từ server

            if (!parsedData || Object.keys(parsedData).length === 0) {
                detailsDiv.innerHTML = `<p style="color: red;">Dữ liệu trả về không đầy đủ hoặc bị lỗi.</p>`;
                showNotification(`Dữ liệu không hợp lệ cho từ "${word}".`, true);
                return;
            }

            // Hiển thị thông tin nếu parsedData hợp lệ
            const ipa = parsedData.IPA || "N/A";
            const definition = parsedData.Definition || "N/A";
            const definitions = parsedData.Definitions?.join(", ") || "N/A";
            const sentence = parsedData.Sentence || "N/A";
            const extraInfo = parsedData.ExtraInfo ? parsedData.ExtraInfo.join(", ") : "N/A";
            const picture = parsedData.Picture || null;
            const description = parsedData.Description || "N/A";
            const wordFamilies = parsedData.WordFamilies ? parsedData.WordFamilies.join(", ") : "N/A";
            const vietnamese = parsedData.Vietnamese || "N/A";

            // Log các giá trị trích xuất được
            console.log("Extracted Fields:", { ipa, definition, definitions, sentence, extraInfo, picture, description, wordFamilies, vietnamese });

            const detailsHTML = `
                <p><strong>${word}</strong></p>
                <p><b>IPA:</b> ${ipa}</p>
                <p><b>Definition:</b> ${definition}</p>
                <p><b>Definitions:</b> ${definitions}</p>
                <p><b>Sentence:</b> ${sentence}</p>
                <p><b>ExtraInfo:</b> ${extraInfo}</p>
                <p><b>Picture:</b> ${picture ? `<img src="${picture}" alt="${word}" style="max-width: 200px;">` : "N/A"}</p>
                <p><b>Description:</b> ${description}</p>
                <p><b>Word Families:</b> ${wordFamilies}</p>
                <p><b>Vietnamese:</b> ${vietnamese}</p>
            `;

            detailsDiv.innerHTML = detailsHTML;
            showNotification(`Đã tải thông tin cho từ "${word}" thành công!`);
        });
    }

    function displayErrorMessage(error, word) {
        console.error(`Error fetching details for "${word}":`, error); // Log lỗi chi tiết
        let errorMessage = "Failed to fetch details. Please try again later.";

        if (error.includes("401")) {
            errorMessage = "Unauthorized. Please check your API key.";
        } else if (error.includes("404")) {
            errorMessage = `Word "${word}" not found.`;
        } else if (error.includes("NetworkError")) {
            errorMessage = "Network error. Check your connection.";
        }

        detailsDiv.innerHTML = `<p style="color: red;">${errorMessage}</p>`;
    }

    // Các sự kiện giao diện
    copyPromptButton.addEventListener('click', () => {
        chrome.storage.local.get({ vocabularyList: [] }, (result) => {
            const vocabularyList = result.vocabularyList || [];
            if (isVocabularyEmpty(vocabularyList)) {
                showNotification("Vocabulary list is empty.", true);
                return;
            }

            const prompt = generatePrompt(vocabularyList);

            navigator.clipboard.writeText(prompt)
                .then(() => {
                    showNotification("Prompt đã được sao chép vào clipboard!");
                    // Gửi thông báo tới background.js để tạo thông báo trên desktop
                    chrome.runtime.sendMessage({ action: 'backendSuccess', message: "Prompt đã được sao chép thành công!" });
                })
                .catch(err => {
                    showNotification("Không thể sao chép prompt: " + err, true);
                    // Gửi thông báo lỗi tới background.js
                    chrome.runtime.sendMessage({ action: 'backendError', message: "Không thể sao chép prompt: " + err });
                });
        });
    });

    executeAction.addEventListener('click', () => {
        chrome.storage.local.get({ vocabularyList: [] }, (result) => {
            const vocabularyList = result.vocabularyList || [];
            if (isVocabularyEmpty(vocabularyList)) {
                showNotification("Vocabulary list is empty.", true);
                return;
            }

            const selectedAction = actionSelector.value;
            if (selectedAction === 'copyAll') {
                const allWords = vocabularyList.join("\n");
                navigator.clipboard.writeText(allWords)
                    .then(() => {
                        showNotification("All words have been copied to clipboard!");
                        chrome.runtime.sendMessage({ action: 'backendSuccess', message: "All words đã được sao chép thành công!" });
                    })
                    .catch(err => {
                        showNotification("Failed to copy: " + err, true);
                        chrome.runtime.sendMessage({ action: 'backendError', message: "Không thể sao chép tất cả từ: " + err });
                    });
            }
        });
    });

    createBlankCsvButton.addEventListener('click', () => {
        const userInput = prompt(
            "Paste nội dung CSV của bạn vào đây. Định dạng sẽ được giữ nguyên:",
            "Word,IPA,Definition,Definitions,Sentence,ExtraInfo,Description,Word Families,Vietnamese\n"
        );

        if (userInput && userInput.trim() !== "") {
            downloadFile(userInput, "custom.csv");
            showNotification("File CSV đã được tạo và tải xuống!");
            chrome.runtime.sendMessage({ action: 'backendSuccess', message: "File CSV đã được tạo thành công!" });
        } else {
            showNotification("Không có nội dung được nhập. File không được tạo.", true);
            chrome.runtime.sendMessage({ action: 'backendError', message: "Không có nội dung được nhập. File không được tạo." });
        }
    });

    // Hàm tạo file download
    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Hàm tạo prompt (cần bạn định nghĩa)
    function generatePrompt(vocabularyList) {
        // Ví dụ:
        return `Please provide detailed information for the following words in JSON format:\n${vocabularyList.join("\n")}`;
    }

    function updateServerStatus(isOnline) {
        if (isOnline) {
            serverStatusDiv.classList.remove('offline');
            serverStatusDiv.classList.add('online');
            serverStatusDiv.querySelector('span').textContent = 'Server: Online';
        } else {
            serverStatusDiv.classList.remove('online');
            serverStatusDiv.classList.add('offline');
            serverStatusDiv.querySelector('span').textContent = 'Server: Offline';
        }
    }

    // Hàm kiểm tra trạng thái server
    function checkServerStatus() {
        fetch('http://localhost:3005/api/test', { method: 'GET' })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error(`Server responded with status ${response.status}`);
            })
            .then(data => {
                console.log("Server response:", data);
                updateServerStatus(true);
            })
            .catch(error => {
                console.error("Error checking server status:", error);
                updateServerStatus(false);
            });
    }

    // Hiển thị danh sách từ ban đầu
    displayVocabularyList();

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        displayVocabularyList(query);
    });

    // Sử dụng chrome.storage.onChanged để tự động cập nhật danh sách từ vựng khi có thay đổi
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.vocabularyList) {
            displayVocabularyList(searchInput.value.toLowerCase());
        }
    });

    // Lắng nghe các tin nhắn từ background.js
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'updateVocabularyList') {
            // Cập nhật giao diện người dùng hoặc xử lý dữ liệu
            displayVocabularyList(); // Nếu trong popup.js
            showNotification("Vocabulary list đã được cập nhật!");
        }
        if (request.action === 'backendError') {
            showNotification(request.message, true); // Hoặc cập nhật UI khác
        }
        if (request.action === 'backendSuccess') {
            showNotification(request.message); // Thông báo thành công
        }
    });

    // Kiểm tra trạng thái server khi popup được mở
    checkServerStatus();
});
