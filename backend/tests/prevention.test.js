import request from 'supertest';
import app from '../server.js';
import mongoose from 'mongoose';
import { TaskSchema } from '../models/taskModel.js';
import { CustomerIssueSchema } from '../models/customerIssueModel.js';

let token;
let user;

beforeAll(async () => {
    // Login to get token
    const email = `prevtest${Date.now()}@example.com`;
    const password = 'password123';

    await request(app).post('/api/users/register').send({
        name: 'Prev Tester',
        email,
        password,
        title: 'Tester',
        role: 'Admin',
        phoneNumber: "1234567890"
    });

    const res = await request(app).post('/api/users/login').send({
        email,
        password
    });

    token = res.body.accessToken;
    user = res.body.user;
});

afterAll(async () => {
    // Clean up
    await TaskSchema.deleteMany({ slid: 'PREV-TEST-SLID' });
    await CustomerIssueSchema.deleteMany({ slid: 'PREV-TEST-SLID' });
    await mongoose.connection.close();
});

describe('Issue Prevention Stats', () => {
    it('should include both prevented (score 10) and escalated (score 5) overlaps', async () => {
        // 1. Create a Customer Issue
        await CustomerIssueSchema.create({
            slid: 'PREV-TEST-SLID',
            fromMain: 'Test Source',
            reporter: 'Tester',
            contactMethod: 'Phone',
            teamCompany: 'Test Co',
            assignedTo: 'Technician',
            date: new Date(Date.now() - 86400000), // 1 day ago
            issues: [{ category: 'Test Issue' }]
        });

        // 2. Create a "Prevented" Task (Score 10) for same SLID
        await TaskSchema.create({
            slid: 'PREV-TEST-SLID',
            requestNumber: Math.floor(Math.random() * 1000000),
            interviewDate: new Date(),
            evaluationScore: 10,
            assignedTo: [user._id],
            whomItMayConcern: [user._id],
            createdBy: user._id,
            reason: ['Test Issue']
        });

        // 3. Create an "Escalated" Task (Score 5) for same SLID
        // (In realistic scenarios, it would be different SLIDs, but for overlap test, inclusion is key)
        const slid2 = 'PREV-TEST-SLID-2';
        await CustomerIssueSchema.create({
            slid: slid2,
            fromMain: 'Test Source',
            reporter: 'Tester',
            contactMethod: 'Phone',
            teamCompany: 'Test Co',
            assignedTo: 'Technician',
            date: new Date(Date.now() - 86400000),
            issues: [{ category: 'Test Issue' }]
        });
        await TaskSchema.create({
            slid: slid2,
            requestNumber: Math.floor(Math.random() * 1000000),
            interviewDate: new Date(),
            evaluationScore: 5,
            assignedTo: [user._id],
            whomItMayConcern: [user._id],
            createdBy: user._id,
            reason: ['Test Issue']
        });

        const res = await request(app)
            .get('/api/tasks/prevention-stats')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);

        // Find overlaps for these SLIDs
        const overlap1 = res.body.overlaps.find(o => o.task.slid === 'PREV-TEST-SLID');
        const overlap2 = res.body.overlaps.find(o => o.task.slid === slid2);

        expect(overlap1).toBeDefined();
        expect(overlap1.isPrevented).toBe(true);
        expect(overlap1.task.evaluationScore).toBe(10);

        expect(overlap2).toBeDefined();
        expect(overlap2.isPrevented).toBe(false);
        expect(overlap2.task.evaluationScore).toBe(5);

        // Check overall counts
        expect(res.body.preventedOverlapCount).toBeGreaterThanOrEqual(1);
        expect(res.body.failureOverlapCount).toBeGreaterThanOrEqual(1);

        // Clean up slid2
        await TaskSchema.deleteMany({ slid: slid2 });
        await CustomerIssueSchema.deleteMany({ slid: slid2 });
    });
});
