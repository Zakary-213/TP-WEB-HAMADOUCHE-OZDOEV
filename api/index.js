const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const app = express();

const connectDB = require("../backend/connectDB/connectDB");
const path = require("path");
const PORT = process.env.PORT || 4000;

const ALLOWED_ORIGINS = new Set([
  "https://tp-web-hamadouche-ozdoev.vercel.app",
  "https://tp-web-hamadouche-ozdoev-git-dev-zakarys-projects-853ed3d8.vercel.app",
  "https://tp-web-hamadouche-ozdoev-a0fxz66z4-zakarys-projects-853ed3d8.vercel.app",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5501"
]);

const corsOptions = {
  origin: (origin, callback) => {
    console.log(`🔍 Requête CORS reçue de l'origine : ${origin}`);
    
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }

    const isProjectPreview = /^https:\/\/tp-web-hamadouche-ozdoev-[a-z0-9-]+-zakarys-projects-853ed3d8\.vercel\.app$/i.test(origin);
    if (isProjectPreview) {
      return callback(null, true);
    }

    console.warn(`⚠️ Origine bloquée par CORS : ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Gestion globale des erreurs pour le débogage Railway
process.on('uncaughtException', (err) => {
  console.error('❌ ERREUR CRITIQUE (Exception non gérée) :');
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ ERREUR CRITIQUE (Promesse non gérée) :');
  console.error(reason);
});

console.log('🎬 Démarrage du serveur...');

connectDB().then(() => {
  console.log('📡 Base de données initialisée');
}).catch(err => {
  console.error('❌ Échec de l\'initialisation de la DB :', err);
});

app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// Route de test supplémentaire
app.get("/api/ping", (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use('/api/auth', require('../backend/authRoutes/authRoutes'));

// Démarrage du serveur si ce n'est pas sur Vercel (Vercel gère l'invocation lui-même)
if (require.main === module || process.env.RAILWAY_STATIC_URL || process.env.PORT) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur en ligne sur le port ${PORT}`);
    console.log(`🔗 URL: 0.0.0.0:${PORT}`);
    console.log(`📡 Prêt à recevoir des requêtes`);
  });
}

module.exports = app;
