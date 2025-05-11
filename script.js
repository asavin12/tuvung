let vocabList = [];

// Thay bằng thông tin GitHub của bạn
const GITHUB_TOKEN = "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";
const GITHUB_OWNER = "asavin12"; ;
const GITHUB_REPO = "tukho";
const GITHUB_PATH = "difficult_words.json";
const API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

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
    try {
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
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="checkbox" class="word-checkbox" data-index="${index}"></td>
            <td>${word.german}</td>
            <td>${word.vietnamese}</td>
        `;
        tableBody.appendChild(row);
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

// Sắp xếp ngẫu nhiên, đảm bảo không có từ lặp liên tiếp
function shuffleArray(array) {
    const result = [...array];
    let n = result.length;

    // Fisher-Yates shuffle với kiểm tra không lặp liên tiếp
    for (let i = n - 1; i > 0; i--) {
        let validIndices = [];
        for (let j = 0; j <= i; j++) {
            // Chỉ thêm chỉ số j nếu result[j] không giống result[i+1] (hoặc i là cuối mảng)
            if (i === n - 1 || normalizeString(result[j].german) !== normalizeString(result[i + 1].german)) {
                validIndices.push(j);
            }
        }
        if (validIndices.length === 0) {
            // Nếu không có chỉ số hợp lệ, giữ nguyên (hiếm xảy ra)
            continue;
        }
        // Chọn ngẫu nhiên từ các chỉ số hợp lệ
        const j = validIndices[Math.floor(Math.random() * validIndices.length)];
        [result[i], result[j]] = [result[j], result[i]];
    }

    // Kiểm tra lại và sửa nếu vẫn có lặp liên tiếp
    for (let i = 1; i < result.length; i++) {
        if (normalizeString(result[i].german) === normalizeString(result[i - 1].german)) {
            // Tìm một vị trí không gây lặp liên tiếp để hoán đổi
            for (let j = i + 1; j < result.length; j++) {
                if (
                    normalizeString(result[j].german) !== normalizeString(result[i - 1].german) &&
                    (j === result.length - 1 || normalizeString(result[j].german) !== normalizeString(result[i + 1]?.german))
                ) {
                    [result[i], result[j]] = [result[j], result[i]];
                    break;
                }
            }
        }
    }

    return result;
}

// Tạo bảng học từ vựng
function generateTable() {
    const repeatCount = parseInt(document.getElementById("repeatCount").value) || 1;
    const tableType = document.getElementById("tableType").value;
    const printArea = document.getElementById("printArea");

    const selectedIndices = Array.from(document.querySelectorAll(".word-checkbox:checked"))
        .map(checkbox => parseInt(checkbox.dataset.index));

    if (selectedIndices.length === 0) {
        alert("Vui lòng chọn ít nhất một từ để tạo bảng.");
        return;
    }

    // Tạo danh sách từ được chọn
    const selectedWords = selectedIndices.map(index => vocabList[index]);

    // Tạo danh sách từ lặp lại
    let tableData = [];
    selectedWords.forEach(word => {
        for (let i = 0; i < repeatCount; i++) {
            tableData.push({ ...word });
        }
    });

    // Sắp xếp ngẫu nhiên
    tableData = shuffleArray(tableData);

    // Tạo bảng HTML
    const answerColumnTitle = tableType === "germanToVietnamese" ? "Đáp án Tiếng Việt" : "Đáp án Tiếng Đức";
    let tableHtml = `
        <table class="print-table">
            <thead>
                <tr>
                    <th>${tableType === "germanToVietnamese" ? "Tiếng Đức" : "Tiếng Việt"}</th>
                    <th>${answerColumnTitle}</th>
                </tr>
            </thead>
            <tbody>
    `;
    tableData.forEach(word => {
        tableHtml += `
            <tr>
                <td>${tableType === "germanToVietnamese" ? word.german : word.vietnamese}</td>
                <td></td>
            </tr>
        `;
    });
    tableHtml += `</tbody></table>`;

    printArea.innerHTML = tableHtml;
    printArea.style.display = "block";
    document.getElementById("printControls").style.display = "block";
}

// Tạo và tải PDF
function createPDF() {
    const printArea = document.getElementById("printArea");
    if (!printArea.innerHTML) {
        alert("Không có bảng để tạo PDF. Vui lòng tạo bảng trước.");
        return;
    }

    // Tải jsPDF từ CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        // Thêm font Arial từ arial.js
        doc.addFileToVFS("Arial.ttf", arialBase64);
        doc.addFont("Arial.ttf", "Arial", "normal");
        doc.setFont("Arial");

        // Lấy dữ liệu bảng
        const table = printArea.querySelector(".print-table");
        const rows = table.querySelectorAll("tr");
        let y = 10;

        // Tiêu đề
        const tableType = document.getElementById("tableType").value;
        doc.setFontSize(14);
        doc.text(`Bảng Học Từ Vựng (${tableType === "germanToVietnamese" ? "Tiếng Đức → Tiếng Việt" : "Tiếng Việt → Tiếng Đức"})`, 10, y);
        y += 7;

        // Vẽ bảng
        const colWidths = [100, 90];
        const rowHeight = 7;
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);

        rows.forEach((row, index) => {
            if (y + rowHeight > 277) {
                doc.addPage();
                y = 10;
            }

            const cells = row.querySelectorAll("th, td");
            let x = 10;

            cells.forEach((cell, cellIndex) => {
                const text = cell.textContent;
                const width = colWidths[cellIndex];
                const isHeader = cell.tagName === "TH";

                // Vẽ viền
                doc.setLineWidth(0.2);
                doc.rect(x, y, width, rowHeight);

                // Vẽ nền cho tiêu đề
                if (isHeader) {
                    doc.setFillColor(240, 240, 240);
                    doc.rect(x, y, width, rowHeight, "F");
                }

                // Vẽ văn bản
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(text, x + 2, y + 5, { maxWidth: width - 4 });

                x += width;
            });

            y += rowHeight;
        });

        // Lưu PDF
        doc.save("vocab_table.pdf");
    };
    script.onerror = function() {
        alert("Không thể tải jsPDF. Vui lòng kiểm tra kết nối mạng.");
    };
    document.head.appendChild(script);
}

// Tải danh sách từ vựng khi trang load
window.onload = loadVocabList;
