const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// PostgreSQL connection setup
const db = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'food_delivery_db',
    password: 'admin',
    port: 5432,
})

db.connect().then(() => {
    console.log('Connected to PostgreSQL');
    return db.query('CREATE SCHEMA IF NOT EXISTS food_delivery_db');
})
.then(() => {
    console.log('Using food_delivery_db schema');
})
.catch((err) => {
    console.error('Error connecting to PostgreSQL:', err);
});

// for signup
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password, fullName, mobile, address } = req.body;
    try {
        const result = await db.query(
            'insert into users (username, email, password, full_name, mobile_number, address) values ($1, $2, $3, $4, $5, $6) returning *',
            [username, email, password, fullName, mobile, address]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// for login
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    try{
        const result = await db.query(
            `select * from users where (email = $1 or username = $1 or mobile_number::text = $1) and password = $2`,
            [identifier, password]
        );
        if (result.rows.length > 0){
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// for save restaurant
app.post('/api/restaurants', async (req, res) => {
    const { name, address, image, mobile } = req.body;
    try{
        const result = await db.query(
            'insert into restaurants (name, address, image_url, mobile) values ($1, $2, $3, $4) returning *',
            [name, address, image, mobile]
        );
        res.json(result.rows[0]);
    } catch (error){
        console.log('Error saving restaurant:', error);
        res.status(500).json({ error: 'Failed to save restaurant' });
    }
});

// for fetch restaurants
app.get('/api/restaurants', async (req, res) => {
    try {
        const result = await db.query('select * from restaurants');
        res.json(result.rows);
    } catch(error){
        console.error('Error fetching restaurants:', error);
        res.status(500).json({ error: 'Failed to fetch restaurants' });
    }
});

// for updating restaurant
app.put('/api/restaurants/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, image, mobile } = req.body;
    try {
        const result = await db.query(
            'UPDATE restaurants SET name = $1, address = $2, image_url = $3, mobile = $4 WHERE id = $5 RETURNING *',
            [name, address, image, mobile, id]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Restaurant not found' });
        }
    } catch (error) {
        console.error('Error updating restaurant:', error);
        res.status(500).json({ error: 'Failed to update restaurant' });
    }
});



app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
})