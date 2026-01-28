# 🚀 Quick Setup Guide - AI Integration

## Step 1: Get OpenAI API Key (5 minutes)

1. Go to https://platform.openai.com
2. Sign up or log in
3. Click on your profile (top right) → "API keys"
4. Click "Create new secret key"
5. Copy the key (starts with `sk-proj-...`)

**Note:** New accounts get $5 free credit!

## Step 2: Configure Environment (2 minutes)

Create `.env.local` file in the project root:

```bash
# Copy the example file
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI key:

```env
OPENAI_API_KEY=sk-proj-your-key-here
NEXTAUTH_SECRET=any-random-string-here
NEXTAUTH_URL=http://localhost:3000
```

## Step 3: Install Dependencies (1 minute)

```bash
npm install
```

## Step 4: Run the App (1 minute)

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Test AI Features

1. Navigate to any course → Start a lesson
2. Click the floating AI button (bottom right)
3. Ask a coding question
4. Watch the Socratic tutor respond!

---

## 🎯 What's New?

### ✨ AI Chatbot Features

**Socratic Teaching Mode:**
- Won't give direct answers
- Asks guiding questions
- Helps you think critically
- Knows your current code context

**Rate Limiting:**
- 10 queries per hour (demo)
- Resets every hour
- Counter shown in chat header

**Smart Context:**
- Sees the code you're working on
- Gives relevant hints
- Understands your lesson

### 🤖 How to Use

**Example Conversation:**

You: "Why is my loop not working?"

AI: "Good question! What do you expect the value of `i` to be when the loop ends? What is it actually?"

You: "It should be 10 but it's 11"

AI: "Excellent observation! Look at your loop condition. What happens when `i` equals 10?"

You: "Oh! I see, I should use `i < 10` instead of `i <= 10`"

AI: "Perfect! You've got it! 🎉"

---

## 🐛 Troubleshooting

### "Rate limit exceeded" error
- You've used all 10 queries this hour
- Wait for the timer to reset
- Or upgrade the limit in `app/api/ai/chat/route.ts`

### "Failed to get AI response"
- Check your OpenAI API key is correct
- Verify you have credit left at https://platform.openai.com/usage
- Check console for error details

### AI button not showing
- Make sure you're on a lesson page
- Check browser console for errors
- Try refreshing the page

---

## 💰 Cost Estimation

**GPT-4o-mini pricing:**
- ~$0.0001 per query (very cheap!)
- 10,000 queries = $1
- Perfect for demos and testing

**Free tier includes:**
- $5 credit for 3 months
- ~50,000 AI queries
- More than enough for development

---

## 🎨 Customization

### Change Rate Limit

Edit `app/api/ai/chat/route.ts`:

```typescript
// Change from 10 to 50 queries per hour
if (userLimit.count >= 50) { // Changed from 10
  // ...
}
```

### Modify AI Personality

Edit the system prompt in `app/api/ai/chat/route.ts`:

```typescript
const systemPrompt = `You are a friendly coding mentor...`
```

### Change Chat Position

Edit `app/components/AIChatbot.tsx`:

```typescript
// Move to left side
className="fixed bottom-4 left-4 ..." // Changed from right-4
```

---

## 📚 Next Steps

After AI is working:

1. **Add to More Pages**
   - Problem submission pages
   - Contest pages
   - Practice playground

2. **Enhance Features**
   - Save conversation history
   - Code completion
   - Test case generation

3. **Database Integration**
   - Store conversations
   - Track AI usage
   - Analytics dashboard

---

## 🎉 You're All Set!

The AI tutor is now integrated. Try it out and see how students learn better with Socratic guidance!

**Need help?** Check the main documentation or open an issue.
