import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Konfiguration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Korrekte Pfad-Konfiguration
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadDir = path.join(projectRoot, 'uploads', 'vehicles');

// CORS Konfiguration
const corsOptions = {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
};

// Express und Middleware
const app = express();
const port = process.env.PORT || 3000;

app.use(cors(corsOptions));
app.use(express.json());

// Wichtig: Statisches Verzeichnis korrekt einbinden
app.use('/uploads/vehicles', express.static(path.join(projectRoot, 'uploads', 'vehicles')));

// Upload-Verzeichnis erstellen
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created upload directory:', uploadDir);
}

// MySQL Verbindung
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Multer Konfiguration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/octet-stream'
    ];
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;

    if (allowedTypes.includes(file.mimetype) ||
        (file.originalname && file.originalname.match(allowedExtensions))) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Alle Fahrzeuge abrufen
app.get('/api/vehicles', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.*, 
            GROUP_CONCAT(DISTINCT vf.feature) as features,
            GROUP_CONCAT(DISTINCT vi.image_url) as images
            FROM vehicles v
            LEFT JOIN vehicle_features vf ON v.id = vf.vehicle_id
            LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id
            GROUP BY v.id
            ORDER BY v.created_at DESC
        `);

        const vehicles = rows.map(vehicle => ({
            ...vehicle,
            features: vehicle.features ? vehicle.features.split(',') : [],
            images: vehicle.images ? vehicle.images.split(',').map(url => `http://localhost:${port}${url}`) : []
        }));

        res.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: error.message });
    }
});

// Einzelnes Fahrzeug abrufen
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const [vehicles] = await pool.query(`
            SELECT v.*, 
            GROUP_CONCAT(DISTINCT vf.feature) as features,
            GROUP_CONCAT(DISTINCT vi.image_url) as images
            FROM vehicles v
            LEFT JOIN vehicle_features vf ON v.id = vf.vehicle_id
            LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id
            WHERE v.id = ?
            GROUP BY v.id
        `, [req.params.id]);

        if (vehicles.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        const vehicle = {
            ...vehicles[0],
            features: vehicles[0].features ? vehicles[0].features.split(',') : [],
            images: vehicles[0].images ? vehicles[0].images.split(',').map(url => `http://localhost:${port}${url}`) : []
        };

        res.json(vehicle);
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    // Debugging: Logge die empfangenen Daten
    console.log('Empfangene Daten:', username, password);

    const adminUsername = 'root';
    const adminPassword = '123456';

    if (username === adminUsername && password === adminPassword) {
        const token = 'secure-admin-token';
        res.status(200).json({ token });
    } else {
        res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    }
});

// Fahrzeug erstellen
app.post('/api/vehicles', upload.array('images', 10), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { brand, model, year, price, mileage, fuelType, transmission, power, description, status } = req.body;
        let features = [];
        try {
            features = JSON.parse(req.body.features || '[]');
        } catch (e) {
            console.warn('Could not parse features:', e);
        }

        // Fahrzeug einfügen
        const [vehicleResult] = await connection.query(
            'INSERT INTO vehicles (brand, model, year, price, mileage, fuel_type, transmission, power, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [brand, model, year, price, mileage, fuelType, transmission, power, description, status || 'available']
        );

        const vehicleId = vehicleResult.insertId;

        // Features einfügen
        if (features.length > 0) {
            const featureValues = features.map(feature => [vehicleId, feature]);
            await connection.query(
                'INSERT INTO vehicle_features (vehicle_id, feature) VALUES ?',
                [featureValues]
            );
        }

        // Bilder speichern
        const savedImages = [];
        if (req.files && req.files.length > 0) {
            const imageValues = req.files.map((file, index) => {
                const imageUrl = `/uploads/vehicles/${file.filename}`;
                savedImages.push(`http://localhost:${port}${imageUrl}`);
                return [vehicleId, imageUrl, index];
            });

            await connection.query(
                'INSERT INTO vehicle_images (vehicle_id, image_url, sort_order) VALUES ?',
                [imageValues]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Vehicle created successfully',
            id: vehicleId,
            images: savedImages
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating vehicle:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Error Handling Middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            error: 'File upload error',
            message: error.message
        });
    }
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Server starten
const startServer = async () => {
    try {
        // Teste Schreibzugriff
        fs.accessSync(uploadDir, fs.constants.W_OK);
        console.log('Upload directory is writable:', uploadDir);

        // Teste Datenbankverbindung
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
            console.log('Upload directory:', uploadDir);
            console.log('CORS enabled for:', corsOptions.origin);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
