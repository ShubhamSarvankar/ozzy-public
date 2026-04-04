const mongoose = require('mongoose');

const quizScoreSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  score: { type: Number, required: true },
});

const QuizScore = mongoose.model('QuizScore', quizScoreSchema);

module.exports = QuizScore;
