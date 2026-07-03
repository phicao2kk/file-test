// context-exercise.js - Tạo bài tập điền từ dựa trên ngữ cảnh

class ContextExerciseGenerator {
    constructor() {
        this.vocabulary = getVocabulary();
    }

    /**
     * Tạo bài tập điền từ ngữ cảnh
     * @param {Array} words - Danh sách từ cần kiểm tra
     * @param {Object} options - Tùy chọn
     * @returns {Object} Bài tập điền từ
     */
    generateExercise(words, options = {}) {
        const {
            difficulty = 'medium',     // easy, medium, hard
            count = 10,               // Số câu hỏi
            type = 'multiple_choice',  // fill_in_blank, multiple_choice, matching
            contextType = 'real_life'  // real_life, academic, business, daily
        } = options;

        // Chọn từ ngẫu nhiên
        const selectedWords = this.selectWords(words, count);
        
        // Tạo ngữ cảnh cho mỗi từ
        const contexts = selectedWords.map(word => 
            this.generateContext(word, difficulty, contextType)
        );

        // Tạo bài tập
        const exercise = {
            title: this.getExerciseTitle(type, difficulty),
            description: `Thực hành ${selectedWords.length} từ vựng với ngữ cảnh thực tế`,
            type: type,
            difficulty: difficulty,
            questions: [],
            totalQuestions: contexts.length,
            timeLimit: contexts.length * 30 // 30 giây mỗi câu
        };

        // Tạo câu hỏi dựa trên loại bài tập
        switch(type) {
            case 'multiple_choice':
                exercise.questions = this.createMultipleChoice(contexts);
                break;
            case 'fill_in_blank':
                exercise.questions = this.createFillInBlank(contexts);
                break;
            case 'matching':
                exercise.questions = this.createMatching(contexts);
                break;
            default:
                exercise.questions = this.createMultipleChoice(contexts);
        }

        return exercise;
    }

    /**
     * Chọn từ cho bài tập
     */
    selectWords(words, count) {
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    /**
     * Tạo ngữ cảnh cho từ
     */
    generateContext(word, difficulty, contextType) {
        const contexts = this.getContextTemplates(word, contextType);
        const selected = contexts[Math.floor(Math.random() * contexts.length)];
        
        return {
            word: word,
            sentence: selected.sentence,
            blankIndex: selected.blankIndex,
            hint: selected.hint || this.generateHint(word, difficulty),
            meaning: word.vi,
            options: this.generateOptions(word, difficulty)
        };
    }

    /**
     * Lấy template ngữ cảnh
     */
    getContextTemplates(word, contextType) {
        const templates = {
            real_life: [
                {
                    sentence: `I need to ${word.en} my homework before the deadline.`,
                    blankIndex: 2,
                    hint: 'Hoàn thành công việc đúng hạn'
                },
                {
                    sentence: `She always ${word.en} coffee in the morning.`,
                    blankIndex: 2,
                    hint: 'Hành động thường làm'
                },
                {
                    sentence: `Can you ${word.en} me the salt, please?`,
                    blankIndex: 1,
                    hint: 'Yêu cầu ai đó chuyển đồ'
                },
                {
                    sentence: `They ${word.en} to travel to Vietnam next year.`,
                    blankIndex: 1,
                    hint: 'Dự định trong tương lai'
                }
            ],
            business: [
                {
                    sentence: `The company needs to ${word.en} its marketing strategy.`,
                    blankIndex: 3,
                    hint: 'Cải thiện chiến lược'
                },
                {
                    sentence: `We should ${word.en} this project before the quarter ends.`,
                    blankIndex: 2,
                    hint: 'Hoàn thành dự án'
                }
            ],
            academic: [
                {
                    sentence: `Students must ${word.en} the research papers carefully.`,
                    blankIndex: 2,
                    hint: 'Đọc kỹ tài liệu'
                }
            ],
            daily: [
                {
                    sentence: `I ${word.en} to the gym three times a week.`,
                    blankIndex: 1,
                    hint: 'Thói quen hàng ngày'
                }
            ]
        };

        return templates[contextType] || templates.real_life;
    }

    /**
     * Tạo gợi ý cho từ
     */
    generateHint(word, difficulty) {
        const hints = {
            easy: `Từ này có nghĩa là: ${word.vi}`,
            medium: `Từ này bắt đầu bằng chữ "${word.en[0]}"`,
            hard: `Từ này có ${word.en.length} chữ cái`
        };
        return hints[difficulty] || hints.medium;
    }

    /**
     * Tạo các lựa chọn cho câu hỏi
     */
    generateOptions(word, difficulty) {
        const allWords = [];
        const allTopics = Object.values(this.vocabulary);
        allTopics.forEach(topic => {
            topic.words.forEach(w => {
                if (w.en !== word.en) allWords.push(w);
            });
        });

        // Chọn 3 từ sai ngẫu nhiên
        const shuffled = allWords.sort(() => Math.random() - 0.5);
        const wrongOptions = shuffled.slice(0, 3);

        // Trộn đáp án đúng với đáp án sai
        const options = [
            { text: word.en, correct: true },
            ...wrongOptions.map(w => ({ text: w.en, correct: false }))
        ];

        return options.sort(() => Math.random() - 0.5);
    }

    /**
     * Tạo câu hỏi trắc nghiệm
     */
    createMultipleChoice(contexts) {
        return contexts.map((ctx, index) => ({
            id: index + 1,
            type: 'multiple_choice',
            question: `Chọn từ đúng để hoàn thành câu:`,
            sentence: ctx.sentence.replace(ctx.word.en, '______'),
            options: ctx.options,
            correctAnswer: ctx.word.en,
            hint: ctx.hint,
            meaning: ctx.meaning
        }));
    }

    /**
     * Tạo câu hỏi điền từ
     */
    createFillInBlank(contexts) {
        return contexts.map((ctx, index) => ({
            id: index + 1,
            type: 'fill_in_blank',
            question: `Điền từ còn thiếu vào chỗ trống:`,
            sentence: ctx.sentence.replace(ctx.word.en, '_____'),
            correctAnswer: ctx.word.en,
            hint: ctx.hint,
            meaning: ctx.meaning
        }));
    }

    /**
     * Tạo câu hỏi ghép cặp
     */
    createMatching(contexts) {
        const pairs = contexts.map((ctx, index) => ({
            id: index + 1,
            english: ctx.word.en,
            vietnamese: ctx.word.vi
        }));

        // Trộn thứ tự tiếng Việt
        const shuffledVietnamese = [...pairs]
            .sort(() => Math.random() - 0.5)
            .map(p => p.vietnamese);

        return pairs.map((pair, index) => ({
            id: index + 1,
            type: 'matching',
            question: `Ghép từ tiếng Anh với nghĩa tiếng Việt:`,
            english: pair.english,
            options: shuffledVietnamese,
            correctAnswer: pair.vietnamese
        }));
    }

    /**
     * Lấy tiêu đề bài tập
     */
    getExerciseTitle(type, difficulty) {
        const typeNames = {
            multiple_choice: 'Trắc nghiệm',
            fill_in_blank: 'Điền từ vào chỗ trống',
            matching: 'Ghép cặp'
        };

        const difficultyNames = {
            easy: 'Cơ bản',
            medium: 'Trung bình',
            hard: 'Nâng cao'
        };

        return `Bài tập ${typeNames[type]} - ${difficultyNames[difficulty]}`;
    }

    /**
     * Đánh giá kết quả bài tập
     */
    evaluateExercise(userAnswers, exercise) {
        let correct = 0;
        const details = [];

        exercise.questions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === q.correctAnswer;
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

        let level;
        if (score >= 90) level = '🌟 Xuất sắc! Bạn là bậc thầy từ vựng!';
        else if (score >= 70) level = '👍 Tốt! Hãy tiếp tục luyện tập!';
        else if (score >= 50) level = '📖 Cần ôn tập thêm một chút!';
        else level = '💪 Đừng nản! Hãy thử lại nhé!';

        return {
            score: score,
            correct: correct,
            total: total,
            level: level,
            details: details,
            timeSpent: userAnswers.timeSpent || 0,
            recommendations: this.generateRecommendations(details)
        };
    }

    /**
     * Tạo đề xuất dựa trên kết quả
     */
    generateRecommendations(details) {
        const wrongAnswers = details.filter(d => !d.isCorrect);
        
        if (wrongAnswers.length === 0) {
            return ['Bạn đã hoàn thành xuất sắc! Hãy thử bài tập khó hơn.'];
        }

        const recommendations = wrongAnswers.map(d => 
            `Ôn lại từ "${d.correctAnswer}" trong câu: ${d.sentence}`
        );

        return recommendations.slice(0, 5);
    }

    /**
     * Tạo bài tập từ các từ đã học
     */
    generateExerciseFromLearnedWords(learnedWords, options = {}) {
        // Lọc các từ đã học (có nghĩa tiếng Việt)
        const words = learnedWords.filter(w => w.vi && w.en);
        return this.generateExercise(words, options);
    }

    /**
     * Tạo bài tập từ chủ đề cụ thể
     */
    generateExerciseFromTopic(topicKey, options = {}) {
        const topic = this.vocabulary[topicKey];
        if (!topic) throw new Error(`Không tìm thấy chủ đề: ${topicKey}`);
        return this.generateExercise(topic.words, options);
    }
}