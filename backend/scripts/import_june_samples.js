import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { FieldTeamsSchema as FieldTeam } from '../models/fieldTeamsModel.js';
import TeamSamplesToken from '../models/teamSamplesTokenModel.js';

const juneData = [
  { name: 'اشرف احمد محمد عيد', samples: 11 },
  { name: 'حسام محمد رشاد الشعار', samples: 7 },
  { name: 'عادل زياد اديب ماضي', samples: 2 },
  { name: 'محمد شحادة فضل يحيى', samples: 7 },
  { name: 'محمد ياسر صبحي مقبل', samples: 7 },
  { name: 'مصطفى عمر احمد العتيبي', samples: 4 }, // matched from العتيي
  { name: 'موسى يوسف موسى ابو خليفة', samples: 14 },
  { name: 'معاذ بسام محمد عياصرة', samples: 4 },
  { name: 'مامون يوسف سليمان سالم', samples: 2 },
  { name: 'عبد الله يوسف محمود حماد', samples: 6 },
  { name: 'عمر عبد الله اسماعيل الدقس', samples: 2 },
  { name: 'مؤيد ابراهيم محمد الزعاترة', samples: 4 },
  { name: 'نشأت زياد سلامة التغلبي', samples: 6 },
  { name: 'شادي باسم عبد الجواد الصالحي', samples: 13 },
  { name: 'عبد الرحمن رافت سليمان ابو دهاك', samples: 2 },
  { name: 'احمد سمير احمد طه', samples: 4 },
  { name: 'عبد القادر صبحي احمد البيك', samples: 6 },
  { name: 'فهد طايل فهد الفالح', samples: 3 },
  { name: 'احمد محمود ابو صفية', samples: 12 },
  { name: 'احمد جواد نعمان بدر', samples: 5 },
  { name: 'علاء الدين نضال احمد الكدش', samples: 2 },
  { name: 'عمران سامي محمد عتمة', samples: 1 },
  { name: 'احمد ماجد حسين زيغان', samples: 10 },
  { name: 'المعتصم بالله موسى مصطفى بني هذيل', samples: 3 }, // matched from بي هذيل
  { name: 'حسام رباح محمد الساخن', samples: 2 }, // matched from حسام رياح محمد الساخن
  { name: 'معاذ نبيل محمد عليان', samples: 3 },
  { name: 'معن محمد ظاهر بكري', samples: 13 },
  { name: 'انس ابراهيم صبري ابو صفية', samples: 2 },
  { name: 'محمد توفيق خليل القواسمي', samples: 3 },
  { name: 'مهند ابراهيم محمد الزعاترة', samples: 2 },
  { name: 'محمد جواد نعمان بدر', samples: 8 },
  { name: 'محمود نبيل حسين البواب', samples: 8 },
  { name: 'ايمن فيصل عبد المنعم الاسود', samples: 6 },
  { name: 'جاسم منذر محمد غنيم', samples: 4 },
  { name: 'احمد فؤاد حمدو حموده', samples: 1 },
  { name: 'احمد محمد مصطفى الهندي', samples: 3 },
  { name: 'ايهم عبد اللطيف محمود السعدي', samples: 2 },
  { name: 'حسين علي جمعة السردية', samples: 1 },
  { name: 'ابراهيم عطا جبري حسونة', samples: 4 },
  { name: 'صهيب موسى سلامة القرارعة', samples: 5 },
  { name: 'سليمان اسماعيل سليمان عبدالعال', samples: 2 }
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

  for (const item of juneData) {
    totalInputSamples += item.samples;
    const team = allTeams.find(t => t.teamName.trim() === item.name.trim());
    if (team) {
      matched.push({
        year: 2026,
        month: 6,
        teamName: team.teamName,
        teamId: team._id,
        sampleSize: item.samples
      });
    } else {
      unmatched.push(item);
    }
  }

  console.log(`Total Input Samples: ${totalInputSamples}`);
  console.log(`Matched teams: ${matched.length}/${juneData.length}`);
  if (unmatched.length > 0) {
    console.log('Unmatched items:', unmatched);
  }

  if (matched.length > 0) {
    console.log('Applying bulkWrite to TeamSamplesToken for June 2026 (Month 6)...');
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

  // Verify updated June totals in DB
  const junDocs = await TeamSamplesToken.find({ year: 2026, month: 6 });
  const totalJunSamples = junDocs.reduce((s, d) => s + (d.sampleSize || 0), 0);
  const nonZeroJun = junDocs.filter(d => d.sampleSize > 0);
  console.log(`Verification: June 2026 has ${nonZeroJun.length} non-zero teams with Total = ${totalJunSamples} samples.`);

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(console.error);
