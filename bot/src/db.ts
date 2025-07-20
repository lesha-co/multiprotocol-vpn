import { DataTypes, Sequelize } from "sequelize";
import assert from "node:assert";
const filename = process.env.SQLITE_FILENAME;
assert(filename);
const sequelize = new Sequelize(`sqlite:${filename}`);

try {
  await sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

export interface KeyAttributes {
  keyData: string;
  serverName: string;
  claimedBy: string;
}

export const Key = sequelize.define<any, KeyAttributes>("Key", {
  keyData: DataTypes.STRING,
  serverName: DataTypes.STRING,
  claimedBy: DataTypes.STRING,
});

// Automatically create all tables
await sequelize.sync({
  alter: true,
});
