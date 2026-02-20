import "dotenv/config";
import { db, auth } from "../lib/firebaseConfig";
import { collection, doc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Masjid } from "../lib/types";

const SEED_MASJIDS: Masjid[] = [
    {
        id: "seed_1",
        name: "Masjid Al-Noor",
        city: "London",
        address: "45 Whitechapel Road, E1 1DU",
        adminUid: "",
        timetable: { fajr: "04:45", dhuhr: "13:15", asr: "16:45", maghrib: "19:02", isha: "20:30", jummah: "13:30" },
        createdAt: Date.now() - 86400000,
    },
    {
        id: "seed_2",
        name: "Islamic Centre",
        city: "Birmingham",
        address: "12 Coventry Road, B10 0UR",
        adminUid: "",
        timetable: { fajr: "05:00", dhuhr: "13:10", asr: "16:30", maghrib: "18:55", isha: "20:15", jummah: "13:15" },
        createdAt: Date.now() - 172800000,
    },
    {
        id: "seed_3",
        name: "Masjid As-Salam",
        city: "Manchester",
        address: "78 Cheetham Hill Road, M8 8LZ",
        adminUid: "",
        timetable: { fajr: "04:55", dhuhr: "13:20", asr: "16:40", maghrib: "19:00", isha: "20:25", jummah: "13:30" },
        createdAt: Date.now() - 259200000,
    },
    {
        id: "seed_4",
        name: "Masjid Al-Huda",
        city: "Leeds",
        address: "32 Spencer Place, LS7 4BR",
        adminUid: "",
        timetable: { fajr: "05:05", dhuhr: "13:15", asr: "16:35", maghrib: "18:50", isha: "20:10", jummah: "13:00" },
        createdAt: Date.now() - 345600000,
    },
];

async function seed() {
    console.log("Starting seed...");
    try {
        console.log("Attempting to sign in...");
        // Using provided credentials
        await signInWithEmailAndPassword(auth, "mohdhuzaifa8126195456@gmail.com", "Mohdhuzaifa@123");
        console.log("Signed in successfully.");
    } catch (error: any) {
        console.error("Error signing in:", error.code || error);
        // We might stop here if auth fails, but let's try to proceed in case rules are open
    }

    const masjidsCollection = collection(db, "masjids");

    for (const masjid of SEED_MASJIDS) {
        try {
            // Use setDoc with specific ID to maintain the seed IDs
            await setDoc(doc(db, "masjids", masjid.id), masjid);
            console.log(`Seeded masjid: ${masjid.name}`);
        } catch (error: any) {
            console.error(`Error seeding ${masjid.name}:`, error.code || error);
        }
    }

    console.log("Seeding complete. If you saw PERMISSION_DENIED, update your Firestore Rules.");
    process.exit(0);
}

seed();
