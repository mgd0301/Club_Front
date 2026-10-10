// src/config.js

// Primero, toma el valor del entorno (si existe)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://192.168.1.149:5001";

console.log("🚨 DIAGNÓSTICO: REACT_APP_API_BASE_URL =", process.env.REACT_APP_API_BASE_URL);
console.log("🚨 DIAGNÓSTICO: API_BASE_URL =", API_BASE_URL);
export { API_BASE_URL };

