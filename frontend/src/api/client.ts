import axios from "axios";
import { API_URL } from "../utils/constants";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("khetchain_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
