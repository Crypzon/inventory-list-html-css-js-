// Import library yang dibutuhkan
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Inisialisasi aplikasi express
const app = express();
const port = 3000; // Port tempat server akan berjalan

// Gunakan middleware
app.use(cors()); // Mengizinkan request dari domain lain (frontend kita)
app.use(express.json()); // Memungkinkan server membaca body request dalam format JSON

// Hubungkan ke database SQLite (file akan dibuat jika belum ada)
const db = new sqlite3.Database('./inventory.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("Error saat menyambungkan ke database", err.message);
    } else {
        console.log('Terhubung ke database SQLite.');
        db.serialize(() => {
            // Buat tabel 'items' jika belum ada dengan skema dasar
            db.run('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, quantity INTEGER NOT NULL, uniqueId TEXT UNIQUE)');
            
            // Jalankan ALTER TABLE untuk menambahkan kolom baru. Ini aman untuk dijalankan berulang kali.
            db.run('ALTER TABLE items ADD COLUMN status TEXT', () => {});
            db.run('ALTER TABLE items ADD COLUMN owner TEXT', () => {});
            db.run('ALTER TABLE items ADD COLUMN purchaseDate TEXT', () => {});
        });
    }
});

// === API Endpoints ===

// 1. GET: Mengambil semua item dari inventaris
app.get('/api/items', (req, res) => {
    const sql = "SELECT * FROM items ORDER BY id DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// 2. GET: Mengambil satu item berdasarkan uniqueId (untuk scanner QR)
app.get('/api/items/:uniqueId', (req, res) => {
    const sql = "SELECT * FROM items WHERE uniqueId = ?";
    db.get(sql, [req.params.uniqueId], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (row) {
            res.json({ "message": "success", "data": row });
        } else {
            res.status(404).json({ "message": "Item tidak ditemukan." });
        }
    });
});


// 3. POST: Menambahkan item baru ke inventaris (VERSI YANG SUDAH DIPERBAIKI)
app.post('/api/items', (req, res) => {
    // AMBIL SEMUA DATA BARU dari body request
    const { name, quantity, status, owner, purchaseDate } = req.body;

    if (!name || !quantity) {
        res.status(400).json({ "error": "Nama dan jumlah harus diisi." });
        return;
    }

    const uniqueId = Date.now().toString(); 
    // PERBARUI SQL QUERY untuk memasukkan semua kolom baru
    const sql = 'INSERT INTO items (name, quantity, uniqueId, status, owner, purchaseDate) VALUES (?, ?, ?, ?, ?, ?)';
    // TAMBAHKAN SEMUA VARIABEL BARU ke dalam array params
    const params = [name, quantity, uniqueId, status, owner, purchaseDate];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        // KIRIM KEMBALI SEMUA DATA item yang baru dibuat
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID, name, quantity, uniqueId, status, owner, purchaseDate }
        });
    });
});
 //  PUT: Memperbarui item yang sudah ada
app.put('/api/items/:uniqueId', (req, res) => {
    // Ambil data baru dari body request
    const { name, quantity, status, owner, purchaseDate } = req.body;
    // Ambil uniqueId dari parameter URL
    const uniqueId = req.params.uniqueId;

    if (!name || !quantity) {
        return res.status(400).json({ "error": "Nama dan jumlah tidak boleh kosong." });
    }

    const sql = `
        UPDATE items 
        SET name = ?, 
            quantity = ?, 
            status = ?, 
            owner = ?, 
            purchaseDate = ? 
        WHERE uniqueId = ?
    `;
    const params = [name, quantity, status, owner, purchaseDate, uniqueId];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ "message": `Item dengan ID ${uniqueId} tidak ditemukan.` });
        }
        res.json({
            "message": "success",
            "data": { name, quantity, status, owner, purchaseDate },
            "changes": this.changes
        });
    });
});



//  DELETE: Menghapus item
app.delete('/api/items/:uniqueId', (req, res) => {
    const uniqueId = req.params.uniqueId;
    const sql = 'DELETE FROM items WHERE uniqueId = ?';

    db.run(sql, uniqueId, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ "message": `Item dengan ID ${uniqueId} tidak ditemukan.` });
        }
        res.json({ "message": "deleted", "changes": this.changes });
    });
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});