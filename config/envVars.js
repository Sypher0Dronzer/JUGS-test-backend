import dotenv from "dotenv";

dotenv.config();


export const ENV_VARS = {
	MONGO_URI: process.env.MONGO_URI,
	MONGO_LOCALDB: process.env.MONGO_LOCALDB,
	PORT: process.env.PORT || 5000,
	JWT_SECRET: process.env.JWT_SECRET,
	FRONTEND_LINK:process.env.FRONTEND_LINK,
	ENVIROMENT: process.env.ENVIROMENT,
	REDIS_URL: process.env.REDIS_URL,

};