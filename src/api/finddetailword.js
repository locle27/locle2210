//find



import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import net from 'net';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Khởi tạo Express app
const app = express();

// Cấu hình CORS để cho phép chỉ origin của extension
app.use(cors({
    origin: 'chrome-extension://mdnofinlleojcaembpeaboffdeopgagi',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Sử dụng middleware JSON
// Sử dụng middleware JSON
app.use(express.json());

// Route API kiểm tra server
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Hàm kiểm tra cổng khả dụng
const DEFAULT_PORT = 3005;
const getAvailablePort = async (port) => {
    return new Promise((resolve, reject) => {
        const tester = net.createServer()
            .once('error', (err) => (err.code === 'EADDRINUSE' ? resolve(false) : reject(err)))
            .once('listening', () => tester.once('close', () => resolve(true)).close())
            .listen(port);
    });
};

// Khởi động server
(async () => {
    const portAvailable = await getAvailablePort(DEFAULT_PORT);
    const PORT = portAvailable ? DEFAULT_PORT : 3011; // Thay đổi cổng dự phòng tại đây

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})();

// Các middleware khác nếu cần
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Key từ file .env
const apiKey = process.env.API_KEY;

// Hàm lấy chi tiết từ
const getWordDetails = async (word) => {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: `Provide detailed information about the word '${word}' in JSON format, including the following fields:
                        - IPA: The pronunciation in IPA format.
                        - Definition: A brief explanation of the word.
                        - Definitions: Detailed definitions or additional meanings, limited to a maximum of 3 items.
                        - Sentence: Example sentences using the word.
                        - ExtraInfo: Related words, phrases, or collocations as a string or an array of strings, limited to a maximum of 3 items.
                        - Picture: A URL for an illustrative image.
                        - Description: Context or application of the word.
                        - WordFamilies: A list of related word forms. Each entry should combine English and Vietnamese in the following format:
                        "word: meaning"
                        - Vietnamese: The Vietnamese meaning,`
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`API raw response for "${word}":`, data); // Ghi lại toàn bộ dữ liệu trả về
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            throw new Error("No text found in API response.");
        }

        return rawText;
    } catch (error) {
        console.error(`Error fetching word details for "${word}":`, error.message);
        return null;
    }
};

// Hàm làm sạch rawText để chỉ giữ lại JSON hợp lệ
const cleanRawText = (rawText) => {
    // Loại bỏ phần dư thừa trước dấu { của JSON
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start === -1 || end === -1) {
        throw new Error('Invalid JSON format in rawText.');
    }
    const jsonString = rawText.substring(start, end + 1);
    return jsonString.trim();
};

// Hàm xử lý danh sách từ
const processWords = async (words) => {
    const processedWords = [];

    for (const word of words) {
        console.log(`Processing word: "${word}"`);
        const rawApiResponse = await getWordDetails(word);

        if (!rawApiResponse) {
            console.error(`Failed to fetch data for "${word}". Skipping...`);
            processedWords.push({
                word: word,
                IPA: "N/A",
                Definition: "N/A",
                Definitions: "N/A",
                Sentence: "N/A",
                ExtraInfo: "N/A",
                Picture: null,
                Description: "N/A",
                WordFamilies: "N/A",
                Vietnamese: "N/A",
            });
            continue;
        }

        let cleanedText;
        try {
            cleanedText = cleanRawText(rawApiResponse);
        } catch (error) {
            console.error(`Error cleaning text for "${word}":`, error.message);
            processedWords.push({
                word: word,
                IPA: "N/A",
                Definition: "N/A",
                Definitions: "N/A",
                Sentence: "N/A",
                ExtraInfo: "N/A",
                Picture: null,
                Description: "N/A",
                WordFamilies: "N/A",
                Vietnamese: "N/A",
            });
            continue;
        }

        let parsedData = {};

        try {
            console.log(`Cleaned JSON for "${word}":`, cleanedText);
            parsedData = JSON.parse(cleanedText);
        } catch (error) {
            console.error(`Error parsing data for "${word}":`, error.message);
            processedWords.push({
                word: word,
                IPA: "N/A",
                Definition: "N/A",
                Definitions: "N/A",
                Sentence: "N/A",
                ExtraInfo: "N/A",
                Picture: null,
                Description: "N/A",
                WordFamilies: "N/A",
                Vietnamese: "N/A",
            });
            continue;
        }

        processedWords.push({
            word: word,
            IPA: parsedData.IPA || "N/A",
            Definition: parsedData.Definition || "N/A",
            Definitions: parsedData.Definitions?.join(", ") || "N/A",
            Sentence: parsedData.Sentence || "N/A",
            ExtraInfo: parsedData.ExtraInfo?.join(", ") || "N/A",
            Picture: parsedData.Picture || null,
            Description: parsedData.Description || "N/A",
            WordFamilies: parsedData.WordFamilies?.join(", ") || "N/A",
            Vietnamese: parsedData.Vietnamese || "N/A",
        });
    }

    console.log("All words processed successfully.");
    return processedWords;
};

// Route API để tra cứu từ chi tiết
app.get('/api/getWordDetails', async (req, res) => {
    const word = req.query.word;

    if (!word) {
        console.warn("Missing 'word' parameter in /api/getWordDetails request.");
        return res.status(400).json({ error: "Word parameter is required" });
    }

    try {
        // Gọi hàm đã có để lấy thông tin chi tiết của từ
        const wordDetails = await getWordDetails(word); // Gọi hàm fetch từ server
        if (!wordDetails) {
            return res.status(404).json({ error: `Details not found for word "${word}"` });
        }

        // Làm sạch dữ liệu trả về trước khi parse JSON
        const cleanedText = cleanRawText(wordDetails);
        console.log(`Cleaned JSON for "${word}":`, cleanedText); // Thêm log

        let parsedData = JSON.parse(cleanedText); // Parse dữ liệu trả về từ API
        console.log(`Parsed Data to send for "${word}":`, parsedData); // Thêm log

        // Trả về dữ liệu chi tiết dưới dạng JSON cho client
        return res.json(parsedData);
    } catch (error) {
        console.error("Error in getWordDetails API:", error.message);
        return res.status(500).json({ error: "An error occurred while fetching word details" });
    }
});

// Route để render trang index với các từ đã xử lý
app.get('/', async (req, res) => {
    const words = req.query.words ? req.query.words.split(',') : [];
    if (words.length === 0) {
        return res.status(400).json({ error: "No words provided" });
    }
    const processedWords = await processWords(words);
    res.render('index', { words: processedWords });
});

// Route để xử lý danh sách từ vựng từ extension
app.post('/api/processVocabulary', async (req, res) => {
    const { vocabularyList } = req.body;

    if (!vocabularyList || !Array.isArray(vocabularyList)) {
        console.warn("Invalid 'vocabularyList' in /api/processVocabulary request.");
        return res.status(400).json({ error: "Invalid vocabulary list" });
    }

    try {
        const processedWords = await processWords(vocabularyList);
        res.json({ processedWords });
    } catch (error) {
        console.error("Error processing vocabulary list:", error.message);
        res.status(500).json({ error: "An error occurred while processing the vocabulary list" });
    }
});

// Route API mới để xử lý các từ
app.post('/api/processWords', async (req, res) => {
    const words = req.body.words;

    if (!Array.isArray(words) || words.length === 0) {
        return res.status(400).json({ error: "Invalid word list. Please provide an array of words." });
    }

    try {
        // Xử lý từng từ trong danh sách
        const processedWords = await processWords(words);

        // Trả kết quả danh sách từ đã xử lý về cho frontend
        res.json({ processedWords });
    } catch (error) {
        console.error("Error processing words:", error.message);
        res.status(500).json({ error: "An error occurred while processing words." });
    }
});

export default {
    entry: './src/api/finddetailword.js', // Chọn file này làm đầu vào
    output: {
        filename: 'finddetailword.bundle.js', // Tên file đầu ra
        path: path.resolve('dist'), // Thư mục đầu ra
    },
    target: 'node', // Chỉ định môi trường chạy là Node.js
    mode: 'development', // Hoặc 'production' khi build để triển khai
    module: {
        rules: [
            {
                test: /\.js$/, // Áp dụng cho file .js
                exclude: /node_modules/, // Bỏ qua thư viện
                use: {
                    loader: 'babel-loader', // Dùng Babel để chuyển đổi mã ES6
                },
            },
        ],
    },
};
