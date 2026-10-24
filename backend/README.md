# Chat Backend API — Simple Beginner & Interview Guide

A direct 1-on-1 Chat Backend built using **Node.js**, **Express**, **TypeScript**, **MongoDB**, and **Firebase Firestore**.

---

## 💡 Quick Overview: How It Works

- **MongoDB** stores:
  - **Users** (name, email, password)
  - **Chats** (who is talking to whom, and when they last chatted)
- **Firebase Firestore** stores:
  - **Messages** (the actual text messages and timestamps)
  - **Read Receipts** (who read which message and when)
  - **Last Seen** (the latest message a user has seen in a chat)

> **Important Rule:** Message text is **never** saved in MongoDB. It is always saved in Firebase Firestore.

---

## 📁 Simple Folder Structure

```text
backend/src/
├── config/
│   ├── db.ts               # Connects to MongoDB
│   ├── firebase.ts         # Connects to Firebase Firestore
│   └── env.ts              # Loads environment settings (.env)
├── models/
│   ├── User.model.ts       # MongoDB User model
│   └── Chat.model.ts       # MongoDB Chat model
├── controllers/
│   ├── auth.controller.ts  # Handles register and login
│   ├── chat.controller.ts  # Handles chat creation and chat list
│   └── message.controller.ts # Handles messages, read receipts, and last seen
├── services/
│   ├── auth.service.ts     # Business logic for passwords and JWT tokens
│   ├── chat.service.ts     # Business logic for chats and member checks
│   └── message.service.ts  # Firestore operations for messages
├── routes/
│   └── index.ts            # ALL API routes in one single file
├── middleware/
│   └── index.ts            # Auth, validation, and error handler in one single file
├── helpers/
│   └── index.ts            # Response helpers and async handler in one single file
├── validations/
│   ├── auth.validation.ts  # Checks register and login input
│   ├── chat.validation.ts  # Checks chat input
│   └── message.validation.ts # Checks message input
├── types/
│   └── index.ts            # TypeScript definitions
├── app.ts                  # Express application setup
└── server.ts               # Starts the server
```

---

## 🚀 How to Run the Project

### 1. Install packages
Open your terminal in the `backend` folder and run:
```bash
cd backend
npm install
```

### 2. Configure `.env`
Create a `.env` file in `backend/`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/chat_app
JWT_SECRET=super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

*(Place your Firebase `serviceAccountKey.json` inside the `backend/` folder).*

### 3. Start the server
```bash
npm run dev
```
The server will start at: `http://localhost:5000`

---

## 🧪 Step-by-Step API Testing Guide (Simple English)

Follow these **9 easy steps** in order. You can copy and paste each command into your terminal to test the API or show it in an interview.

---

### Step 1: Create User 1 (Alice)
We create our first user, Alice.

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "password123"
  }'
```
- **What happens:** Alice is saved in MongoDB.
- **Copy from response:** Save Alice's `_id` (we will call this `ALICE_ID`) and her `token` (`ALICE_TOKEN`).

---

### Step 2: Create User 2 (Bob)
We create our second user, Bob.

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob",
    "email": "bob@example.com",
    "password": "password123"
  }'
```
- **What happens:** Bob is saved in MongoDB.
- **Copy from response:** Save Bob's `_id` (`BOB_ID`) and his `token` (`BOB_TOKEN`).

---

### Step 3: Login as Alice to get a fresh Token
If you ever need a new token, simply login:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'
```

---

### Step 4: Start a Chat between Alice and Bob (API 1)
Alice starts a 1-on-1 chat with Bob.

```bash
curl -X POST http://localhost:5000/api/v1/chat/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ALICE_TOKEN>" \
  -d '{
    "userAId": "<ALICE_ID>",
    "userBId": "<BOB_ID>"
  }'
```
- **What happens:** A new chat is created in MongoDB.
- **Copy from response:** Save the `chatId`.
- **Interview Rule:**
  - If you run this command again, it will **NOT** create a duplicate chat. It will return the existing `chatId`.
  - Alice cannot chat with herself (`userAId` and `userBId` cannot be the same).

---

### Step 5: Alice Sends a Message to Bob (API 2)
Alice sends her first message to Bob.

```bash
curl -X POST http://localhost:5000/api/v1/chat/<CHAT_ID>/message/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ALICE_TOKEN>" \
  -d '{
    "text": "Hi Bob! How are you doing?"
  }'
```
- **What happens:**
  - The message is saved directly in **Firebase Firestore** with a server timestamp.
  - The chat in MongoDB is updated with the last activity time.
- **Copy from response:** Save the message `id` (`MESSAGE_ID`).

---

### Step 6: Bob Reads the Chat Messages (API 3)
Bob opens the chat and loads the messages.

```bash
curl -X GET "http://localhost:5000/api/v1/chat/<CHAT_ID>/messages?limit=10" \
  -H "Authorization: Bearer <BOB_TOKEN>"
```
- **What happens:**
  - Returns messages ordered with the newest message first.
  - Returns `nextCursor` if there are more messages to load.
- **Interview Rule:** A stranger who is not part of this chat cannot read these messages (returns `403 Forbidden`).

---

### Step 7: Bob Marks the Message as Read (API 4)
Bob sends a read receipt for Alice's message.

```bash
curl -X POST http://localhost:5000/api/v1/chat/<CHAT_ID>/message/<MESSAGE_ID>/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <BOB_TOKEN>" \
  -d '{
    "userId": "<BOB_ID>"
  }'
```
- **What happens:** A read receipt is stored in Firestore under:
  `chats/<chatId>/messages/<messageId>/readReceipts/<userId>`
- **Interview Rules:**
  - **Idempotency:** If Bob calls this 5 times, the original `readAt` time **never changes**.
  - **Self-read Block:** Alice cannot mark her own message as read.

---

### Step 8: Bob Updates His "Last Seen" Progress (API 5)
Bob updates his reading progress up to this message.

```bash
curl -X POST http://localhost:5000/api/v1/chat/<CHAT_ID>/lastseen \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <BOB_TOKEN>" \
  -d '{
    "userId": "<BOB_ID>",
    "messageId": "<MESSAGE_ID>"
  }'
```
- **What happens:** Saved in Firestore under:
  `chats/<chatId>/lastSeen/<userId>`
- **Interview Rule:**
  - **Cannot move backwards:** If Bob has seen Message #5, he cannot move his last-seen back to Message #2. The API checks the message timestamps and blocks backward movement.

---

### Step 9: Bob Sees All His Active Chats (API 6)
Bob views his inbox/chats list.

```bash
curl -X GET http://localhost:5000/api/v1/user/<BOB_ID>/chats \
  -H "Authorization: Bearer <BOB_TOKEN>"
```
- **What happens:** Returns all chats where Bob is a participant, sorted by the most recent message.

---

## 🎯 Summary of Key Rules for Your Interview

When the interviewer asks questions, here are the simple answers:

| Question | Simple Answer |
| :--- | :--- |
| **Why use both MongoDB and Firestore?** | MongoDB is great for structured relationships (Users and Chat memberships). Firestore is great for high-speed, real-time message streams, read receipts, and timestamps. |
| **How do you stop duplicate direct chats?** | We sort the two user IDs alphabetically (e.g. `user1_user2`) and save it in a field called `participantKey` with a **unique index** in MongoDB. |
| **Can users read someone else's chat?** | No. Every API checks if the logged-in user's ID is in the chat's `participants` list. If not, it returns `403 Forbidden`. |
| **Can last-seen go backwards?** | No. We check the Firestore creation time of the target message. If it is older than the current last-seen message, it is rejected. |
| **Is the code clean and organized?** | Yes. All routes are in one file ([routes/index.ts](file:///d:/Node_Task/backend/src/routes/index.ts)), all middlewares are in one file ([middleware/index.ts](file:///d:/Node_Task/backend/src/middleware/index.ts)), and all helpers are in one file ([helpers/index.ts](file:///d:/Node_Task/backend/src/helpers/index.ts)). |
