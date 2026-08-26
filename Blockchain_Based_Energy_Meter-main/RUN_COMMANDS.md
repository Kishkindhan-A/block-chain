# 🚀 ENARGY: All-In-One Single Command Runner

Run the entire ecosystem with **one single command** from the root folder:

```powershell
npm start
```

---

## ⚙️ What `npm start` Automatically Performs:

1. 1️⃣ **Blockchain Node**: Launches local Ethereum node on `http://127.0.0.1:8545`.
2. 2️⃣ **Contract Deployment**: Compiles and deploys `EnergyMeter.sol`, extracting the new contract address.
3. 3️⃣ **Environment Config**: Automatically updates `CONTRACT_ADDRESS` in `backend/.env`.
4. 4️⃣ **Backend API Server**: Starts Express server on `http://localhost:3000` (with SQLite fallback).
5. 5️⃣ **Frontend Dashboard**: Starts Vite React server on `http://localhost:5173`.
6. 6️⃣ **IoT Simulator**: Starts 1-second live telemetry simulator for meters `MTR001`, `MTR002`, `MTR003`.

---

## 🔑 Default Credentials

Open **[http://localhost:5173](http://localhost:5173)** in your browser:

| Role | Username / Meter ID | Password |
| :--- | :--- | :--- |
| **Consumer** | `MTR001` | `TNEB@MTR001` |
| **EB Admin** | `EB-Admin` | `TNEB@ADMIN` |
