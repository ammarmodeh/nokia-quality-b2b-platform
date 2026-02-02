
const mongoose = require('mongoose');
const Task = require('./backend/models/taskModel');
require('dotenv').config({ path: './backend/.env' });

const verify = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Create a new task with array fields
        const taskData = {
            responsible: ['Owner A', 'Owner B'],
            reason: ['Reason 1', 'Reason 2'],
            subReason: ['Sub 1', 'Sub 2'],
            rootCause: ['Root 1', 'Root 2'],
            // Required fields based on schema?
            slid: '1234567',
            customerName: 'Test Customer',
            contactNumber: '1234567890',
            teamName: 'Test Team',
            // ... minimal fields
        };

        console.log('Creating task with arrays...');
        const task = await Task.create(taskData);
        console.log('Task created:', task._id);

        // Verify fields are arrays
        const savedTask = await Task.findById(task._id);

        console.log('Responsible is array:', Array.isArray(savedTask.responsible));
        console.log('Responsible values:', savedTask.responsible);

        if (savedTask.responsible.length === 2 && savedTask.reason.length === 2) {
            console.log('SUCCESS: Arrays persisted correctly.');
        } else {
            console.error('FAILURE: Arrays did not persist correctly.');
        }

        // Clean up
        await Task.findByIdAndDelete(task._id);
        console.log('Test task deleted.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verify();
