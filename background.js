// Hàm tạo thông báo trên desktop (tuỳ chọn)
function createDesktopNotification(title, message, isError = false) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png', // Đảm bảo bạn có icon tại đường dẫn này
        title: title,
        message: message,
        priority: 2
    }, function(notificationId) {
        console.log(`Notification ${notificationId} created.`);
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchWordDetails') {
        const word = request.word.trim().replace(/,$/, ''); // Loại bỏ dấu phẩy ở cuối
        console.log(`Fetching word details for: "${word}"`);

        if (!word) {
            console.error("Empty word parameter.");
            sendResponse({ error: "Word parameter is empty." });
            return;
        }

        fetch('http://localhost:3005/api/getWordDetails?word=' + encodeURIComponent(word), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log(`API Response Status for "${word}":`, response.status);
            return response.json();
        })
        .then(data => {
            console.log(`API Response Data for "${word}":`, data);
            if (data.IPA && data.Definition) { // Kiểm tra các trường cần thiết
                sendResponse({ data });
            } else {
                console.warn(`Incomplete data received for "${word}". Sending empty response.`);
                sendResponse({});
            }
        })
        .catch(error => {
            console.error(`Error fetching word details for "${word}":`, error.message);
            sendResponse({ error: error.message });
            // Tạo thông báo lỗi trên desktop
            createDesktopNotification("Error", `Failed to fetch details for "${word}": ${error.message}`, true);
        });

        // Return true to indicate that sendResponse will be called asynchronously
        return true;
    }

    if (request.action === 'addWord') {
        let word = request.word.trim(); // Loại bỏ khoảng trắng thừa
        if (!word) {
            sendResponse({ success: false, message: "Word is empty." });
            return;
        }

        // Lấy danh sách từ hiện tại
        chrome.storage.local.get({ vocabularyList: [] }, (result) => {
            let vocabularyList = result.vocabularyList || [];
            console.log("Current vocabularyList:", vocabularyList);

            // Kiểm tra xem từ đã tồn tại chưa (không nhạy cảm với chữ hoa/chữ thường)
            let exists = vocabularyList.some(existingWord => existingWord.toLowerCase() === word.toLowerCase());
            if (exists) {
                sendResponse({ success: false, message: `Word "${word}" already exists in the list.` });
                console.log(`Word "${word}" already exists.`);
                return;
            }

            // Thêm từ vào danh sách (lưu giữ định dạng chữ gốc)
            vocabularyList.push(word);
            console.log(`Adding word "${word}" to vocabularyList.`);
            chrome.storage.local.set({ vocabularyList }, () => {
                console.log(`Updated vocabularyList:`, vocabularyList);
                sendResponse({ success: true });

                // Gửi thông báo tới popup.js để cập nhật giao diện
                chrome.runtime.sendMessage({ action: 'updateVocabularyList' });

                // Tùy chọn: Tạo thông báo trên desktop
                createDesktopNotification("Success", `Word "${word}" đã được thêm vào danh sách từ vựng.`);
            });
        });

        // Đảm bảo sendResponse được gọi bất đồng bộ
        return true;
    }

    if (request.action === 'updateVocabularyList' || 
        request.action === 'backendSuccess' || 
        request.action === 'backendError') {
        
        // Gửi tin nhắn tới tất cả các listeners (popup.js nếu mở)
        chrome.runtime.sendMessage(request);
        return;
    }

    // Xử lý các hành động khác nếu cần
});

// Hàm kiểm tra trạng thái server định kỳ (ví dụ: mỗi 5 phút)
function periodicServerCheck() {
    setInterval(() => {
        fetch('http://localhost:3005/api/test', { method: 'GET' })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error(`Server responded with status ${response.status}`);
            })
            .then(data => {
                console.log("Periodic server check: Server is online.");
                // Bạn có thể gửi thông báo tới popup hoặc lưu trạng thái
            })
            .catch(error => {
                console.error("Periodic server check: Server is offline.", error);
                // Gửi thông báo lỗi tới người dùng
                createDesktopNotification("Error", "Server is currently offline. Please check your connection.", true);
            });
    }, 5 * 60 * 1000); // 5 phút
}

// Bắt đầu kiểm tra định kỳ khi background script khởi động
periodicServerCheck();