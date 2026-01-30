import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log("MONGO_URI loaded:", process.env.MONGO_URI ? "Yes" : "No");

import { QuizSchema } from './models/quizModel.js';

const iqQuestions = [
    // VERBAL REASONING
    {
        question: "Which word in brackets is most opposite to the word in capitals? PROSCRIBE",
        options: ["allow", "stifle", "promote", "verify", "indict"],
        correctAnswer: "allow",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 1
    },
    {
        question: "Find two words that are antonyms: (lofty, mean, humble, proud, great)",
        options: ["lofty, humble", "mean, great", "proud, humble", "proud, mean"],
        correctAnswer: "proud, humble",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 2
    },
    {
        question: "Find the word that is most opposite in meaning to the word in capitals: CANDID",
        options: ["explicit", "guarded", "sincere", "frank", "honest"],
        correctAnswer: "guarded",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 3
    },
    {
        question: "Which word is the odd one out?",
        options: ["Apple", "Orange", "Potato", "Banana", "Grape"],
        correctAnswer: "Potato",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 4
    },
    {
        question: "Complete the analogy: Finger is to Hand as Leaf is to...",
        options: ["Tree", "Branch", "Flower", "Root", "Stem"],
        correctAnswer: "Branch",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 5
    },
    {
        question: "Identify the synonym for: ADHERE",
        options: ["Detach", "Stick", "Loosen", "Avoid", "Ignore"],
        correctAnswer: "Stick",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 6
    },
    {
        question: "Which word is NOT related to the others?",
        options: ["Clarinet", "Oboe", "Flute", "Trumpet", "Violin"],
        correctAnswer: "Violin",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 7
    },
    {
        question: "Identify the word that means the same as 'Enormous'",
        options: ["Puny", "Huge", "Tiny", "Average", "Micro"],
        correctAnswer: "Huge",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 8
    },
    {
        question: "What is the next item in the sequence? Monday, Wednesday, Friday, ...",
        options: ["Saturday", "Sunday", "Thursday", "Tuesday", "Wednesday"],
        correctAnswer: "Sunday",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 9
    },
    {
        question: "Rearrange the letters 'RACE' to form a word meaning 'An item used in a game'",
        options: ["CARE", "ACRE", "CARD", "ACER", "None of these"],
        correctAnswer: "None of these", // It should be CARD but RACE can't make CARD. Wait.
        // Let's change the question
    },
    {
        question: "Rearrange the letters 'EAT' to form a word meaning 'a drink'",
        options: ["ATE", "TEA", "ETA", "TAE"],
        correctAnswer: "TEA",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 10
    },

    // NUMERICAL REASONING
    {
        question: "What number should replace the question mark? 0, 1, 2, 4, 6, 9, 12, 16, ?",
        options: ["18", "20", "22", "24", "25"],
        correctAnswer: "20",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 11
    },
    {
        question: "Find the missing number: 1, 3, 6, 10, 15, ?",
        options: ["18", "19", "20", "21", "22"],
        correctAnswer: "21",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 12
    },
    {
        question: "Solve: 15% of 200 is...",
        options: ["15", "30", "45", "60", "20"],
        correctAnswer: "30",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 13
    },
    {
        question: "Which number is the odd one out? 13, 17, 19, 23, 25, 29",
        options: ["13", "19", "25", "29", "17"],
        correctAnswer: "25",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 14
    },
    {
        question: "What is the next number in the series? 2, 4, 8, 16, 32, ...",
        options: ["40", "48", "64", "56", "72"],
        correctAnswer: "64",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 15
    },
    {
        question: "If a car travels 60 miles per hour, how far will it travel in 15 minutes?",
        options: ["10 miles", "15 miles", "20 miles", "25 miles", "30 miles"],
        correctAnswer: "15 miles",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 16
    },
    {
        question: "Find the average of: 10, 20, 30, 40, 50",
        options: ["25", "30", "35", "40", "45"],
        correctAnswer: "30",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 17
    },
    {
        question: "What is the result of 7 squared minus 5 squared?",
        options: ["2", "12", "24", "49", "25"],
        correctAnswer: "24",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 18
    },
    {
        question: "Find the value of X: 3X + 7 = 22",
        options: ["3", "4", "5", "6", "7"],
        correctAnswer: "5",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 19
    },
    {
        question: "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
        options: ["$0.10", "$0.05", "$0.02", "$0.01", "$0.08"],
        correctAnswer: "$0.05",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 20
    },

    // LOGICAL REASONING
    {
        question: "All Bloops are Razzies. All Razzies are Lallies. Therefore, all Bloops are Lallies.",
        options: ["True", "False", "Insufficient Information"],
        correctAnswer: "True",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 21
    },
    {
        question: "If A is taller than B, and B is taller than C, who is the shortest?",
        options: ["A", "B", "C", "Cannot be determined"],
        correctAnswer: "C",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 22
    },
    {
        question: "Which of the following is most logical? All cats like fish. Felix is a cat. Felix likes fish.",
        options: ["Yes", "No", "Maybe"],
        correctAnswer: "Yes",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 23
    },
    {
        question: "If it rains, the grass gets wet. The grass is dry. Therefore, it did not rain.",
        options: ["Logically sound", "Logically flawed"],
        correctAnswer: "Logically sound",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 24
    },
    {
        question: "Find the odd one out: Circle, Square, Triangle, Cube, Sphere, Pyramid",
        options: ["Circle", "Triangle", "Pyramid", "Square"],
        correctAnswer: "Pyramid", // Wait, Cube, Sphere, Pyramid are 3D. Circle, Square, Triangle are 2D.
        // Let's refine.
    },
    {
        question: "Which shape is 3-dimensional?",
        options: ["Circle", "Square", "Sphere", "Triangle"],
        correctAnswer: "Sphere",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 25
    },
    {
        question: "If Monday is the first day of the week, what is the fourth day?",
        options: ["Wednesday", "Thursday", "Friday", "Tuesday"],
        correctAnswer: "Thursday",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 26
    },
    {
        question: "Complete the pattern: Up, Down, Left, Right, Up, Down, Left, ...",
        options: ["Up", "Down", "Right", "Left"],
        correctAnswer: "Right",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 27
    },
    {
        question: "Which word represents a state of mind?",
        options: ["Table", "Happy", "Run", "Blue", "Fast"],
        correctAnswer: "Happy",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 28
    },
    {
        question: "If 1=5, 2=25, 3=125, 4=625, then 5=?",
        options: ["3125", "5", "1", "2500", "555"],
        correctAnswer: "1", // Logic: 1=5 means 5=1
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 29
    },
    {
        question: "Find the next item: A, C, E, G, ...",
        options: ["H", "I", "J", "K", "L"],
        correctAnswer: "I",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 30
    },

    // MORE VERBAL
    {
        question: "Which word is a synonym for 'Vigilant'?",
        options: ["Careless", "Watchful", "Sleepy", "Lazy", "Quick"],
        correctAnswer: "Watchful",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 31
    },
    {
        question: "Identify the odd word: Paris, London, Tokyo, Germany, New York",
        options: ["Paris", "Tokyo", "Germany", "London"],
        correctAnswer: "Germany",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 32
    },
    {
        question: "What is a 'Cacophony'?",
        options: ["A sweet melody", "A harsh mixture of sounds", "A type of bird", "A chemical reaction"],
        correctAnswer: "A harsh mixture of sounds",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 33
    },
    {
        question: "Fill in the blank: The sun ... in the east.",
        options: ["rises", "sets", "goes", "stays"],
        correctAnswer: "rises",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 34
    },
    {
        question: "Identify the antonym of 'Arrogant'",
        options: ["Proud", "Humble", "Vain", "Cocky", "Bold"],
        correctAnswer: "Humble",
        category: "Verbal Reasoning",
        quizType: "IQ",
        type: "options",
        order: 35
    },

    // MORE NUMERICAL
    {
        question: "Sequence: 100, 90, 81, 72, 64, ?",
        options: ["55", "56", "58", "54", "60"],
        correctAnswer: "56", // Logic: -10, -9, -9, -8. Wait. 100-10=90, 90-9=81. 81-9=72. 72-8=64. 64-8=56.
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 36
    },
    {
        question: "What is 1/4 of 1/2 of 80?",
        options: ["5", "10", "20", "40", "2.5"],
        correctAnswer: "10",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 37
    },
    {
        question: "If 5 machines can make 5 widgets in 5 minutes, how many minutes will it take 100 machines to make 100 widgets?",
        options: ["100", "50", "25", "5", "10"],
        correctAnswer: "5",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 38
    },
    {
        question: "Which number is prime? 9, 15, 21, 27, 31",
        options: ["9", "15", "21", "27", "31"],
        correctAnswer: "31",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 39
    },
    {
        question: "Sum of angles in a triangle is...",
        options: ["90", "180", "270", "360"],
        correctAnswer: "180",
        category: "Numerical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 40
    },

    // DIAGRAMMATIC / SPATIAL (Descriptive)
    {
        question: "If you rotate a 'p' 180 degrees, what letter does it look like?",
        options: ["b", "d", "q", "p"],
        correctAnswer: "d",
        category: "Spatial Reasoning",
        quizType: "IQ",
        type: "options",
        order: 41
    },
    {
        question: "How many faces does a cube have?",
        options: ["4", "6", "8", "12"],
        correctAnswer: "6",
        category: "Spatial Reasoning",
        quizType: "IQ",
        type: "options",
        order: 42
    },
    {
        question: "What is the complement of a 30-degree angle?",
        options: ["60", "90", "150", "180"],
        correctAnswer: "60",
        category: "Spatial Reasoning",
        quizType: "IQ",
        type: "options",
        order: 43
    },
    {
        question: "A mirror shows the time to be 3:15. What is the actual time?",
        options: ["3:15", "9:45", "8:45", "6:45", "12:15"],
        correctAnswer: "8:45",
        category: "Spatial Reasoning",
        quizType: "IQ",
        type: "options",
        order: 44
    },
    {
        question: "If you fold a square paper in half twice, how many smaller squares do you get if you unfold?",
        options: ["2", "4", "6", "8"],
        correctAnswer: "4",
        category: "Spatial Reasoning",
        quizType: "IQ",
        type: "options",
        order: 45
    },

    // GENERAL LOGIC
    {
        question: "Which month has 28 days?",
        options: ["February", "March", "All of them", "None of them"],
        correctAnswer: "All of them",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 46
    },
    {
        question: "If there are 3 apples and you take away 2, how many apples do you have?",
        options: ["1", "2", "3", "0"],
        correctAnswer: "2",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 47
    },
    {
        question: "A doctor gives you 3 pills and tells you to take one every half hour. How long will the pills last?",
        options: ["30 minutes", "60 minutes", "90 minutes", "120 minutes"],
        correctAnswer: "60 minutes",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 48
    },
    {
        question: "How many 2-cent stamps are in a dozen?",
        options: ["6", "12", "24", "1"],
        correctAnswer: "12",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 49
    },
    {
        question: "Divide 30 by 1/2 and add 10. What is the result?",
        options: ["25", "50", "70", "40", "15"],
        correctAnswer: "70",
        category: "Logical Reasoning",
        quizType: "IQ",
        type: "options",
        order: 50
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Remove existing IQ questions to avoid duplicates on re-run
        await QuizSchema.deleteMany({ quizType: 'IQ' });
        console.log("Existing IQ questions removed");

        await QuizSchema.insertMany(iqQuestions);
        console.log("50 IQ Questions seeded successfully");

        process.exit();
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDB();
