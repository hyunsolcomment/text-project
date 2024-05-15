import axios from "axios";
import { V } from "./variables";

axios.defaults.baseURL = V.BACKEND;
axios.defaults.headers['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;