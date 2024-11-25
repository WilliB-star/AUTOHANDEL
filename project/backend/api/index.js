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

// CORS Konfiguration - MUSS VOR app.use(cors()) definiert werden
const corsOptions = {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
};

// Upload-Verzeichnis erstellen
console.log('Project root:', projectRoot);
console.log('Upload directory path:', uploadDir);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created upload directory:', uploadDir);
}

// Express und Middleware
const app = express();
const port = process.env.PORT || 3000;

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads/vehicles', express.static('uploads/vehicles'));

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

// Multer Konfiguration mit Debug-Logs
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Current directory:', __dirname);
        console.log('Attempted upload directory:', uploadDir);
        console.log('Absolute upload path:', path.resolve(uploadDir));
        console.log('File being saved:', file.originalname);

        if (!fs.existsSync(uploadDir)) {
            console.log('Upload directory does not exist, creating it...');
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const files = fs.readdirSync(uploadDir);
        console.log('Files in upload directory:', files);

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        console.log('Generated filename:', filename);
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    console.log('Processing file:', file);
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
        console.log('File accepted:', file.originalname);
        cb(null, true);
    } else {
        console.log('File rejected:', file.originalname, file.mimetype);
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
            images: vehicle.images ? vehicle.images.split(',') : []
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
            images: vehicles[0].images ? vehicles[0].images.split(',') : []
        };

        res.json(vehicle);
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fahrzeug erstellen
app.post('/api/vehicles', upload.array('images', 10), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Files received:', req.files?.map(f => ({
            filename: f.filename,
            path: f.path,
            destination: f.destination
        })));
        console.log('Received vehicle data:', req.body);

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
        if (req.files && req.files.length > 0) {
            const imageValues = req.files.map((file, index) => [
                vehicleId,
                `/uploads/vehicles/${file.filename}`,
                index
            ]);

            await connection.query(
                'INSERT INTO vehicle_images (vehicle_id, image_url, sort_order) VALUES ?',
                [imageValues]
            );
        }

        await connection.commit();

        // Neues Fahrzeug mit allen Daten abrufen
        const [vehicle] = await connection.query(`
            SELECT v.*, 
            GROUP_CONCAT(DISTINCT vf.feature) as features,
            GROUP_CONCAT(DISTINCT vi.image_url) as images
            FROM vehicles v
            LEFT JOIN vehicle_features vf ON v.id = vf.vehicle_id
            LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id
            WHERE v.id = ?
            GROUP BY v.id
        `, [vehicleId]);

        res.status(201).json({
            message: 'Vehicle created successfully',
            vehicle: {
                ...vehicle[0],
                features: vehicle[0].features ? vehicle[0].features.split(',') : [],
                images: vehicle[0].images ? vehicle[0].images.split(',') : []
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating vehicle:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Kundenformular speichern
app.post('/api/customer-forms', upload.array('images', 10), async (req, res) => {
    try {
        console.log('Received customer form data:', req.body);
        console.log('Received files:', req.files);

        const formData = req.body;
        const files = req.files;

        // Bilder-URLs erstellen
        const imageUrls = files.map(file => `/uploads/vehicles/${file.filename}`);

        // Formular in der Datenbank speichern
        const [result] = await pool.query(`
            INSERT INTO customer_forms 
            (customer_name, email, phone, vehicle_brand, vehicle_model, vehicle_year, 
             vehicle_mileage, vehicle_price, vehicle_fuel_type, vehicle_transmission, 
             vehicle_power, vehicle_description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                formData.contactName,
                formData.email,
                formData.phone,
                formData.brand,
                formData.model,
                formData.year,
                formData.mileage,
                formData.price,
                formData.fuelType,
                formData.transmission,
                formData.power,
                formData.description,
                'neu'
            ]
        );

        const formId = result.insertId;

        // Bilder in der Datenbank speichern
        if (imageUrls.length > 0) {
            const imageValues = imageUrls.map(url => [formId, url]);
            await pool.query(
                'INSERT INTO customer_form_images (form_id, image_url) VALUES ?',
                [imageValues]
            );
        }

        res.status(201).json({
            message: 'Customer form saved successfully',
            formId: formId,
            images: imageUrls
        });
    } catch (error) {
        console.error('Error saving customer form:', error);
        res.status(500).json({
            error: 'Failed to save customer form',
            details: error.message
        });
    }
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();

        res.json({
            status: 'healthy',
            message: 'Server is running and database is connected',
            uploadDir: uploadDir,
            corsOrigins: corsOptions.origin
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Error Handling Middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('Multer error:', error);
        return res.status(400).json({
            error: 'File upload error',
            message: error.message
        });
    }
    next(error);
});

// Server starten
const startServer = async () => {
    try {
        // Teste Schreibzugriff
        fs.accessSync(uploadDir, fs.constants.W_OK);
        console.log('Upload directory is writable');

        // Teste Datenbankverbindung
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
            console.log('Upload directory configured at:', uploadDir);
            console.log('CORS enabled for:', corsOptions.origin);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();