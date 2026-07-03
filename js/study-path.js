// study-path.js - Gợi ý lộ trình học thông minh

class StudyPathGenerator {
    constructor() {
        this.vocabulary = getVocabulary();
    }

    /**
     * Tạo lộ trình học dựa trên từ vựng đã học
     * @param {Array} learnedWords - Danh sách từ đã học
     * @param {Object} options - Tùy chọn lộ trình
     * @returns {Object} Lộ trình học được đề xuất
     */
    generatePath(learnedWords = [], options = {}) {
        const {
            dailyTarget = 10,      // Số từ mỗi ngày
            weeks = 4,              // Số tuần
            focusWeakness = true,   // Tập trung điểm yếu
            adaptive = true         // Thích ứng theo tiến độ
        } = options;

        // Phân tích từ đã học
        const analysis = this.analyzeLearning(learnedWords);
        
        // Đề xuất các chủ đề tiếp theo
        const recommendedTopics = this.recommendTopics(analysis, learnedWords);
        
        // Tạo lịch trình chi tiết
        const schedule = this.buildSchedule(recommendedTopics, dailyTarget, weeks);
        
        // Đề xuất từ vựng cụ thể mỗi ngày
        const dailyWords = this.suggestDailyWords(schedule, learnedWords);

        return {
            summary: analysis,
            recommendedTopics,
            schedule,
            dailyWords,
            totalWords: dailyWords.length * dailyTarget,
            estimatedTime: this.estimateStudyTime(dailyWords)
        };
    }

    /**
     * Phân tích tình trạng học của người dùng
     */
    analyzeLearning(learnedWords) {
        const allTopics = Object.keys(this.vocabulary);
        const topicStats = {};
        let totalLearned = learnedWords.length;

        // Thống kê theo chủ đề
        allTopics.forEach(topic => {
            const topicWords = this.vocabulary[topic].words;
            const learnedInTopic = topicWords.filter(word => 
                learnedWords.some(lw => lw.en === word.en)
            );
            
            topicStats[topic] = {
                total: topicWords.length,
                learned: learnedInTopic.length,
                percentage: (learnedInTopic.length / topicWords.length * 100) || 0,
                remaining: topicWords.length - learnedInTopic.length
            };
        });

        // Xác định điểm mạnh/yếu
        const strengths = [];
        const weaknesses = [];
        const unlearnedTopics = [];

        allTopics.forEach(topic => {
            const stat = topicStats[topic];
            if (stat.percentage >= 80) strengths.push(topic);
            else if (stat.percentage <= 30 && stat.remaining > 0) weaknesses.push(topic);
            if (stat.remaining > 0) unlearnedTopics.push(topic);
        });

        // Sắp xếp độ ưu tiên
        const priorityTopics = unlearnedTopics
            .map(topic => ({
                topic,
                remaining: topicStats[topic].remaining,
                priority: this.calculatePriority(topicStats[topic], weaknesses)
            }))
            .sort((a, b) => b.priority - a.priority);

        return {
            totalLearned,
            topicStats,
            strengths,
            weaknesses,
            unlearnedTopics,
            priorityTopics,
            completionRate: totalLearned / this.getTotalWords() * 100
        };
    }

    /**
     * Tính độ ưu tiên cho chủ đề
     */
    calculatePriority(stat, weaknesses) {
        // Chủ đề còn nhiều từ chưa học + ưu tiên
        let priority = stat.remaining / stat.total * 100;
        
        // Nếu chủ đề nằm trong danh sách yếu, tăng ưu tiên
        if (weaknesses.includes(stat.topic)) priority *= 1.5;
        
        // Chủ đề đã học ít hơn 30% -> ưu tiên cao
        if (stat.percentage < 30) priority *= 1.3;
        
        return priority;
    }

    /**
     * Đề xuất các chủ đề nên học tiếp theo
     */
    recommendTopics(analysis, learnedWords) {
        const recommendations = [];
        const topics = analysis.priorityTopics;
        
        // Lấy top 5 chủ đề ưu tiên
        const topTopics = topics.slice(0, 5);
        
        topTopics.forEach(item => {
            const topicData = this.vocabulary[item.topic];
            const learnedInTopic = topicData.words.filter(word =>
                learnedWords.some(lw => lw.en === word.en)
            );
            
            // Lấy các từ chưa học trong chủ đề
            const unlearned = topicData.words
                .filter(word => !learnedWords.some(lw => lw.en === word.en))
                .slice(0, 20); // Giới hạn mỗi chủ đề 20 từ
            
            recommendations.push({
                topic: item.topic,
                name: topicData.name,
                remaining: item.remaining,
                difficulty: this.estimateDifficulty(topicData.name),
                reason: this.getRecommendReason(item, analysis),
                sampleWords: unlearned.slice(0, 5)
            });
        });

        return recommendations;
    }

    /**
     * Xây dựng lịch trình học
     */
    buildSchedule(recommendedTopics, dailyTarget, weeks) {
        const schedule = [];
        let currentDay = 1;
        let topicIndex = 0;
        let wordsPerTopic = Math.floor(dailyTarget * weeks / recommendedTopics.length);

        for (let week = 1; week <= weeks; week++) {
            const weekSchedule = {
                week: week,
                days: []
            };

            for (let day = 1; day <= 7; day++) {
                if (topicIndex >= recommendedTopics.length) break;

                const topic = recommendedTopics[topicIndex];
                const daySchedule = {
                    day: currentDay,
                    topic: topic.topic,
                    words: [],
                    review: currentDay > 1 ? this.getReviewWords(currentDay - 1) : []
                };

                // Thêm từ mới cho ngày này
                const startIdx = (currentDay - 1) * Math.floor(dailyTarget / recommendedTopics.length);
                const endIdx = Math.min(startIdx + dailyTarget, topic.sampleWords.length);
                
                for (let i = startIdx; i < endIdx; i++) {
                    if (topic.sampleWords[i]) {
                        daySchedule.words.push(topic.sampleWords[i]);
                    }
                }

                weekSchedule.days.push(daySchedule);
                currentDay++;

                if (daySchedule.words.length > 0) {
                    const wordsLearnedInTopic = this.vocabulary[topic.topic].words
                        .filter(w => topic.sampleWords.some(sw => sw.en === w.en));
                    
                    if (wordsLearnedInTopic.length >= topic.sampleWords.length) {
                        topicIndex++;
                    }
                }
            }

            schedule.push(weekSchedule);
        }

        return schedule;
    }

    /**
     * Gợi ý từ vựng cho từng ngày
     */
    suggestDailyWords(schedule, learnedWords) {
        const result = {};
        const allTopics = Object.keys(this.vocabulary);
        
        schedule.forEach(week => {
            week.days.forEach(day => {
                const key = `day_${day.day}`;
                const topicWords = this.vocabulary[day.topic];
                
                // Lọc từ chưa học
                const availableWords = topicWords.words.filter(word =>
                    !learnedWords.some(lw => lw.en === word.en)
                );
                
                // Lấy từ ít gặp trước (dựa trên vị trí trong danh sách)
                const sortedWords = this.prioritizeWords(availableWords);
                
                result[key] = {
                    topic: day.topic,
                    newWords: sortedWords.slice(0, 5),
                    reviewWords: day.review || [],
                    tip: this.getStudyTip(day.topic)
                };
            });
        });

        return result;
    }

    /**
     * Ưu tiên từ vựng theo mức độ phổ biến và khó
     */
    prioritizeWords(words) {
        // Sắp xếp theo độ khó (từ đơn giản trước)
        return words.sort((a, b) => {
            const difficultyA = this.estimateWordDifficulty(a.en);
            const difficultyB = this.estimateWordDifficulty(b.en);
            return difficultyA - difficultyB;
        });
    }

    /**
     * Ước lượng độ khó của từ
     */
    estimateWordDifficulty(word) {
        let score = 0;
        // Từ dài hơn -> khó hơn
        if (word.length > 10) score += 2;
        if (word.length > 7) score += 1;
        
        // Từ có nhiều âm tiết -> khó hơn
        const syllables = word.match(/[aeiouy]/gi) || [];
        if (syllables.length > 3) score += 1;
        
        // Từ ít gặp -> khó hơn (danh sách từ phổ biến giả định)
        const commonWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'];
        if (commonWords.includes(word.toLowerCase())) score -= 2;
        
        return Math.max(1, Math.min(5, score + 1));
    }

    /**
     * Ước lượng độ khó của chủ đề
     */
    estimateDifficulty(topicName) {
        const hardTopics = ['philosophy', 'politics', 'economics', 'medicine', 'science'];
        const easyTopics = ['colors', 'animals', 'family', 'food', 'clothing'];
        
        const lowerName = topicName.toLowerCase();
        if (hardTopics.some(t => lowerName.includes(t))) return 'Trung bình - Khó';
        if (easyTopics.some(t => lowerName.includes(t))) return 'Dễ - Trung bình';
        return 'Trung bình';
    }

    /**
     * Lý do đề xuất
     */
    getRecommendReason(item, analysis) {
        if (analysis.weaknesses.includes(item.topic)) {
            return `Chủ đề này hiện đang là điểm yếu của bạn (${item.remaining} từ chưa học)`;
        }
        if (item.remaining > 20) {
            return `Chủ đề này còn nhiều từ mới (${item.remaining} từ) để khám phá`;
        }
        return 'Chủ đề phù hợp để mở rộng vốn từ của bạn';
    }

    /**
     * Lấy từ cần ôn tập
     */
    getReviewWords(day) {
        // Giả định: ôn tập các từ đã học từ ngày trước
        return [
            { vi: "đã học", en: "review_word_1" },
            { vi: "cần ôn tập", en: "review_word_2" }
        ];
    }

    /**
     * Tổng số từ trong toàn bộ dữ liệu
     */
    getTotalWords() {
        let total = 0;
        Object.keys(this.vocabulary).forEach(topic => {
            total += this.vocabulary[topic].words.length;
        });
        return total;
    }

    /**
     * Ước lượng thời gian học
     */
    estimateStudyTime(dailyWords) {
        const days = Object.keys(dailyWords).length;
        const hoursPerDay = 0.5; // 30 phút mỗi ngày
        return {
            days: days,
            hours: days * hoursPerDay,
            totalMinutes: days * 30
        };
    }

    /**
     * Lấy mẹo học cho chủ đề
     */
    getStudyTip(topic) {
        const tips = {
            kitchen: '📝 Học qua việc dán nhãn các vật dụng trong bếp',
            animals: '🦁 Xem video về động vật và tập đọc tên của chúng',
            travel: '✈️ Lên kế hoạch cho một chuyến đi và mô tả bằng tiếng Anh',
            technology: '💻 Đọc tin tức công nghệ bằng tiếng Anh mỗi ngày',
            food: '🍳 Xem công thức nấu ăn tiếng Anh và học từ vựng mới',
            default: '💡 Kết hợp học từ mới với ngữ cảnh thực tế để nhớ lâu hơn'
        };
        return tips[topic] || tips.default;
    }

    /**
     * Tạo báo cáo tiến độ
     */
    generateProgressReport(learnedWords, testResults = []) {
        const analysis = this.analyzeLearning(learnedWords);
        
        return {
            summary: {
                totalWords: this.getTotalWords(),
                learnedWords: analysis.totalLearned,
                percentage: analysis.completionRate.toFixed(1) + '%',
                topicsCompleted: analysis.strengths.length,
                topicsInProgress: analysis.unlearnedTopics.length
            },
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            nextTopics: analysis.priorityTopics.slice(0, 3),
            testAverage: testResults.length > 0 ? 
                testResults.reduce((a, b) => a + b, 0) / testResults.length : 0,
            recommendedDaily: Math.max(5, Math.min(15, 10 + (analysis.completionRate - 50) / 10))
        };
    }
}