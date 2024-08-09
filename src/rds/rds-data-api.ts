import { RDSDataClient, ExecuteStatementCommand, BatchExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { type SqlParameter } from "@aws-sdk/client-rds-data/dist-types/models/models_0";

const version = "2.1 - 2024-07-24"; // Remove formatting, go straight to values

// See https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
const config: Record<string, any> = {
    region: process.env.DATA_API_ARN!.split(":")[3],
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    }
}

const database = {
    resourceArn: process.env.DATA_API_ARN,
    secretArn: process.env.DATA_API_SECRET_ARN, // This is the ARN of the secret in Secrets Manager - not the secret itself
    database: process.env.DATA_API_DATABASE,
};

let index: RDSDataClient;
console.log("Initializing data api", version, process.env.DATA_API_ARN);
index = new RDSDataClient(config);
execute("SELECT version()").then((rows) => {
    console.log("Connected to database", rows[0].version);
}).catch((err) => {
    console.error("Failed to connect to database");
    console.error(err);
    throw err;
});

//https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/rds-data/command/ExecuteStatementCommand/
export async function execute(sql: string, params?: Record<string, any>) {
    const parameters: SqlParameter[] = params ? Object.entries(params).map(([key, value]) => asParameter(key, value)) : [];
    const command = new ExecuteStatementCommand({
        sql,
        parameters,
        ...database,
        includeResultMetadata: true,
    });
    // try {
    const rows: Record<string, any>[] = [];
    const { columnMetadata, records, numberOfRecordsUpdated } = await index.send(command);
    if (columnMetadata && records) {
        //console.log(columnMetadata, records)
        for (const record of records) {
            // A record is an array of fields matching the columnMetadata array
            // [
            //     { longValue: 3 },
            //     { stringValue: 'apollo-contacts-export - 2024-03-27T095203.105.csv' },
            //     { isNull: true },
            //     { stringValue: '2024-04-09 17:48:17.510924' }
            const row: Record<string, any> = {};
            for (let i = 0; i < columnMetadata.length; i++) {
                const { name, typeName } = columnMetadata[i];
                const key = snakeToCamel(name!);
                const field = record[i];
                // Look for a null, then get the value irrespective of the key, which is longValue, stringValue...
                const value = field.isNull ? null : Object.values(field)[0];
                switch (typeName) {
                    case "timestamp":
                        row[key] = new Date(value);
                        break;
                    case "serial":
                    case "int4":
                        row[key!] = value;
                        break;
                    case "json":
                    case "jsonb":
                        row[key] = JSON.parse(value);
                        break;
                    default:
                        // Arrays
                        if (typeof value === "object" && Array.isArray(value?.stringValues) || Array.isArray(value?.longValues)) {
                            row[key] = value.stringValues || value.longValues;
                            // The rest - strings
                        } else {
                            row[key] = value;
                        }
                }
            }
            rows.push(row);
        }
    }
    return rows;
    // }
    // catch (err) {
    //     return err;
    // }
}

export async function batch(sql: string, params: Record<string, any>[]) {
    homogeniseFields(sql, params);
    const parameterSets: SqlParameter[][] = params ? params.map((param) => Object.entries(param).map(([key, value]) => asParameter(key, value))) : [];
    const command = new BatchExecuteStatementCommand({
        sql,
        parameterSets,
        ...database,
    });
    const result = await index.send(command);
}

function asParameter(key: string, value: any): SqlParameter {
    if (value === null || value === undefined) {
        return { name: key, value: { isNull: true } };
    }
    switch (typeof value) {
        case "string":
            return { name: key, value: { stringValue: value } };
        case "number":
            return { name: key, value: { longValue: value } };
        case "boolean":
            return { name: key, value: { booleanValue: value } };
        case "object":
            if (value instanceof Date) {
                return { name: key, value: { stringValue: value.toISOString() } };
            }
            return { name: key, value: { stringValue: JSON.stringify(value) } };
        default:
            return { name: key, value: { stringValue: JSON.stringify(value) } };
    }
}

// Add entries with null for missing fields
export function homogeniseFields(sql: string, rows: Record<string, any>[]) {
    // Find all the fields in the SQL - fields start with a colon
    const fields = sql.match(/:([a-zA-Z0-9_]+)/g)?.map((field) => field.slice(1)) as string[];
    for (const row of rows) {
        for (const field of fields) {
            if (!row[field]) {
                row[field] = null;
            }
        }
    }
}

function snakeToCamel(s: string) {
    return s.replace(/(_\w)/g, k => k[1].toUpperCase());
}





