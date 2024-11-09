// addConversationToGameThread.js
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { listThreadmessages } from './list-thread-messages.js';

dotenv.config({ path: '../.env' });


const conversation = [
    "Detective: Mr. Carter, thanks for coming in. Let’s cut to the chase—your office was broken into last night, and the security system was conveniently deactivated at the time. Care to explain?",
    "Alex Carter: Detective, I’m as shocked as anyone. The security system isn’t supposed to go offline under any circumstances. We have redundancies in place.",
    "Detective: Yet it did. You’re the head of security—surely you’d know how that could happen?",
    "Alex Carter: The system was temporarily disabled for maintenance, but it was supposed to be reactivated before the break-in. I’ve already reviewed our logs. There was a scheduled maintenance window last night.",
    "Detective: Scheduled maintenance during office hours? Odd timing, don’t you think?",
    "Alex Carter: Not office hours, Detective. It was late—after 10 PM, when the office is typically empty. We chose that time to minimize disruption. Maintenance like this happens regularly.",
    "Detective: Who authorized the maintenance?",
    "Alex Carter: I did, but I had no reason to suspect it would be a problem. The technician assigned was our most trusted contractor. I’ve worked with him for years.",
    "Detective: Did anyone else know the system would be down?",
    "Alex Carter: The maintenance schedule is confidential, shared only with my team and upper management. It’s not public knowledge.",
    "Detective: And yet, someone knew exactly when to strike. The break-in happened within minutes of the system going down. Sounds like an inside job to me.",
    "Alex Carter: That’s what I’m worried about too. I’m already conducting an internal review. We have badge access logs and camera footage up until the system went offline. I’ve handed everything over to your team.",
    "Detective: We’ll take a closer look. In the meantime, let’s talk about the stolen items. How many people knew about the devices and documents in that office?",
    "Alex Carter: Only a select few. Those documents were in a locked cabinet in the executive suite. The stolen devices are tracked through asset tags, and I’ve initiated remote lock protocols.",
    "Detective: Good. Now, tell me more about your team. Anyone acting suspicious recently?",
    "Alex Carter: No one stands out. But we’ve had a few new hires in the past month. I’ll get you their details. It’s possible someone got too curious.",
    "Detective: Do that. Also, who else could deactivate the security system besides you?",
    "Alex Carter: Myself, the COO, and the on-call technician. But all changes require dual authorization. Someone must’ve either forged access or gotten help.",
    "Detective: Interesting. Alright, Mr. Carter. That’s all for now, but stay close. We’ll need your cooperation as we dig deeper.",
    "Alex Carter: Of course, Detective. I’ll do everything I can to help catch whoever did this.",
    "Detective: Let’s hope so. Because right now, all eyes are on you."
  ];
  

async function populateGameThread() {
  // iterate through the conversation array and add each message to the game thread using the OpenaiGameService and thread id passed in as arguments
    const threadId = process.argv.slice(2)[0];
    const client = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });

    for (const message of conversation) {
        
        await client.beta.threads.messages.create(
            threadId,
            {
              role: message.startsWith("Detective") ? "assistant" : "user",
              content: message,
            }
          );
    }



}

await populateGameThread();
await listThreadmessages(process.argv.slice(2)[0]);