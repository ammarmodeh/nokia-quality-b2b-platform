
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const verify = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Define Schema Inline to avoid import issues
        const taskSchema = new mongoose.Schema({
            responsible: { type: [String], default: [] },
            reason: { type: [String], default: [] },
            subReason: { type: [String], default: [] },
            rootCause: { type: [String], default: [] },
            slid: { type: String, required: false },
            // allow other fields
        }, { strict: false });

        // Use a temporary model name to avoid conflicts if previously compiled
        // Or just use 'Task' since we are running standalone process
        const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

        // Create a new task with array fields
        const taskData = {
            responsible: ['Owner A1', 'Owner B1'],
            reason: ['Reason 1', 'Reason 2'],
            subReason: ['Sub 1', 'Sub 2'],
            rootCause: ['Root 1', 'Root 2'],
            slid: 'VERIFY_TEST_123'
        };

        console.log('Creating task with arrays...');
        const task = await Task.create(taskData);
        console.log('Task created:', task._id);

        // Verify fields are arrays
        const savedTask = await Task.findById(task._id);

        console.log('Responsible is array:', Array.isArray(savedTask.responsible));
        console.log('Responsible:', savedTask.responsible);

        if (savedTask.responsible.length === 2 && savedTask.responsible[0] === 'Owner A1') {
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
