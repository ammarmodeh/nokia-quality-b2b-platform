import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("Error: GEMINI_API_KEY not found in .env");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log("Checking models with key ending in...", key.slice(-4));

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error("API Error:", JSON.stringify(data.error, null, 2));
    } else {
      console.log("Available Models:");
      if (data.models) {
        data.models.forEach(m => {
          if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
            console.log(`- ${m.name}`);
          }
        });
      } else {
        console.log("No models found in response:", data);
      }
    }
  })
  .catch(err => console.error("Fetch Error:", err));
