
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const teamSchema = new mongoose.Schema({
  teamName: String,
  sessionHistory: Array
}, { strict: false });

const Team = mongoose.model('FieldTeam', teamSchema, 'fieldteams');

async function checkTeams() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nokia-quality-db');
  const teams = await Team.find({}).limit(10);
  console.log('--- Database Team Names ---');
  teams.forEach(t => {
    console.log(`"${t.teamName}" (Length: ${t.teamName?.length})`);
  });
  await mongoose.disconnect();
}

checkTeams();
