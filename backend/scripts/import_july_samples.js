import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { FieldTeamsSchema as FieldTeam } from '../models/fieldTeamsModel.js';
import TeamSamplesToken from '../models/teamSamplesTokenModel.js';

const julyData = [
  { name: 'شادي باسم عبد الجواد الصالحي', samples: 20 },
  { name: 'احمد ماجد حسين زيغان', samples: 15 },
  { name: 'محمد جواد نعمان بدر', samples: 21 },
  { name: 'محمود نبيل حسين البواب', samples: 11 },
  { name: 'ايمن فيصل عبد المنعم الاسود', samples: 15 },
  { name: 'جاسم منذر محمد غنيم', samples: 6 },
  { name: 'احمد فؤاد حمدو حموده', samples: 13 },
  { name: 'موسى يوسف موسى ابو خليفة', samples: 4 },
  { name: 'حسام رباح محمد الساخن', samples: 4 }, // matched from حسام رياح محمد الساخن
  { name: 'احمد محمود ابو صفية', samples: 18 },
  { name: 'معاذ بسام محمد عياصرة', samples: 7 },
  { name: 'عمر عبد اللطيف سليمان علي', samples: 4 },
  { name: 'معن محمد ظاهر بكري', samples: 3 },
  { name: 'عمر عبد الله اسماعيل الدقس', samples: 4 },
  { name: 'سليمان اسماعيل سليمان عبدالعال', samples: 6 },
  { name: 'احمد جواد نعمان بدر', samples: 6 },
  { name: 'مؤيد ابراهيم محمد الزعاترة', samples: 5 },
  { name: 'عبد القادر صبحي احمد البيك', samples: 4 },
  { name: 'عادل زياد اديب ماضي', samples: 11 },
  { name: 'منذر يوسف احمد الخطيب', samples: 2 },
  { name: 'احمد محمد مصطفى الهندي', samples: 7 },
  { name: 'محمد شحادة فضل يحيى', samples: 3 },
  { name: 'حسام محمد رشاد الشعار', samples: 9 },
  { name: 'نشأت زياد سلامة التغلبي', samples: 5 },
  { name: 'فهد طايل فهد الفالح', samples: 8 },
  { name: 'مصطفى عمر احمد العتيبي', samples: 5 }, // matched from العتيي
  { name: 'صهيب موسى سلامة القرارعة', samples: 10 },
  { name: 'اشرف احمد محمد عيد', samples: 12 },
  { name: 'مامون يوسف سليمان سالم', samples: 4 },
  { name: 'محمد توفيق خليل القواسمي', samples: 2 },
  { name: 'احمد سمير احمد طه', samples: 7 },
  { name: 'عبد الله يوسف محمود حماد', samples: 10 },
  { name: 'عمران سامي محمد عتمة', samples: 4 },
  { name: 'المعتصم بالله موسى مصطفى بني هذيل', samples: 3 },
  { name: 'معاذ نبيل محمد عليان', samples: 6 },
  { name: 'مهند ابراهيم محمد الزعاترة', samples: 1 },
  { name: 'ابراهيم عطا جبري حسونة', samples: 2 },
  { name: 'حسين علي جمعة السردية', samples: 1 },
  { name: 'محمد ياسر صبحي مقبل', samples: 6 },
  { name: 'علاء الدين نضال احمد الكدش', samples: 2 },
  { name: 'عبد الرحمن رافت سليمان ابو دهاك', samples: 3 },
  { name: 'انس ابراهيم صبري ابو صفية', samples: 3 },
  { name: 'راسم محمد راسم الحافي', samples: 2 },
  { name: 'زيد محمد عيسى دعسان', samples: 1 }
];

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  const allTeams = await FieldTeam.find({});
  console.log(`Found ${allTeams.length} FieldTeams in database.`);

  const matched = [];
  const unmatched = [];
  let totalInputSamples = 0;

  for (const item of julyData) {
    totalInputSamples += item.samples;
    const team = allTeams.find(t => t.teamName.trim() === item.name.trim());
    if (team) {
      matched.push({
        year: 2026,
        month: 7,
        teamName: team.teamName,
        teamId: team._id,
        sampleSize: item.samples
      });
    } else {
      unmatched.push(item);
    }
  }

  console.log(`Total Input Samples: ${totalInputSamples}`);
  console.log(`Matched teams: ${matched.length}/${julyData.length}`);
  if (unmatched.length > 0) {
    console.log('Unmatched items:', unmatched);
  }

  if (matched.length > 0) {
    console.log('Applying bulkWrite to TeamSamplesToken for July 2026 (Month 7)...');
    const ops = matched.map(m => ({
      updateOne: {
        filter: {
          year: m.year,
          month: m.month,
          teamName: m.teamName
        },
        update: {
          $set: {
            teamId: m.teamId,
            sampleSize: m.sampleSize
          }
        },
        upsert: true
      }
    }));

    const res = await TeamSamplesToken.bulkWrite(ops);
    console.log('BulkWrite result matchedCount:', res.matchedCount, 'modifiedCount:', res.modifiedCount);
  }

  // Verify updated July totals in DB
  const julDocs = await TeamSamplesToken.find({ year: 2026, month: 7 });
  const totalJulSamples = julDocs.reduce((s, d) => s + (d.sampleSize || 0), 0);
  const nonZeroJul = julDocs.filter(d => d.sampleSize > 0);
  console.log(`Verification: July 2026 has ${nonZeroJul.length} non-zero teams with Total = ${totalJulSamples} samples.`);

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(console.error);
