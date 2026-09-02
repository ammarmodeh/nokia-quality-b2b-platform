import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { FieldTeamsSchema as FieldTeam } from '../models/fieldTeamsModel.js';
import TeamSamplesToken from '../models/teamSamplesTokenModel.js';

const augustData = [
  { name: 'شادي باسم عبد الجواد الصالحي', samples: 12 },
  { name: 'احمد ماجد حسين زيغان', samples: 9 },
  { name: 'محمد جواد نعمان بدر', samples: 7 },
  { name: 'محمود نبيل حسين البواب', samples: 10 },
  { name: 'ايمن فيصل عبد المنعم الاسود', samples: 6 },
  { name: 'جاسم منذر محمد غنيم', samples: 9 },
  { name: 'احمد فؤاد حمدو حموده', samples: 4 },
  { name: 'موسى يوسف موسى ابو خليفة', samples: 3 },
  { name: 'حسام رباح محمد الساخن', samples: 9 }, // matched from حسام رياح محمد الساخن
  { name: 'احمد محمود ابو صفية', samples: 17 },
  { name: 'معاذ بسام محمد عياصرة', samples: 10 },
  { name: 'عمر عبد اللطيف سليمان علي', samples: 2 },
  { name: 'معن محمد ظاهر بكري', samples: 7 },
  { name: 'عمر عبد الله اسماعيل الدقس', samples: 8 },
  { name: 'سليمان اسماعيل سليمان عبدالعال', samples: 5 }, // matched from عبد العال
  { name: 'احمد جواد نعمان بدر', samples: 7 },
  { name: 'مؤيد ابراهيم محمد الزعاترة', samples: 7 },
  { name: 'عبد القادر صبحي احمد البيك', samples: 3 },
  { name: 'عادل زياد اديب ماضي', samples: 3 },
  { name: 'زيد محمد عيسى دعسان', samples: 3 },
  { name: 'عبد الرحمن رافت سليمان ابو دهاك', samples: 8 },
  { name: 'اشرف احمد محمد عيد', samples: 18 },
  { name: 'ابراهيم عطا جبري حسونة', samples: 4 },
  { name: 'فهد طايل فهد الفالح', samples: 5 },
  { name: 'مامون يوسف سليمان سالم', samples: 4 },
  { name: 'مهند ابراهيم محمد الزعاترة', samples: 4 },
  { name: 'انس ابراهيم صبري ابو صفية', samples: 8 },
  { name: 'محمد ياسر صبحي مقبل', samples: 16 },
  { name: 'علاء الدين نضال احمد الكدش', samples: 6 },
  { name: 'مصطفى عمر احمد العتيبي', samples: 6 }, // matched from العتيي
  { name: 'حسين علي جمعة السردية', samples: 5 },
  { name: 'المعتصم بالله موسى مصطفى بني هذيل', samples: 4 },
  { name: 'عمران سامي محمد عتمة', samples: 7 },
  { name: 'عبد الله يوسف محمود حماد', samples: 6 },
  { name: 'صهيب موسى سلامة القرارعة', samples: 9 },
  { name: 'احمد محمد مصطفى الهندي', samples: 2 },
  { name: 'نشأت زياد سلامة التغلبي', samples: 7 },
  { name: 'احمد سمير احمد طه', samples: 4 },
  { name: 'معاذ نبيل محمد عليان', samples: 5 },
  { name: 'محمد شحادة فضل يحيى', samples: 4 },
  { name: 'ايهم عبد اللطيف محمود السعدي', samples: 3 },
  { name: 'ابراهيم هاني محمد خشمان', samples: 10 },
  { name: 'حسام محمد رشاد الشعار', samples: 4 },
  { name: 'احمد عناد عادل حطاب', samples: 1 },
  { name: 'احمد عوض عوض طويرش', samples: 1 },
  { name: 'منذر يوسف احمد الخطيب', samples: 1 },
  { name: 'محمد توفيق خليل القواسمي', samples: 2 }
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

  for (const item of augustData) {
    totalInputSamples += item.samples;
    const team = allTeams.find(t => t.teamName.trim() === item.name.trim());
    if (team) {
      matched.push({
        year: 2026,
        month: 8,
        teamName: team.teamName,
        teamId: team._id,
        sampleSize: item.samples
      });
    } else {
      unmatched.push(item);
    }
  }

  console.log(`Total Input Samples: ${totalInputSamples}`);
  console.log(`Matched teams: ${matched.length}/${augustData.length}`);
  if (unmatched.length > 0) {
    console.log('Unmatched items:', unmatched);
  }

  if (matched.length > 0) {
    console.log('Applying bulkWrite to TeamSamplesToken for August 2026...');
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

  // Verify updated August totals in DB
  const augDocs = await TeamSamplesToken.find({ year: 2026, month: 8 });
  const totalAugSamples = augDocs.reduce((s, d) => s + (d.sampleSize || 0), 0);
  const nonZeroAug = augDocs.filter(d => d.sampleSize > 0);
  console.log(`Verification: August 2026 has ${nonZeroAug.length} non-zero teams with Total = ${totalAugSamples} samples.`);

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(console.error);
