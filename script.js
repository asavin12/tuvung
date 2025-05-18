let vocabList = [];

// Thông tin GitHub
const GITHUB_OWNER = "tranduchai1";
const GITHUB_REPO = "tuvung";
const GITHUB_PATH = "difficult_words.json";
const API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

// Khóa bí mật cho XOR
const SECRET_KEY = 'mysecretkey';

// API key mã hóa
const ENCODED_KEY = 'ChEDOiA1DCJaVioiOzkBURApOBIyLTQwRAsxHCgbClwbO0lDEQQoFg==';

// Hàm giải mã XOR
function xorDecode(str, key) {
    return Array.from(str)
        .map((char, i) => char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        .map(code => String.fromCharCode(code))
        .join('');
}

// Hàm lấy API key giải mã
function loadApiKey() {
    try {
        const decodedBase64 = atob(ENCODED_KEY);
        const token = xorDecode(decodedBase64, SECRET_KEY);
        return token;
    } catch (error) {
        console.error('Error decoding API key:', error.message);
        alert(`Không thể giải mã API key: ${error.message}. Vui lòng kiểm tra ENCODED_KEY và SECRET_KEY.`);
        return null;
    }
}

// Hàm sửa chuỗi mã hóa sai
function fixEncoding(str) {
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

// Hàm chuẩn hóa chuỗi để kiểm tra trùng lặp
function normalizeString(str) {
    if (typeof str !== 'string') return '';
    const fixedStr = fixEncoding(str);
    return fixedStr
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// Hàm mã hóa base64 với UTF-8
function encodeBase64(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return btoa(String.fromCharCode(...data));
}

// Hàm giải mã base64 với UTF-8
function decodeBase64(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}

// Tải dữ liệu từ GitHub
async function loadVocabList() {
    const GITHUB_TOKEN = loadApiKey();
    if (!GITHUB_TOKEN) return;

    try {
        const networkCheck = await fetch('https://api.github.com', { method: 'HEAD' });
        if (!networkCheck.ok) {
            throw new Error(`Không thể kết nối đến GitHub API: ${networkCheck.status}`);
        }

        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "vocab-app"
            }
        });

        if (response.ok) {
            const data = await response.json();
            vocabList = JSON.parse(decodeBase64(data.content));
            displayVocabList();
        } else if (response.status === 404) {
            console.log("File not found, initializing empty list");
            vocabList = [];
            displayVocabList();
        } else {
            const errorData = await response.json();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message}`);
        }
    } catch (error) {
        console.error("Error loading vocab list:", error.message);
        alert(`Không thể tải danh sách từ vựng: ${error.message}. Vui lòng kiểm tra console và token GitHub.`);
    }
}

// Lưu dữ liệu lên GitHub
async function saveVocabList() {
    const GITHUB_TOKEN = loadApiKey();
    if (!GITHUB_TOKEN) return;

    try {
        let sha = null;
        const getResponse = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "vocab-app"
            }
        });

        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        } else if (getResponse.status !== 404) {
            const errorData = await getResponse.json();
            throw new Error(`HTTP error! Status: ${getResponse.status}, Message: ${errorData.message}`);
        }

        const jsonString = JSON.stringify(vocabList, null, 2);
        const updateResponse = await fetch(API_URL, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "vocab-app"
            },
            body: JSON.stringify({
                message: `Update difficult_words.json`,
                content: encodeBase64(jsonString),
                sha: sha
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`HTTP error! Status: ${updateResponse.status}, Message: ${errorData.message}`);
        }

        console.log("Vocab list saved successfully");
    } catch (error) {
        console.error("Error saving vocab list:", error.message);
        alert(`Không thể lưu danh sách từ vựng: ${error.message}. Vui lòng kiểm tra console và token GitHub.`);
    }
}

// Hiển thị danh sách từ vựng
function displayVocabList() {
    const tableBody = document.getElementById("vocabTableBody");
    tableBody.innerHTML = "";
    vocabList.forEach((word, index) => {
        if (word && typeof word.german === 'string' && typeof word.vietnamese === 'string') {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="checkbox" class="word-checkbox" data-index="${index}"></td>
                <td>${word.german}</td>
                <td>${word.vietnamese}</td>
            `;
            tableBody.appendChild(row);
        }
    });
    document.getElementById("selectAll").checked = false;
}

// Chọn hoặc bỏ chọn tất cả
function toggleSelectAll() {
    const selectAll = document.getElementById("selectAll").checked;
    const checkboxes = document.querySelectorAll(".word-checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll;
    });
}

// Xóa các từ được chọn
async function deleteSelectedWords() {
    const selectedIndices = Array.from(document.querySelectorAll(".word-checkbox:checked"))
        .map(checkbox => parseInt(checkbox.dataset.index))
        .sort((a, b) => b - a);

    if (selectedIndices.length === 0) {
        alert("Vui lòng chọn ít nhất một từ để xóa.");
        return;
    }

    if (confirm(`Bạn có chắc muốn xóa ${selectedIndices.length} từ đã chọn?`)) {
        selectedIndices.forEach(index => {
            vocabList.splice(index, 1);
        });
        await saveVocabList();
        displayVocabList();
    }
}

// Sắp xếp ngẫu nhiên theo cụm
function shuffleArray(array, repeatCount) {
    if (!array || array.length === 0) return [];

    // Lọc các phần tử hợp lệ
    const validWords = array.filter(word => word && typeof word.german === 'string' && typeof word.vietnamese === 'string');
    if (validWords.length === 0) return [];

    // Số dòng mỗi cụm = số từ được chọn
    const clusterSize = validWords.length; // 10 nếu chọn 10 từ
    const numClusters = repeatCount; // Số cụm = repeatCount
    let finalResult = [];

    // Tạo danh sách từ có sẵn, mỗi từ lặp repeatCount lần
    let availableWords = [];
    validWords.forEach((word, index) => {
        for (let i = 0; i < repeatCount; i++) {
            availableWords.push({
                ...word,
                normalizedGerman: normalizeString(word.german),
                originalIndex: index // Lưu chỉ số gốc để theo dõi
            });
        }
    });

    let lastWordOfPrevCluster = null;

    // Hàm xáo trộn một mảng (Fisher-Yates Shuffle)
    function shuffleSubArray(arr, start, end) {
        for (let i = end - 1; i > start; i--) {
            const j = start + Math.floor(Math.random() * (i - start + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Hàm kiểm tra và sửa vi phạm quy tắc
    function fixClusterBoundary(clusters, clusterIndex, clusterSize) {
        if (clusterIndex === 0) return;
        const prevCluster = clusters[clusterIndex - 1];
        const currCluster = clusters[clusterIndex];
        const lastWord = prevCluster[clusterSize - 1];
        const firstWord = currCluster[0];
        if (lastWord.normalizedGerman === firstWord.normalizedGerman || lastWord.originalIndex === firstWord.originalIndex) {
            // Tìm từ khác trong cụm hiện tại để hoán đổi
            for (let i = 1; i < currCluster.length; i++) {
                if (currCluster[i].normalizedGerman !== lastWord.normalizedGerman && 
                    currCluster[i].originalIndex !== lastWord.originalIndex) {
                    [currCluster[0], currCluster[i]] = [currCluster[i], currCluster[0]];
                    break;
                }
            }
        }
    }

    const clusters = [];

    for (let clusterIndex = 0; clusterIndex < numClusters; clusterIndex++) {
        let cluster = [];
        const usedIndices = new Set(); // Theo dõi chỉ số từ đã dùng trong cụm

        if (clusterIndex === 0) {
            // Cụm 1: Chọn 1 lần mỗi từ
            for (let i = 0; i < clusterSize; i++) {
                const candidates = availableWords.filter(word => !usedIndices.has(word.originalIndex));
                if (candidates.length === 0) break;
                const wordIndex = Math.floor(Math.random() * candidates.length);
                const selectedWord = candidates[wordIndex];
                cluster.push(selectedWord);
                usedIndices.add(selectedWord.originalIndex);
            }
        } else {
            // Cụm 2 trở đi: Dòng đầu khác dòng cuối cụm trước
            const lastWordNormalized = lastWordOfPrevCluster ? lastWordOfPrevCluster.normalizedGerman : '';
            const lastWordIndex = lastWordOfPrevCluster ? lastWordOfPrevCluster.originalIndex : -1;

            // Chọn dòng đầu tiên
            const firstCandidates = availableWords.filter(
                word => word.normalizedGerman !== lastWordNormalized && word.originalIndex !== lastWordIndex
            );
            let firstWord;
            if (firstCandidates.length > 0) {
                const firstWordIndex = Math.floor(Math.random() * firstCandidates.length);
                firstWord = firstCandidates[firstWordIndex];
            } else {
                // Nếu không có từ khác, chọn từ có originalIndex khác
                const fallbackCandidates = availableWords.filter(word => word.originalIndex !== lastWordIndex);
                if (fallbackCandidates.length > 0) {
                    const firstWordIndex = Math.floor(Math.random() * fallbackCandidates.length);
                    firstWord = fallbackCandidates[firstWordIndex];
                } else {
                    // Nếu không còn lựa chọn, chọn ngẫu nhiên
                    const firstWordIndex = Math.floor(Math.random() * availableWords.length);
                    firstWord = availableWords[firstWordIndex];
                }
            }
            cluster.push(firstWord);
            usedIndices.add(firstWord.originalIndex);

            // Chọn các từ còn lại
            for (let i = 1; i < clusterSize; i++) {
                const candidates = availableWords.filter(word => !usedIndices.has(word.originalIndex));
                if (candidates.length === 0) break;
                const wordIndex = Math.floor(Math.random() * candidates.length);
                const selectedWord = candidates[wordIndex];
                cluster.push(selectedWord);
                usedIndices.add(selectedWord.originalIndex);
            }
        }

        // Cập nhật availableWords
        const usedWords = new Set(cluster);
        availableWords = availableWords.filter(word => !usedWords.has(word));

        // Xáo trộn vị trí dòng trong cụm
        shuffleSubArray(cluster, 0, cluster.length);

        // Lưu cụm
        clusters.push(cluster);
        lastWordOfPrevCluster = cluster[cluster.length - 1];
    }

    // Kiểm tra và sửa vi phạm quy tắc
    for (let i = 1; i < numClusters; i++) {
        fixClusterBoundary(clusters, i, clusterSize);
    }

    // Ghép các cụm thành kết quả cuối
    finalResult = clusters.flat();

    // Loại bỏ thuộc tính normalizedGerman và originalIndex
    return finalResult.map(({ normalizedGerman, originalIndex, ...word }) => word);
}

// Tạo bảng học từ vựng
function generateTable(type = null) {
    const repeatCount = parseInt(document.getElementById("repeatCount").value) || 1;
    const tableType = type || document.getElementById("tableType").value;
    const selectedIndices = Array.from(document.querySelectorAll(".word-checkbox:checked"))
        .map(checkbox => parseInt(checkbox.dataset.index));

    if (selectedIndices.length === 0) {
        alert("Vui lòng chọn ít nhất một từ để tạo bảng.");
        return null;
    }

    const selectedWords = selectedIndices
        .map(index => vocabList[index])
        .filter(word => word && typeof word.german === 'string' && typeof word.vietnamese === 'string');

    if (selectedWords.length === 0) {
        alert("Không có từ hợp lệ để tạo bảng. Vui lòng kiểm tra danh sách từ vựng.");
        return null;
    }

    const tableData = shuffleArray(selectedWords, repeatCount);

    const answerColumnTitle = tableType === "germanToVietnamese" ? "Đáp án Tiếng Việt" : "Đáp án Tiếng Đức";
    let tableHtml = `
        <table class="print-table">
            <thead>
                <tr>
                    <th>STT</th>
                    <th>${tableType === "germanToVietnamese" ? "Tiếng Đức" : "Tiếng Việt"}</th>
                    <th>${answerColumnTitle}</th>
                </tr>
            </thead>
            <tbody>
    `;
    tableData.forEach((word, idx) => {
        tableHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td>${tableType === "germanToVietnamese" ? word.german : word.vietnamese}</td>
                <td></td>
            </tr>
        `;
    });
    tableHtml += `</tbody></table>`;

    if (!type) {
        const printArea = document.getElementById("printArea");
        printArea.innerHTML = tableHtml;
        printArea.style.display = "block";
        document.getElementById("printControls").style.display = "block";
    }

    return tableHtml;
}

// Tạo PDF cho bảng hiện tại
function createPDF() {
    const tableHtml = generateTable();
    if (!tableHtml) {
        alert("Không có bảng để tạo PDF. Vui lòng tạo bảng trước.");
        return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        doc.addFileToVFS("Arial.ttf", arialBase64);
        doc.addFont("Arial.ttf", "Arial", "normal");
        doc.setFont("Arial");

        const tableType = document.getElementById("tableType").value;
        const title = `Bảng Học Từ Vựng (${tableType === "germanToVietnamese" ? "Tiếng Đức → Tiếng Việt" : "Tiếng Việt → Tiếng Đức"})`;

        function drawTable(tableHtml, title, startY) {
            doc.setFontSize(12);
            doc.text(title, 10, startY);
            startY += 5;

            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = tableHtml;
            const table = tempDiv.querySelector(".print-table");
            const rows = table.querySelectorAll("tr");
            let y = startY;

            const colWidths = [8, 80, 90]; // Cột STT, Tiếng Đức/Việt, Đáp án
            const lineHeight = 3.5; // Chiều cao mỗi dòng văn bản
            const padding = 1; // Khoảng cách lề ô
            const maxLinesPerCell = 2; // Số dòng tối đa mỗi ô
            const pageHeight = 287; // Chiều cao trang A4 trừ lề (297 - 10)

            rows.forEach((row, index) => {
                const cells = row.querySelectorAll("th, td");
                let maxLines = 1;

                // Tính số dòng tối đa trong ô của hàng
                cells.forEach((cell, cellIndex) => {
                    const text = cell.textContent;
                    const width = colWidths[cellIndex] - 2 * padding;
                    doc.setFontSize(10);
                    const lines = doc.splitTextToSize(text, width);
                    maxLines = Math.min(Math.max(maxLines, lines.length), maxLinesPerCell);
                });

                const rowHeight = maxLines * lineHeight + 2 * padding;

                // Kiểm tra nếu hàng vượt quá trang
                if (y + rowHeight > pageHeight) {
                    doc.addPage();
                    y = 10;
                    // Vẽ lại tiêu đề trên trang mới
                    doc.setFontSize(12);
                    doc.text(title, 10, y);
                    y += 5;
                }

                let x = 10;
                cells.forEach((cell, cellIndex) => {
                    const text = cell.textContent;
                    const width = colWidths[cellIndex];
                    const isHeader = cell.tagName === "TH";

                    // Vẽ viền ô
                    doc.setLineWidth(0.2);
                    doc.rect(x, y, width, rowHeight);

                    // Tô nền cho tiêu đề
                    if (isHeader) {
                        doc.setFillColor(240, 240, 240);
                        doc.rect(x, y, width, rowHeight, "F");
                    }

                    // Vẽ văn bản
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    let lines = doc.splitTextToSize(text, width - 2 * padding);
                    if (lines.length > maxLinesPerCell) {
                        lines = lines.slice(0, maxLinesPerCell);
                        if (lines[maxLinesPerCell - 1].length > 3) {
                            lines[maxLinesPerCell - 1] = lines[maxLinesPerCell - 1].slice(0, -3) + "...";
                        }
                    }
                    lines.forEach((line, lineIndex) => {
                        doc.text(line, x + padding, y + padding + (lineIndex + 1) * lineHeight);
                    });

                    x += width;
                });

                y += rowHeight;
            });

            return y;
        }

        drawTable(tableHtml, title, 10);
        doc.save("vocab_table.pdf");
    };
    script.onerror = function() {
        alert("Không thể tải jsPDF. Vui lòng kiểm tra kết nối mạng.");
    };
    document.head.appendChild(script);
}

// Tạo PDF chứa cả hai bảng
function createCombinedPDF() {
    const germanToVietnameseTable = generateTable("germanToVietnamese");
    const vietnameseToGermanTable = generateTable("vietnameseToGerman");

    if (!germanToVietnameseTable || !vietnameseToGermanTable) {
        alert("Không thể tạo PDF. Vui lòng kiểm tra danh sách từ đã chọn.");
        return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        doc.addFileToVFS("Arial.ttf", arialBase64);
        doc.addFont("Arial.ttf", "Arial", "normal");
        doc.setFont("Arial");

        const colWidths = [8, 80, 90]; // Cột STT, Tiếng Đức/Việt, Đáp án
        const lineHeight = 3.5; // Chiều cao mỗi dòng văn bản
        const padding = 1; // Khoảng cách lề ô
        const maxLinesPerCell = 2; // Số dòng tối đa mỗi ô
        const pageHeight = 287; // Chiều cao trang A4 trừ lề (297 - 10)

        function drawTable(tableHtml, title, startY) {
            doc.setFontSize(12);
            doc.text(title, 10, startY);
            startY += 5;

            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = tableHtml;
            const table = tempDiv.querySelector(".print-table");
            const rows = table.querySelectorAll("tr");
            let y = startY;

            rows.forEach((row, index) => {
                const cells = row.querySelectorAll("th, td");
                let maxLines = 1;

                // Tính số dòng tối đa trong ô của hàng
                cells.forEach((cell, cellIndex) => {
                    const text = cell.textContent;
                    const width = colWidths[cellIndex] - 2 * padding;
                    doc.setFontSize(10);
                    const lines = doc.splitTextToSize(text, width);
                    maxLines = Math.min(Math.max(maxLines, lines.length), maxLinesPerCell);
                });

                const rowHeight = maxLines * lineHeight + 2 * padding;

                // Kiểm tra nếu hàng vượt quá trang
                if (y + rowHeight > pageHeight) {
                    doc.addPage();
                    y = 10;
                    // Vẽ lại tiêu đề trên trang mới
                    doc.setFontSize(12);
                    doc.text(title, 10, y);
                    y += 5;
                }

                let x = 10;
                cells.forEach((cell, cellIndex) => {
                    const text = cell.textContent;
                    const width = colWidths[cellIndex];
                    const isHeader = cell.tagName === "TH";

                    // Vẽ viền ô
                    doc.setLineWidth(0.2);
                    doc.rect(x, y, width, rowHeight);

                    // Tô nền cho tiêu đề
                    if (isHeader) {
                        doc.setFillColor(240, 240, 240);
                        doc.rect(x, y, width, rowHeight, "F");
                    }

                    // Vẽ văn bản
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    let lines = doc.splitTextToSize(text, width - 2 * padding);
                    if (lines.length > maxLinesPerCell) {
                        lines = lines.slice(0, maxLinesPerCell);
                        if (lines[maxLinesPerCell - 1].length > 3) {
                            lines[maxLinesPerCell - 1] = lines[maxLinesPerCell - 1].slice(0, -3) + "...";
                        }
                    }
                    lines.forEach((line, lineIndex) => {
                        doc.text(line, x + padding, y + padding + (lineIndex + 1) * lineHeight);
                    });

                    x += width;
                });

                y += rowHeight;
            });

            return y;
        }

        let y = drawTable(germanToVietnameseTable, "Bảng Học Từ Vựng (Tiếng Đức → Tiếng Việt)", 10);
        doc.addPage();
        drawTable(vietnameseToGermanTable, "Bảng Học Từ Vựng (Tiếng Việt → Tiếng Đức)", 10);

        doc.save("combined_vocab_table.pdf");
    };
    script.onerror = function() {
        alert("Không thể tải jsPDF. Vui lòng kiểm tra kết nối mạng.");
    };
    document.head.appendChild(script);
}

// Tải danh sách từ vựng khi trang load
window.onload = loadVocabList;