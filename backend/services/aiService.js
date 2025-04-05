import OpenAI from 'openai';
const openai = new OpenAI({
  apiKey: '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',
});

export const generateAIText = async (taskDetails) => {
  const prompt = `Generate an email summary for the following task details:\n\nTitle: ${taskDetails.title}\nPriority: ${taskDetails.priority}\nStatus: ${taskDetails.status}\nDepartment: ${taskDetails.department}\nDue Date: ${taskDetails.formattedDate}\nRemaining Time: ${taskDetails.remainingTime}\nCategory: ${taskDetails.category}\nAssigned To: ${taskDetails.assignedUsers.join(", ")}\nProgress: ${taskDetails.progress}%\nSubtasks:\n${taskDetails.subtasks.map((subtask, index) => `  ${index + 1}. ${subtask.title}\n    - Note: ${subtask.note}`).join("\n")}\nCreated By: ${taskDetails.creator}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use the appropriate model name
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI text:', error);
    throw error;
  }
};