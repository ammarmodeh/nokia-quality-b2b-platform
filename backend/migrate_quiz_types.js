import mongoose from 'mongoose';
import { QuizSchema } from './models/quizModel.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Starting migration...');

    // Update all questions that have no quizType or null quizType to 'Performance'
    const result = await QuizSchema.updateMany(
        { $or: [{ quizType: { $exists: false } }, { quizType: null }] },
        { $set: { quizType: 'Performance' } }
    );

    console.log(`Migration complete. Matched ${result.matchedCount} documents and modified ${result.modifiedCount} documents.`);

    mongoose.disconnect();
}).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
