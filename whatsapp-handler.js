// whatsapp-handler.js
// File untuk menangani pesan WhatsApp dan fungsi-fungsi terkait

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Fungsi untuk memformat pesan WhatsApp dengan header dan footer yang menarik
function formatWhatsAppMessage(title, content, settings) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = currentDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Dapatkan nama ISP dari pesan OTP (jika ada)
    const otpMessage = settings?.otpMessage || '';
    const ispMatch = otpMessage.match(/([A-Za-z0-9-]+)$/); // Ambil kata terakhir dari pesan OTP
    const ispName = ispMatch ? ispMatch[0] : 'WebPortal';
    
    // Buat header yang menarik
    let message = "";
    message += "╭───「 *" + ispName + "* 」───╮\n";
    message += "│ " + formattedDate + "\n";
    message += "│ " + formattedTime + "\n";
    message += "╰────────────────╯\n\n";
    
    // Tambahkan judul pesan
    message += "*" + title + "*\n";
    message += "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n";
    
    // Tambahkan konten pesan
    message += content;
    
    // Tambahkan footer
    message += "\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n";
    message += "_Pesan ini dikirim otomatis oleh sistem. Ketik *help* untuk bantuan._\n";
    message += "╭───「 *" + ispName + "* 」───╮\n";
    message += "│ Layanan Pelanggan:\n";
    message += "│ " + (settings?.adminWhatsapp || 'Admin') + "\n";
    message += "╰────────────────╯";
    
    return message;
}

// Konstanta untuk WhatsApp webhook
const WHATSAPP_COMMANDS = {
    HELP: ['help', 'bantuan', 'menu'],
    STATUS: ['status', 'cek', 'info'],
    SSID_2G: ['ssid2g', 'wifi2g', 'ssid 2g'],
    SSID_5G: ['ssid5g', 'wifi5g', 'ssid 5g'],
    PASSWORD_2G: ['pass2g', 'password2g', 'pw2g'],
    PASSWORD_5G: ['pass5g', 'password5g', 'pw5g'],
    REBOOT: ['reboot', 'restart', 'boot'],
    USER_INFO: ['userinfo', 'user', 'pelanggan'],
    CONNECTED_DEVICES: ['devices', 'perangkat', 'connected']
};

// Konstanta untuk pesan WhatsApp
const WHATSAPP_MESSAGES = {
    // Fungsi untuk mendapatkan pesan dengan format yang menarik
    getFormattedMessage: function(title, content, settings) {
        return formatWhatsAppMessage(title, content, settings);
    },
    
    // Pesan selamat datang
    WELCOME: function(settings) {
        const content = "Selamat datang di layanan WhatsApp WebPortal. Ketik *help* untuk melihat daftar perintah.";
        return formatWhatsAppMessage("Selamat Datang", content, settings);
    },
    
    // Menu bantuan
    HELP: function(settings) {
        let content = "📱 *Perintah Pelanggan:*\n";
        content += "🔸 *status* - Cek status perangkat\n";
        content += "🔸 *ssid2g* [nama] - Ubah nama WiFi 2.4G\n";
        content += "🔸 *ssid5g* [nama] - Ubah nama WiFi 5G\n";
        content += "🔸 *pass2g* [password] - Ubah password WiFi 2.4G\n";
        content += "🔸 *pass5g* [password] - Ubah password WiFi 5G\n";
        content += "🔸 *devices* - Lihat perangkat terhubung\n";
        content += "🔸 *userinfo* - Lihat info pelanggan\n\n";
        content += "🔴 *Khusus Admin:*\n";
        content += "🔸 *reboot* [no_pelanggan] - Restart perangkat\n";
        content += "🔸 *status* [no_pelanggan] - Cek status pelanggan\n";
        content += "🔸 *userinfo* [no_pelanggan] - Lihat info pelanggan\n";
        content += "🔸 *ssid2g* [no_pelanggan] [nama] - Ubah SSID 2.4G pelanggan\n";
        content += "🔸 *ssid5g* [no_pelanggan] [nama] - Ubah SSID 5G pelanggan\n";
        content += "🔸 *pass2g* [no_pelanggan] [password] - Ubah password WiFi 2.4G pelanggan\n";
        content += "🔸 *pass5g* [no_pelanggan] [password] - Ubah password WiFi 5G pelanggan";
        
        return formatWhatsAppMessage("Menu Bantuan", content, settings);
    },
    
    // Pesan error dan notifikasi
    NOT_REGISTERED: function(settings) {
        const content = "❌ Maaf, nomor Anda belum terdaftar di sistem. Silakan hubungi admin untuk mendaftarkan nomor Anda.";
        return formatWhatsAppMessage("Tidak Terdaftar", content, settings);
    },
    
    ADMIN_ONLY: function(settings) {
        const content = "⛔ Maaf, perintah ini hanya dapat diakses oleh admin.";
        return formatWhatsAppMessage("Akses Ditolak", content, settings);
    },
    
    SUCCESS: function(param, value, settings) {
        const content = `✅ Berhasil mengubah ${param} menjadi: *${value}*`;
        return formatWhatsAppMessage("Berhasil", content, settings);
    },
    
    ERROR: function(error, settings) {
        const content = `❌ Maaf, terjadi kesalahan: ${error}`;
        return formatWhatsAppMessage("Error", content, settings);
    },
    
    INVALID_COMMAND: function(settings) {
        const content = "⚠️ Perintah tidak valid. Ketik *help* untuk melihat daftar perintah.";
        return formatWhatsAppMessage("Perintah Tidak Valid", content, settings);
    },
    
    REBOOT_SUCCESS: function(settings) {
        const content = "✅ Perangkat berhasil di-restart. Mohon tunggu beberapa menit hingga perangkat kembali online.";
        return formatWhatsAppMessage("Restart Berhasil", content, settings);
    },
    
    REBOOT_FAILED: function(error, settings) {
        const content = `❌ Gagal me-restart perangkat. Error: ${error}`;
        return formatWhatsAppMessage("Restart Gagal", content, settings);
    }
};

// Fungsi untuk mendapatkan deviceId berdasarkan nomor WhatsApp
async function getDeviceIdByWhatsApp(whatsappNumber, formatWhatsAppNumber) {
    try {
        // Format nomor WhatsApp untuk pencarian
        const formattedNumber = formatWhatsAppNumber(whatsappNumber);
        
        // Coba ambil dari GenieACS
        const genieacsUrl = process.env.GENIEACS_URL;
        const genieacsUsername = process.env.GENIEACS_USERNAME;
        const genieacsPassword = process.env.GENIEACS_PASSWORD;
        
        const auth = {
            username: genieacsUsername,
            password: genieacsPassword
        };
        
        // Query untuk mencari perangkat berdasarkan nomor WhatsApp
        const query = encodeURIComponent(JSON.stringify({
            "_tags.customerNumber": formattedNumber
        }));
        
        const response = await axios.get(`${genieacsUrl}/devices?query=${query}`, { auth });
        
        if (response.data && response.data.length > 0) {
            return response.data[0]._id;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting deviceId by WhatsApp number:', error);
        return null;
    }
}

// Fungsi untuk memeriksa apakah nomor adalah admin
function isAdminWhatsApp(whatsappNumber, formatWhatsAppNumber, settingsFile) {
    try {
        const settings = JSON.parse(fs.readFileSync(settingsFile));
        const adminNumber = formatWhatsAppNumber(settings.adminWhatsapp);
        const formattedNumber = formatWhatsAppNumber(whatsappNumber);
        
        return adminNumber === formattedNumber;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Fungsi untuk mendapatkan status perangkat dalam format pesan
async function getDeviceStatusMessage(deviceId, genieacsUrl, auth, getDeviceStatus, formatUptime, getParameterWithPaths, parameterPaths) {
    try {
        // Ambil data perangkat dari GenieACS
        const response = await axios.get(`${genieacsUrl}/devices/${encodeURIComponent(deviceId)}`, { auth });
        
        if (!response.data) {
            return "Perangkat tidak ditemukan.";
        }
        
        const device = response.data;
        
        // Ambil informasi status
        const lastInform = new Date(device.lastInform?._value || 0);
        const status = getDeviceStatus(lastInform);
        
        // Ambil parameter perangkat menggunakan parameterPaths dari app.js
        const serialNumber = getParameterWithPaths(device, parameterPaths.serialNumber) || 'N/A';
        const model = getParameterWithPaths(device, parameterPaths.productClass) || 'N/A';
        const uptime = getParameterWithPaths(device, parameterPaths.uptime);
        const formattedUptime = uptime ? formatUptime(uptime) : 'N/A';
        const ssid2G = getParameterWithPaths(device, parameterPaths.ssid2G) || 'N/A';
        const ssid5G = getParameterWithPaths(device, parameterPaths.ssid5G) || 'N/A';
        const rxPower = getParameterWithPaths(device, parameterPaths.rxPower);
        const rxPowerValue = rxPower ? parseFloat(rxPower).toFixed(2) + ' dBm' : 'N/A';
        const pppUsername = getParameterWithPaths(device, parameterPaths.pppUsername) || 'N/A';
        const macAddress = getParameterWithPaths(device, [...parameterPaths.pppMac, ...parameterPaths.pppMacWildcard]) || 'N/A';
        const userConnected2G = getParameterWithPaths(device, parameterPaths.userConnected2G) || '0';
        const userConnected5G = getParameterWithPaths(device, parameterPaths.userConnected5G) || '0';
        
        // Format konten pesan
        let content = `Status: *${status ? 'Online ✅' : 'Offline ❌'}*\n`;
        content += `Model: ${model}\n`;
        content += `Serial Number: ${serialNumber}\n`;
        content += `Username PPPoE: ${pppUsername}\n`;
        content += `MAC Address: ${macAddress}\n`;
        content += `Uptime: ${formattedUptime}\n\n`;
        content += `RX Power: ${rxPowerValue}\n\n`;
        content += `📶 *Informasi WiFi*\n`;
        content += `SSID 2.4G: *${ssid2G}*\n`;
        content += `SSID 5G: *${ssid5G}*\n`;
        content += `Perangkat Terhubung 2.4G: ${userConnected2G}\n`;
        content += `Perangkat Terhubung 5G: ${userConnected5G}\n`;
        
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (error) {
            console.error('Error reading settings:', error);
            settings = {};
        }
        
        // Format pesan dengan header dan footer
        const message = formatWhatsAppMessage('Status Perangkat', content, settings);
        
        return message;
    } catch (error) {
        console.error('Error getting device status:', error);
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (err) {
            console.error('Error reading settings:', err);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.ERROR(error.message, settings);
    }
}

// Fungsi untuk update pengaturan WiFi via WhatsApp
async function updateWifiSettingViaWhatsApp(deviceId, settingType, newValue, genieacsUrl, auth) {
    try {
        // Validasi input
        if (!deviceId || !settingType || !newValue) {
            return "Parameter tidak lengkap.";
        }
        
        // Tentukan path parameter berdasarkan jenis pengaturan
        let paramPaths = [];
        let paramName;
        
        switch (settingType) {
            case 'ssid2G':
                paramPaths = [
                    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID"
                ];
                paramName = "SSID 2.4G";
                break;
            case 'ssid5G':
                paramPaths = [
                    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID"
                ];
                paramName = "SSID 5G";
                break;
            case 'password2G':
                paramPaths = [
                    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase",
                    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase"
                ];
                paramName = "Password WiFi 2.4G";
                break;
            case 'password5G':
                paramPaths = [
                    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase",
                    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.5.KeyPassphrase"
                ];
                paramName = "Password WiFi 5G";
                break;
            default:
                return "Jenis pengaturan tidak valid.";
        }
        
        // Buat payload untuk update parameter
        // Kita akan mencoba semua kemungkinan path parameter
        const tasks = [];
        
        // Buat task untuk setiap path parameter
        for (const paramPath of paramPaths) {
            tasks.push({
                name: "setParameterValues",
                parameterValues: [
                    [paramPath, newValue, "xsd:string"]
                ]
            });
        }
        
        // Kirim request ke GenieACS untuk setiap path parameter
        for (const task of tasks) {
            try {
                await axios.post(
                    `${genieacsUrl}/devices/${encodeURIComponent(deviceId)}/tasks`,
                    [task],
                    { auth }
                );
                console.log(`Berhasil update parameter ${task.parameterValues[0][0]} untuk device ${deviceId}`);
            } catch (error) {
                console.error(`Error updating parameter ${task.parameterValues[0][0]}:`, error.message);
                // Lanjutkan ke path berikutnya jika ada error
            }
        }
        
        // Kirim request untuk refresh perangkat
        await axios.post(
            `${genieacsUrl}/devices/${encodeURIComponent(deviceId)}/tasks`,
            [{ name: "refreshObject", objectName: "" }],
            { auth }
        );
        
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (error) {
            console.error('Error reading settings:', error);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.SUCCESS(paramName, newValue, settings);
    } catch (error) {
        console.error('Error updating WiFi setting:', error);
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (err) {
            console.error('Error reading settings:', err);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.ERROR(error.message, settings);
    }
}

// Fungsi untuk reboot perangkat
async function rebootDevice(deviceId, genieacsUrl, auth) {
    try {
        if (!deviceId) {
            return "Device ID tidak valid.";
        }
        
        // Buat payload untuk reboot
        const payload = [{ name: "reboot" }];
        
        // Kirim request ke GenieACS
        await axios.post(
            `${genieacsUrl}/devices/${encodeURIComponent(deviceId)}/tasks`,
            payload,
            { auth }
        );
        
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (error) {
            console.error('Error reading settings:', error);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.REBOOT_SUCCESS(settings);
    } catch (error) {
        console.error('Error rebooting device:', error);
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (err) {
            console.error('Error reading settings:', err);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.REBOOT_FAILED(error.message, settings);
    }
}

// Fungsi untuk mendapatkan informasi perangkat terhubung
async function getConnectedDevicesMessage(deviceId, genieacsUrl, auth, getParameterWithPaths, parameterPaths) {
    try {
        // Ambil data perangkat dari GenieACS
        const response = await axios.get(`${genieacsUrl}/devices/${encodeURIComponent(deviceId)}`, { auth });
        
        if (!response.data) {
            return "Perangkat tidak ditemukan.";
        }
        
        const device = response.data;
        
        // Coba dapatkan data perangkat terhubung
        const connectedDevices = [];
        
        // Coba ambil dari parameter yang umum digunakan
        const lanDeviceNumberOfEntries = getParameterWithPaths(device, [
            "InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries",
            "Device.Hosts.HostNumberOfEntries"
        ]);
        
        if (lanDeviceNumberOfEntries) {
            const numEntries = parseInt(lanDeviceNumberOfEntries);
            
            for (let i = 1; i <= numEntries; i++) {
                const hostnamePaths = [
                    `InternetGatewayDevice.LANDevice.1.Hosts.Host.${i}.HostName`,
                    `Device.Hosts.Host.${i}.HostName`
                ];
                
                const macPaths = [
                    `InternetGatewayDevice.LANDevice.1.Hosts.Host.${i}.MACAddress`,
                    `Device.Hosts.Host.${i}.MACAddress`
                ];
                
                const ipPaths = [
                    `InternetGatewayDevice.LANDevice.1.Hosts.Host.${i}.IPAddress`,
                    `Device.Hosts.Host.${i}.IPAddress`
                ];
                
                const interfaceTypePaths = [
                    `InternetGatewayDevice.LANDevice.1.Hosts.Host.${i}.InterfaceType`,
                    `Device.Hosts.Host.${i}.InterfaceType`
                ];
                
                const hostname = getParameterWithPaths(device, hostnamePaths) || 'Unknown';
                const mac = getParameterWithPaths(device, macPaths) || 'N/A';
                const ip = getParameterWithPaths(device, ipPaths) || 'N/A';
                const interfaceType = getParameterWithPaths(device, interfaceTypePaths) || 'N/A';
                
                // Hanya tambahkan jika ada MAC address
                if (mac !== 'N/A') {
                    connectedDevices.push({
                        hostname,
                        mac,
                        ip,
                        interfaceType
                    });
                }
            }
        }
        
        // Format konten pesan
        let content = "";
        
        if (connectedDevices.length === 0) {
            content += "Tidak ada perangkat yang terhubung.";
        } else {
            content += `Total Perangkat Terhubung: *${connectedDevices.length}*\n\n`;
            connectedDevices.forEach((device, index) => {
                content += `📱 *Perangkat ${index + 1}*\n`;
                content += `Nama: ${device.hostname}\n`;
                content += `IP: ${device.ip}\n`;
                content += `MAC: ${device.mac}\n`;
                content += `Tipe: ${device.interfaceType}\n\n`;
            });
        }
        
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (error) {
            console.error('Error reading settings:', error);
            settings = {};
        }
        
        // Format pesan dengan header dan footer
        const message = formatWhatsAppMessage('Perangkat Terhubung', content, settings);
        
        return message;
    } catch (error) {
        console.error('Error getting connected devices:', error);
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (err) {
            console.error('Error reading settings:', err);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.ERROR(error.message, settings);
    }
}

// Fungsi untuk mendapatkan informasi pengguna
async function getUserInfoMessage(deviceId, genieacsUrl, auth, getParameterWithPaths, parameterPaths, getRxPowerClass) {
    try {
        // Ambil data perangkat dari GenieACS
        const response = await axios.get(`${genieacsUrl}/devices/${encodeURIComponent(deviceId)}`, { auth });
        
        if (!response.data) {
            return "Perangkat tidak ditemukan.";
        }
        
        const device = response.data;
        
        // Ambil parameter perangkat menggunakan parameterPaths dari app.js
        const serialNumber = getParameterWithPaths(device, parameterPaths.serialNumber) || 'N/A';
        const model = getParameterWithPaths(device, parameterPaths.productClass) || 'N/A';
        const pppUsername = getParameterWithPaths(device, parameterPaths.pppUsername) || 'N/A';
        const pppPassword = getParameterWithPaths(device, parameterPaths.pppPassword) || 'N/A';
        const ipAddress = getParameterWithPaths(device, parameterPaths.pppoeIP) || 'N/A';
        const macAddress = getParameterWithPaths(device, [...parameterPaths.pppMac, ...parameterPaths.pppMacWildcard]) || 'N/A';
        const rxPower = getParameterWithPaths(device, parameterPaths.rxPower);
        const rxPowerValue = rxPower ? parseFloat(rxPower).toFixed(2) + ' dBm' : 'N/A';
        const rxPowerClass = rxPower ? getRxPowerClass(parseFloat(rxPower)) : 'N/A';
        const ssid2G = getParameterWithPaths(device, parameterPaths.ssid2G) || 'N/A';
        const ssid5G = getParameterWithPaths(device, parameterPaths.ssid5G) || 'N/A';
        const userConnected2G = getParameterWithPaths(device, parameterPaths.userConnected2G) || '0';
        const userConnected5G = getParameterWithPaths(device, parameterPaths.userConnected5G) || '0';
        const uptime = getParameterWithPaths(device, parameterPaths.uptime);
        const formattedUptime = uptime ? formatUptime(uptime) : 'N/A';
        
        // Format konten pesan
        let content = `💻 *Informasi Perangkat*\n`;
        content += `Model: ${model}\n`;
        content += `Serial Number: ${serialNumber}\n`;
        content += `MAC Address: ${macAddress}\n`;
        content += `Uptime: ${formattedUptime}\n\n`;
        
        content += `🔑 *Informasi Akun*\n`;
        content += `Username PPPoE: ${pppUsername}\n`;
        content += `Password PPPoE: ${pppPassword}\n`;
        content += `IP Address: ${ipAddress}\n\n`;
        
        content += `📶 *Informasi Sinyal*\n`;
        content += `RX Power: ${rxPowerValue}\n`;
        content += `Kualitas Sinyal: ${rxPowerClass}\n\n`;
        
        content += `📱 *Informasi WiFi*\n`;
        content += `SSID 2.4G: *${ssid2G}*\n`;
        content += `SSID 5G: *${ssid5G}*\n`;
        content += `Perangkat Terhubung 2.4G: ${userConnected2G}\n`;
        content += `Perangkat Terhubung 5G: ${userConnected5G}\n`;
        
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (error) {
            console.error('Error reading settings:', error);
            settings = {};
        }
        
        // Format pesan dengan header dan footer
        const message = formatWhatsAppMessage('Informasi Pelanggan', content, settings);
        
        return message;
    } catch (error) {
        console.error('Error getting user info:', error);
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (err) {
            console.error('Error reading settings:', err);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.ERROR(error.message, settings);
    }
}

// Fungsi utama untuk memproses pesan WhatsApp
async function processWhatsAppMessage(sender, message, gateway, deps) {
    try {
        console.log(`Processing WhatsApp message from ${sender}: ${message}`);
        
        const {
            formatWhatsAppNumber,
            getDeviceStatus,
            formatUptime,
            getParameterWithPaths,
            parameterPaths,
            getRxPowerClass,
            SETTINGS_FILE
        } = deps;
        
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (error) {
            console.error('Error reading settings:', error);
            settings = {};
        }
        
        // Periksa apakah pesan kosong
        if (!message || message.trim() === '') {
            return WHATSAPP_MESSAGES.WELCOME(settings);
        }
        
        // Pisahkan perintah dan parameter
        const parts = message.trim().toLowerCase().split(' ');
        const command = parts[0];
        const params = parts.slice(1).join(' ');
        
        // Setup GenieACS credentials
        const genieacsUrl = process.env.GENIEACS_URL;
        const auth = {
            username: process.env.GENIEACS_USERNAME,
            password: process.env.GENIEACS_PASSWORD
        };
        
        // Periksa apakah sender terdaftar di sistem
        let deviceId = await getDeviceIdByWhatsApp(sender, formatWhatsAppNumber);
        const isAdmin = isAdminWhatsApp(sender, formatWhatsAppNumber, SETTINGS_FILE);
        
        // Jika bukan admin dan tidak terdaftar, tolak
        if (!deviceId && !isAdmin) {
            return WHATSAPP_MESSAGES.NOT_REGISTERED(settings);
        }
        
        // Proses perintah
        if (WHATSAPP_COMMANDS.HELP.includes(command)) {
            return WHATSAPP_MESSAGES.HELP(settings);
        }
        
        // Perintah status - cek status perangkat
        else if (WHATSAPP_COMMANDS.STATUS.includes(command)) {
            // Jika admin dan ada parameter nomor pelanggan
            if (isAdmin && params) {
                // Cari deviceId berdasarkan nomor pelanggan
                const customerDeviceId = await getDeviceIdByWhatsApp(params, formatWhatsAppNumber);
                if (customerDeviceId) {
                    deviceId = customerDeviceId;
                } else {
                    return WHATSAPP_MESSAGES.getFormattedMessage('Pelanggan Tidak Ditemukan', `Pelanggan dengan nomor ${params} tidak ditemukan.`, settings);
                }
            }
            
            if (!deviceId) {
                return WHATSAPP_MESSAGES.NOT_REGISTERED(settings);
            }
            
            // Ambil status perangkat
            return await getDeviceStatusMessage(deviceId, genieacsUrl, auth, getDeviceStatus, formatUptime, getParameterWithPaths, parameterPaths);
        }
        
        // Perintah untuk mengubah SSID 2.4G
        else if (WHATSAPP_COMMANDS.SSID_2G.includes(command)) {
            if (!params) {
                return WHATSAPP_MESSAGES.getFormattedMessage('Informasi', "Mohon berikan nama SSID 2.4G baru. Contoh: *ssid2g NamaWiFiBaru*", settings);
            }
            
            // Jika admin dan format perintah: ssid2g [nomor_pelanggan] [ssid_baru]
            if (isAdmin && params.split(' ').length > 1) {
                const customerNumber = params.split(' ')[0];
                const newSsid = params.split(' ').slice(1).join(' ');
                
                // Cari deviceId berdasarkan nomor pelanggan
                const customerDeviceId = await getDeviceIdByWhatsApp(customerNumber, formatWhatsAppNumber);
                if (customerDeviceId) {
                    deviceId = customerDeviceId;
                    return await updateWifiSettingViaWhatsApp(deviceId, 'ssid2G', newSsid, genieacsUrl, auth);
                } else {
                    return WHATSAPP_MESSAGES.getFormattedMessage('Pelanggan Tidak Ditemukan', `Pelanggan dengan nomor ${customerNumber} tidak ditemukan.`, settings);
                }
            }
            
            if (!deviceId) {
                return WHATSAPP_MESSAGES.NOT_REGISTERED(settings);
            }
            
            // Update SSID 2.4G
            return await updateWifiSettingViaWhatsApp(deviceId, 'ssid2G', params, genieacsUrl, auth);
        }
        
        // Perintah untuk mengubah SSID 5G
        else if (WHATSAPP_COMMANDS.SSID_5G.includes(command)) {
            if (!params) {
                return WHATSAPP_MESSAGES.getFormattedMessage('Informasi', "Mohon berikan nama SSID 5G baru. Contoh: *ssid5g NamaWiFiBaru*", settings);
            }
            
            // Jika admin dan format perintah: ssid5g [nomor_pelanggan] [ssid_baru]
            if (isAdmin && params.split(' ').length > 1) {
                const customerNumber = params.split(' ')[0];
                const newSsid = params.split(' ').slice(1).join(' ');
                
                // Cari deviceId berdasarkan nomor pelanggan
                const customerDeviceId = await getDeviceIdByWhatsApp(customerNumber, formatWhatsAppNumber);
                if (customerDeviceId) {
                    deviceId = customerDeviceId;
                    return await updateWifiSettingViaWhatsApp(deviceId, 'ssid5G', newSsid, genieacsUrl, auth);
                } else {
                    return WHATSAPP_MESSAGES.getFormattedMessage('Pelanggan Tidak Ditemukan', `Pelanggan dengan nomor ${customerNumber} tidak ditemukan.`, settings);
                }
            }
            
            if (!deviceId) {
                return WHATSAPP_MESSAGES.NOT_REGISTERED(settings);
            }
            
            // Update SSID 5G
            return await updateWifiSettingViaWhatsApp(deviceId, 'ssid5G', params, genieacsUrl, auth);
        }
        
        // Perintah untuk mengubah password WiFi 2.4G
        else if (WHATSAPP_COMMANDS.PASSWORD_2G.includes(command)) {
            if (!params) {
                return WHATSAPP_MESSAGES.getFormattedMessage('Informasi', "Mohon berikan password WiFi 2.4G baru. Contoh: *pass2g PasswordBaru*", settings);
            }
            
            // Jika admin dan format perintah: pass2g [nomor_pelanggan] [password_baru]
            if (isAdmin && params.split(' ').length > 1) {
                const customerNumber = params.split(' ')[0];
                const newPassword = params.split(' ').slice(1).join(' ');
                
                // Cari deviceId berdasarkan nomor pelanggan
                const customerDeviceId = await getDeviceIdByWhatsApp(customerNumber, formatWhatsAppNumber);
                if (customerDeviceId) {
                    deviceId = customerDeviceId;
                    return await updateWifiSettingViaWhatsApp(deviceId, 'password2G', newPassword, genieacsUrl, auth);
                } else {
                    return WHATSAPP_MESSAGES.getFormattedMessage('Pelanggan Tidak Ditemukan', `Pelanggan dengan nomor ${customerNumber} tidak ditemukan.`, settings);
                }
            }
            
            if (!deviceId) {
                return WHATSAPP_MESSAGES.NOT_REGISTERED(settings);
            }
            
            // Update password WiFi 2.4G
            return await updateWifiSettingViaWhatsApp(deviceId, 'password2G', params, genieacsUrl, auth);
        }
        
        // Perintah untuk mengubah password WiFi 5G
        else if (WHATSAPP_COMMANDS.PASSWORD_5G.includes(command)) {
            if (!params) {
                return WHATSAPP_MESSAGES.getFormattedMessage('Informasi', "Mohon berikan password WiFi 5G baru. Contoh: *pass5g PasswordBaru*", settings);
            }
            
            // Jika admin dan format perintah: pass5g [nomor_pelanggan] [password_baru]
            if (isAdmin && params.split(' ').length > 1) {
                const customerNumber = params.split(' ')[0];
                const newPassword = params.split(' ').slice(1).join(' ');
                
                // Cari deviceId berdasarkan nomor pelanggan
                const customerDeviceId = await getDeviceIdByWhatsApp(customerNumber, formatWhatsAppNumber);
                if (customerDeviceId) {
                    deviceId = customerDeviceId;
                    return await updateWifiSettingViaWhatsApp(deviceId, 'password5G', newPassword, genieacsUrl, auth);
                } else {
                    return WHATSAPP_MESSAGES.getFormattedMessage('Pelanggan Tidak Ditemukan', `Pelanggan dengan nomor ${customerNumber} tidak ditemukan.`, settings);
                }
            }
            
            if (!deviceId) {
                return WHATSAPP_MESSAGES.NOT_REGISTERED(settings);
            }
            
            // Update password WiFi 5G
            return await updateWifiSettingViaWhatsApp(deviceId, 'password5G', params, genieacsUrl, auth);
        }
        
        // Perintah untuk melihat perangkat terhubung
        else if (WHATSAPP_COMMANDS.CONNECTED_DEVICES.includes(command)) {
            // Jika admin dan ada parameter nomor pelanggan
            if (isAdmin && params) {
                // Cari deviceId berdasarkan nomor pelanggan
                const customerDeviceId = await getDeviceIdByWhatsApp(params, formatWhatsAppNumber);
                if (customerDeviceId) {
                    deviceId = customerDeviceId;
                } else {
                    return WHATSAPP_MESSAGES.getFormattedMessage('Pelanggan Tidak Ditemukan', `Pelanggan dengan nomor ${params} tidak ditemukan.`, settings);
                }
            }
            
            if (!deviceId) {
                return WHATSAPP_MESSAGES.NOT_REGISTERED(settings);
            }
            
            // Ambil informasi perangkat terhubung
            return await getConnectedDevicesMessage(deviceId, genieacsUrl, auth, getParameterWithPaths, parameterPaths);
        }
        
        // Perintah untuk reboot perangkat (khusus admin)
        else if (WHATSAPP_COMMANDS.REBOOT.includes(command)) {
            if (!isAdmin) {
                return WHATSAPP_MESSAGES.ADMIN_ONLY;
            }
            
            // Admin harus menyediakan nomor pelanggan
            if (!params) {
                return "Mohon berikan nomor pelanggan yang akan di-reboot. Contoh: *reboot 081234567890*";
            }
            
            // Cari deviceId berdasarkan nomor pelanggan
            const customerDeviceId = await getDeviceIdByWhatsApp(params, formatWhatsAppNumber);
            if (!customerDeviceId) {
                return `Pelanggan dengan nomor ${params} tidak ditemukan.`;
            }
            
            // Reboot perangkat
            return await rebootDevice(customerDeviceId, genieacsUrl, auth);
        }
        
        // Perintah untuk melihat informasi pengguna (khusus admin)
        else if (WHATSAPP_COMMANDS.USER_INFO.includes(command)) {
            if (!isAdmin) {
                return WHATSAPP_MESSAGES.ADMIN_ONLY;
            }
            
            // Admin harus menyediakan nomor pelanggan
            if (!params) {
                return "Mohon berikan nomor pelanggan. Contoh: *userinfo 081234567890*";
            }
            
            // Cari deviceId berdasarkan nomor pelanggan
            const customerDeviceId = await getDeviceIdByWhatsApp(params, formatWhatsAppNumber);
            if (!customerDeviceId) {
                return `Pelanggan dengan nomor ${params} tidak ditemukan.`;
            }
            
            // Ambil informasi pengguna
            return await getUserInfoMessage(customerDeviceId, genieacsUrl, auth, getParameterWithPaths, parameterPaths, getRxPowerClass);
        }
        
        // Perintah tidak dikenali
        else {
            return WHATSAPP_MESSAGES.INVALID_COMMAND;
        }
    } catch (error) {
        console.error('Error processing WhatsApp message:', error);
        // Baca pengaturan untuk header dan footer
        let settings;
        try {
            const settingsFile = path.join(process.cwd(), 'settings.json');
            settings = JSON.parse(fs.readFileSync(settingsFile));
        } catch (err) {
            console.error('Error reading settings:', err);
            settings = {};
        }
        
        return WHATSAPP_MESSAGES.ERROR(error.message, settings);
    }
}

module.exports = {
    WHATSAPP_COMMANDS,
    WHATSAPP_MESSAGES,
    getDeviceIdByWhatsApp,
    isAdminWhatsApp,
    getDeviceStatusMessage,
    updateWifiSettingViaWhatsApp,
    rebootDevice,
    getConnectedDevicesMessage,
    getUserInfoMessage,
    processWhatsAppMessage
};
