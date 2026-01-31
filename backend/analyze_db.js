import mongoose from 'mongoose';
import { QuizSchema } from './models/quizModel.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const counts = await QuizSchema.aggregate([
        { $group: { _id: "$quizType", count: { $sum: 1 } } }
    ]);
    console.log(JSON.stringify(counts, null, 2));

    const samplePerformance = await QuizSchema.findOne({ quizType: 'Performance' });
    console.log('Sample Performance Question:', samplePerformance?.question);

    const sampleIQ = await QuizSchema.findOne({ quizType: 'IQ' });
    console.log('Sample IQ Question:', sampleIQ?.question);

    const noType = await QuizSchema.findOne({ quizType: { $exists: false } });
    console.log('Question with no type:', noType?.question);

    mongoose.disconnect();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
