const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
app.use(bodyParser.json());
app.use(cors({origin: 'http://localhost:4200'}));
app.use(cors());

// Increase payload size limit
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

app.post('/api/auth/signup', async (req, res) => {
    const {username, email, password, fullName, mobile, addressLine1, addressLine2, city, state, postalCode, country} = req.body;
    try {
        await db.query('BEGIN');
        // insert user data
        const userResult = await db.query(
            'insert into users (username, email, password, full_name, mobile_number, address_line1, address_line2, city, state, postal_code, country) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *',
            [username, email, password, fullName, mobile, addressLine1, addressLine2, city, state, postalCode, country]
        );
        const userId = userResult.rows[0].id;
        await db.query('COMMIT');
        res.json({user: userResult.rows[0]});
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error signing up:', error);
        res.status(500).json({error: 'Failed to sign up'});
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
    const { name, address, image_url, mobile } = req.body;
    try{
        const result = await db.query(
            'insert into restaurants (name, address, image_url, mobile) values ($1, $2, $3, $4) returning *',
            [name, address, image_url, mobile]
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
    const { name, address, image_url, mobile } = req.body;
    try {
        const result = await db.query(
            'UPDATE restaurants SET name = $1, address = $2, image_url = $3, mobile = $4 WHERE id = $5 RETURNING *',
            [name, address, image_url, mobile, id]
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

// for deleting restaurant
app.delete('/api/restaurants/:id', async(req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'delete from restaurants where id = $1 returning *',
            [id]
        );
        if (result.rows.length > 0) {
            res.json({ message: 'Restaurant deleted successfully' });
        } else {
            res.status(404).json({error: 'Restaurant not found'});
        }
    } catch (error){
        console.error('Error deleting restaurant:', error);
        res.status(500).json({ error: 'Falied to delete restaurant' });
    }
});

// for saving a menu item
app.post('/api/restaurants/:restaurantId/menus', async (req, res) => {
    const { restaurantId } = req.params;
    const { name, description, price } = req.body;
    try {
        const result = await db.query(
            'insert into menu_items (restaurant_id, name, description, price) values ($1, $2, $3, $4) returning *',
            [restaurantId, name, description, price]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error saving menu item:', error);
        res.status(500).json({ error: 'Failed to save menu item' });
    }
});

// for fetching menu items by restaurant
app.get('/api/restaurants/:restaurantId/menus', async (req, res) => {
    const { restaurantId } = req.params;
    try {
        const result = await db.query('select * from menu_items where restaurant_id = $1', [restaurantId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

// for updating a menu item
app.put('/api/menus/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price } = req.body;
    try {
        const result = await db.query(
            'update menu_items set name = $1, description = $2, price = $3 where id = $4 returning *',
            [name, description, price, id]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Menu item not found' });
        }
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// for deleting a menu item
app.delete('/api/menus/:id', async (req, res) => {
    const {id} = req.params;
    try {
        const result = await db.query(
            'delete from menu_items where id = $1 returning *',
            [id]
        );
        if (result.rows.length > 0) {
            res.json({message: 'Menu item deleted successfully'});
        } else {
            res.status(404).json({error: 'Menu item not found'});
        }
    } catch (error){
        console.error('Error deleting menu item:', error);
        res.status(500).json({error: 'Failed to delete menu item'});
    }
});

// for placing an order
app.post('/api/orders', async (req, res) => {
    const { user_id, orderItems, total_price } = req.body;
    try {
        await db.query('BEGIN'); // Start transaction

        for (const item of orderItems) {
            await db.query(
                'INSERT INTO orders (user_id, menu_item_id, quantity, total_price) VALUES ($1, $2, $3, $4)',
                [user_id, item.menu_item_id, item.quantity, item.total_price]
            );
        }

        await db.query('COMMIT'); // Commit transaction
        res.json({ message: 'Order placed successfully' });
    } catch (error) {
        await db.query('ROLLBACK'); // Rollback transaction in case of error
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// for fetching a user's order history
app.get('/api/users/:userId/orders', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await db.query(
            `select o.id, o.quantity, o.total_price, o.created_at as order_date, o.rating, o.review, mi.name as menu_item_name, r.name as restaurant_name
            from orders o
            join menu_items mi on o.menu_item_id = mi.id
            join restaurants r on mi.restaurant_id = r.id
            where o.user_id = $1
            order by o.created_at desc`,
            [userId]
        );
        res.json(result.rows);
    } catch (error){
        console.error('Error fetching order history:', error);
        res.status(500).json({error: 'Failed to fetch order history'});
    }
});

// for fetching user details
app.get('/api/users/:userId', async (req, res) => {
    const {userId} = req.params;
    try{
        const result = await db.query('select * from users where id = $1', [userId]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({error: 'User not found'});
        }
    } catch (error) {
        console.error ('Error fetching user details:', error);
        res.status(500).json({error: 'Failed to fetch user details'});
    }
});

// for updating user profile
app.put('/api/auth/profile/:id', async (req,res) => {
    const {id} = req.params;
    const { username, email, full_name, mobile_number, address_line1, address_line2, city, state, postal_code, country } = req.body;
    try {
        const result = await db.query(
            'update users set username = $1, email = $2, full_name = $3, mobile_number = $4, address_line1 = $5, address_line2 = $6, city = $7, state = $8, postal_code = $9, country = $10 WHERE id = $11 RETURNING *',
            [username, email, full_name, mobile_number, address_line1, address_line2, city, state, postal_code, country, id]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({error: 'User not found'});
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({error: 'Failed to update user profile'});
    }
})

// for submitting review and rating
app.post('/api/orders/:orderId/review', async (req, res) => {
    const {orderId} = req.params;
    const {rating, review} = req.body;
    try {
        const result = await db.query(
            'update orders set rating = $1, review = $2 where id = $3 returning *',
            [rating, review, orderId]
        );
        if (result.rows.length > 0){
            res.json(result.rows[0]);
        } else {
            res.status(404).json({error: 'Order not found'});
        }
    } catch (error) {
        console.error('Error submitting review and rating:', error);
        res.status(500).json({error: 'Failed to submit review and rating'});
    }
})

// for fetching restaurants with their average rating
app.get('/api/restaurants/with-ratings', async (req, res) => {
    try {
        const result = await db.query(
            `select r.*, coalesce(avg(o.rating), 0) as average_rating
            from restaurants r
            left join menu_items mi on r.id = mi.restaurant_id
            left join orders o on mi.id = o.menu_item_id
            group by r.id`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching restaurants with ratings:', error);
        res.status(500).json({error: 'Failed to fetch restaurants with ratings'});
    }
});

// for fetching reviews and rating for a specific menu item
app.get('/api/menus/:menuId/reviews', async (req, res) => {
   const {menuId} = req.params;
   try{
    const result = await db.query(
        `select rating, review, created_at
        from orders
        where menu_item_id = $1 and rating is not null and review is not null
        order by created_at desc`,
        [menuId]
    );
    res.json(result.rows);
   } catch (error) {
    console.error('Error fetching reviews and ratings:', error);
    res.status(500).json({error: 'Failed to fetch reviews and ratings'})
   }
});

// for forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
    const {identifier, newPassword} = req.body;
    try {
        const userQuery = await db.query(
            'select * from users where email = $1 or username = $1',
            [identifier]
        );
        if (userQuery.rows.length === 0){
            return res.status(404).json({error: 'User not found'});
        }
        const userId = userQuery.rows[0].id;
        // update users password
        const updateQuery = await db.query(
            'update users set password = $1 where id = $2',
            [newPassword, userId]
        );
        if (updateQuery.rowCount > 0) {
            res.json({message: 'Password changed successfully'});
        } else {
            res.status(500).json({error: 'Failed to update password'});
        }
    } catch (error){
        console.error('Error changing password:', error);
        res.status(500).json({error: 'Failed to change password'});
    }
})

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
})