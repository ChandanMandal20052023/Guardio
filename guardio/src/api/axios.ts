import axios from "axios";

const rawUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const cleanUrl = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
const baseURL = cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api/`;

export default axios.create({
  baseURL: baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
  headers: {
    "Content-Type": "application/json",
  },
});