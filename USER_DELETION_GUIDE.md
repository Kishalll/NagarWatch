# User Deletion - Known Limitation

## The Problem
When you delete a user from the Admin Dashboard in NagarWatch, it only removes their data from **Firestore** (the database), but their **Firebase Authentication** account remains active. This causes an "email-already-in-use" error if you try to register again with the same email.

## Why This Happens
Firebase has two separate systems:
1. **Firestore** - stores user data (name, username, role, status, etc.)
2. **Firebase Authentication** - stores login credentials (email/password)

For security reasons, Firebase doesn't allow client-side code to delete other users' authentication accounts. This requires server-side code (Cloud Functions) with admin privileges.

## Workaround (Manual Deletion)

Until Cloud Functions are set up, you'll need to manually delete users from the Firebase Console:

### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (**nagar-watch**)
3. Click **Authentication** in the left sidebar
4. Click the **Users** tab
5. Find the user by their email address
6. Click the **⋮** (three dots) menu on the right
7. Click **Delete account**
8. Confirm the deletion

Now you can register again with that email address!

## Proper Solution (Cloud Functions)

To automate this process, you need to:

1. **Upgrade to Blaze Plan**: Cloud Functions v2 requires the Firebase Blaze (pay-as-you-go) plan
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to **Upgrade** and switch to the Blaze plan
   - Don't worry - it has a generous free tier and you'll likely stay within it

2. **Deploy Cloud Functions**: Once on the Blaze plan, run:
   ```bash
   firebase deploy --only functions
   ```

3. **Automatic Deletion**: After deployment, when you delete a user from the Admin Dashboard, they'll be automatically removed from both Firestore AND Firebase Authentication!

## Cost Information
Firebase Blaze plan includes:
- **Free tier**: 2 million function invocations/month
- **Free tier**: 400,000 GB-seconds/month
- You only pay if you exceed these limits

For a small community app like NagarWatch, you'll likely stay within the free tier.

## Alternative: Keep Current Setup
If you don't want to upgrade to Blaze plan, you can:
- Continue using the manual deletion process above
- It only takes a few seconds per user
- Suitable for small-scale community management

---

**Note**: The Cloud Functions code is already written and ready in `functions/index.js`. You just need to upgrade to the Blaze plan and deploy!
