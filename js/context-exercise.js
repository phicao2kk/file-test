// ==================== BỘ ĐẾM GIỜ CHO BÀI TẬP ====================
let exerciseTimer = null;
let exerciseTimeLeft = 0;
let exerciseTotalTime = 0;

function startExerciseTimer() {
    // Dừng timer cũ nếu có
    if (exerciseTimer) {
        clearInterval(exerciseTimer);
        exerciseTimer = null;
    }
    
    const exercise = window.currentExercise;
    if (!exercise) return;
    
    exerciseTotalTime = exercise.timeLimit || 300; // 5 phút mặc định
    exerciseTimeLeft = exerciseTotalTime;
    updateTimerDisplay();
    
    exerciseTimer = setInterval(() => {
        exerciseTimeLeft--;
        updateTimerDisplay();
        
        // Hết giờ
        if (exerciseTimeLeft <= 0) {
            clearInterval(exerciseTimer);
            exerciseTimer = null;
            // Tự động nộp bài
            submitExercise();
            showToast('⏰ Hết giờ! Bài tập đã được tự động nộp.');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;
    
    const minutes = Math.floor(exerciseTimeLeft / 60);
    const seconds = exerciseTimeLeft % 60;
    timerDisplay.textContent = `⏱️ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Đổi màu khi còn ít thời gian
    if (exerciseTimeLeft <= 10) {
        timerDisplay.style.color = '#ef4444';
    } else if (exerciseTimeLeft <= 30) {
        timerDisplay.style.color = '#f59e0b';
    } else {
        timerDisplay.style.color = '#6b7280';
    }
}

function stopExerciseTimer() {
    if (exerciseTimer) {
        clearInterval(exerciseTimer);
        exerciseTimer = null;
    }
}

// Toast notification
function showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full text-white text-sm font-medium ${isError ? 'bg-red-500' : 'bg-blue-500'} animate-fade-in`;
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// CẬP NHẬT HÀM renderExerciseQuestion
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
    document.getElementById('question-text').textContent = q.question || 'Chọn từ đúng để hoàn thành câu:';
    document.getElementById('sentence-display').textContent = q.sentence || 'I need to ______ my homework.';
    document.getElementById('hint-text').textContent = q.hint || 'Hoàn thành công việc';
    document.getElementById('meaning-display').textContent = `📖 Nghĩa: ${q.meaning || 'từ'}`;
    
    // Render options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    if (q.type === 'multiple_choice' && q.options && q.options.length > 0) {
        q.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = option.text || option;
            btn.dataset.value = option.text || option;
            btn.dataset.correct = option.correct || false;
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
            btn.onclick = () => selectExerciseOption(btn, btn.dataset.value);
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
    } else {
        // Fallback: tạo các option mặc định
        const defaultOptions = ['do', 'make', 'take', 'get'];
        defaultOptions.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = option;
            btn.dataset.value = option;
            btn.dataset.correct = (option === 'do');
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
            btn.onclick = () => selectExerciseOption(btn, option);
            optionsContainer.appendChild(btn);
        });
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
    
    // Bắt đầu timer nếu chưa bắt đầu
    if (!exerciseTimer) {
        startExerciseTimer();
    }
}

// CẬP NHẬT HÀM showExerciseResult
function showExerciseResult() {
    stopExerciseTimer();
    submitExercise();
}

// CẬP NHẬT HÀM submitExercise
function submitExercise() {
    stopExerciseTimer();
    
    const exercise = window.currentExercise;
    const answers = window.userAnswers;
    
    if (!exercise) return;
    
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
        canvasConfetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.5 }
        });
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

// CẬP NHẬT HÀM createExerciseModal
function createExerciseModal() {
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
                        <span id="timer-display" class="font-mono font-bold">⏱️ 05:00</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div id="progress-bar" class="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300" style="width:10%"></div>
                    </div>
                </div>

                <!-- Question Area -->
                <div id="exercise-question-area" class="overflow-y-auto max-h-[calc(90vh-270px)]">
                    <div class="bg-gray-50 rounded-xl p-4 mb-4">
                        <p id="question-number" class="text-sm text-indigo-600 font-semibold">Câu hỏi 1/10</p>
                        <p id="question-text" class="text-lg font-medium mt-1">Chọn từ đúng để hoàn thành câu:</p>
                        <div id="sentence-display" class="text-lg p-4 bg-white rounded-lg border-l-4 border-indigo-500 mt-2 font-medium">
                            I need to ______ my homework.
                        </div>
                        <div id="meaning-display" class="text-sm text-gray-500 mt-2">📖 Nghĩa: làm</div>
                        <div id="hint-area" class="mt-2 text-sm text-gray-400 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                            💡 Gợi ý: <span id="hint-text">Hoàn thành công việc</span>
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

// CẬP NHẬT HÀM closeExerciseModal
function closeExerciseModal() {
    stopExerciseTimer();
    const modal = document.getElementById('exerciseModal');
    if (modal) modal.classList.add('hidden');
    // Reset timer display
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = '⏱️ 05:00';
        timerDisplay.style.color = '#6b7280';
    }
}
