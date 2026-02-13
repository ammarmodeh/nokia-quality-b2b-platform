import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    name: String
});
const User = mongoose.model('User', UserSchema);

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const users = await User.find({}, { email: 1, role: 1, name: 1 }).limit(5);
    console.log(JSON.stringify(users, null, 2));
    mongoose.disconnect();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
