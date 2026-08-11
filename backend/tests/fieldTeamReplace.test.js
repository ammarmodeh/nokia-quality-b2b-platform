import request from 'supertest';
import app from '../server.js';
import mongoose from 'mongoose';
import { FieldTeamsSchema } from '../models/fieldTeamsModel.js';

let token;

beforeAll(async () => {
  const email = `fieldteam-replace-${Date.now()}@example.com`;
  const password = 'password123';

  await request(app).post('/api/users/register').send({
    name: 'Field Team Admin',
    email,
    password,
    title: 'Tester',
    role: 'Admin',
    phoneNumber: '1234567890'
  });

  const res = await request(app).post('/api/users/login').send({
    email,
    password
  });

  token = res.body.accessToken;
}, 30000);

afterAll(async () => {
  await FieldTeamsSchema.deleteMany({ teamCode: { $in: ['REPLACE-001'] } });
  await mongoose.connection.close();
});

describe('Field team replace flow', () => {
  it('allows replacing an active team when replaceExisting is true', async () => {
    const teamCode = 'REPLACE-001';

    await FieldTeamsSchema.create({
      teamName: 'Old Team',
      firstName: 'Old',
      surname: 'Team',
      teamCompany: 'Test Co',
      contactNumber: '+1234567890',
      teamCode,
      quizCode: 'ABCDREPLACE-001',
      password: 'hashed-password',
      canTakeQuiz: false,
      isActive: true,
      isSuspended: false,
      isTerminated: false,
      isNewToInstallation: false,
      isNewToActivation: false,
    });

    const res = await request(app)
      .post('/api/field-teams/add-field-team')
      .set('Authorization', `Bearer ${token}`)
      .send({
        teamName: 'Replacement Team',
        firstName: 'New',
        surname: 'Team',
        teamCompany: 'Test Co',
        contactNumber: '+1234567890',
        teamCode,
        replaceExisting: true,
        isNewToInstallation: false,
        isNewToActivation: false,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.teamCode).toBe(teamCode);
    expect(res.body.teamName).toBe('Replacement Team');

    const activeTeams = await FieldTeamsSchema.find({ teamCode, isTerminated: false });
    expect(activeTeams).toHaveLength(1);
  }, 30000);
});
