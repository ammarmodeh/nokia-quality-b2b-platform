import request from 'supertest';
import app from '../server.js';
import mongoose from 'mongoose';
import { UserSchema as User } from '../models/userModel.js';

beforeAll(async () => {
    // Connect to a test database or ensure the main DB is ready
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Auth Endpoints', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send({
                name: 'Test User',
                email: `test${Date.now()}@example.com`,
                password: 'password123',
                title: 'Tester',
                role: 'Employee',
                isAdmin: false,
                phoneNumber: "1234567890" // Required field
            });

        if (res.statusCode !== 201) {
            console.log('Register failed:', res.body);
        }
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message'); // Controller returns message
    });

    it('should login the user', async () => {
        // register first
        const email = `login${Date.now()}@example.com`;
        const password = 'password123';

        const regRes = await request(app).post('/api/users/register').send({
            name: 'Login User',
            email,
            password,
            title: 'Tester',
            role: 'Employee',
            phoneNumber: "0987654321" // Required field
        });

        if (regRes.statusCode !== 201) {
            console.log('Login Test - Registration failed:', regRes.body);
        }

        const res = await request(app)
            .post('/api/users/login')
            .send({
                email,
                password
            });

        if (res.statusCode !== 200) {
            console.log('Login failed:', res.body);
        }
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('accessToken'); // Controller returns accessToken
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/users/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'wrongpassword'
            });

        expect(res.statusCode).not.toEqual(200);
    });
});
