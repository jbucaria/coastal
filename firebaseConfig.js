// firebase.js
import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
import { getFirestore } from 'firebase/firestore'

// Your Firebase configuration (matches the plist content)
const firebaseConfig = {
  apiKey: 'AIzaSyCnyLTERgNd1i4Y3Y2kR-ETJu2f545wwsg',
  authDomain: 'coastal-cce38.firebaseapp.com',
  projectId: 'coastal-cce38',
  storageBucket: 'coastal-cce38.appspot.com',
  messagingSenderId: '867908177885',
  appId: '1:867908177885:ios:6d44768272781a78577034',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Storage and Firestore
const storage = getStorage(app)
const firestore = getFirestore(app)

export { storage, firestore }
