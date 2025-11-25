const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

/**
 * Cloud Function to delete a user from Firebase Authentication
 * This is triggered when a user document is deleted from Firestore
 */
exports.deleteUserAuth = onDocumentDeleted("users/{userId}", async (event) => {
    const userId = event.params.userId;

    try {
        // Delete the user from Firebase Authentication
        await getAuth().deleteUser(userId);
        console.log(`Successfully deleted user ${userId} from Authentication`);
        return null;
    } catch (error) {
        console.error(`Error deleting user ${userId} from Authentication:`, error);
        // Don't throw error - the Firestore doc is already deleted
        return null;
    }
});

/**
 * Callable function to delete a user (alternative approach)
 * Call this from the client: deleteUser({ userId: 'xxx' })
 */
exports.deleteUser = onCall(async (request) => {
    // Check if the caller is an admin
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new HttpsError(
            "permission-denied",
            "Only admins can delete users",
        );
    }

    const userId = request.data.userId;

    try {
        // Delete from Authentication
        await getAuth().deleteUser(userId);

        // Delete from Firestore
        await getFirestore().collection("users").doc(userId).delete();

        // Also delete any houses associated with this user
        const housesSnapshot = await getFirestore()
            .collection("houses")
            .where("userId", "==", userId)
            .get();

        const deletePromises = housesSnapshot.docs.map((doc) => doc.ref.delete());
        await Promise.all(deletePromises);

        return { success: true, message: "User deleted successfully" };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new HttpsError("internal", error.message);
    }
});
