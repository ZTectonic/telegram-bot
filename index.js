require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;

const bot = new TelegramBot(token, { polling: true });
const db = new sqlite3.Database('./database.sqlite');

// Jadval yaratish
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT
)`);

// Ro'yxatdan o'tkazish
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    db.run(`INSERT OR IGNORE INTO users (id, username, first_name, last_name) VALUES (?, ?, ?, ?)`,
        [chatId, msg.chat.username || '', msg.chat.first_name || '', msg.chat.last_name || '']
    );

    bot.sendMessage(chatId, "✅ Ro'yxatdan o'tdingiz! Javoblaringiz faqat adminga boradi.");
});

// Foydalanuvchidan kelgan xabarni adminga yuborish
bot.on('message', (msg) => {
    if (msg.text.startsWith('/')) return;
    bot.sendMessage(adminId, `📩 Yangi xabar: \nFrom: ${msg.chat.first_name} (@${msg.chat.username || 'no_username'})\n\n${msg.text}`);
});

// Admin foydalanuvchilar ro'yxatini ko'rishi
bot.onText(/\/list/, (msg) => {
    if (msg.chat.id.toString() !== adminId) {
        return bot.sendMessage(msg.chat.id, "⛔ Bu buyruq faqat admin uchun!");
    }

    db.all(`SELECT * FROM users`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return bot.sendMessage(adminId, "❌ Ma'lumot olishda xatolik!");
        }

        if (rows.length === 0) {
            return bot.sendMessage(adminId, "📭 Hozircha foydalanuvchi yo'q.");
        }

        let list = rows.map(u => `${u.id} - ${u.first_name} (@${u.username})`).join("\n");
        bot.sendMessage(adminId, `📋 Foydalanuvchilar ro'yxati:\n\n${list}`);
    });
});
// Admin foydalanuvchini o'chirish
bot.onText(/\/delete (\d+)/, (msg, match) => {  
    if (msg.chat.id.toString() !== adminId) {
        return bot.sendMessage(msg.chat.id, "⛔ Bu buyruq faqat admin uchun!");
    }

    const userId = match[1];
    db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
        if (err) {
            console.error(err);
            return bot.sendMessage(adminId, "❌ Foydalanuvchini o'chirishda xatolik!");
        }

        if (this.changes === 0) {
            return bot.sendMessage(adminId, "📭 Bunday foydalanuvchi topilmadi.");
        }

        bot.sendMessage(adminId, `✅ Foydalanuvchi o'chirildi: ${userId}`);
    });
});