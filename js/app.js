// app.js - Phiên bản nâng cao với đầy đủ tính năng

let currentTopic = "universe";
let currentWordObj = null;
let vocabulary = getVocabulary();
let learnedWords = JSON.parse(localStorage.getItem("learnedWords") || "{}");
let wrongWords = JSON.parse(localStorage.getItem("wrongWords") || "[]");
let streak = parseInt(localStorage.getItem("streak") || "0");
let lastStudyDate = localStorage.getItem("lastStudyDate") || "";

// Biến cho chức năng xem thêm / thu gọn
let showAllTopics = false;
let currentSearchTerm = "";
let allTopicsList = [];

// ==================== ÂM THANH (Web Audio API - Max 100%) ====================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            console.log('Audio init error:', e);
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Phát âm thanh đúng - Tiếng chuông vui (MAX VOLUME)
function playCorrectSound() {
    try {
        initAudio();
        if (!audioCtx) return;
        
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99];
        const durations = [0.12, 0.12, 0.15];
        const startTimes = [0, 0.12, 0.24];
        
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + startTimes[i]);
            gain.gain.setValueAtTime(0.5, now + startTimes[i]);
            gain.gain.exponentialRampToValueAtTime(0.001, now + startTimes[i] + durations[i]);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + startTimes[i]);
            osc.stop(now + startTimes[i] + durations[i]);
        });
    } catch(e) {
        console.log('Correct sound error:', e);
    }
}

// Phát âm thanh sai - Tiếng buzz (MAX VOLUME)
function playWrongSound() {
    try {
        initAudio();
        if (!audioCtx) return;
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(150, now + 0.15);
        osc.frequency.setValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(80, now);
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
        osc2.start(now);
        osc2.stop(now + 0.4);
    } catch(e) {
        console.log('Wrong sound error:', e);
    }
}

// ==================== QUẢN LÝ TỪ SAI ====================
function addWrongWord(vi, en, topic) {
    wrongWords.push({
        vi: vi,
        en: en,
        topic: topic,
        timestamp: Date.now(),
        attempts: 1
    });
    localStorage.setItem("wrongWords", JSON.stringify(wrongWords));
    updateWrongCountBadge();
}

function getWrongWords() {
    return JSON.parse(localStorage.getItem("wrongWords") || "[]");
}

function clearWrongWords() {
    wrongWords = [];
    localStorage.setItem("wrongWords", JSON.stringify(wrongWords));
    updateWrongCountBadge();
}

function updateWrongCountBadge() {
    const badge = document.getElementById("wrongCountBadge");
    if (badge) {
        const count = getWrongWords().length;
        if (count > 0) {
            badge.textContent = count > 99 ? "99+" : count;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }
}

// ==================== DOM elements ====================
const topicContainer = document.getElementById("topic-container");
const vietnameseWordEl = document.getElementById("vietnameseWord");
const answerInput = document.getElementById("answerInput");
const checkBtn = document.getElementById("checkBtn");
const nextBtn = document.getElementById("nextBtn");
const speakBtn = document.getElementById("speakBtn");
const randomBtn = document.getElementById("randomBtn");
const resultArea = document.getElementById("resultArea");
const streakCountEl = document.getElementById("streakCount");
const currentTopicNameEl = document.getElementById("currentTopicName");

// ==================== Cập nhật streak ====================
function updateStreak() {
    const today = new Date().toDateString();
    if (lastStudyDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastStudyDate === yesterday.toDateString()) {
            streak++;
        } else {
            streak = 1;
        }
        lastStudyDate = today;
        localStorage.setItem("streak", streak);
        localStorage.setItem("lastStudyDate", lastStudyDate);
    }
    if (streakCountEl) streakCountEl.textContent = streak;
}

// ==================== Cập nhật tên chủ đề ====================
function updateTopicName() {
    if (currentTopicNameEl && vocabulary[currentTopic]) {
        const topicName = vocabulary[currentTopic].name;
        currentTopicNameEl.innerHTML = `📚 Chủ đề: <span class="font-bold">${topicName}</span>`;
    }
}

// ==================== Hiển thị từ ====================
function displayWord() {
    if (currentWordObj) {
        vietnameseWordEl.textContent = currentWordObj.vi;
        answerInput.value = "";
        resultArea.innerHTML = "";
        resultArea.className = "rounded-2xl p-4 transition-all min-h-[100px]";
        answerInput.focus();
        updateTopicName();
    }
}

// ==================== Lấy từ ngẫu nhiên ====================
function getRandomWord() {
    const topicWords = vocabulary[currentTopic]?.words || [];
    if (topicWords.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * topicWords.length);
    return topicWords[randomIndex];
}

function selectNewWord() {
    currentWordObj = getRandomWord();
    displayWord();
}

// ==================== Kiểm tra đáp án ====================
function checkAnswer() {
    if (!currentWordObj) return;
    initAudio();
    
    const userAnswer = answerInput.value.trim().toLowerCase();
    const correctAnswer = currentWordObj.en.toLowerCase();
    
    if (userAnswer === correctAnswer) {
        playCorrectSound();
        
        resultArea.innerHTML = `
            <div class="correct-answer text-white p-4 rounded-xl text-center">
                <i class="fas fa-check-circle text-2xl mb-2"></i>
                <p class="font-bold">🎉 Chính xác! "${currentWordObj.en}"</p>
                <p class="text-sm opacity-90">Tiếp tục phát huy nhé!</p>
            </div>
        `;
        resultArea.className = "rounded-2xl p-4 transition-all min-h-[100px] correct-answer text-white";
        
        const key = `${currentTopic}_${currentWordObj.en}`;
        if (!learnedWords[key]) {
            learnedWords[key] = true;
            localStorage.setItem("learnedWords", JSON.stringify(learnedWords));
        }
        
        updateStreak();
        
        canvasConfetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        
        setTimeout(() => {
            selectNewWord();
        }, 1500);
    } else {
        playWrongSound();
        
        addWrongWord(currentWordObj.vi, currentWordObj.en, currentTopic);
        
        let suggestion = "";
        if (correctAnswer.length > 0 && userAnswer.length > 0) {
            if (correctAnswer[0] === userAnswer[0]) {
                suggestion = `<div class="suggestion-tip p-3 rounded-lg mt-3 text-sm text-gray-800">💡 Gợi ý: Từ bắt đầu bằng chữ <strong class="text-indigo-700">"${correctAnswer[0]}"</strong>, hãy thử lại!</div>`;
            } else {
                suggestion = `<div class="suggestion-tip p-3 rounded-lg mt-3 text-sm text-gray-800">💡 Gợi ý: Từ này bắt đầu bằng chữ <strong class="text-indigo-700">"${correctAnswer[0]}"</strong></div>`;
            }
        }
        
        resultArea.innerHTML = `
            <div class="wrong-answer text-white p-4 rounded-xl text-center">
                <i class="fas fa-times-circle text-2xl mb-2"></i>
                <p class="font-bold">❌ Chưa đúng!</p>
                <p class="text-sm opacity-90">Đáp án đúng là: <strong class="text-yellow-200">"${correctAnswer}"</strong></p>
                ${suggestion}
            </div>
        `;
        resultArea.className = "rounded-2xl p-4 transition-all min-h-[100px] wrong-answer text-white";
        
        answerInput.classList.add('shake');
        setTimeout(() => {
            answerInput.classList.remove('shake');
        }, 300);
    }
}

// ==================== Các hàm điều hướng ====================
function nextWord() {
    selectNewWord();
}

function randomWord() {
    const topics = Object.keys(vocabulary);
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    currentTopic = randomTopic;
    highlightActiveTopic();
    selectNewWord();
}

function speakWord() {
    if (currentWordObj && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentWordObj.en);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.volume = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }
}

// ==================== QUẢN LÝ CHỦ ĐỀ ====================
function buildTopicsList() {
    allTopicsList = Object.keys(vocabulary).map(key => ({
        key: key,
        name: vocabulary[key].name
    }));
    const topicCountSpan = document.getElementById("topicCount");
    if (topicCountSpan) topicCountSpan.textContent = allTopicsList.length;
    return allTopicsList;
}

function filterTopics() {
    const searchTerm = currentSearchTerm.toLowerCase();
    if (!searchTerm) return allTopicsList;
    return allTopicsList.filter(topic => 
        topic.name.toLowerCase().includes(searchTerm) || 
        topic.key.toLowerCase().includes(searchTerm)
    );
}

function updateActionButtons() {
    const filtered = filterTopics();
    const hiddenCount = filtered.length - 12;
    const showMoreBtn = document.getElementById("showMoreBtn");
    const collapseBtn = document.getElementById("collapseBtn");
    
    if (!showMoreBtn || !collapseBtn) return;
    
    if (showAllTopics) {
        showMoreBtn.classList.add("hidden");
        collapseBtn.classList.remove("hidden");
    } else {
        collapseBtn.classList.add("hidden");
        if (hiddenCount > 0) {
            showMoreBtn.classList.remove("hidden");
            const hiddenCountSpan = document.getElementById("hiddenCount");
            if (hiddenCountSpan) hiddenCountSpan.textContent = hiddenCount;
            const btnSpan = showMoreBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = hiddenCount;
        } else {
            showMoreBtn.classList.add("hidden");
        }
    }
}

function renderTopics() {
    const filtered = filterTopics();
    const maxVisible = showAllTopics ? filtered.length : 12;
    const visibleTopics = filtered.slice(0, maxVisible);
    
    updateActionButtons();
    
    const container = document.getElementById("topic-container");
    if (container) {
        if (!showAllTopics) {
            container.classList.add("max-h-32", "overflow-y-auto");
            container.classList.remove("max-h-none");
        } else {
            container.classList.remove("max-h-32", "overflow-y-auto");
            container.classList.add("max-h-none");
        }
    }
    
    topicContainer.innerHTML = visibleTopics.map(topic => `
        <button data-topic="${topic.key}" class="topic-chip px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm bg-white/80 hover:bg-white ${currentTopic === topic.key ? 'active' : ''}">
            ${topic.name}
        </button>
    `).join('');
    
    document.querySelectorAll('.topic-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTopic = btn.dataset.topic;
            highlightActiveTopic();
            selectNewWord();
            
            if (showAllTopics) {
                showAllTopics = false;
                renderTopics();
            }
        });
    });
}

function showMoreTopics() {
    showAllTopics = true;
    renderTopics();
}

function collapseTopics() {
    showAllTopics = false;
    renderTopics();
}

function highlightActiveTopic() {
    document.querySelectorAll('.topic-chip').forEach(btn => {
        if (btn.dataset.topic === currentTopic) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    updateTopicName();
}

// ==================== HÀM ĐÓNG MODAL ====================
function closePathModal() {
    const modal = document.getElementById('pathModal');
    if (modal) modal.classList.add('hidden');
}

function closeExerciseModal() {
    const modal = document.getElementById('exerciseModal');
    if (modal) modal.classList.add('hidden');
}

// ==================== TÍNH NĂNG MỚI: GỢI Ý LỘ TRÌNH HỌC ====================
function showStudyPath() {
    const pathGenerator = new StudyPathGenerator();
    const learnedWordsList = getLearnedWordsList();
    
    const path = pathGenerator.generatePath(learnedWordsList, {
        dailyTarget: 10,
        weeks: 4
    });
    
    // Hiển thị modal lộ trình
    const modal = document.getElementById('pathModal');
    if (!modal) {
        createPathModal();
    }
    
    const content = document.getElementById('pathContent');
    if (content) {
        content.innerHTML = renderPathContent(path);
    }
    
    document.getElementById('pathModal').classList.remove('hidden');
}

function getLearnedWordsList() {
    const list = [];
    Object.keys(learnedWords).forEach(key => {
        const [topic, en] = key.split('_');
        const wordData = vocabulary[topic]?.words.find(w => w.en === en);
        if (wordData) {
            list.push(wordData);
        }
    });
    return list;
}

function renderPathContent(path) {
    return `
        <div class="path-summary p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl mb-4">
            <h4 class="font-bold text-lg">📊 Tổng quan lộ trình</h4>
            <div class="grid grid-cols-2 gap-3 mt-3">
                <div class="bg-white p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-indigo-600">${path.totalWords}</div>
                    <div class="text-sm text-gray-600">Từ vựng</div>
                </div>
                <div class="bg-white p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-purple-600">${path.estimatedTime.totalMinutes}'</div>
                    <div class="text-sm text-gray-600">Thời gian</div>
                </div>
                <div class="bg-white p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-600">${path.recommendedTopics.length}</div>
                    <div class="text-sm text-gray-600">Chủ đề</div>
                </div>
                <div class="bg-white p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-orange-600">${path.schedule.length}</div>
                    <div class="text-sm text-gray-600">Tuần</div>
                </div>
            </div>
        </div>
        
        <div class="path-details max-h-96 overflow-y-auto">
            <h5 class="font-bold text-md mb-3">📅 Lịch trình chi tiết</h5>
            ${path.schedule.map(week => `
                <div class="week-schedule mb-4 border rounded-xl overflow-hidden">
                    <div class="bg-gray-100 px-4 py-2 font-semibold">Tuần ${week.week}</div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
                        ${week.days.map(day => `
                            <div class="day-card bg-white border rounded-lg p-2 text-sm">
                                <div class="font-bold text-indigo-600">Ngày ${day.day}</div>
                                <div class="text-xs text-gray-600">${day.topic}</div>
                                <div class="mt-1">
                                    ${day.words.slice(0, 3).map(w => `
                                        <span class="inline-block bg-gray-100 rounded px-1.5 py-0.5 text-xs mr-1">${w.en}</span>
                                    `).join('')}
                                    ${day.words.length > 3 ? `<span class="text-xs text-gray-400">+${day.words.length - 3}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
            <p class="text-sm text-yellow-800">💡 <strong>Mẹo học:</strong> ${path.schedule[0]?.days[0]?.tip || 'Học đều đặn mỗi ngày để đạt hiệu quả tốt nhất!'}</p>
        </div>
    `;
}

function createPathModal() {
    // Modal đã có sẵn trong HTML, chỉ cần đảm bảo tồn tại
    if (document.getElementById('pathModal')) return;
    
    const modalHTML = `
        <div id="pathModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 hidden backdrop-blur-sm">
            <div class="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] p-6 shadow-2xl overflow-hidden animate-scale-up">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                        <i class="fas fa-map-signs text-indigo-600"></i> Lộ trình học thông minh
                    </h3>
                    <button onclick="closePathModal()" class="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                        ✕
                    </button>
                </div>
                <div id="pathContent" class="overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
                    <div class="text-center py-12 text-gray-400">
                        <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                        <p>Đang phân tích dữ liệu học tập...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
}

// ==================== TÍNH NĂNG MỚI: BÀI TẬP ĐIỀN TỪ ====================
function startExercise() {
    const exerciseGenerator = new ContextExerciseGenerator();
    const learnedWordsList = getLearnedWordsList();
    
    // Nếu chưa học từ nào, lấy từ chủ đề hiện tại
    const words = learnedWordsList.length > 0 ? learnedWordsList : vocabulary[currentTopic]?.words || [];
    
    if (words.length === 0) {
        alert('Chưa có từ vựng để làm bài tập! Hãy học một vài từ trước nhé!');
        return;
    }
    
    const exercise = exerciseGenerator.generateExercise(words, {
        difficulty: 'medium',
        count: Math.min(10, words.length),
        type: 'multiple_choice',
        contextType: 'real_life'
    });
    
    // Lưu bài tập hiện tại
    window.currentExercise = exercise;
    window.userAnswers = [];
    window.currentQuestionIndex = 0;
    
    // Hiển thị modal bài tập
    const modal = document.getElementById('exerciseModal');
    if (!modal) {
        createExerciseModal();
    }
    
    renderExerciseQuestion();
    document.getElementById('exerciseModal').classList.remove('hidden');
    document.getElementById('exercise-title').textContent = exercise.title;
    document.getElementById('exercise-desc').textContent = exercise.description;
}

function renderExerciseQuestion() {
    const exercise = window.currentExercise;
    const index = window.currentQuestionIndex;
    if (!exercise || index >= exercise.questions.length) {
        showExerciseResult();
        return;
    }
    
    const q = exercise.questions[index];
    const total = exercise.totalQuestions;
    
    // Cập nhật header
    document.getElementById('progress-text').textContent = `Câu ${index + 1}/${total}`;
    document.getElementById('progress-bar').style.width = `${((index + 1) / total) * 100}%`;
    
    // Cập nhật câu hỏi
    document.getElementById('question-number').textContent = `Câu hỏi ${index + 1}/${total}`;
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('sentence-display').textContent = q.sentence;
    document.getElementById('hint-text').textContent = q.hint;
    document.getElementById('meaning-display').textContent = `📖 Nghĩa: ${q.meaning}`;
    
    // Render options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    if (q.type === 'multiple_choice') {
        q.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = option.text;
            btn.dataset.value = option.text;
            btn.dataset.correct = option.correct;
            btn.style.cssText = `
                padding: 12px 16px;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                background: white;
                cursor: pointer;
                transition: all 0.3s;
                text-align: left;
                font-size: 16px;
                width: 100%;
            `;
            btn.onclick = () => selectExerciseOption(btn, option.text);
            btn.onmouseover = () => {
                if (!btn.disabled) btn.style.borderColor = '#6366f1';
            };
            btn.onmouseout = () => {
                if (!btn.disabled && !btn.classList.contains('selected')) btn.style.borderColor = '#e5e7eb';
            };
            optionsContainer.appendChild(btn);
        });
    } else if (q.type === 'fill_in_blank') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Nhập từ còn thiếu...';
        input.className = 'w-full p-3 border-2 border-gray-200 rounded-lg text-lg';
        input.onchange = (e) => {
            window.userAnswers[index] = e.target.value;
        };
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                window.userAnswers[index] = e.target.value;
                document.getElementById('exercise-submit-btn')?.click();
            }
        };
        optionsContainer.appendChild(input);
        setTimeout(() => input.focus(), 100);
    }
    
    // Cập nhật nút
    const nextBtn = document.getElementById('exercise-next-btn');
    const submitBtn = document.getElementById('exercise-submit-btn');
    if (index === total - 1) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

function selectExerciseOption(btn, value) {
    const index = window.currentQuestionIndex;
    window.userAnswers[index] = value;
    
    // Highlight selected
    document.querySelectorAll('.option-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.borderColor = '#e5e7eb';
    });
    btn.classList.add('selected');
    btn.style.borderColor = '#6366f1';
}

function nextExerciseQuestion() {
    window.currentQuestionIndex++;
    renderExerciseQuestion();
}

function submitExercise() {
    const exercise = window.currentExercise;
    const answers = window.userAnswers;
    
    // Đánh giá
    let correct = 0;
    const details = [];
    
    exercise.questions.forEach((q, index) => {
        const userAnswer = answers[index] || '';
        const isCorrect = userAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
        if (isCorrect) correct++;
        
        details.push({
            questionId: q.id,
            userAnswer: userAnswer,
            correctAnswer: q.correctAnswer,
            isCorrect: isCorrect,
            sentence: q.sentence,
            meaning: q.meaning
        });
    });
    
    const total = exercise.totalQuestions;
    const score = (correct / total) * 100;
    
    let level, emoji;
    if (score >= 90) { level = 'Xuất sắc! Bạn là bậc thầy từ vựng!'; emoji = '🌟'; }
    else if (score >= 70) { level = 'Tốt! Hãy tiếp tục luyện tập!'; emoji = '👍'; }
    else if (score >= 50) { level = 'Cần ôn tập thêm một chút!'; emoji = '📖'; }
    else { level = 'Đừng nản! Hãy thử lại nhé!'; emoji = '💪'; }
    
    // Hiển thị kết quả
    document.getElementById('exercise-question-area').classList.add('hidden');
    document.getElementById('exercise-result-area').classList.remove('hidden');
    document.getElementById('result-score').textContent = `${correct}/${total}`;
    document.getElementById('result-level').textContent = `${emoji} ${level}`;
    
    const recList = document.getElementById('result-recommendations');
    recList.innerHTML = '';
    const wrongDetails = details.filter(d => !d.isCorrect);
    
    if (wrongDetails.length === 0) {
        recList.innerHTML = '<li class="text-green-600">✅ Bạn đã trả lời đúng tất cả! Tuyệt vời!</li>';
    } else {
        wrongDetails.forEach(d => {
            const li = document.createElement('li');
            li.className = 'text-sm text-gray-700 py-1 border-b border-gray-100';
            li.innerHTML = `
                <span class="text-red-500">✕</span> 
                <span class="font-medium">${d.correctAnswer}</span> 
                <span class="text-gray-500">- ${d.meaning}</span>
                <span class="text-xs text-gray-400 block ml-6">"${d.sentence}"</span>
            `;
            recList.appendChild(li);
        });
    }
}

function showExerciseResult() {
    // Tự động nộp bài khi hết câu hỏi
    submitExercise();
}

function createExerciseModal() {
    // Modal đã có sẵn trong HTML, chỉ cần đảm bảo tồn tại
    if (document.getElementById('exerciseModal')) return;
    
    const modalHTML = `
        <div id="exerciseModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 hidden backdrop-blur-sm">
            <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] p-6 shadow-2xl overflow-hidden animate-scale-up">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 id="exercise-title" class="text-xl font-bold text-indigo-600 flex items-center gap-2">
                            <i class="fas fa-pencil-alt"></i> Bài tập từ vựng
                        </h3>
                        <p id="exercise-desc" class="text-sm text-gray-500">Thực hành với ngữ cảnh thực tế</p>
                    </div>
                    <button onclick="closeExerciseModal()" class="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                        ✕
                    </button>
                </div>

                <!-- Progress -->
                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span id="progress-text">Câu 1/10</span>
                        <span id="timer-display">⏱️ 00:30</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 rounded-full mt-1">
                        <div id="progress-bar" class="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style="width:10%"></div>
                    </div>
                </div>

                <!-- Question Area -->
                <div id="exercise-question-area" class="overflow-y-auto max-h-[calc(90vh-250px)]">
                    <div class="bg-gray-50 rounded-xl p-4 mb-4">
                        <p id="question-number" class="text-sm text-indigo-600 font-semibold">Câu hỏi 1/10</p>
                        <p id="question-text" class="text-lg font-medium mt-1">Chọn từ đúng để hoàn thành câu:</p>
                        <div id="sentence-display" class="text-lg p-4 bg-white rounded-lg border-l-4 border-indigo-500 mt-2 font-medium">
                            I need to ______ my homework before the deadline.
                        </div>
                        <div id="meaning-display" class="text-sm text-gray-500 mt-2">📖 Nghĩa: hoàn thành</div>
                        <div id="hint-area" class="mt-2 text-sm text-gray-400 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                            💡 Gợi ý: <span id="hint-text">Hoàn thành công việc đúng hạn</span>
                        </div>
                    </div>

                    <div id="options-container" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>

                    <div class="flex justify-between mt-6">
                        <button onclick="closeExerciseModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-all">
                            ✕ Đóng
                        </button>
                        <div>
                            <button id="exercise-next-btn" onclick="nextExerciseQuestion()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
                                Tiếp theo →
                            </button>
                            <button id="exercise-submit-btn" onclick="submitExercise()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all hidden">
                                📊 Nộp bài
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Result Area -->
                <div id="exercise-result-area" class="hidden overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div class="text-center py-6">
                        <div class="text-6xl mb-2">📊</div>
                        <div class="text-5xl font-bold text-indigo-600" id="result-score">8/10</div>
                        <p id="result-level" class="text-lg mt-2 font-medium text-gray-700">🌟 Xuất sắc!</p>
                    </div>

                    <div class="bg-gray-50 rounded-xl p-4">
                        <h5 class="font-semibold text-gray-700 mb-2">💡 Đề xuất ôn tập:</h5>
                        <ul id="result-recommendations" class="space-y-1"></ul>
                    </div>

                    <div class="flex justify-center gap-3 mt-4">
                        <button onclick="closeExerciseModal()" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all">
                            ✕ Đóng
                        </button>
                        <button onclick="location.reload()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
                            🔄 Làm lại
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
}

// ==================== TÍNH NĂNG MỚI: BÀI TẬP TỪ CHỦ ĐỀ HIỆN TẠI ====================
function startTopicExercise() {
    const words = vocabulary[currentTopic]?.words || [];
    if (words.length === 0) {
        alert('Chủ đề này chưa có từ vựng!');
        return;
    }
    
    const exerciseGenerator = new ContextExerciseGenerator();
    const exercise = exerciseGenerator.generateExercise(words, {
        difficulty: 'medium',
        count: Math.min(10, words.length),
        type: 'multiple_choice',
        contextType: 'real_life'
    });
    
    window.currentExercise = exercise;
    window.userAnswers = [];
    window.currentQuestionIndex = 0;
    
    if (!document.getElementById('exerciseModal')) {
        createExerciseModal();
    }
    
    renderExerciseQuestion();
    document.getElementById('exerciseModal').classList.remove('hidden');
    document.getElementById('exercise-title').textContent = `📝 Bài tập - ${vocabulary[currentTopic].name}`;
    document.getElementById('exercise-desc').textContent = `Thực hành ${exercise.totalQuestions} từ vựng`;
}

// ==================== TÍNH NĂNG MỚI: BÀI TẬP TỪ TỪ ĐÃ HỌC ====================
function startLearnedExercise() {
    const learnedWordsList = getLearnedWordsList();
    if (learnedWordsList.length === 0) {
        alert('Bạn chưa học từ nào! Hãy học một vài từ trước nhé! 🎯');
        return;
    }
    
    const exerciseGenerator = new ContextExerciseGenerator();
    const exercise = exerciseGenerator.generateExercise(learnedWordsList, {
        difficulty: 'medium',
        count: Math.min(10, learnedWordsList.length),
        type: 'multiple_choice',
        contextType: 'real_life'
    });
    
    window.currentExercise = exercise;
    window.userAnswers = [];
    window.currentQuestionIndex = 0;
    
    if (!document.getElementById('exerciseModal')) {
        createExerciseModal();
    }
    
    renderExerciseQuestion();
    document.getElementById('exerciseModal').classList.remove('hidden');
    document.getElementById('exercise-title').textContent = '📝 Ôn tập từ đã học';
    document.getElementById('exercise-desc').textContent = `Ôn lại ${exercise.totalQuestions} từ đã học`;
}

// ==================== TÍNH NĂNG MỚI: BÀI TẬP TỪ TỪ SAI ====================
function startWrongWordsExercise() {
    const wrongWordsList = getWrongWords();
    if (wrongWordsList.length === 0) {
        alert('Bạn chưa có từ sai nào! Giỏi quá! 🎉');
        return;
    }
    
    const exerciseGenerator = new ContextExerciseGenerator();
    const exercise = exerciseGenerator.generateExercise(wrongWordsList, {
        difficulty: 'medium',
        count: Math.min(10, wrongWordsList.length),
        type: 'multiple_choice',
        contextType: 'real_life'
    });
    
    window.currentExercise = exercise;
    window.userAnswers = [];
    window.currentQuestionIndex = 0;
    
    if (!document.getElementById('exerciseModal')) {
        createExerciseModal();
    }
    
    renderExerciseQuestion();
    document.getElementById('exerciseModal').classList.remove('hidden');
    document.getElementById('exercise-title').textContent = '📝 Ôn tập từ sai';
    document.getElementById('exercise-desc').textContent = `Ôn lại ${exercise.totalQuestions} từ đã sai`;
}

// ==================== Khởi tạo ====================
function init() {
    document.addEventListener('click', () => {
        initAudio();
    }, { once: false });
    
    buildTopicsList();
    renderTopics();
    selectNewWord();
    updateStreak();
    updateWrongCountBadge();
    
    checkBtn.addEventListener("click", checkAnswer);
    nextBtn.addEventListener("click", nextWord);
    speakBtn.addEventListener("click", speakWord);
    randomBtn.addEventListener("click", randomWord);
    answerInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") checkAnswer();
    });
    
    const searchInput = document.getElementById("topicSearch");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearchTerm = e.target.value;
            showAllTopics = false;
            renderTopics();
        });
    }
    
    const showMoreBtn = document.getElementById("showMoreBtn");
    if (showMoreBtn) {
        showMoreBtn.addEventListener("click", showMoreTopics);
    }
    
    const collapseBtn = document.getElementById("collapseBtn");
    if (collapseBtn) {
        collapseBtn.addEventListener("click", collapseTopics);
    }
    
    // Gắn sự kiện cho các nút tính năng mới
    const pathBtn = document.getElementById("pathBtn");
    if (pathBtn) pathBtn.addEventListener("click", showStudyPath);
    
    const exerciseBtn = document.getElementById("exerciseBtn");
    if (exerciseBtn) exerciseBtn.addEventListener("click", startExercise);
    
    const topicExerciseBtn = document.getElementById("topicExerciseBtn");
    if (topicExerciseBtn) topicExerciseBtn.addEventListener("click", startTopicExercise);
    
    const learnedExerciseBtn = document.getElementById("learnedExerciseBtn");
    if (learnedExerciseBtn) learnedExerciseBtn.addEventListener("click", startLearnedExercise);
    
    const wrongExerciseBtn = document.getElementById("wrongExerciseBtn");
    if (wrongExerciseBtn) wrongExerciseBtn.addEventListener("click", startWrongWordsExercise);
}

// ====== EXPORT CÁC HÀM RA GLOBAL ======
// Để có thể gọi từ HTML onclick
window.closePathModal = closePathModal;
window.closeExerciseModal = closeExerciseModal;
window.nextExerciseQuestion = nextExerciseQuestion;
window.submitExercise = submitExercise;

// Khởi chạy
init();
