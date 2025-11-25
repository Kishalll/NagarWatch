# Setting Up Cloud Functions for User Deletion

## Why Cloud Functions?
Firebase doesn't allow client-side code to delete other users' authentication accounts for security reasons. We need server-side code (Cloud Functions) to handle this.

## Setup Steps

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Cloud Functions
```bash
firebase init functions
```
- Select your existing Firebase project
- Choose JavaScript
- Do NOT overwrite existing files
- Install dependencies with npm

### 4. Deploy the Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 5. Update Firestore Security Rules
Add this rule to allow Cloud Functions to delete users:
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow delete: if request.auth.token.role == 'admin';
    }
  }
}
```

## How It Works

### Option 1: Automatic (Recommended)
When you delete a user document from Firestore, the `deleteUserAuth` function automatically triggers and deletes the user from Firebase Authentication.

**No code changes needed** - it works with your existing delete button!

### Option 2: Manual Call (Alternative)
If you want more control, you can call the `deleteUser` function directly from your Dashboard:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const deleteUserFunction = httpsCallable(functions, 'deleteUser');

const handleUserAction = async (action, userId) => {
    if (action === 'delete') {
        if (window.confirm('Remove this user?')) {
            try {
                await deleteUserFunction({ userId });
                console.log('User deleted successfully');
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Failed to delete user: ' + error.message);
            }
        }
    }
};
```

## Testing

1. Deploy the functions
2. Try deleting a user from the admin dashboard
3. Try registering again with the same email - it should work now!

## Cost
Cloud Functions have a free tier:
- 2 million invocations/month
- 400,000 GB-seconds/month

For a small community app, you'll likely stay within the free tier.
