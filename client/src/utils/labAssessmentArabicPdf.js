import api from "../api/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { normalizeExportSections } from "./labAssessmentExcelExport";

// =========================================================================
// 1. COMPREHENSIVE ARABIC TRANSLATION DICTIONARY FOR ALL 9 SECTIONS
// =========================================================================

export const ARABIC_LAB_SECTIONS_MAP = {
  "sec-1": {
    title: "1. كبينة التوزيع (FDB) – لحام وإدارة شعيرات الألياف الضوئية",
    checkpoints: {
      "cp-1-1": {
        name: "قياس القدرة الضوئية الواردة من منفذ السبلتر (Splitter Port) قبل بدء التركيب",
        guide: "يجب دائماً استخدام مقياس القدرة الضوئية (OPM) لقياس الإشارة مباشرة من منفذ السبلتر للتأكد من سلامة التغذية.",
      },
      "cp-1-2-theo": {
        name: "تسجيل القراءة والتأكد من مطابقتها للمدى النظري المقبول (-16 إلى -19 dBm)",
        guide: "المدى النظري الممتاز هو بين -16 و -19 dBm، تسجيل القيمة بدقة يضمن سلامة الشبكة.",
      },
      "cp-1-2-prac": {
        name: "تسجيل القراءة والتأكد من مطابقتها للمدى العملي المقبول (-16 إلى -22 / -23 dBm)",
        guide: "إذا تجاوزت الإشارة -23 dBm يجب التوقف وفحص السبلتر أو إبلاغ فريق الصيانة قبل متابعة التركيب.",
      },
      "cp-1-4": {
        name: "تنفيذ اللحام الحراري (Fusion Splice) بين البيغتيل (Pigtail) وكابل الدروب الخارجي (الأسود)",
        guide: "تأكد من تنظيف الشعيرة جيداً بالكحول، القص الدقيق بـ Cleaver، وضمان جودة اللحام بدون فقاعات أو انكسارات.",
      },
      "cp-1-route-pigtail": {
        name: "ترتيب وتمرير البيغتيل داخل الكاسيت/المجرى دون انحناءات حادة أو شد أو تداخل",
        guide: "تجنب ثني الشعيرات بزاوية حادة (Bending Loss)، وحافظ على نصف قطر الانحناء المناسب داخل كاسيت الـ FDB.",
      },
      "cp-1-route-outdoor": {
        name: "ترتيب وتمرير كابل الدروب الخارجي داخل الكاسيت والمجرى بشكل منظم ومحكم",
        guide: "قم بتثبيت الكابل الخارجي بإحكام وترتيب مساره دون الضغط على الشعيرات المجاورة.",
      },
      "cp-1-label-pigtail": {
        name: "وضع ملصق الترقيم والتعريف المطلوب على البيغتيل (رقم منفذ السبلتر)",
        guide: "الملصق إلزامي لتسهيل أعمال الصيانة المستقبلية والتعرف السريع على المنفذ.",
      },
      "cp-1-label-outdoor": {
        name: "وضع ملصق الترقيم والتعريف المطلوب على كابل الدروب الخارجي (الأسود)",
        guide: "يجب تثبيت الملصق بوضوح في المكان المخصص لتمييز كابل العميل عن باقي الكوابل.",
      },
      "cp-1-7": {
        name: "حماية نقطة اللحام بأنبوب الحماية الحراري (Protection Sleeve) وتثبيته في مكانه",
        guide: "تسخين الأنبوب جيداً وتثبيته في الحامل المخصص لمنع انكسار الشعيرة عند إغلاق الكاسيت.",
      },
      "cp-1-8": {
        name: "التعامل مع كوابل الدروب الحالية واستخراج الكابل المطلوب بحذر دون التأثير على كوابل المشتركين الآخرين",
        guide: "الحذر الشديد أثناء فتح الكاسيت حتى لا تتسبب في انقطاع خدمة أي مشترك نشط على نفس الكبينة.",
      },
      "cp-1-9": {
        name: "الحفاظ على تنظيم الكاسيت بالكامل، منع تشوهه، وإعادة جميع الشعيرات لمساراتها الصحيحة",
        guide: "إغلاق كاسيت الـ FDB بأمان والتأكد من عدم وجود أي شعيرة مضغوطة أو معرضة للكسر.",
      },
    },
  },
  "sec-2": {
    title: "2. نقطة دخول المبنى (BEP) – لحام الألياف الخارجية والداخلية",
    checkpoints: {
      "cp-2-1": {
        name: "تنفيذ اللحام الحراري بين كابل الدروب الخارجي (الأسود) والداخلي (الأبيض)",
        guide: "اللحام بين الكابل الخارجي والداخلي داخل الـ BEP يتطلب تقشيراً دقيقاً ولحاماً خالياً من الفقد العالي.",
      },
      "cp-2-2": {
        name: "ترتيب وتمرير الشعيرات داخل علبة BEP وفق معايير التركيب المعتمدة",
        guide: "لف الشعيرات الاحتياطية بانسيابية داخل مسارات الـ BEP وتثبيت أنبوب الحماية في مكانه المخصص.",
      },
      "cp-2-3": {
        name: "تجنب الانحناءات الحادة والشد والحلقات الزائدة، وتثبيت الكوابل بإحكام",
        guide: "شد الكابل أو تركه مرتخياً يسبب انقطاع الإشارة، تأكد من تثبيت المرابط بإحكام.",
      },
      "cp-2-label-outdoor": {
        name: "وضع ملصق الترقيم المطلوب على كابل الدروب الخارجي (الأسود) عند علبة BEP",
        guide: "وضع ملصق واضح ومقروء يوضح اتجاه المصدر/الكبينة.",
      },
      "cp-2-label-indoor": {
        name: "وضع ملصق الترقيم المطلوب على كابل الدروب الداخلي (الأبيض) عند علبة BEP",
        guide: "وضع ملصق واضح ومقروء يوضح اتجاه الشقة أو المنفذ الداخلي.",
      },
    },
  },
  "sec-3": {
    title: "3. مقبس الألياف الضوئية (OTO) – اللحام، الترتيب والفحص البصري",
    checkpoints: {
      "cp-3-1": {
        name: "تنفيذ اللحام الحراري بين كابل الدروب الداخلي وبيغتيل مقبس OTO",
        guide: "لحام دقيق ونظيف يضمن وصول كامل القدرة الضوئية إلى منفذ الـ OTO بدون خسائر.",
      },
      "cp-3-2": {
        name: "حماية نقطة اللحام وترتيب الشعيرة داخل علبة OTO دون انحناءات حادة أو ضغط",
        guide: "ترتيب الشعيرة داخل مقبس OTO بعناية فائقة لتجنب كسرها أثناء إغلاق الغطاء الخارجي.",
      },
      "cp-3-3": {
        name: "وضع ملصق التعريف المعتمد على غطاء مقبس OTO الخارجي بشكل مقروء وصحيح",
        guide: "إلصاق بطاقة التعريف على وجه علبة OTO لكتابة رقم الخدمة أو الترقيم المعتمد.",
      },
      "cp-3-4": {
        name: "توصيل الباتش كورد (Patch Cord) من OTO إلى مقياس القدرة الضوئية وإجراء الفحص البصري",
        guide: "فحص الإشارة عند مخرج الـ OTO باستخدام باتش كورد سليم ونظيف للتأكد من جودة المسار كاملاً.",
      },
      "cp-3-5": {
        name: "قياس الفقد الكلي للمسار (Link Loss) والتأكد أنه لا يتجاوز 2 dB مقارنة بقراءة الـ FDB",
        guide: "إذا كان الفرق بين قراءة FDB وقراءة OTO أكبر من 2 dB، فهذا يعني وجود خلل أو انحناء حاد أو لحام سيء يجب إصلاحه فوراً.",
      },
    },
  },
  "sec-4": {
    title: "4. جهاز المشترك (ONT) – التركيب، الإعداد وتفعيل الخدمة",
    checkpoints: {
      "cp-4-zte-int": {
        name: "راوتر ZTE F6600P – تشغيل الجهاز وإدخال رقم INT في الحقل المخصص بشكل صحيح",
        guide: "التأكد من إدخال رقم الـ INT الخاص بالعميل بدقة لتسجيل الجهاز على شبكة الـ OLT.",
      },
      "cp-4-zte-wan": {
        name: "راوتر ZTE F6600P – ضبط إعدادات الاتصال بشبكة الإنترنت (WAN Configuration)",
        guide: "إعداد الـ VLAN والـ PPPoE / IP بالشكل المعتمد للخدمة.",
      },
      "cp-4-zte-wifi": {
        name: "راوتر ZTE F6600P – ضبط إعدادات الواي فاي للترددين 2.4 GHz و 5 GHz (الأسماء وكلمات المرور)",
        guide: "تسمية الشبكتين بوضوح وتعيين كلمات مرور قوية ومطابقة لطلب العميل أو المعيار المعتمد.",
      },
      "cp-4-zte-optical": {
        name: "راوتر ZTE F6600P – فحص مستوى الإشارة الضوئية المستلمة والتأكد من استقرارها",
        guide: "التحقق من صفحة إعدادات الراوتر للتأكد من أن Optical Rx Power تقع في النطاق السليم (-15 إلى -24 dBm).",
      },
      "cp-4-zte-led": {
        name: "راوتر ZTE F6600P – فهم وتفسير دلالات أضواء LED (ثبات/وميض PON، أحمر LOS، أضواء الإنترنت والواي فاي)",
        guide: "القدرة على تشخيص أي مشكلة فورية من خلال حالة ولمعان مؤشرات الـ LEDs.",
      },
      "cp-4-nokia6-int": {
        name: "راوتر Nokia G-2426G-P (Wi-Fi 6) – تشغيل الجهاز وإدخال رقم INT المطلوب بدقة",
        guide: "إدخال رقم الـ INT المعتمد في واجهة نوكيا والتأكد من قبوله.",
      },
      "cp-4-nokia6-fw": {
        name: "راوتر Nokia G-2426G-P – رفع وتحديث السوفتوير (Firmware v62) والتحقق من إعادة التشغيل التلقائي",
        guide: "إلزامية ترقية الفيرموير إلى الإصدار 62 لضمان استقرار أداء شبكة Wi-Fi 6 وتوافقها الكامل.",
      },
      "cp-4-nokia6-wan": {
        name: "راوتر Nokia G-2426G-P – ضبط إعدادات شبكة الـ WAN والمعلومات المطلوبة بدقة",
        guide: "التحقق من اتصال الـ WAN وظهور حالة Connected بنجاح.",
      },
      "cp-4-nokia6-wifi": {
        name: "راوتر Nokia G-2426G-P – ضبط إعدادات الواي فاي للترددين 2.4 GHz و 5 GHz بشكل منفصل",
        guide: "إعداد قنوات وبث الترددين والتأكد من عمل ميزة Wi-Fi 6 بدون تعارض.",
      },
      "cp-4-nokia6-optical": {
        name: "راوتر Nokia G-2426G-P – فحص ومطابقة مستوى الإشارة الضوئية المستلمة",
        guide: "مطابقة قراءة صفحة الـ Optical Power مع قراءة جهاز القياس الخارجي.",
      },
      "cp-4-nokia6-led": {
        name: "راوتر Nokia G-2426G-P – فهم وتفسير دلالات أضواء الـ LED وحالات التشغيل والأعطال",
        guide: "معرفة حالات الأضواء لتشخيص مشاكل الربط والانقطاع بسرعة أمام العميل.",
      },
      "cp-4-nokia5-wan": {
        name: "راوتر Nokia G-140W-H (Wi-Fi 5) – ضبط إعدادات اتصال الـ WAN بشكل صحيح",
        guide: "إعداد شبكة الـ WAN على أجهزة نوكيا الجيل الخامس والتأكد من استلام IP.",
      },
      "cp-4-nokia5-wifi": {
        name: "راوتر Nokia G-140W-H (Wi-Fi 5) – ضبط شبكات الواي فاي 2.4 GHz و 5 GHz",
        guide: "ضبط أسماء الشبكات وكلمات المرور والتأكد من استقرار التغطية.",
      },
      "cp-4-nokia5-optical": {
        name: "راوتر Nokia G-140W-H (Wi-Fi 5) – التحقق من مستوى الإشارة الضوئية المستلمة",
        guide: "التأكد من أن قراءة الإشارة تقع ضمن المدى الآمن والمستقر.",
      },
      "cp-4-nokia5-led": {
        name: "راوتر Nokia G-140W-H (Wi-Fi 5) – فهم وتفسير دلالات أضواء الـ LED",
        guide: "تحديد سبب انقطاع الخدمة (LOS أحمر، PON وميض) فورياً عبر المؤشرات.",
      },
      "cp-4-label-callcenter": {
        name: "وضع ملصق أرقام الدعم الفني ورقم الـ INT على جهاز الـ ONT بشكل بارز للعميل",
        guide: "ملصق مركز الاتصال ورقم الـ INT ضروري لتمكين العميل من التواصل عند الحاجة دون البحث عن الأرقام.",
      },
      "cp-4-label-noreset": {
        name: "وضع ملصق التحذير (NO RESET) فوق ثقب إعادة الضبط مباشرة وبشكل واضح",
        guide: "ملصق NO RESET يمنع العميل من الضغط على زر Reset وحذف البرمجة والتسبب في انقطاع الخدمة.",
      },
    },
  },
  "sec-5": {
    title: "5. الأدوات المساعدة وتطبيقات الهاتف الذكي الميدانية",
    checkpoints: {
      "cp-5-ookla": {
        name: "تطبيق Ookla Speedtest – مثبت على هاتف الفني ومضبوط لاختيار السيرفر المعتمد والقياس الدقيق",
        guide: "إلزامية وجود التطبيق واختيار السيرفر المحلي المعتمد للمشروع لتوثيق السرعة الحقيقية.",
      },
      "cp-5-wifimeter": {
        name: "تطبيق Wi-Fi Signal Meter / Analyzer – مثبت لقياس قوة الإشارة والتغطية لترددي 2.4 و 5 GHz",
        guide: "استخدام التطبيق لتحديد أفضل موقع للراوتر وقياس التغطية في مختلف غرف العميل.",
      },
      "cp-5-timestamp": {
        name: "تطبيق Timestamp Camera – مثبت ومضبوط لإظهار التاريخ والوقت وإحداثيات الموقع (GPS)",
        guide: "توثيق كل خطوة بصورة واضحة تتضمن التاريخ والوقت والموقع الجغرافي الدقيق.",
      },
      "cp-5-laptop-1gbps": {
        name: "لابتوب يدعم منفذ شبكة 1 Gbps – متوفر لدى الفريق لاختبار السرعات العالية عبر الكابل المباشر",
        guide: "إلزامية توفر لابتوب بمنفذ 1Gbps لإثبات وصول السرعة الكاملة للباقة للمشترك سلكياً.",
      },
      "cp-5-wifi6-device": {
        name: "جهاز يدعم تقنية Wi-Fi 6 – متوفر لدى الفريق لقياس واختبار سرعات الواي فاي الفائقة",
        guide: "جهاز Wi-Fi 6 يثبت للعميل أداء راوتر Wi-Fi 6 الحقيقي دون تقييد بالأجهزة القديمة.",
      },
    },
  },
  "sec-6": {
    title: "6. توعية وتثقيف العميل وشرح تفاصيل الخدمة",
    checkpoints: {
      "cp-6-1": {
        name: "شرح الفارق بين ترددي 2.4 GHz و 5 GHz (السرعة مقابل المدى واختراق الجدران)",
        guide: "شرح مبسط للعميل: 5GHz سرعة فائقة بمدى أقصر، 2.4GHz مدى أوسع لتغطية الغرف البعيدة.",
      },
      "cp-6-2": {
        name: "شرح وتنفيذ اختبار السرعة عند 3 نقاط داخل منزل العميل (3-Point Speed Test)",
        guide: "إجراء الفحص بجانب الراوتر، في غرفة المعيشة، وفي أبعد نقطة لتثقيف العميل حول توزيع التغطية.",
      },
      "cp-6-3": {
        name: "تحذير العميل بوضوح بعدم الضغط على زر Reset في الراوتر وشرح تأثيره على انقطاع الخدمة",
        guide: "التأكيد على أن ضغط Reset يمسح الإعدادات ويتطلب زيارة فنية جديدة لإعادة التفعيل.",
      },
      "cp-6-4": {
        name: "توضيح قنوات الدعم للعميل: مركز الاتصال (مبيعات/فواتير) مقابل الدعم الفني (سرعات/مشاكل)",
        guide: "توجيه العميل إلى الرقم الصحيح لتوفير وقته وضمان سرعة حل استفساراته.",
      },
      "cp-6-5": {
        name: "إبلاغ العميل بمكالمة تقييم الرضا (CX Call بعد 48 ساعة) وشرح مقياس الرضا (9-10 ممتاز، 1-8 غير راضٍ)",
        guide: "توضيح أهمية التقييم وأن الدرجات من 9 إلى 10 تعبر عن الخدمة الممتازة وتدعم الفريق.",
      },
      "cp-6-6": {
        name: "تثقيف العميل بشأن أداء خدمات IPTV، الـ VPN، سيرفرات الألعاب (PlayStation) وتفاوت سرعات السيرفرات",
        guide: "توضيح أن بطء سيرفر لعبة أو تطبيق معين خارج عن سرعة خط الفايبر المستقر.",
      },
    },
  },
  "sec-7": {
    title: "7. الوعي بتذاكر الجودة ومستويات الخدمة الزمنية (SLAs)",
    checkpoints: {
      "cp-7-1": {
        name: "معرفة وفهم تذاكر NPS (المهلة: 24 ساعة) وتذاكر خدمة العملاء CC (المهلة: 9 ساعات)",
        guide: "الالتزام الحازم بالمدة الزمنية لكل نوع من التذاكر لتجنب غرامات التأخير وتراجع مؤشرات الجودة.",
      },
      "cp-7-2": {
        name: "الالتزام بالإجراءات التصحيحية الفورية والتصعيد الصحيح عند خطر تجاوز المهلة الزمنية (SLA)",
        guide: "إغلاق التذكرة بحل جذري وليس مؤقت، وإبلاغ المشرف فوراً عند مواجهة أي عائق ميداني.",
      },
    },
  },
  "sec-8": {
    title: "8. التقييم الذاتي وتوثيق مراحل العمل بالصور الزمنية",
    checkpoints: {
      "cp-8-photos-self-assess": {
        name: "التقاط وتوثيق صور Timestamp واضحة لجميع خطوات العمل (لحامات وملصقات FDB, BEP, OTO, ONT، وفحوصات السرعة والإشارة) للتقييم الذاتي الدقيق",
        guide: "الصور الواضحة والمؤرخة بالتاريخ والوقت هي الإثبات القاطع لجودة تنفيذك وحمايتك من أي شكوى.",
      },
    },
  },
  "sec-9": {
    title: "9. مهارات التواصل والسلوك المهني والمظهر العام مع العميل",
    checkpoints: {
      "cp-9-comm-behaviour": {
        name: "التقييم الشامل للسلوك المهني: حسن الاستقبال، المظهر والزي الرسمي، اللباقة والوضوح في الحديث، شرح خطوات العمل باحترام، والتعامل الاحترافي مع استفسارات وشكاوى العميل",
        guide: "انطباع العميل عن الفني يعكس 80% من رضاه عن الشركة؛ احرص على اللباقة، ارتداء الزي المعتمد، والابتسامة وحسن الاستماع.",
      },
    },
  },
};

export const ARABIC_CERTIFICATES_MAP = {
  dd: { title: "السياقة الوقائية والسلامة المرورية", code: "DD", desc: "القيادة الآمنة والامتثال لقواعد المرور" },
  es: { title: "السلامة الكهربائية والتعامل مع المخاطر", code: "ES", desc: "التعامل الآمن مع المصادر الكهربائية والتأريض" },
  fa: { title: "الإسعافات الأولية والاستجابة الطارئة", code: "FA", desc: "الإنعاش القلبي والتعامل مع الإصابات الطارئة" },
  ff: { title: "مكافحة الحرائق واستخدام الطفايات", code: "FF", desc: "استخدام طفايات الحريق وإجراءات الإخلاء" },
  ra: { title: "تقييم مخاطر بيئة العمل الميدانية", code: "RA", desc: "تحديد المخاطر في موقع العمل وإجراءات الوقاية" },
  wah: { title: "السلامة والعمل على ارتفاعات", code: "WAH", desc: "استخدام السلالم، الأحزمة، وتسلق الأعمدة بأمان" },
};

export const ARABIC_EQUIPMENT_MAP = {
  "Fusion Splicer": "جهاز لحام الألياف الضوئية (Fusion Splicer)",
  "Optical Power Meter": "مقياس القدرة الضوئية (Optical Power Meter)",
  "Visual Fault Locator": "قلم الليزر البصري لتحديد القطع (VFL)",
  "Fiber Cleaver": "قاطعة الألياف الدقيقة (Fiber Cleaver)",
  "Fiber Stripper": "زرادية تجريد الألياف (Fiber Stripper)",
  "Alcohol & Wipes": "كحول طبي مع مناديل تنظيف الألياف",
  "Labeling Machine": "طابعة ولواصق الترقيم الميداني",
  "Laptop 1Gbps": "كمبيوتر محمول بمنفذ 1Gbps",
  "Wi-Fi 6 Device": "هاتف أو جهاز يدعم Wi-Fi 6",
  "Safety Gear / PPE": "مهمات الوقاية والسلامة الشخصية (PPE)",
};

// =========================================================================
// 2. WEAK POINTS EXTRACTION & ANALYSIS
// =========================================================================

export const extractWeakPoints = (assessment) => {
  const weakPoints = [];
  const sections = normalizeExportSections(assessment?.sections);

  sections.forEach((sec, sIdx) => {
    const secKey = sec.sectionId || `sec-${sIdx + 1}`;
    const secDict = ARABIC_LAB_SECTIONS_MAP[secKey] || {};
    const checkpoints = sec.checkpoints || [];

    checkpoints.forEach((cp) => {
      const isSec8Or9 = secKey === "sec-8" || secKey === "sec-9" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment") || sec.sectionTitle?.includes("Communication");
      const maxScore = isSec8Or9 ? 10 : 5;
      const passThreshold = isSec8Or9 ? 7 : 4;
      const score = Number(cp.score !== undefined && cp.score !== null ? cp.score : (cp.status === "Pass" ? maxScore : 0));
      const isFailed = cp.status === "Fail" || score < passThreshold;

      if (isFailed || (score < maxScore && cp.notes)) {
        const cpKey = cp.id;
        const cpMeta = (secDict.checkpoints && secDict.checkpoints[cpKey]) || {};
        const arabicName = cpMeta.name || cp.name;
        const correctiveGuide = cpMeta.guide || "مراجعة إجراءات التركيب القياسية والالتزام بدليل الجودة المعتمد.";

        weakPoints.push({
          sectionTitleAr: secDict.title || sec.sectionTitle,
          checkpointId: cpKey,
          checkpointNameAr: arabicName,
          score,
          maxScore,
          status: cp.status || (score >= passThreshold ? "Pass" : "Fail"),
          notes: cp.notes || "لم يتم تسجيل ملاحظة محددة من المقيم، يرجى الالتزام بالمعيار الموضح.",
          correctiveGuide,
          severity: score === 0 || cp.status === "Fail" ? "حرجة (Critical)" : "متوسطة (Moderate)",
        });
      }
    });
  });

  return weakPoints;
};

// =========================================================================
// 3. HIGH-RESOLUTION ARABIC HTML TEMPLATE BUILDER
// =========================================================================

export const buildArabicLabAssessmentHtml = (assessment) => {
  const teamName = assessment.fieldTeam?.teamName || assessment.teamName || "غير محدد";
  const teamCompany = assessment.fieldTeam?.company || assessment.company || "Reach Quality";
  const assessmentDate = assessment.assessmentDate || assessment.createdAt || new Date();
  const formattedDate = format(new Date(assessmentDate), "yyyy/MM/dd");
  const conductedBy = assessment.conductedBy || "مشرف الجودة الميداني";
  const totalScore = Math.round(Number(assessment.totalScore || assessment.overallScore || 0));
  const isPass = totalScore >= 75; // Passing grade threshold

  const weakPoints = extractWeakPoints(assessment);
  const sections = normalizeExportSections(assessment?.sections);

  // Equipment stats
  const eqList = assessment.equipmentChecklist || [];
  const eqValidCount = eqList.filter((e) => e.status === "Valid/Available" || e.status === "Pass" || e.status === "Valid").length;
  const eqTotalCount = eqList.length;
  const eqPercentage = eqTotalCount > 0 ? Math.round((eqValidCount / eqTotalCount) * 100) : 100;
  const defectiveTools = eqList.filter((e) => e.status !== "Valid/Available" && e.status !== "Pass" && e.status !== "Valid");

  // Certifications
  const certs = assessment.certifications || {};

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير التقييم العملي للفني الميداني - ${teamName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap');

    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
    }

    /* HEADER BANNER */
    .header-container {
      border-bottom: 3px solid #1a365d;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #1a365d;
      margin: 0 0 4px 0;
    }

    .brand-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      margin: 0;
    }

    .report-badge {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 14px;
      text-align: center;
    }

    .report-badge .code {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      display: block;
    }

    .report-badge .date {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    /* INFO GRID */
    .meta-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
    }

    .meta-value {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }

    /* KPI SCORE HERO */
    .score-hero {
      background: ${isPass ? "linear-gradient(135deg, #065f46 0%, #047857 100%)" : "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)"};
      color: #ffffff;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .score-hero .left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .score-hero .title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.2px;
    }

    .score-hero .desc {
      font-size: 12px;
      opacity: 0.9;
    }

    .score-hero .score-display {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 8px 18px;
      border-radius: 10px;
    }

    .score-num {
      font-size: 28px;
      font-weight: 900;
      line-height: 1;
    }

    .score-status-badge {
      background-color: #ffffff;
      color: ${isPass ? "#065f46" : "#991b1b"};
      font-weight: 900;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
    }

    /* WEAK POINTS SPOTLIGHT SECTION */
    .weak-points-container {
      border: 2px solid #ef4444;
      background-color: #fef2f2;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 22px;
      page-break-inside: avoid;
    }

    .weak-points-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #fecaca;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .weak-points-title {
      font-size: 15px;
      font-weight: 900;
      color: #991b1b;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    .weak-count-badge {
      background-color: #dc2626;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 10px;
      border-radius: 9999px;
    }

    .weak-item-card {
      background-color: #ffffff;
      border: 1px solid #fca5a5;
      border-right: 5px solid #dc2626;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }

    .weak-item-card:last-child {
      margin-bottom: 0;
    }

    .weak-card-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .weak-item-name {
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
    }

    .weak-item-score {
      font-size: 12px;
      font-weight: 800;
      color: #dc2626;
      background: #fee2e2;
      padding: 1px 8px;
      border-radius: 4px;
    }

    .weak-notes-box {
      background-color: #fff1f2;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      color: #881337;
      margin-top: 6px;
      font-weight: 600;
    }

    .weak-guide-box {
      background-color: #f0fdf4;
      border: 1px dashed #86efac;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      color: #166534;
      margin-top: 6px;
      font-weight: 700;
    }

    /* SECTION TITLE */
    .section-header {
      font-size: 14px;
      font-weight: 800;
      color: #1e3a8a;
      background-color: #eff6ff;
      border-right: 4px solid #2563eb;
      padding: 6px 12px;
      margin: 16px 0 8px 0;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-after: avoid;
    }

    /* TABLES */
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 12px;
    }

    table.report-table th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 800;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }

    table.report-table td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    table.report-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .badge-pass {
      background-color: #dcfce7;
      color: #15803d;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: inline-block;
    }

    .badge-fail {
      background-color: #fee2e2;
      color: #b91c1c;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: inline-block;
    }

    .badge-na {
      background-color: #f1f5f9;
      color: #64748b;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: inline-block;
    }

    /* CERTIFICATIONS & TOOLS GRID */
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .card-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      background: #ffffff;
    }

    .card-box-title {
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .cert-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px dashed #f1f5f9;
      font-size: 11.5px;
    }

    .cert-item:last-child {
      border-bottom: none;
    }

    /* FEEDBACK CARD */
    .feedback-card {
      background-color: #faf5ff;
      border: 1.5px dashed #c084fc;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 14px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .feedback-title {
      font-size: 13px;
      font-weight: 800;
      color: #7e22ce;
      margin-bottom: 6px;
    }

    .feedback-content {
      font-size: 12px;
      color: #3b0764;
      white-space: pre-wrap;
      line-height: 1.6;
    }

    /* SIGNATURE FOOTER */
    .signature-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      page-break-inside: avoid;
    }

    .signature-box {
      text-align: center;
    }

    .sig-title {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 35px;
    }

    .sig-line {
      border-bottom: 1.5px solid #94a3b8;
      width: 70%;
      margin: 0 auto 6px auto;
    }

    .sig-name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }

    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 20px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-container">
    <div>
      <h1 class="brand-title">تقرير التقييم العملي للفني الميداني (FTTH Lab Assessment)</h1>
      <p class="brand-subtitle">عمليات الجودة وضبط الأداء الميداني • نوكيا & ريتش للاتصالات</p>
    </div>
    <div class="report-badge">
      <span class="code">رقم التقرير الفني</span>
      <span class="date">${formattedDate}</span>
    </div>
  </div>

  <!-- METADATA GRID -->
  <div class="meta-card">
    <div class="meta-item">
      <span class="meta-label">اسم الفني / الفريق</span>
      <span class="meta-value">${teamName}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">الشركة التابع لها</span>
      <span class="meta-value">${teamCompany}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">المُقيّم المسؤول</span>
      <span class="meta-value">${conductedBy}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">تاريخ الاختبار</span>
      <span class="meta-value">${formattedDate}</span>
    </div>
  </div>

  <!-- HERO SCORE -->
  <div class="score-hero">
    <div class="left">
      <div class="title">نتيجة التقييم الفني الشامل في المختبر</div>
      <div class="desc">تم تقييم الفني في بيئة مختبرية محاكاة لجميع مراحل التركيب من كبينة الـ FDB حتى منزل العميل</div>
    </div>
    <div class="score-display">
      <div class="score-num">${totalScore}%</div>
      <div class="score-status-badge">${isPass ? "معتمد (PASSED)" : "يحتاج تحسين (NEEDS WORK)"}</div>
    </div>
  </div>

  <!-- SPOTLIGHT: WEAK POINTS & CORRECTIVE GUIDANCE -->
  <div class="weak-points-container">
    <div class="weak-points-header">
      <h2 class="weak-points-title">
        <span>⚠️</span>
        نقاط الضعف والملاحظات التي تتطلب تركيزاً وتحسيناً عاجلاً
      </h2>
      <span class="weak-count-badge">${weakPoints.length} معايير بحاجة لمعالجة</span>
    </div>

    ${
      weakPoints.length === 0
        ? `
      <div style="text-align: center; padding: 12px; color: #166534; font-weight: 700; font-size: 13px;">
        🌟 أداء متميز ومثالي! لم يتم تسجيل أي نقاط ضعف حرجة أثناء الاختبار العملي.
      </div>
    `
        : weakPoints
            .map(
              (wp, idx) => `
      <div class="weak-item-card">
        <div class="weak-card-top">
          <span class="weak-item-name">${idx + 1}. [${wp.sectionTitleAr}] – ${wp.checkpointNameAr}</span>
          <span class="weak-item-score">الدرجة: ${wp.score} / ${wp.maxScore}</span>
        </div>
        ${
          wp.notes && wp.notes !== "None"
            ? `
          <div class="weak-notes-box">
            📌 <strong>ملاحظة المقيم أثناء الفحص:</strong> ${wp.notes}
          </div>
        `
            : ""
        }
        <div class="weak-guide-box">
          💡 <strong>التوجيه الفني لتفادي الخطأ ميدانياً:</strong> ${wp.correctiveGuide}
        </div>
      </div>
    `
            )
            .join("")
    }
  </div>

  <!-- 2-COLUMN: CERTIFICATES & TOOLS READINESS -->
  <div class="grid-2col">
    <!-- Safety Certifications -->
    <div class="card-box">
      <div class="card-box-title">
        <span>🦺 شهادات السلامة المهنية المعتمدة</span>
      </div>
      <div>
        ${Object.keys(ARABIC_CERTIFICATES_MAP)
          .map((key) => {
            const cert = ARABIC_CERTIFICATES_MAP[key];
            const isCert = !!certs[key];
            return `
            <div class="cert-item">
              <span style="font-weight: 600; color: #334155;">[${cert.code}] ${cert.title}</span>
              <span class="${isCert ? "badge-pass" : "badge-fail"}">
                ${isCert ? "معتمد ✓" : "غير متوفر ✗"}
              </span>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>

    <!-- Equipment Readiness -->
    <div class="card-box">
      <div class="card-box-title">
        <span>🛠️ جاهزية الأدوات ومعدات العمل (${eqPercentage}%)</span>
        <span class="${eqPercentage >= 90 ? "badge-pass" : "badge-fail"}">
          ${eqValidCount}/${eqTotalCount} أدوات
        </span>
      </div>
      <div>
        ${
          defectiveTools.length === 0
            ? `
          <div style="font-size: 11.5px; color: #166534; padding: 6px 0; font-weight: 700;">
            ✓ جميع الأدوات والمعدات المطلوبة متوفرة وسليمة 100%.
          </div>
        `
            : defectiveTools
                .map((tool) => {
                  const arName = ARABIC_EQUIPMENT_MAP[tool.toolName] || tool.toolName;
                  return `
              <div class="cert-item">
                <span style="font-weight: 700; color: #dc2626;">${arName}</span>
                <span class="badge-fail">${tool.status === "Missing" ? "مفقود" : "تالف / غير صالح"}</span>
              </div>
            `;
                })
                .join("")
        }
      </div>
    </div>
  </div>

  <!-- DETAILED STAGES BREAKDOWN -->
  <h3 style="font-size: 15px; font-weight: 900; color: #1e3a8a; margin: 20px 0 10px 0;">
    📋 تفاصيل تقييم جميع مراحل العمل الـ 9
  </h3>

  ${sections
    .map((sec, sIdx) => {
      const secKey = sec.sectionId || `sec-${sIdx + 1}`;
      const secDict = ARABIC_LAB_SECTIONS_MAP[secKey] || {};
      const secTitleAr = secDict.title || sec.sectionTitle;
      const checkpoints = sec.checkpoints || [];

      return `
      <div style="page-break-inside: avoid; margin-bottom: 16px;">
        <div class="section-header">
          <span>${secTitleAr}</span>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50%;">معيار التقييم الفني</th>
              <th style="width: 12%; text-align: center;">الحالة</th>
              <th style="width: 12%; text-align: center;">الدرجة</th>
              <th style="width: 26%;">ملاحظات المُقيّم</th>
            </tr>
          </thead>
          <tbody>
            ${checkpoints
              .map((cp) => {
                const cpMeta = (secDict.checkpoints && secDict.checkpoints[cp.id]) || {};
                const nameAr = cpMeta.name || cp.name;
                const isSec8Or9 = secKey === "sec-8" || secKey === "sec-9" || sec.sectionTitle?.includes("Photo") || sec.sectionTitle?.includes("Self-Assessment") || sec.sectionTitle?.includes("Communication");
                const maxCpScore = isSec8Or9 ? 10 : 5;
                const score = cp.score !== undefined && cp.score !== null ? cp.score : (cp.status === "Pass" ? maxCpScore : 0);
                const status = cp.status || (score >= (isSec8Or9 ? 7 : 4) ? "Pass" : "Fail");

                return `
                <tr>
                  <td style="font-weight: 600; color: #1e293b;">${nameAr}</td>
                  <td style="text-align: center;">
                    <span class="${status === "Pass" ? "badge-pass" : status === "Fail" ? "badge-fail" : "badge-na"}">
                      ${status === "Pass" ? "ناجح" : status === "Fail" ? "راسب" : "N/A"}
                    </span>
                  </td>
                  <td style="text-align: center; font-weight: 800; color: ${score === maxCpScore ? "#15803d" : "#b91c1c"};">
                    ${score} / ${maxCpScore}
                  </td>
                  <td style="color: ${cp.notes ? "#0f172a" : "#94a3b8"}; font-size: 11.5px;">
                    ${cp.notes || "لا توجد ملاحظات"}
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    })
    .join("")}

  <!-- ASSESSOR COMPREHENSIVE FEEDBACK -->
  ${
    assessment.feedback || assessment.comments
      ? `
    <div class="feedback-card">
      <div class="feedback-title">📝 ملاحظات وتوصيات المقيم العامة لخطة التطوير:</div>
      <div class="feedback-content">${assessment.feedback || assessment.comments}</div>
    </div>
  `
      : ""
  }

  <!-- SIGNATURES -->
  <div class="signature-container">
    <div class="signature-box">
      <div class="sig-title">توقيع واعتماد مشرف الجودة / المُقيّم</div>
      <div class="sig-line"></div>
      <div class="sig-name">${conductedBy}</div>
    </div>
    <div class="signature-box">
      <div class="sig-title">إقرار وتوقيع الفني الميداني بالاطلاع على الملاحظات</div>
      <div class="sig-line"></div>
      <div class="sig-name">${teamName}</div>
    </div>
  </div>

  <div class="footer-note">
    تم استخراج هذا التقرير آلياً عبر منصة Nokia Quality B2B Platform • جميع الحقوق محفوظة لعمليات الجودة
  </div>

</body>
</html>
  `.trim();
};

// =========================================================================
// 4. PDF EXPORT HANDLER (BACKEND PUPPETEER + CLIENT PRINT FALLBACK)
// =========================================================================

export const exportArabicLabAssessmentPDF = async (assessment) => {
  const teamName = assessment.fieldTeam?.teamName || assessment.teamName || "Technician";
  const safeTeamName = teamName.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
  const fileName = `تقرير_تقييم_فني_${safeTeamName}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

  const toastId = toast.loading("جاري إنشاء التقرير الفني بالعربية بصيغة PDF...");

  try {
    const htmlContent = buildArabicLabAssessmentHtml(assessment);

    // Call backend puppeteer / html-pdf-node engine
    const response = await api.post(
      "/ai/report/download",
      {
        customHtml: htmlContent,
        format: "pdf",
        title: `تقرير التقييم العملي في المختبر - ${teamName}`,
      },
      {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );

    const blob = new Blob([response.data], { type: "application/pdf" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    toast.success("تم تصدير تقرير التقييم الفني بالعربية بنجاح!", { id: toastId });
  } catch (error) {
    console.error("Backend PDF generation failed, switching to high-fidelity browser print fallback:", error);

    // Fallback: Open formatted Arabic print window
    try {
      const htmlContent = buildArabicLabAssessmentHtml(assessment);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        toast.info("تم فتح التقرير العربي للطباعة وحفظه كـ PDF", { id: toastId });
      } else {
        toast.error("تعذر إنشاء ملف PDF، يرجى السماح بالنوافذ المنبثقة", { id: toastId });
      }
    } catch (fallbackErr) {
      console.error("Print fallback error:", fallbackErr);
      toast.error("فشل إنشاء تقرير PDF العربي", { id: toastId });
    }
  }
};
