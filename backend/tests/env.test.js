import 'dotenv/config';

describe('Env Test', () => {
    it('should have MONGO_URI', () => {
        console.log('MONGO_URI is:', process.env.MONGO_URI ? 'DEFINED' : 'UNDEFINED');
        expect(process.env.MONGO_URI).toBeDefined();
    });
});
