import request from 'supertest';
import app from '../server.js';
import mongoose from 'mongoose';

let token;
let createdTaskId;
let userId;

beforeAll(async () => {
    // Login to get token
    const email = `tasktest${Date.now()}@example.com`;
    const password = 'password123';

    // Register first
    const regRes = await request(app).post('/api/users/register').send({
        name: 'Task Tester',
        email,
        password,
        title: 'Tester',
        role: 'Admin', // Admin to have full access
        phoneNumber: "1122334455"
    });

    if (regRes.statusCode !== 201) {
        console.error('Task setup registration failed:', regRes.body);
    }

    const res = await request(app).post('/api/users/login').send({
        email,
        password
    });

    if (res.statusCode !== 200) {
        console.error('Task setup login failed:', res.body);
    } else {
        token = res.body.accessToken;
        userId = res.body.user._id;
    }
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Task Endpoints', () => {
    it('should create a new task', async () => {
        if (!token) {
            throw new Error('No token, cannot run test');
        }

        const payload = {
            title: 'Test Task',
            date: new Date(),
            team: [],
            stage: 'TODO',
            priority: 'High', // Changed from HIGH to High (enum)
            slid: 'SLID-TEST-002', // Changed to avoid duplicate if previous run succeeded partially
            requestNumber: Math.floor(Math.random() * 100000), // Required and Unique
            assignedTo: [userId], // Required ref to User
            whomItMayConcern: [userId], // Required ref to User
            // createdBy should be handled by controller using req.user
        };

        const res = await request(app)
            .post('/api/tasks/add-task')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

        if (res.statusCode !== 201) {
            console.log('Create task failed:', res.body);
        }
        expect(res.statusCode).toEqual(201); // Expect 201 Created
        expect(res.body).toHaveProperty('task');
        createdTaskId = res.body.task._id;
    });

    it('should get all tasks', async () => {
        const res = await request(app)
            .get('/api/tasks/get-all-tasks')
            .set('Authorization', `Bearer ${token}`);

        if (res.statusCode !== 200) {
            console.log('Get all tasks failed:', res.body);
        }
        expect(res.statusCode).toEqual(200);
        // Controller returns { success: true, data: [...], pagination: {...} }
        expect(Array.isArray(res.body.data)).toBeTruthy();
    });

    it('should update the task', async () => {
        if (!createdTaskId) return;

        const res = await request(app)
            .put(`/api/tasks/update-task/${createdTaskId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Updated Test Task',
                stage: 'In Progress' // Schema allows "In Progress"
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.title).toEqual('Updated Test Task'); // updateTask returns updated doc
    });

    it('should delete the task', async () => {
        if (!createdTaskId) return;

        const res = await request(app)
            .delete(`/api/tasks/delete-task/${createdTaskId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
    });
});
