import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.get('/api', (req, res) => {
    res.json({ message: 'Campaign Planner API', status: 'ready' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.url });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
