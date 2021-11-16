import { Sequelize } from 'sequelize';
import dotenv from 'dotenv'

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE, process.env.DATABASE_USER, process.env.DATABASE_USER_PASSWORD, {
    dialect: 'mysql',
    host: process.env.CLEARDB_DATABASE_URL, 
});

export default sequelize;