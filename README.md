# NagarWatch 🏘️

**NagarWatch** is a modern, interactive community management dashboard designed to streamline operations for gated communities and residential associations. It provides a visual map-based interface for managing houses, tracking occupancy, organizing events, and maintaining meeting records.

![NagarWatch Dashboard](https://via.placeholder.com/800x400?text=NagarWatch+Dashboard+Preview)

## 🚀 Features

### 🗺️ Interactive Community Map
- **Visual House Management:** View the entire community layout on an interactive map.
- **Status Tracking:** Color-coded markers indicate house status (Occupied, For Rent, For Sale, Away).
- **Dynamic Registration:** Residents can register their house location directly on the map.

### 👥 Role-Based Access
- **Admin:** Full control to approve users, manage house details, create events, and record meetings.
- **Resident:** View community updates, register their own house, and participate in meeting discussions.
- **Association:** Special access for committee members (configurable).

### 📅 Community Management
- **Events:** Schedule and display community events with dates, times, and locations.
- **Meetings:** Record meeting minutes and allow residents to add discussion notes.
- **User Approvals:** Secure verification system where Admins approve new resident registrations.

## 🛠️ Tech Stack

- **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Database:** [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Maps:** [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Icons:** [Lucide React](https://lucide.dev/)

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16 or higher)
- A Firebase project with Authentication and Firestore enabled.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/nagar-watch.git
    cd nagar-watch
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    - Create a file named `firebase.js` in `src/config/`.
    - Add your Firebase configuration keys:
      ```javascript
      // src/config/firebase.js
      import { initializeApp } from "firebase/app";
      import { getAuth } from "firebase/auth";
      import { getFirestore } from "firebase/firestore";

      const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
      };

      const app = initializeApp(firebaseConfig);
      export const auth = getAuth(app);
      export const db = getFirestore(app);
      ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## 📖 User Guide

### For Admins
1.  **Login:** Use your admin credentials.
2.  **Approve Users:** Go to the **Members** tab to approve pending resident sign-ups.
3.  **Manage Houses:** Click "Add House" to place new units on the map, or click existing markers to edit details.
4.  **Events & Meetings:** Use the respective tabs to create new community events or log meeting minutes.

### For Residents
1.  **Register:** Sign up and wait for Admin approval.
2.  **Add Your House:** Once approved, go to the **Map** tab. You will be prompted to tap your house location on the map to register it.
3.  **Stay Updated:** Check the **Events** tab for upcoming activities and **Meetings** to read minutes.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements.

## 📄 License

This project is licensed under the MIT License.
