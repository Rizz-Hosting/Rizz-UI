const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const {
  convertCRC16,
  generateTransactionId,
  generateExpirationTime,
  elxyzFile,
  generateQRIS,
  createQRIS,
  checkQRISStatus
} = require('./src/api/orkut/orkut.js')

const app = express();
const PORT = process.env.PORT || 4000;

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/', express.static(path.join(__dirname, 'api-page')));
app.use('/src', express.static(path.join(__dirname, 'src')));

const settingsPath = path.join(__dirname, './src/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const responseData = {
                status: data.status,
                creator: settings.apiSettings.creator || "Created Using Rizz UI",
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

// Api Route
let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');
fs.readdirSync(apiFolder).forEach((subfolder) => {
    const subfolderPath = path.join(apiFolder, subfolder);
    if (fs.statSync(subfolderPath).isDirectory()) {
        fs.readdirSync(subfolderPath).forEach((file) => {
            const filePath = path.join(subfolderPath, file);
            if (path.extname(file) === '.js') {
                require(filePath)(app);
                totalRoutes++;
                console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded Route: ${path.basename(file)} `));
            }
        });
    }
});
console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes Loaded: ${totalRoutes} `));

app.get('/api/orkut/createpayment', async (req, res) => {
    const { apikey, amount } = req.query;
    if (!apikey) {
    return res.json("Isi Parameter Apikey.");
    }
    const check = global.apikey
    if (!check.includes(apikey)) return res.json("Apikey Tidak Valid!.")
    if (!amount) {
    return res.json("Isi Parameter Amount.")
    }
    const { codeqr } = req.query;
    if (!codeqr) {
    return res.json("Isi Parameter CodeQr menggunakan qris code kalian.");
    }
    try {
        const qrData = await createQRIS(amount, codeqr);
        res.json({ status: true, creator: global.creator, result: qrData });        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})



app.get('/api/orkut/cekstatus', async (req, res) => {
    const { merchant, keyorkut } = req.query;
        if (!merchant) {
        return res.json("Isi Parameter Merchant.")
    }
    if (!keyorkut) {
        return res.json("Isi Parameter Keyorkut.");
    }
    try {
        const apiUrl = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
        const response = await axios.get(apiUrl);
        const result = await response.data;
                // Check if data exists and get the latest transaction
        const latestTransaction = result.data && result.data.length > 0 ? result.data[0] : null;
                if (latestTransaction) {
            res.json(latestTransaction);
        } else {
            res.json({ message: "No transactions found." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'index.html'));
});

app.use((req, res, next) => {
    res.status(404).sendFile(process.cwd() + "/api-page/404.html");
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).sendFile(process.cwd() + "/api-page/500.html");
});

app.listen(PORT, () => {
    console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Server is running on port ${PORT} `));
});

module.exports = app;