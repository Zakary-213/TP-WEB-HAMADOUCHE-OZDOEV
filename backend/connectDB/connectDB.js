const mongoose = require("mongoose");
require("dotenv").config();


const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("La variable d'environnement MONGODB_URI est manquante !");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connecté à MongoDB avec succès");
    } catch (error) {
        console.error("❌ Erreur de connexion à MongoDB :");
        console.error(error.message);
        // On ne quitte pas immédiatement pour laisser le temps à Railway d'afficher les logs
        setTimeout(() => process.exit(1), 2000);
    }
};

module.exports = connectDB;